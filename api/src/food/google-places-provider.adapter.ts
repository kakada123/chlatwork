import {
  Injectable,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Place } from "./food.types";
import { calculateDistanceKm } from "./data/districts";
import type { FoodFiltersDto } from "./dto/food-filters.dto";
import { foodSearchQuery, searchLocationLabel } from "./food-search-preferences";

export interface GoogleFoodSearchResult {
  places: Place[]; dataSource: "google"; nextPageToken?: string;
  searchCenter?: { lat: number; lng: number }; routePolyline?: string;
}

class GoogleFoodRequestError extends Error {
  constructor(readonly status: number, readonly reason: string) { super("Google Food provider failed"); }
}

const FOOD_TYPES = ["restaurant", "cafe", "fast_food_restaurant", "food_court"];
const SAFE_GOOGLE_ERROR_REASONS = new Set([
  "API_KEY_HTTP_REFERRER_BLOCKED",
  "API_KEY_IP_ADDRESS_BLOCKED",
  "API_KEY_SERVICE_BLOCKED",
  "API_KEY_INVALID",
  "API_KEY_EXPIRED",
  "SERVICE_DISABLED",
  "BILLING_DISABLED",
  "CONSUMER_INVALID",
  "RATE_LIMIT_EXCEEDED",
  "QUOTA_EXCEEDED",
  "DAILY_LIMIT_EXCEEDED",
]);
const FIELD_MASK = [
  "id",
  "displayName",
  "location",
  "formattedAddress",
  "primaryType",
  "types",
  "businessStatus",
  "googleMapsUri",
  "attributions",
]
  .map((field) => `places.${field}`)
  .join(",");

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, maxLength = 300): string | undefined {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : undefined;
}

function googleErrorReason(body: unknown): string {
  const error = record(record(body).error);
  const details = Array.isArray(error.details) ? error.details : [];
  for (const value of details) {
    const detail = record(value);
    // Provider text and metadata may contain keys, locations or project identifiers.
    // Only known Google ErrorInfo codes are safe to include in operational logs.
    if (
      detail["@type"] === "type.googleapis.com/google.rpc.ErrorInfo" &&
      detail.domain === "googleapis.com" &&
      typeof detail.reason === "string" &&
      SAFE_GOOGLE_ERROR_REASONS.has(detail.reason)
    )
      return detail.reason;
  }
  // Some Maps rejections contain only error.message, without Google RPC ErrorInfo.
  // Match known wording to fixed categories; never return or log the provider's text.
  const message =
    typeof error.message === "string"
      ? error.message.slice(0, 4000).toLowerCase()
      : "";
  if (
    /api keys? (?:with|cannot have) (?:http )?referr?er restrictions/.test(
      message,
    ) ||
    /requests? from referr?er .{0,1000}blocked/.test(message)
  )
    return "API_KEY_HTTP_REFERRER_BLOCKED";
  if (/requests? from (?:this )?ip address .{0,1000}blocked/.test(message))
    return "API_KEY_IP_ADDRESS_BLOCKED";
  if (
    /enable billing|billing (?:has not been enabled|is disabled|is not enabled)/.test(
      message,
    )
  )
    return "BILLING_DISABLED";
  if (/api (?:has not been used|is not enabled|is disabled)/.test(message))
    return "SERVICE_DISABLED";
  if (
    /api key (?:not valid|is not valid|is invalid)|invalid api key/.test(
      message,
    )
  )
    return "API_KEY_INVALID";
  if (message.includes("api project is not authorized to use this api"))
    return "API_PROJECT_NOT_AUTHORIZED";
  return "UNKNOWN";
}

function safeUrl(value: unknown, mapsOnly = false): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return;
    if (
      mapsOnly &&
      ![
        "google.com",
        "www.google.com",
        "maps.google.com",
        "maps.app.goo.gl",
      ].includes(url.hostname)
    )
      return;
    if (
      !mapsOnly &&
      (!url.hostname.includes(".") ||
        /^(localhost|127\.|0\.|\[)/.test(url.hostname))
    )
      return;
    return url.href;
  } catch {
    return;
  }
}

@Injectable()
export class GooglePlacesProviderAdapter {
  private readonly logger = new Logger(GooglePlacesProviderAdapter.name);
  private readonly quotaBlockedUntil = new Map<string, number>();
  constructor(private readonly config: ConfigService) {}

  routeSearchAvailable(): boolean {
    const value = this.config.get<string>("GOOGLE_ROUTES_API_KEY")?.trim();
    return Boolean(value && !/^(dummy_|replace_)/i.test(value));
  }

  async searchNearby(
    lat: number,
    lng: number,
    radiusMeters = 2000,
    cuisine?: string,
    options: FoodFiltersDto = {},
  ): Promise<GoogleFoodSearchResult> {
    const apiKey = this.config.get<string>("GOOGLE_PLACES_API_KEY")?.trim();
    if (!apiKey || /^(dummy_|replace_)/i.test(apiKey)) {
      throw new ServiceUnavailableException(
        "Google place search is not configured.",
      );
    }
    const locationLabel = searchLocationLabel(options);
    const query = foodSearchQuery(cuisine, options.filters);
    const alongRoute = options.filters?.locationDiscovery === "along-my-route";
    if (alongRoute && (!options.routeOrigin?.trim() || !options.routeDestination?.trim())) throw new BadRequestException("Enter a route origin and destination.");
    if ((options.searchLat === undefined) !== (options.searchLng === undefined)) throw new BadRequestException("Supply both search-center coordinates.");
    const routesKey = this.config.get<string>("GOOGLE_ROUTES_API_KEY")?.trim();
    if (alongRoute && options.pageToken && !options.routePolyline) throw new BadRequestException("Supply the route polyline when loading another route page.");
    if (alongRoute && !options.pageToken && (!routesKey || /^(dummy_|replace_)/i.test(routesKey))) throw new ServiceUnavailableException("Route search is not configured.");
    try {
      let center = { lat, lng };
      let routePolyline: string | undefined;
      if (alongRoute) {
        if (options.pageToken && options.routePolyline) routePolyline = options.routePolyline;
        else {
          const body = await this.request("https://routes.googleapis.com/directions/v2:computeRoutes", routesKey!, "routes.polyline.encodedPolyline", {
            origin: { address: options.routeOrigin }, destination: { address: options.routeDestination }, travelMode: "DRIVE", routingPreference: "TRAFFIC_UNAWARE", computeAlternativeRoutes: false,
          });
          const routes = Array.isArray(body.routes) ? body.routes : [];
          const encoded = record(record(routes[0]).polyline).encodedPolyline;
          if (typeof encoded !== "string" || !encoded || encoded.length > 20000) throw new Error("Route unavailable");
          routePolyline = encoded;
        }
      } else if (options.pageToken && options.searchLat !== undefined && options.searchLng !== undefined) {
        center = { lat: options.searchLat, lng: options.searchLng };
      } else if (locationLabel) {
        const body = await this.request("https://places.googleapis.com/v1/places:searchText", apiKey, "places.location", { textQuery: locationLabel, regionCode: "KH", pageSize: 1 });
        const anchor = record((Array.isArray(body.places) ? body.places : [])[0]);
        const point = record(anchor.location);
        if (typeof point.latitude !== "number" || !Number.isFinite(point.latitude) || Math.abs(point.latitude) > 90 || typeof point.longitude !== "number" || !Number.isFinite(point.longitude) || Math.abs(point.longitude) > 180) throw new Error("Location unavailable");
        center = { lat: point.latitude, lng: point.longitude };
      }
      const types = options.filters?.restaurantTypes;
      const type = Array.isArray(types) && types.length === 1 ? ({ "food-court": "food_court", "fast-food-restaurant": "fast_food_restaurant", "coffee-shop": "cafe", "bakery-cafe": "bakery", "buffet-restaurant": "buffet_restaurant", "fine-dining": "fine_dining_restaurant", "bbq-restaurant": "barbecue_restaurant" } as Record<string, string>)[types[0]] : undefined;
      const withRatings = Boolean(options.filters?.reviews || options.minimumRating);
      const body = await this.request("https://places.googleapis.com/v1/places:searchText", apiKey, `${FIELD_MASK},nextPageToken${withRatings ? ",places.rating,places.userRatingCount" : ""}`, {
        textQuery: query, regionCode: "KH", languageCode: "km", pageSize: 20,
        ...(options.pageToken ? { pageToken: options.pageToken } : {}),
        ...(type ? { includedType: type, strictTypeFiltering: true } : {}),
        ...(options.filters?.operatingStatus === "open-now" ? { openNow: true } : {}),
        ...(options.minimumRating ? { minRating: options.minimumRating } : {}),
        ...(routePolyline ? { searchAlongRouteParameters: { polyline: { encodedPolyline: routePolyline } } }
          : { locationBias: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius: radiusMeters } } }),
      });
      if (body.places !== undefined && !Array.isArray(body.places))
        throw new Error("Invalid provider result");
      const places: Place[] = [];
      const seen = new Set<string>();
      for (const candidate of (body.places || []) as unknown[]) {
        const place = this.normalize(candidate, center.lat, center.lng);
        // Text search is location-biased rather than radius-restricted; enforce the requested radius ourselves.
        if (
          !place ||
          (!routePolyline && (place.distanceMeters ?? Infinity) > radiusMeters) ||
          seen.has(place.id)
        )
          continue;
        seen.add(place.id);
        if (routePolyline) place.distanceMeters = undefined;
        places.push(place);
      }
      const nextPageToken = typeof body.nextPageToken === "string" && body.nextPageToken.length <= 4096 ? body.nextPageToken : undefined;
      return { places, dataSource: "google", nextPageToken, searchCenter: center, ...(routePolyline ? { routePolyline } : {}) };
    } catch (error) {
      // Never log raw provider messages, headers or metadata; ErrorInfo reasons are allowlisted above.
      this.logger.warn({
        message: "Google Places search failed",
        providerStatus: error instanceof GoogleFoodRequestError ? error.status : null,
        providerReason: error instanceof GoogleFoodRequestError ? error.reason : "UNKNOWN",
      });
      if (error instanceof GoogleFoodRequestError && error.status === 429) {
        throw new ServiceUnavailableException({
          statusCode: 503,
          code: "FOOD_PLACES_RATE_LIMITED",
          message:
            "Google place search has reached a provider quota limit. Please try again later.",
        });
      }
      throw new ServiceUnavailableException(
        "Google place search is unavailable. Please try again later.",
      );
    }
  }

  private async request(
    url: string,
    key: string,
    fieldMask: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    // Pause this provider endpoint after a 429 instead of spending quota on repeated clicks.
    // This guard is per API process; Routes failures do not block ordinary Places searches.
    if ((this.quotaBlockedUntil.get(url) ?? 0) > Date.now())
      throw new GoogleFoodRequestError(429, "RATE_LIMITED");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const value: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 429)
        this.quotaBlockedUntil.set(url, Date.now() + 60_000);
      const reason = googleErrorReason(value);
      throw new GoogleFoodRequestError(
        response.status,
        response.status === 429 && reason === "UNKNOWN" ? "RATE_LIMITED" : reason,
      );
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new GoogleFoodRequestError(response.status, "UNKNOWN");
    return value as Record<string, unknown>;
  }

  private normalize(
    value: unknown,
    userLat: number,
    userLng: number,
  ): Place | null {
    const source = record(value);
    const id = text(source.id, 256);
    const displayName = record(source.displayName);
    const name = text(displayName.text);
    const location = record(source.location);
    const lat = location.latitude;
    const lng = location.longitude;
    const types = Array.isArray(source.types)
      ? source.types.filter((type): type is string => typeof type === "string")
      : [];
    const foodTypes = types.filter(
      (type) =>
        FOOD_TYPES.includes(type) ||
        type.endsWith("_restaurant") ||
        [
          "bakery",
          "coffee_shop",
          "tea_house",
          "ice_cream_shop",
          "bar",
        ].includes(type),
    );
    if (
      !id ||
      !/^[\w-]+$/.test(id) ||
      !name ||
      !foodTypes.length ||
      typeof lat !== "number" ||
      !Number.isFinite(lat) ||
      Math.abs(lat) > 90 ||
      typeof lng !== "number" ||
      !Number.isFinite(lng) ||
      Math.abs(lng) > 180 ||
      (source.businessStatus !== undefined &&
        source.businessStatus !== "OPERATIONAL")
    )
      return null;
    const primaryType =
      typeof source.primaryType === "string" ? source.primaryType : types[0];
    const amenity = [
      "cafe",
      "coffee_shop",
      "tea_house",
      "bakery",
      "ice_cream_shop",
    ].includes(primaryType)
      ? "cafe"
      : primaryType === "fast_food_restaurant"
        ? "fast_food"
        : primaryType === "food_court"
          ? "food_court"
          : primaryType === "bar"
            ? "bar"
            : "restaurant";
    const attributions = (
      Array.isArray(source.attributions) ? source.attributions : []
    ).flatMap((entry) => {
      const attribution = record(entry);
      const provider = text(attribution.provider);
      const providerUri = safeUrl(attribution.providerUri);
      return provider && providerUri ? [{ provider, providerUri }] : [];
    });
    return {
      id: `google:${id}`,
      googlePlaceId: id,
      name,
      nameKm: /[\u1780-\u17ff]/.test(name) ? name : undefined,
      nameEn: displayName.languageCode === "en" ? name : undefined,
      lat,
      lng,
      amenity,
      cuisine: foodTypes
        .filter(
          (type) =>
            type.endsWith("_restaurant") && type !== "fast_food_restaurant",
        )
        .map((type) => type.replace(/_restaurant$/, "")),
      distanceMeters: Math.round(
        calculateDistanceKm(userLat, userLng, lat, lng) * 1000,
      ),
      street: text(source.formattedAddress),
      city: text(source.formattedAddress) || "",
      googleMapsUri: safeUrl(source.googleMapsUri, true),
      rating: typeof source.rating === "number" && source.rating >= 0 && source.rating <= 5 ? source.rating : undefined,
      userRatingCount: typeof source.userRatingCount === "number" && Number.isInteger(source.userRatingCount) && source.userRatingCount >= 0 ? source.userRatingCount : undefined,
      attributions,
      // A business listing or price tier is not a verified per-person menu price.
      isPriceVerified: false,
      source: "google",
    };
  }
}
