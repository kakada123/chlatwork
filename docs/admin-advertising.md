# Website advertising switch

Sign in as an admin and open **Admin → Manage tools & ads** (`/admin/tools`). Under **Website advertising**, turn **Show website ads** off. The switch saves automatically. Turn it on again to restore normal ad eligibility.

The setting covers banner ads, desktop sidebars, native tool-page ads and sponsored links across all products using this API. Existing Kakada, public Link page and blank-canvas exclusions still apply when advertising is enabled. Disabled ads also release the app shell's reserved ad columns.

The authenticated admin API stores the setting as `ads:sitewide` in the existing `feature_availability` table and records the updating admin and timestamp. A missing row keeps the existing enabled default; saving creates the row. No schema migration or new environment variable is required. Both the API and frontend changes must be deployed for the control to be available.

Ads wait until authentication and the public availability snapshot have resolved. An unknown initial policy does not load provider content. The public snapshot contains disabled feature keys only; changing a setting remains protected by the existing JWT and admin guards.

Visible pages recheck availability once a minute and when the tab/window becomes active, with a short throttle for duplicate browser events. Hidden tabs do not poll. Local-only pages do not add availability reads or wait for the backend. Normal navigation also uses the existing availability refresh.

When an eligible open page learns ads are disabled, the app removes the ad placements and reloads once to clear third-party content or listeners injected outside Vue. This can reset unsaved page inputs. A page that loads with ads already disabled does not enter a reload loop. Failed admin saves restore the switch's persisted value; a confirmed saved disable is applied locally before the public snapshot is refreshed.

Validation is local: `tests/ad-settings.test.ts`, existing ad/navigation tests, API feature-availability tests, TypeScript and the dotenv-disabled production build. No live database setting or provider delivery was changed during implementation.
