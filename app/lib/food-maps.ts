export interface FoodMapPlace {
  googlePlaceId?: string;
  name?: string;
  lat: number;
  lng: number;
}

function coordinates(point: { lat: number; lng: number }): string {
  if (
    !Number.isFinite(point.lat) ||
    !Number.isFinite(point.lng) ||
    Math.abs(point.lat) > 90 ||
    Math.abs(point.lng) > 180
  )
    throw new Error("Invalid map coordinates");
  return `${point.lat},${point.lng}`;
}

export function foodDirectionsUrl(place: FoodMapPlace): string {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", coordinates(place));
  if (place.googlePlaceId)
    url.searchParams.set("destination_place_id", place.googlePlaceId);
  return url.href;
}

export function foodMapSearchUrl(place: FoodMapPlace): string {
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", place.name || coordinates(place));
  if (place.googlePlaceId)
    url.searchParams.set("query_place_id", place.googlePlaceId);
  return url.href;
}

export function foodMapEmbedUrl(
  key: string,
  place: FoodMapPlace | null,
  center = { lat: 11.5564, lng: 104.9282 },
): string | null {
  const apiKey = key.trim();
  if (!apiKey || /^(dummy_|replace_)/i.test(apiKey)) return null;
  const url = new URL(
    `https://www.google.com/maps/embed/v1/${place ? "place" : "view"}`,
  );
  url.searchParams.set("key", apiKey);
  if (place)
    url.searchParams.set(
      "q",
      place.googlePlaceId
        ? `place_id:${place.googlePlaceId}`
        : coordinates(place),
    );
  else {
    url.searchParams.set("center", coordinates(center));
    url.searchParams.set("zoom", "14");
  }
  return url.href;
}
