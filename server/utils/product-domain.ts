import { createError, getRequestHost, type H3Event } from "h3";
import { createDomainConfig, PRODUCTS, resolveHost, type DomainConfigSetting } from "../../app/lib/product-domains";

const reportedInvalidSettings = new Set<DomainConfigSetting>();

function reportInvalidDomainSetting(setting: DomainConfigSetting) {
  if (reportedInvalidSettings.has(setting)) return;
  reportedInvalidSettings.add(setting);
  // Report only the setting name, once per process; never log runtime values or flood webhook retries.
  const guidance = setting === "NUXT_PUBLIC_DOMAINS_PREVIEW_ORIGINS"
    ? "additional preview hosts are disabled. Use comma-separated exact HTTPS origins, or leave the variable unset."
    : `this migration stage is disabled. Use comma-separated product names: ${Object.keys(PRODUCTS).join(",")}.`;
  console.warn(`[chlatwork:domains] Invalid ${setting}; ${guidance}`);
}

export function requestDomain(event: H3Event) {
  const config = createDomainConfig(useRuntimeConfig(event).public.domains, reportInvalidDomainSetting);
  const host = getRequestHost(event, { xForwardedHost: false });
  const context = resolveHost(host, config);
  return { config, context, host };
}

export function trustedRequestOrigin(event: H3Event) {
  const { config, context, host } = requestDomain(event);
  if (context.kind === "unsupported") throw createError({ statusCode: 400, statusMessage: "Unconfigured request host" });
  if (context.product) return config.origins[context.product];
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `http://${host}`;
  if (context.kind === "preview") return config.previews.find((value) => new URL(value).host === host)!;
  // Preserve www's host-only flow cookies if that alias is used before its infrastructure redirect.
  return new URL(config.mainOrigin).host === host ? config.mainOrigin : `https://${host}`;
}
