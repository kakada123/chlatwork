import { injectSpeedInsights } from "@vercel/speed-insights/nuxt/runtime";
import { filterPrepShareTelemetry } from "~/lib/prephub-sharing";
// Preserve the existing provider while excluding public-link capabilities from outgoing events.
export default defineNuxtPlugin(() => {
  injectSpeedInsights({ beforeSend: filterPrepShareTelemetry });
});
