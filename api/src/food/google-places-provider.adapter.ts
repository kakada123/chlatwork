import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Place } from "./food.types";
import { calculateDistanceKm } from "./data/districts";

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
  const details = record(record(body).error).details;
  if (!Array.isArray(details)) return "UNKNOWN";
  for (const value of details) {
    const detail = record(value);
    // Provider text and metadata may contain keys, locations or project identifiers.
    // Only known Google ErrorInfo codes are safe to include in operational logs.
    if (
      detail["@type"] === "type.googleapis.com/google.rpc.ErrorInfo" &&
      detail.domain === "googleapis.com" &&
      typeof detail.reason === "string" &&
      SAFE_GOOGLE_ERROR_REASONS.has(detail.reason)
    ) return detail.reason;
  }
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
  constructor(private readonly config: ConfigService) {}

  async searchNearby(
    lat: number,
    lng: number,
    radiusMeters = 2000,
    cuisine?: string,
  ): Promise<{ places: Place[]; dataSource: "google" }> {
    const apiKey = this.config.get<string>("GOOGLE_PLACES_API_KEY")?.trim();
    if (!apiKey || /^(dummy_|replace_)/i.test(apiKey)) {
      throw new ServiceUnavailableException(
        "Google place search is not configured.",
      );
    }
    const circle = {
      center: { latitude: lat, longitude: lng },
      radius: radiusMeters,
    };
    const query = cuisine?.trim();
    const useTextSearch = Boolean(query && query.toLowerCase() !== "all");
    let providerStatus: number | undefined;
    let providerReason = "UNKNOWN";
    try {
      // Fetch fresh Google data without caching or substituting unverified curated locations.
      const response = await fetch(
        `https://places.googleapis.com/v1/places:${useTextSearch ? "searchText" : "searchNearby"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": FIELD_MASK,
          },
          body: JSON.stringify(
            useTextSearch
              ? {
                  textQuery: query,
                  regionCode: "KH",
                  languageCode: "km",
                  pageSize: 20,
                  locationBias: { circle },
                }
              : {
                  includedTypes: FOOD_TYPES,
                  maxResultCount: 20,
                  rankPreference: "DISTANCE",
                  languageCode: "km",
                  locationRestriction: { circle },
                },
          ),
          signal: AbortSignal.timeout(8000),
        },
      );
      providerStatus = response.status;
      if (!response.ok) {
        providerReason = googleErrorReason(await response.json().catch(() => null));
        throw new Error("Provider HTTP failure");
      }
      const body = record(await response.json());
      if (body.places !== undefined && !Array.isArray(body.places))
        throw new Error("Invalid provider result");
      const places: Place[] = [];
      const seen = new Set<string>();
      for (const candidate of (body.places || []) as unknown[]) {
        const place = this.normalize(candidate, lat, lng);
        // Text search is location-biased rather than radius-restricted; enforce the requested radius ourselves.
        if (
          !place ||
          (place.distanceMeters ?? Infinity) > radiusMeters ||
          seen.has(place.id)
        )
          continue;
        seen.add(place.id);
        places.push(place);
      }
      return { places, dataSource: "google" };
    } catch {
      // Never log raw provider messages, headers or metadata; ErrorInfo reasons are allowlisted above.
      this.logger.warn({
        message: "Google Places search failed",
        providerStatus: providerStatus ?? null,
        providerReason,
      });
      throw new ServiceUnavailableException(
        "Google place search is unavailable. Please try again later.",
      );
    }
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
      attributions,
      // A business listing or price tier is not a verified per-person menu price.
      isPriceVerified: false,
      source: "google",
    };
  }
}
