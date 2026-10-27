import { Injectable, Logger } from '@nestjs/common';
import { Place, AmenityType, PlaceFeatures } from './food.types';
import { CURATED_PLACES } from './data/curated-places';
import { calculateDistanceKm } from './data/districts';

interface OverpassElement {
  type: 'node' | 'way';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

interface CacheEntry {
  timestamp: number;
  data: Place[];
}

@Injectable()
export class OsmProviderAdapter {
  private readonly logger = new Logger(OsmProviderAdapter.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
  private readonly REQUEST_TIMEOUT_MS = 8000; // 8 seconds
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL_MS = 1000; // 1s throttle between Overpass calls

  /**
   * Search places around coordinates with a given radius (meters).
   * Includes in-memory caching, throttling, timeout, and fallback to curated dataset.
   */
  async searchNearby(
    lat: number,
    lng: number,
    radiusMeters: number = 2000,
    cuisineFilter?: string,
  ): Promise<{ places: Place[]; dataSource: 'osm' | 'curated' | 'hybrid' }> {
    // Quantize coordinates to ~500m grid for effective caching
    const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}_${radiusMeters}_${cuisineFilter || 'all'}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return { places: cached.data, dataSource: 'osm' };
    }

    try {
      // Throttle concurrent/rapid requests
      const timeSinceLast = now - this.lastRequestTime;
      if (timeSinceLast < this.MIN_REQUEST_INTERVAL_MS) {
        await new Promise((resolve) => setTimeout(resolve, this.MIN_REQUEST_INTERVAL_MS - timeSinceLast));
      }
      this.lastRequestTime = Date.now();

      const osmPlaces = await this.fetchFromOverpass(lat, lng, radiusMeters);

      if (osmPlaces.length > 0) {
        // Merge with any curated places in range to enrich metadata (e.g. verified prices)
        const merged = this.mergeWithCurated(osmPlaces, lat, lng, radiusMeters);

        // Filter by cuisine if requested
        const filtered = cuisineFilter
          ? merged.filter((p) => p.cuisine.some((c) => c.toLowerCase().includes(cuisineFilter.toLowerCase())))
          : merged;

        // Cache result
        this.cache.set(cacheKey, { timestamp: Date.now(), data: filtered });
        return { places: filtered, dataSource: 'osm' };
      }
    } catch (error: any) {
      this.logger.warn(`Overpass API query failed or timed out (${error?.message}). Falling back to curated places.`);
    }

    // Graceful fallback to curated places
    const fallbackPlaces = this.getCuratedPlacesNearby(lat, lng, radiusMeters, cuisineFilter);
    return { places: fallbackPlaces, dataSource: 'curated' };
  }

  /**
   * Fetch live places from OpenStreetMap via Overpass API.
   */
  private async fetchFromOverpass(lat: number, lng: number, radiusMeters: number): Promise<Place[]> {
    // Overpass QL query around center point
    const overpassQuery = `
      [out:json][timeout:8];
      (
        node["amenity"~"^(restaurant|cafe|fast_food|food_court)$"](around:${radiusMeters},${lat},${lng});
        way["amenity"~"^(restaurant|cafe|fast_food|food_court)$"](around:${radiusMeters},${lat},${lng});
      );
      out center 50;
    `;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'ChlatWork-Food/1.0 (contact: info@chlatwork.com)',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Overpass returned HTTP ${response.status}`);
      }

      const json = (await response.json()) as OverpassResponse;
      if (!json.elements || !Array.isArray(json.elements)) {
        return [];
      }

      return json.elements
        .filter((el) => el.tags && (el.tags.name || el.tags['name:km'] || el.tags['name:en']))
        .map((el) => this.normalizeOsmElement(el, lat, lng))
        .filter((place): place is Place => place !== null);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Normalize an Overpass element into our internal Place model.
   */
  private normalizeOsmElement(element: OverpassElement, userLat: number, userLng: number): Place | null {
    const tags = element.tags || {};
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;

    if (lat === undefined || lng === undefined) {
      return null;
    }

    const name = tags['name:km'] || tags.name || tags['name:en'] || 'Restaurant';
    const nameKm = tags['name:km'] || (this.isKhmerText(tags.name) ? tags.name : undefined);
    const nameEn = tags['name:en'] || (!this.isKhmerText(tags.name) ? tags.name : undefined);

    let amenity: AmenityType = 'restaurant';
    if (tags.amenity === 'cafe') amenity = 'cafe';
    else if (tags.amenity === 'fast_food') amenity = 'fast_food';
    else if (tags.amenity === 'food_court') amenity = 'food_court';
    else if (tags.amenity === 'bar') amenity = 'bar';

    const cuisines: string[] = [];
    if (tags.cuisine) {
      tags.cuisine
        .split(/[;,]/)
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean)
        .forEach((c) => {
          if (!cuisines.includes(c)) cuisines.push(c);
        });
    }
    if (cuisines.length === 0) {
      cuisines.push(amenity === 'cafe' ? 'cafe' : 'khmer');
    }

    const features: PlaceFeatures = {
      wheelchair: tags.wheelchair === 'yes',
      airConditioning: tags.air_conditioning === 'yes' || tags['indoor:air_conditioning'] === 'yes',
      outdoorSeating: tags.outdoor_seating === 'yes',
      takeaway: tags.takeaway === 'yes',
      groupFriendly: amenity === 'food_court' || tags.group === 'yes',
    };

    const distKm = calculateDistanceKm(userLat, userLng, lat, lng);

    return {
      id: `osm-${element.id}`,
      osmId: String(element.id),
      name,
      nameKm,
      nameEn,
      amenity,
      cuisine: cuisines,
      lat,
      lng,
      distanceMeters: Math.round(distKm * 1000),
      street: tags['addr:street'],
      district: tags['addr:district'] || tags['addr:subdistrict'],
      city: tags['addr:city'] || 'Phnom Penh',
      openingHours: tags.opening_hours,
      phone: tags.phone || tags['contact:phone'],
      website: tags.website || tags['contact:website'],
      isPriceVerified: false, // Honest price data requirement: unverified unless explicitly validated
      features,
      source: 'osm',
    };
  }

  /**
   * Enrich OSM places with verified curated data if there are known matching spots.
   */
  private mergeWithCurated(osmPlaces: Place[], userLat: number, userLng: number, radiusMeters: number): Place[] {
    const curatedNearby = this.getCuratedPlacesNearby(userLat, userLng, radiusMeters);
    const result: Place[] = [...osmPlaces];

    // Add curated places that aren't already represented in the OSM list by name similarity
    for (const curated of curatedNearby) {
      const alreadyPresent = result.some(
        (p) =>
          calculateDistanceKm(p.lat, p.lng, curated.lat, curated.lng) < 0.1 ||
          p.name.toLowerCase() === curated.name.toLowerCase(),
      );
      if (!alreadyPresent) {
        result.push(curated);
      }
    }

    return result;
  }

  /**
   * Filter and return curated places nearby.
   */
  public getCuratedPlacesNearby(
    userLat: number,
    userLng: number,
    radiusMeters: number = 3000,
    cuisineFilter?: string,
  ): Place[] {
    const radiusKm = radiusMeters / 1000;
    return CURATED_PLACES.map((p) => {
      const distKm = calculateDistanceKm(userLat, userLng, p.lat, p.lng);
      return {
        ...p,
        distanceMeters: Math.round(distKm * 1000),
      };
    })
      .filter((p) => {
        // In city mode, if within radius or within 10km if radius is small
        const distKm = (p.distanceMeters ?? 0) / 1000;
        const matchesRadius = distKm <= Math.max(radiusKm, 5.0);
        const matchesCuisine = cuisineFilter
          ? p.cuisine.some((c) => c.toLowerCase().includes(cuisineFilter.toLowerCase()))
          : true;
        return matchesRadius && matchesCuisine;
      })
      .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  }

  private isKhmerText(str?: string): boolean {
    if (!str) return false;
    // Khmer unicode range: U+1780 to U+17FF
    return /[\u1780-\u17FF]/.test(str);
  }
}
