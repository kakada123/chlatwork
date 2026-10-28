import { ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GooglePlacesProviderAdapter } from "./google-places-provider.adapter";

describe("GooglePlacesProviderAdapter", () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  let adapter: GooglePlacesProviderAdapter;
  const place = {
    id: "google-place-1",
    displayName: { text: "ហាងគុយទាវ", languageCode: "km" },
    location: { latitude: 11.5517, longitude: 104.9248 },
    formattedAddress: "Boeng Keng Kang, Phnom Penh, Cambodia",
    primaryType: "restaurant",
    types: ["restaurant", "food", "point_of_interest"],
    businessStatus: "OPERATIONAL",
    googleMapsUri: "https://maps.google.com/?cid=123",
    attributions: [
      { provider: "Example provider", providerUri: "https://example.test" },
    ],
  };

  beforeEach(() => {
    fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ places: [place] })));
    global.fetch = fetchMock;
    adapter = new GooglePlacesProviderAdapter(
      new ConfigService({ GOOGLE_PLACES_API_KEY: "test_places_key" }),
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns real Google identifiers, coordinates and attribution without fabricating prices or cuisine", async () => {
    const result = await adapter.searchNearby(11.5516, 104.9247, 2000);
    expect(result.dataSource).toBe("google");
    expect(result.places).toHaveLength(1);
    expect(result.places[0]).toMatchObject({
      id: "google:google-place-1",
      googlePlaceId: "google-place-1",
      name: "ហាងគុយទាវ",
      lat: 11.5517,
      lng: 104.9248,
      source: "google",
      isPriceVerified: false,
      cuisine: [],
      googleMapsUri: "https://maps.google.com/?cid=123",
      attributions: [
        { provider: "Example provider", providerUri: "https://example.test/" },
      ],
    });
    expect(result.places[0].estimatedPricePerPersonUsd).toBeUndefined();
    expect(result.places[0].distanceMeters).toBeGreaterThan(0);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchNearby");
    expect(JSON.parse(request.body)).toMatchObject({
      includedTypes: [
        "restaurant",
        "cafe",
        "fast_food_restaurant",
        "food_court",
      ],
      locationRestriction: {
        circle: {
          center: { latitude: 11.5516, longitude: 104.9247 },
          radius: 2000,
        },
      },
    });
    expect(request.headers["X-Goog-FieldMask"]).not.toContain("*");
    expect(request.headers["X-Goog-Api-Key"]).toBe("test_places_key");
  });

  it("uses text search for Khmer dish names and retains only places within the requested radius", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          places: [
            place,
            {
              ...place,
              id: "far-away",
              location: { latitude: 13.36, longitude: 103.86 },
            },
          ],
        }),
      ),
    );
    const result = await adapter.searchNearby(
      11.5516,
      104.9247,
      2000,
      "បាយសាច់ជ្រូក",
    );
    expect(result.places.map((p) => p.googlePlaceId)).toEqual([
      "google-place-1",
    ]);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://places.googleapis.com/v1/places:searchText",
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      textQuery: "បាយសាច់ជ្រូក",
      regionCode: "KH",
      locationBias: {
        circle: {
          center: { latitude: 11.5516, longitude: 104.9247 },
          radius: 2000,
        },
      },
    });
  });

  it("drops invalid, closed, non-food and duplicate records and unsafe provider links", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          places: [
            place,
            place,
            { ...place, id: "closed", businessStatus: "CLOSED_PERMANENTLY" },
            { ...place, id: "temporary", businessStatus: "CLOSED_TEMPORARILY" },
            {
              ...place,
              id: "invalid",
              location: { latitude: "11", longitude: 104 },
            },
            {
              ...place,
              id: "hotel",
              primaryType: "lodging",
              types: ["lodging"],
            },
            { ...place, id: "no-name", displayName: {} },
            {
              ...place,
              id: "links",
              googleMapsUri: "javascript:alert(1)",
              attributions: [
                { provider: "bad", providerUri: "javascript:alert(1)" },
              ],
            },
          ],
        }),
      ),
    );
    const result = await adapter.searchNearby(11.5516, 104.9247, 2000);
    expect(result.places.map((p) => p.googlePlaceId)).toEqual([
      "google-place-1",
      "links",
    ]);
    expect(result.places[1].googleMapsUri).toBeUndefined();
    expect(result.places[1].attributions).toEqual([]);
  });

  it("keeps an empty Google result empty instead of returning curated restaurants", async () => {
    fetchMock.mockResolvedValue(new Response('{"places":[]}'));
    expect((await adapter.searchNearby(11.5516, 104.9247)).places).toEqual([]);
  });

  it.each(["", "dummy_google_places_key", "replace_me"])(
    "rejects unconfigured keys before contacting Google (%s)",
    async (key) => {
      adapter = new GooglePlacesProviderAdapter(
        new ConfigService({ GOOGLE_PLACES_API_KEY: key }),
      );
      await expect(
        adapter.searchNearby(11.5516, 104.9247),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    new Response("provider private details", { status: 403 }),
    new Response('{"places":{}}'),
    new Response("not json"),
  ])(
    "returns a safe unavailable error for provider failures without exposing response details",
    async (response) => {
      fetchMock.mockResolvedValue(response);
      await expect(adapter.searchNearby(11.5516, 104.9247)).rejects.toThrow(
        "Google place search is unavailable. Please try again later.",
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
});
