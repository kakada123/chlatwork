// Pure policy shared by the Nuxt router, server proxy, and deployment tests.
export const PRODUCTS = {
  creator: { name: "ChlatWork Creator", entry: "/creator", home: "/", host: "creator" },
  link: { name: "ChlatWork Link", entry: "/link", home: "/", host: "link" },
  moment: { name: "ChlatWork Moments", entry: "/moments/create", home: "/", host: "moment" },
  expense: { name: "Expense Tracker", entry: "/tools/expense-tracker", home: "/", host: "expense" },
  draw: { name: "Lucky Draw", entry: "/tools/lucky-draw", home: "/", host: "draw" },
  games: { name: "ChlatWork Games", entry: "/tools/kla-klok", home: "/kla-klok", host: "games" },
  jekluy: { name: "ចែកលុយ", entry: "/jekluy", home: "/", host: "jekluy" },
  food: { name: "ChlatWork Food", entry: "/food", home: "/", host: "food" },
} as const;

export type Product = keyof typeof PRODUCTS;
export type ProductListSetting =
  | "NUXT_PUBLIC_DOMAINS_ENABLED_PRODUCTS"
  | "NUXT_PUBLIC_DOMAINS_CANONICAL_PRODUCTS"
  | "NUXT_PUBLIC_DOMAINS_REDIRECT_PRODUCTS";
export type DomainConfigSetting = ProductListSetting | "NUXT_PUBLIC_DOMAINS_PREVIEW_ORIGINS";
type ProductListValue = string | readonly string[];
export interface DomainOptions {
  mainOrigin?: string;
  productOrigins?: string | Record<string, string>;
  enabledProducts?: ProductListValue;
  canonicalProducts?: ProductListValue;
  redirectProducts?: ProductListValue;
  previewOrigins?: string | readonly string[];
}
export interface DomainConfig {
  mainOrigin: string;
  origins: Record<Product | "tools" | "payback", string>;
  enabled: Product[];
  canonical: Product[];
  redirects: Product[];
  previews: string[];
}

function origin(value: string) {
  const url = new URL(value);
  if (
    !["https:", "http:"].includes(url.protocol) || url.username || url.password || url.hostname.includes("*") ||
    url.pathname !== "/" || url.search || url.hash ||
    (url.protocol !== "https:" && !/^(localhost|[a-z0-9-]+\.localhost|127\.0\.0\.1)$/.test(url.hostname))
  ) throw new Error("Domain destinations must be HTTPS origins (HTTP is allowed only on localhost)");
  return url.origin;
}

function products(value: unknown, setting: ProductListSetting, reportInvalid?: (setting: ProductListSetting) => void): Product[] {
  if (value === undefined || value === "") return [];
  const entries: unknown[] | undefined = typeof value === "string" ? value.split(",") : Array.isArray(value) ? value : undefined;
  if (!entries || entries.some((entry) => typeof entry !== "string")) {
    reportInvalid?.(setting);
    return [];
  }
  const names = (entries as string[]).map((item) => item.trim()).filter(Boolean);
  if (names.some((name) => !Object.hasOwn(PRODUCTS, name))) {
    // Reject the entire stage: a typo must neither partially activate migration nor break API/webhook requests.
    reportInvalid?.(setting);
    return [];
  }
  return [...new Set(names)] as Product[];
}

function previewOrigins(value: unknown, reportInvalid?: (setting: DomainConfigSetting) => void): string[] {
  if (value === undefined || value === "") return [];
  const entries: unknown[] | undefined = typeof value === "string" ? value.split(",") : Array.isArray(value) ? value : undefined;
  if (entries && entries.every((entry) => typeof entry === "string")) {
    try {
      return [...new Set((entries as string[]).map((entry) => entry.trim()).filter(Boolean).map(origin))];
    } catch {
      // Optional preview aliases must fail closed without breaking production requests or error rendering.
    }
  }
  reportInvalid?.("NUXT_PUBLIC_DOMAINS_PREVIEW_ORIGINS");
  return [];
}

export function createDomainConfig(options: DomainOptions = {}, reportInvalid?: (setting: DomainConfigSetting) => void): DomainConfig {
  const mainOrigin = origin(options.mainOrigin || "https://chlatwork.com");
  // Nitro may deserialize JSON environment overrides before passing runtimeConfig to the app.
  const overrides = (typeof options.productOrigins === "string" ? JSON.parse(options.productOrigins || "{}") : options.productOrigins || {}) as Record<string, unknown>;
  if (!overrides || Array.isArray(overrides) || typeof overrides !== "object") throw new Error("Invalid product origins");
  if (Object.entries(overrides).some(([key, value]) => ![...Object.keys(PRODUCTS), "tools", "payback"].includes(key) || typeof value !== "string")) throw new Error("Unknown or invalid product origin override");
  const origins = Object.fromEntries(
    [...Object.keys(PRODUCTS), "tools", "payback"].map((key) => [key, origin(
      typeof overrides[key] === "string" ? overrides[key] : `https://${key}.chlatwork.com`,
    )]),
  ) as DomainConfig["origins"];
  // A host identifies exactly one app; ambiguous destinations must fail closed.
  const hosts = [mainOrigin, ...Object.values(origins)].map((value) => new URL(value).host);
  if (new Set(hosts).size !== hosts.length) throw new Error("Product origins must have distinct hosts");
  const enabled = products(options.enabledProducts, "NUXT_PUBLIC_DOMAINS_ENABLED_PRODUCTS", reportInvalid);
  const canonical = products(options.canonicalProducts, "NUXT_PUBLIC_DOMAINS_CANONICAL_PRODUCTS", reportInvalid).filter((product) => enabled.includes(product));
  return {
    mainOrigin, origins, enabled, canonical,
    redirects: products(options.redirectProducts, "NUXT_PUBLIC_DOMAINS_REDIRECT_PRODUCTS", reportInvalid).filter((product) => canonical.includes(product) && product !== "draw"),
    previews: previewOrigins(options.previewOrigins, reportInvalid),
  };
}

export function resolveHost(host: string, config: DomainConfig): { kind: "main" | "preview" | "product" | "unsupported"; product?: Product } {
  const normalized = host.toLowerCase();
  if (normalized === new URL(config.mainOrigin).host || (config.mainOrigin === "https://chlatwork.com" && normalized === "www.chlatwork.com")) return { kind: "main" };
  const product = config.enabled.find((name) => new URL(config.origins[name]).host === normalized);
  if (product) return { kind: "product", product };
  if (config.previews.some((value) => new URL(value).host === normalized)) return { kind: "preview" };
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) return { kind: "main" };
  return { kind: "unsupported" };
}

function pathname(path: string) {
  return path.split(/[?#]/, 1)[0]!.replace(/\/+$/, "") || "/";
}

export function productForPath(path: string): Product | null {
  const value = pathname(path);
  if (/^\/creator(?:\/|$)/.test(value)) return "creator";
  if (/^\/(?:link(?:\/|$)|u\/|account\/link(?:\/|$))/.test(value)) return "link";
  if (/^\/(?:moments(?:\/|$)|moment\/|m\/|i\/)/.test(value)) return "moment";
  if (/^\/food(?:\/|$)/.test(value)) return "food";
  return (Object.keys(PRODUCTS) as Product[]).find((product) => PRODUCTS[product].entry === value) || null;
}

export function productPath(product: Product, path: string) {
  const entry = PRODUCTS[product];
  const value = pathname(path);
  return value === entry.entry ? entry.home : value;
}

export function legacyPath(product: Product | undefined, path: string) {
  if (!product) return pathname(path);
  return pathname(path) === PRODUCTS[product].home || (product === "games" && pathname(path) === "/")
    ? PRODUCTS[product].entry : pathname(path);
}

export function destinationUrl(path: string, config: DomainConfig) {
  const product = productForPath(path);
  const url = new URL(path, config.mainOrigin);
  if (product && config.canonical.includes(product)) {
    return `${config.origins[product]}${productPath(product, url.pathname)}${url.search}${url.hash}`;
  }
  return `${config.mainOrigin}${url.pathname}${url.search}${url.hash}`;
}

export function canonicalUrl(path: string, config: DomainConfig) {
  const url = new URL(destinationUrl(path, config));
  const language = productForPath(path) === "moment" && url.searchParams.get("lang") === "km";
  url.search = language ? "?lang=km" : "";
  url.hash = "";
  return url.href;
}

export function legacyRedirect(path: string, config: DomainConfig) {
  const product = productForPath(path);
  return product && config.redirects.includes(product) ? destinationUrl(path, config) : null;
}

export function navigationUrl(path: string, config: DomainConfig, currentProduct?: Product) {
  const owner = productForPath(path);
  if (currentProduct && owner === currentProduct) {
    const url = new URL(path, config.mainOrigin);
    return `${productPath(currentProduct, url.pathname)}${url.search}${url.hash}`;
  }
  return owner && config.canonical.includes(owner) ? destinationUrl(path, config) : path;
}

export function safeReturnPath(value: unknown, fallback = "/account") {
  return typeof value === "string" && value.startsWith("/") &&
    !/^[\/\\]{2}|[\\\u0000-\u0020\u007f]/.test(value) ? value : fallback;
}

export function isSameOriginMutation(expected: string, supplied?: string, fetchSite?: string) {
  if (supplied) return supplied === expected;
  // Non-browser callers and provider webhooks have no Origin; their existing authentication still applies.
  return fetchSite !== "cross-site" && fetchSite !== "same-site";
}

export function productRouteRecords<T extends { path: string; name?: unknown; alias?: unknown; meta?: Record<string, unknown> }>(routes: readonly T[], product: Product): T[] {
  const entry = PRODUCTS[product];
  return routes.filter((route) => route.path !== "/").map((route) => {
    if (route.path !== entry.entry) return route;
    return {
      ...route,
      path: entry.home,
      alias: [route.path, ...(Array.isArray(route.alias) ? route.alias : route.alias ? [route.alias] : [])],
      meta: { ...route.meta, productLegacyPath: route.path },
    };
  });
}
