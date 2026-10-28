import { Logger, ServiceUnavailableException } from "@nestjs/common";
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

  it.each([
    "API_KEY_HTTP_REFERRER_BLOCKED",
    "API_KEY_IP_ADDRESS_BLOCKED",
    "API_KEY_SERVICE_BLOCKED",
    "API_KEY_INVALID",
    "SERVICE_DISABLED",
    "BILLING_DISABLED",
  ])("logs only a recognized Google rejection code (%s)", async (reason) => {
    const warning = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 403,
            status: "PERMISSION_DENIED",
            message: "private provider text test_places_key",
            details: [
              {
                "@type": "type.googleapis.com/google.rpc.ErrorInfo",
                domain: "googleapis.com",
                reason,
                metadata: {
                  key: "private_api_key",
                  location: "private_location",
                },
              },
            ],
          },
        }),
        { status: 403 },
      ),
    );
    try {
      await expect(
        adapter.searchNearby(11.5516, 104.9247),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(warning).toHaveBeenCalledWith({
        message: "Google Places search failed",
        providerStatus: 403,
        providerReason: reason,
      });
      expect(JSON.stringify(warning.mock.calls)).not.toMatch(
        /private_|test_places_key|11\.5516|104\.9247/,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      warning.mockRestore();
    }
  });

  it.each([
    {
      "@type": "type.googleapis.com/google.rpc.ErrorInfo",
      domain: "googleapis.com",
      reason: "private_unknown_reason",
    },
    {
      "@type": "type.googleapis.com/google.rpc.ErrorInfo",
      domain: "untrusted.example",
      reason: "SERVICE_DISABLED",
    },
    {
      "@type": "untrusted.error",
      domain: "googleapis.com",
      reason: "SERVICE_DISABLED",
    },
  ])(
    "does not log arbitrary provider fields as an error code",
    async (detail) => {
      const warning = jest.spyOn(Logger.prototype, "warn").mockImplementation();
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              message: "private provider message",
              details: [detail],
            },
          }),
          { status: 403 },
        ),
      );
      try {
        await expect(
          adapter.searchNearby(11.5516, 104.9247),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
        expect(warning).toHaveBeenCalledWith({
          message: "Google Places search failed",
          providerStatus: 403,
          providerReason: "UNKNOWN",
        });
      } finally {
        warning.mockRestore();
      }
    },
  );

  it.each([
    [
      "API keys cannot have referer restrictions when used with this API.",
      "API_KEY_HTTP_REFERRER_BLOCKED",
    ],
    [
      "API keys with referer restrictions cannot be used with this API.",
      "API_KEY_HTTP_REFERRER_BLOCKED",
    ],
    [
      "Requests from referer <empty> are blocked.",
      "API_KEY_HTTP_REFERRER_BLOCKED",
    ],
    [
      "Requests from this IP address 192.0.2.1 are blocked.",
      "API_KEY_IP_ADDRESS_BLOCKED",
    ],
    [
      "You must enable Billing on the Google Cloud Project.",
      "BILLING_DISABLED",
    ],
    ["Billing has not been enabled on this project.", "BILLING_DISABLED"],
    [
      "Places API has not been used in project 123456 before or it is disabled.",
      "SERVICE_DISABLED",
    ],
    ["API key not valid. Please pass a valid API key.", "API_KEY_INVALID"],
    [
      "This API project is not authorized to use this API.",
      "API_PROJECT_NOT_AUTHORIZED",
    ],
    ["private unrecognized error test_places_key", "UNKNOWN"],
  ])(
    "classifies message-only rejection without logging the message (%s)",
    async (message, reason) => {
      const warning = jest.spyOn(Logger.prototype, "warn").mockImplementation();
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 403,
              status: "PERMISSION_DENIED",
              message,
            },
          }),
          { status: 403 },
        ),
      );
      try {
        await expect(
          adapter.searchNearby(11.5516, 104.9247),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
        expect(warning).toHaveBeenCalledWith({
          message: "Google Places search failed",
          providerStatus: 403,
          providerReason: reason,
        });
        const logs = JSON.stringify(warning.mock.calls);
        expect(logs).not.toContain(message);
        expect(logs).not.toMatch(/test_places_key|192\.0\.2\.1|123456/);
        expect(fetchMock).toHaveBeenCalledTimes(1);
      } finally {
        warning.mockRestore();
      }
    },
  );

  it("prefers a recognized structured reason over fallback message wording", async () => {
    const warning = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            message: "You must enable Billing on the Google Cloud Project.",
            details: [
              {
                "@type": "type.googleapis.com/google.rpc.ErrorInfo",
                domain: "googleapis.com",
                reason: "API_KEY_SERVICE_BLOCKED",
              },
            ],
          },
        }),
        { status: 403 },
      ),
    );
    try {
      await expect(
        adapter.searchNearby(11.5516, 104.9247),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(warning).toHaveBeenCalledWith({
        message: "Google Places search failed",
        providerStatus: 403,
        providerReason: "API_KEY_SERVICE_BLOCKED",
      });
    } finally {
      warning.mockRestore();
    }
  });
});
