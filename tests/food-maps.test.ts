import assert from "node:assert/strict";
import test from "node:test";
import {
  foodDirectionsUrl,
  foodMapEmbedUrl,
  foodMapSearchUrl,
} from "../app/lib/food-maps.ts";

const place = {
  googlePlaceId: "ChIJ_test-1",
  name: "ហាង & Café",
  lat: 11.55,
  lng: 104.92,
};

test("Food directions and search identify the Google place instead of relying only on coordinates", () => {
  const directions = new URL(foodDirectionsUrl(place));
  assert.equal(directions.origin, "https://www.google.com");
  assert.equal(
    directions.searchParams.get("destination_place_id"),
    "ChIJ_test-1",
  );
  assert.equal(directions.searchParams.get("destination"), "11.55,104.92");
  const search = new URL(foodMapSearchUrl(place));
  assert.equal(search.searchParams.get("query_place_id"), "ChIJ_test-1");
  assert.equal(search.searchParams.get("query"), "ហាង & Café");
});

test("Food embeds use the official Google endpoint and provider place ID with a restricted browser key", () => {
  const url = new URL(foodMapEmbedUrl("fixture_browser_key", place)!);
  assert.equal(
    url.origin + url.pathname,
    "https://www.google.com/maps/embed/v1/place",
  );
  assert.equal(url.searchParams.get("q"), "place_id:ChIJ_test-1");
  assert.equal(url.searchParams.get("key"), "fixture_browser_key");
  const center = new URL(
    foodMapEmbedUrl("fixture_browser_key", null, { lat: 11.57, lng: 104.89 })!,
  );
  assert.equal(center.pathname, "/maps/embed/v1/view");
  assert.equal(center.searchParams.get("center"), "11.57,104.89");
});

test("Food maps retain usable external links without a configured embed key and reject invalid coordinates", () => {
  for (const key of ["", "dummy_google_maps_embed_key", "replace_me"])
    assert.equal(foodMapEmbedUrl(key, place), null);
  assert.throws(() => foodDirectionsUrl({ lat: NaN, lng: 104.92 }));
  const fallback = new URL(foodDirectionsUrl({ lat: 0, lng: 0 }));
  assert.equal(fallback.searchParams.get("destination"), "0,0");
});
