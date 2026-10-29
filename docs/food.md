# ChlatWork Food (ឆ្លាតវើក ហ្វូត)

Food discovery is available at `/food` and on the activated `food.chlatwork.com` product host.

## Restaurant discovery

`GooglePlacesProviderAdapter` calls Google Places API (New) Text Search from the API server. The adapter filters returned coordinates against the selected district/GPS radius because Google's location bias is not a strict boundary. Selecting a city, Phnom Penh area or address first resolves that location through Google, then searches around that center. A city outside Phnom Penh takes precedence over an old Phnom Penh area selection.

Only named, valid, operational food businesses are returned. Closed, malformed, duplicate and out-of-radius listings are excluded. Google IDs, coordinates, addresses, Maps links and third-party attributions are preserved. There is no OSM or curated-restaurant fallback: empty results remain empty, and an unavailable provider returns a safe error.

Normal discovery retains the existing rule-based ranking for meal, occasion, group size and distance. Google listings do not establish verified per-person menu prices. Restaurant cards and AI picks display unverified pricing; the user should confirm prices with the restaurant.

### Filters and more results

`GET /api/food/filters` provides the complete grouped option catalog: Who, Occasion, Meal Time, Budget Type/Range/Preferences, Location Discovery, Phnom Penh Areas, Cambodian Cities/Provinces, Vibe, Food Type, Cuisine, Restaurant Type, Dietary, Spice, Accessibility, Facilities, Operating Status, Service, Waiting Time, Weather, Payment, Food Preferences and Reviews. Unknown keys/values and malformed selections are rejected; multi-select categories allow up to eight choices each.

Selected labels inform Google text matching and Gemini. Supported single restaurant types, Open Now and minimum rating use provider filters. Facilities, dietary preferences, payment methods, deals, opening-late/24-hour preferences and similar text matches are discovery hints, not verified guarantees. Allergies require an explicit description and must still be confirmed with the restaurant. Meal windows are suggested discovery times, not business opening hours.

Near Me requests GPS and requires coordinates rather than silently falling back to the default district. A successful GPS update clears an earlier city/area/address anchor.

Numeric budgets default to a group total; Per Person multiplies by group size. Selecting a budget range replaces the numeric amount with that range's per-person upper bound. Fine Dining ($100+) and Flexible have no fixed ceiling. Gemini receives the normalized group total. Costs remain estimates and restaurant budget fit remains unverified.

Google returns up to 20 places per page. Desktop uses **Load more**; mobile uses an IntersectionObserver with a manual fallback when unsupported or after a failed page. Subsequent pages reuse the exact filters, resolved center and route polyline. IDs are deduplicated; stale responses cannot append to a different search, and failed pages do not retry automatically.

### Along My Route

This option computes a driving route with Google Routes API, then sends the encoded polyline to Places Search Along Route. Enter both origin and destination. It is disabled when `GOOGLE_ROUTES_API_KEY` is absent or a dummy placeholder; other discovery features remain available. Route results do not claim straight-line distances or detour/travel times. Pagination reuses the computed polyline instead of paying to recompute the route.

## Quick filters

Fourteen curated shortcuts fill the existing controls: after-work drinks, after-work date, budget drinks, street food/chill, solo lunch, student budget, office lunch, quick breakfast, café/work, family dinner, romantic dinner, rainy-day hotpot, vegetarian lunch and affordable cooking. The first six appear as compact Khmer/English cards; **More** reveals the rest. Active selection follows the editable criteria. Select a card, adjust group/budget as needed, then press Suggest or Pick for me.

Presets preserve location, dietary/allergy, food-exclusion and accessibility choices. They replace other stale discovery choices and reset a hidden minimum-rating threshold. Presets contain filter values only; actual restaurants and recipes continue to come from Google/Gemini.

## Public food menu catalog

The expandable **Food ideas** section sits above the live results. It reads the `food_menu_items` database table, shows actual matching counts, and supports Khmer/English search plus category, cuisine, meal-time and style filters. Results use 24-item keyset pages, desktop Load More and mobile infinite scrolling with manual retry after failures. Thai cuisine is excluded from the catalog contract, importer and supplied seed.

The supplied [standalone schema + 1,000-record seed](../database/seeds/2026-10-28-food-menu-catalog-1000.sql) is ready for manual review/execution. It also widens the earlier category constraint to include `FAST_FOOD`; `CREATE TABLE IF NOT EXISTS` alone does not update an existing check. If a previous import failed, clear its transaction with `ROLLBACK;` before running the corrected script. No database import is run automatically.

These are AI-assisted menu ideas with representative ingredients, separate from private generated recipe history. **Find nearby** explicitly calls the existing Google discovery flow; **Generate recipe** requests a fresh Gemini recipe and keeps current dietary/location constraints. Choosing a menu does not substitute static catalog data for a generated recipe.

See the [dataset/import guide](../data/food-menu-catalog/README.md) and [copyable ChatGPT batch prompt](prompts/food-menu-catalog-1000.md). New generated JSON can be validated and converted to SQL with `npm run food:catalog:prepare`; the tool checks all 1,000 records, duplicate normalized names/slugs, field bounds and excluded cuisine before creating a new SQL file.

## Saved AI recipes

Every validated Gemini recipe is persisted before the API returns success. Storage is checked before generation so a missing table does not incur a paid AI request. The `FoodAiRecipe` model stores an opaque saved ID, stable recipe ID, recipe JSON, timestamp and optional account owner using the existing PostgreSQL connection. Parameterized SQL supports the manually deployed table without depending on generated-client rollout timing.

Only allowlisted, revalidated recipe output is stored; raw prompts, search criteria, coordinates, route inputs and recent-name lists are excluded. Signed-in users can browse **My recipes** and reopen full details without another generation call. Each history/detail query requires authentication and includes the authenticated owner predicate. Anonymous recipes are stored without an owner and have no public browse endpoint; sign in before generating to retain private account history.

Optional Food authentication permits guests, rejects an invalid supplied session and lets the Nuxt authenticated proxy refresh it before paid work. The frontend resolves initial auth before discovery, clears current recipes/modals/private inputs on an account switch, rejects old in-flight results and scopes browser recent-name history to the account or guest session.

### Manual database rollout

1. Review and manually execute [`database/updates/2026-10-28-add-food-ai-recipes.sql`](../database/updates/2026-10-28-add-food-ai-recipes.sql) against the intended database. It creates the new table/index without modifying existing rows.
2. Deploy the API, then the frontend. No additional environment variable is required beyond the existing database and Gemini configuration.
3. Generate a recipe while signed in, then open My recipes and verify it remains after reloading. Database/provider integration must be checked in that deployment; local mocks/schema validation do not prove live persistence.

No database change is automatically executed by this feature. If storage is unavailable, recipe generation fails safely rather than claiming an unsaved success. Restaurant discovery continues separately.

## Google Maps display

The map panel uses Google's official Maps Embed API. Selecting a restaurant card loads that Google place ID in the frame. Before results are selected, the frame shows the selected district or GPS center. The map shows the selected restaurant rather than a custom overlay of every result.

If the browser Embed key is absent, a direct Google Maps link remains available. Directions use Google's `destination_place_id` as well as coordinates, and source links and provider attributions appear beside restaurant results. Leaflet, OpenStreetMap tiles and Overpass are no longer used.

## “Pick for me” with Gemini

The picker submits the current mode, meal, occasion, group size, total budget, cuisine/dish keyword and district/GPS location to `POST /api/food/pick`.

- Dine-out candidates come from the server's current Google search and ranking.
- Cook at Home requests one new full Khmer/English recipe at a time to reduce inference latency. The API still supports explicitly requested batches of up to three. A cook-at-home pick generates one recipe directly. Neither path chooses from the constant recipe catalog.
- Opening Cook at Home, resizing the window or selecting GPS does not generate a recipe. Generation requires the explicit Suggest/Generate, Pick for Me or catalog Generate recipe action. Desktop mode changes back to Dine Out can queue the requested restaurant search while an earlier request finishes; stale queued criteria cannot silently become a recipe request.
- Browser GPS permission is optional for district discovery. If it is denied, choose a district (or use the selected-area button), then submit the search. A manual district clears stale GPS/city/address/route filters while retaining dietary and radius preferences; it does not create a recipe or pretend to know the user's current coordinates. To use actual GPS, allow Location in the site's browser permissions.
- `FoodAiPickerService` reuses `AI_ENABLED`, `GEMINI_API_KEY` and `GEMINI_TEXT_MODEL`. Short restaurant picks use `AI_PROVIDER_TIMEOUT_MS`; full recipes have an independent `FOOD_AI_RECIPE_TIMEOUT_MS`. Food deliberately uses Gemini as requested, independently of the Creator/Telegram `AI_USE_GEMINI` provider switch.
- For dining, Gemini receives bounded candidate facts and selects one existing ID with a short Khmer explanation. Candidate IDs are constrained in the JSON schema and checked again on the server.
- Generated recipes include ingredients/quantities, cooking steps, servings, prep/cook times and estimated total ingredient costs. Structured output is validated for bounded fields, valid metadata, exact servings, selected meal/occasion, budget ceiling and recent-name duplication. Invalid/incomplete or repeated-only output returns an error without a catalog fallback.
- Gemini cannot invent restaurant records or overwrite restaurant prices/locations. Prompts prohibit unsupported pricing and dietary guarantees. Recipes and explanations are generated suggestions; costs and dietary suitability require confirmation.
- Frontend retries and SDK retries are disabled, and a second click cannot start a concurrent picker request. Recipe generation alone can recover once from a confirmed upstream deadline as described below. Failures never become a hardcoded recipe success.

The browser remembers the last 40 restaurant IDs and 40 recipe names in account-scoped session storage, shared across searches and reloads in that tab. Only IDs/names are stored, not locations, routes, allergies or full provider content. Recent restaurants are excluded before ranking/selection; generated names are normalized before duplicate checks. Current visible place IDs are also excluded when loading/picking. **Reset recent choices** explicitly allows previous choices again; it does not delete saved database recipes. This bounds recent repetition, not semantic duplicates forever or across devices.

### Recipe generation failures

Recipe warnings log a fixed `stage` and `reason`, numeric `providerStatus` when supplied, allowlisted `finishReason`/`blockReason`, and a fixed `validationField` when validation rejects output. Request size, sanitized model names and elapsed milliseconds aid latency diagnosis. Logs never include prompts, generated text, recent names, provider messages, keys or internal Google infrastructure identifiers.

| Reason | Meaning / next check |
| --- | --- |
| `TIMEOUT` | Client/network timeout or Google's upstream `DEADLINE_EXCEEDED`, including a deadline wrapped in HTTP 500. The public response says generation timed out. A larger local timeout cannot fix Google's own inference deadline. |
| `RATE_LIMITED` | HTTP 429; check the Gemini project's rate/quota limits. |
| `AUTHENTICATION_FAILED` / `PERMISSION_DENIED` | HTTP 401/403; check the API server's Gemini key/project access privately. |
| `MODEL_OR_RESOURCE_NOT_FOUND` | HTTP 404; verify the configured model is available to that key. |
| `INVALID_REQUEST` | HTTP 400; inspect model/request compatibility. |
| `PROVIDER_UNAVAILABLE` / `NETWORK_ERROR` / `PROVIDER_ERROR` | Provider/network failure; an unknown error remains unknown rather than exposing raw details. |
| `OUTPUT_LIMIT` / `BLOCKED` / `EMPTY_RESPONSE` / `INCOMPLETE_RESPONSE` | Generation ended without a usable complete response; see the safe finish/block category. |
| `INVALID_JSON` | Completed output was not parseable JSON. |
| `INVALID_*` / `*_MISMATCH` / `OVER_BUDGET` | Output failed local validation; `validationField` identifies the rejected field without its value. |
| `REPEATED_ONLY` | All valid generated choices repeated recent names. |

Upstream deadlines are external provider failures; requesting one concise recipe reduces the work but does not guarantee provider availability. Full recipes have a separate **25-second per-attempt timeout**, avoiding the shorter timeout used for simple text picks. `FOOD_AI_RECIPE_TIMEOUT_MS` can override this up to 45 seconds. Both attempts and the wait share a **55-second budget**. Nuxt's shared Vercel function is explicitly configured for 60 seconds so the proxy can wait for bounded generation and persistence; deploy the frontend configuration as well as the API.

Recipe generation permits **one recovery attempt** only for Google's explicit `DEADLINE_EXCEEDED` or HTTP 504. It waits 1–1.25 seconds with jitter, then uses `FOOD_GEMINI_RECIPE_FALLBACK_MODEL` (default `gemini-3.1-flash-lite`, or `gemini-3.5-flash-lite` when the primary is already 3.1). This avoids automatically targeting the same failing model deployment. Complete criteria, recent exclusions, requested count, schema and validation remain identical. Recovery starts only if at least ten seconds remain after the wait, and its timeout is clamped to the remaining budget. Logs identify the model and attempt without raw provider details.

This can issue one extra billable Gemini request with the same existing key. Local SDK aborts/timeouts, authentication/quota errors, generic provider errors, blocked/truncated output, invalid JSON, invalid recipes and repeated-only results are not retried. A second provider failure stops safely. There is no static recipe fallback, and validated generated recipes still follow the existing database-save path. The recovery model must be enabled for the project's key. See Google's [stable 3.1 Flash-Lite model](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite), [API error reference](https://ai.google.dev/gemini-api/docs/api-errors) and [bounded backoff guidance](https://ai.google.dev/gemini-api/docs/troubleshooting).

## Configuration

Use only placeholders in example files. Configure real values separately in the appropriate hosting environment; never expose server keys through `NUXT_PUBLIC_*`.

| Setting | Location | Purpose |
| --- | --- | --- |
| `GOOGLE_PLACES_API_KEY` | API server | Server-only key with Places API (New) enabled and API restrictions. Use compatible server application restrictions where infrastructure permits. |
| `NUXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` | Nuxt/Vercel | Separate browser key restricted to Maps Embed API and the exact frontend website referrers. This key is intentionally public. |
| `GOOGLE_ROUTES_API_KEY` | API server, optional | Separate server-only Google Cloud key restricted to Routes API. Enables Along My Route; never expose it through Nuxt public settings. |
| `AI_ENABLED=true` | API server | Existing global AI switch; disabled AI makes the picker unavailable. |
| `GEMINI_API_KEY` | API server | Existing Gemini key; no additional Food AI key. |
| `GEMINI_TEXT_MODEL` | API server | Existing configured Gemini text model. |
| `AI_PROVIDER_TIMEOUT_MS` | API server | Existing short restaurant-picker timeout, capped at 30 seconds. |
| `FOOD_AI_RECIPE_TIMEOUT_MS` | API server, optional | Recipe per-attempt timeout, default 25000 ms, capped at 45000 ms and the remaining 55-second total budget. Invalid/nonpositive values use the default. |
| `FOOD_GEMINI_RECIPE_FALLBACK_MODEL` | API server, optional | Alternate Gemini recipe model after one confirmed upstream deadline; default `gemini-3.1-flash-lite`, or 3.5 when primary is already 3.1. |

To create the browser key in Google Cloud Console:

1. Select the intended project and enable **Maps Embed API** under **APIs & Services → Library**.
2. Open **Credentials → Create credentials → API key**.
3. Set **Application restrictions → Websites**, with `https://food.chlatwork.com/*` and `https://chlatwork.com/*`. Add development origins only if needed.
4. Set **API restrictions → Restrict key → Maps Embed API**, then save.
5. Save the key as `NUXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` in Vercel Production and redeploy. Create a separate Places key for the API server; website restrictions are unsuitable for server-to-server Places requests.

Enable billing and the required Google APIs in the associated project. Places and Gemini requests may incur provider charges; Maps Embed requests are documented as free. Google place content is not persisted. Validated Gemini recipe output is saved as described above; bounded browser history stores only IDs/names. The existing application-wide throttler remains at 60 requests per minute per tracker. Behind the frontend proxy its IP tracker can be shared by visitors; this is not a per-user quota. No new tight shared cap is introduced. Paid and private-history responses are `no-store`.

For the route key: enable **Routes API** in Google Cloud, create an API key under **APIs & Services → Credentials**, and restrict its API access to **Routes API**. Apply a compatible server application restriction (stable outbound IP when available), not website referrers. Set the real key only in the API hosting environment and restart/redeploy the API. `dummy_google_routes_key` is an example placeholder, not a usable key. Routes requests may also incur Google charges.

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
| `POST /api/food/recommend` | Ranked Google places with pagination, or newly generated Gemini recipes. |
| `POST /api/food/pick` | Gemini selects a real restaurant or generates one full recipe using the full criteria. |
| `GET /api/food/random` | Legacy picker URL, now using Gemini and validated query criteria. |
| `GET /api/food/recipes` | Legacy static catalog for compatibility; discovery and picking do not call it. |
| `GET /api/food/recipes/:id` | Legacy catalog details; generated recipe details arrive in recommendation/pick responses. |
| `GET /api/food/districts` | Existing Phnom Penh district centers. |
| `GET /api/food/filters` | Valid grouped filter options and route availability. |
| `GET /api/food/menu-catalog` | Public database catalog with search/filters and a bounded slug cursor. |
| `GET /api/food/saved-recipes` | Authenticated account history, 20 per page with an opaque cursor. |
| `GET /api/food/saved-recipes/:id` | Authenticated owner-only saved recipe lookup by UUID. |

```bash
curl -X POST http://localhost:3001/api/food/pick \
  -H 'Content-Type: application/json' \
  -d '{"mode":"dine-out","mealTime":"dinner","occasion":"family","peopleCount":4,"totalBudget":20,"district":"bkk","cuisine":"គុយទាវ"}'
```

## Validation

Provider specs mock only Google/Gemini boundaries and never call paid services. Frontend tests exercise real composable behavior and official map URL builders. Test and compilation results are local evidence; live keys, billing, provider availability, browser rendering and deployed hostname assignment require separate verification after deployment.
