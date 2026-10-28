# ChlatWork Food (ឆ្លាតវើក ហ្វូត)

Food discovery is available at `/food` and on the activated `food.chlatwork.com` product host.

## Restaurant discovery

`GooglePlacesProviderAdapter` calls Google Places API (New) from the API server. A nearby request searches restaurants, cafés, fast food and food courts within the selected district or GPS radius. A Khmer/English dish or cuisine keyword uses Text Search with the same location context; the adapter also filters returned coordinates against the requested radius because Google's text-search location bias is not a strict boundary.

Only named, valid, operational food businesses are returned. Closed, malformed, duplicate and out-of-radius listings are excluded. Google IDs, coordinates, addresses, Maps links and third-party attributions are preserved. There is no OSM or curated-restaurant fallback: empty results remain empty, and an unavailable provider returns a safe error.

Normal discovery retains the existing rule-based ranking for meal, occasion, group size and distance. Google listings do not establish verified per-person menu prices. Restaurant cards and AI picks display unverified pricing; the user should confirm prices with the restaurant. The local Khmer recipe catalog remains available without a Places key.

## Google Maps display

The map panel uses Google's official Maps Embed API. Selecting a restaurant card loads that Google place ID in the frame. Before results are selected, the frame shows the selected district or GPS center. The map shows the selected restaurant rather than a custom overlay of every result.

If the browser Embed key is absent, a direct Google Maps link remains available. Directions use Google's `destination_place_id` as well as coordinates, and source links and provider attributions appear beside restaurant results. Leaflet, OpenStreetMap tiles and Overpass are no longer used.

## “Pick for me” with Gemini

The picker submits the current mode, meal, occasion, group size, total budget, cuisine/dish keyword and district/GPS location to `POST /api/food/pick`.

- Dine-out candidates come from the server's current Google search and ranking.
- Cook-at-home candidates come from the existing recipe catalog, filtered by meal and keyword and ranked using the existing occasion/budget rules.
- `FoodAiPickerService` reuses `AI_ENABLED`, `GEMINI_API_KEY`, `GEMINI_TEXT_MODEL` and `AI_PROVIDER_TIMEOUT_MS`. Food deliberately uses Gemini as requested, independently of the Creator/Telegram `AI_USE_GEMINI` provider switch.
- Gemini receives bounded candidate facts and selects one existing ID with a short Khmer explanation. Candidate IDs are constrained in the JSON schema and checked again on the server. Incomplete output, unknown IDs, invalid JSON and unavailable AI return a safe error.
- The model cannot create restaurant or recipe records or overwrite their prices or locations. The prompt prohibits unsupported pricing and dietary claims. Model explanations remain generated suggestions and are not a guarantee about the business.
- Requests use one provider attempt, frontend retries are disabled, and a second click cannot start a concurrent picker request. Failures never become a hardcoded recipe success.

## Configuration

Use only placeholders in example files. Configure real values separately in the appropriate hosting environment; never expose server keys through `NUXT_PUBLIC_*`.

| Setting | Location | Purpose |
| --- | --- | --- |
| `GOOGLE_PLACES_API_KEY` | API server | Server-only key with Places API (New) enabled and API restrictions. Use compatible server application restrictions where infrastructure permits. |
| `NUXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` | Nuxt/Vercel | Separate browser key restricted to Maps Embed API and the exact frontend website referrers. This key is intentionally public. |
| `AI_ENABLED=true` | API server | Existing global AI switch; disabled AI makes the picker unavailable. |
| `GEMINI_API_KEY` | API server | Existing Gemini key; no additional Food AI key. |
| `GEMINI_TEXT_MODEL` | API server | Existing configured Gemini text model. |
| `AI_PROVIDER_TIMEOUT_MS` | API server | Existing provider timeout, capped at 30 seconds for Food. |

To create the browser key in Google Cloud Console:

1. Select the intended project and enable **Maps Embed API** under **APIs & Services → Library**.
2. Open **Credentials → Create credentials → API key**.
3. Set **Application restrictions → Websites**, with `https://food.chlatwork.com/*` and `https://chlatwork.com/*`. Add development origins only if needed.
4. Set **API restrictions → Restrict key → Maps Embed API**, then save.
5. Save the key as `NUXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` in Vercel Production and redeploy. Create a separate Places key for the API server; website restrictions are unsuitable for server-to-server Places requests.

Enable billing and the required Google APIs in the associated project. Places and Gemini requests may incur provider charges; Maps Embed requests are documented as free. No provider content is cached or persisted by this feature. The existing application-wide throttler remains at 60 requests per minute per tracker. Behind the frontend proxy its IP tracker can be shared by visitors; this is not a per-user quota. No new tight shared cap is introduced. Paid responses are `no-store`.

Redeploy the API after configuring its settings and redeploy the frontend after configuring the Embed key. Keep the existing product-domain activation settings; append `food` to the current enabled list rather than replacing other products. Canonical and permanent-redirect activation remain separate rollout choices. This change does not alter DNS or deployment settings automatically.

References: [Places setup](https://developers.google.com/maps/documentation/places/web-service/get-api-key), [Places attribution](https://developers.google.com/maps/documentation/places/web-service/policies), [Maps Embed](https://developers.google.com/maps/documentation/embed/get-started).

### Google Places 403 troubleshooting

The backend uses `GOOGLE_PLACES_API_KEY`; the browser Embed key does not grant restaurant-search access. In the key's Google Cloud project, enable **Places API (New)**, confirm billing is active, and allow Places API (New) in the key's API restrictions. Website/referrer restrictions are unsuitable for this server-to-server Places call. Use the API server's stable outbound IP for an IP restriction when available. If the hosting has no stable outbound IP, an application-unrestricted server-only key must still be API-restricted to Places API (New); do not copy it into public frontend settings.

The adapter logs `providerStatus` plus an allowlisted `providerReason` from Google's structured ErrorInfo. Some Google responses contain only `error.message`; known message wording is mapped to the fixed categories below without logging that text. Structured reasons take priority over message classification. These categories aid diagnosis and do not verify the project's live settings:

| Reason | Check |
| --- | --- |
| `SERVICE_DISABLED` | Enable Places API (New) in the key's project. |
| `API_KEY_SERVICE_BLOCKED` | Allow Places API (New) in the key's API restrictions. |
| `API_KEY_HTTP_REFERRER_BLOCKED` | The backend key is restricted to websites; configure a separate server key. |
| `API_KEY_IP_ADDRESS_BLOCKED` | The allowed IP must match the server's actual outbound IP. |
| `BILLING_DISABLED` | Enable or restore billing for that project. |
| `API_KEY_INVALID` / `API_KEY_EXPIRED` | Check the server deployment's key configuration privately. |
| `API_PROJECT_NOT_AUTHORIZED` | Google supplied a generic project-authorization rejection; check API restrictions, project access and billing. This wording alone does not distinguish those causes. |
| `UNKNOWN` | Google supplied no recognized structured reason; the status alone cannot identify the cause. |

Raw errors, keys, coordinates and project metadata are never logged. This diagnostic improvement does not itself change Google Cloud permissions or resolve a rejected key. Redeploy the API for new logs; if a server environment value changes, redeploy/restart that API service so it uses the updated configuration.

## API endpoints

All paths below use the Nuxt proxy; the API server exposes the same paths without `/api`.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/food/search` | Google search with `lat`, `lng`, `radius`, `cuisine`, `district`. |
| `POST /api/food/recommend` | Existing ranked restaurant/recipe discovery. |
| `POST /api/food/pick` | Gemini selects one candidate using the full recommendation criteria. |
| `GET /api/food/random` | Legacy picker URL, now using Gemini and validated query criteria. |
| `GET /api/food/recipes` | Existing recipe list with optional category/meal filters. |
| `GET /api/food/recipes/:id` | Existing full recipe details. |
| `GET /api/food/districts` | Existing Phnom Penh district centers. |

```bash
curl -X POST http://localhost:3001/api/food/pick \
  -H 'Content-Type: application/json' \
  -d '{"mode":"dine-out","mealTime":"dinner","occasion":"family","peopleCount":4,"totalBudget":20,"district":"bkk","cuisine":"គុយទាវ"}'
```

## Validation

Provider specs mock only Google/Gemini boundaries and never call paid services. Frontend tests exercise real composable behavior and official map URL builders. Test and compilation results are local evidence; live keys, billing, provider availability, browser rendering and deployed hostname assignment require separate verification after deployment.
