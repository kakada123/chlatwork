import { destinationUrl, productForPath, type DomainConfig, type resolveHost } from "./product-domains.ts";

type DomainContext = ReturnType<typeof resolveHost>;

export function sitemapUrls(paths: string[], config: DomainConfig, context: DomainContext) {
  if (context.kind === "preview" || context.kind === "unsupported") return [];
  if (context.product && !config.canonical.includes(context.product)) return [];
  return [...new Set(paths.filter((path) => {
    const product = productForPath(path);
    return context.product ? product === context.product : !product || !config.canonical.includes(product);
  }).map((path) => destinationUrl(path, config)))];
}

export function robotsText(config: DomainConfig, context: DomainContext) {
  if (context.kind === "preview" || context.kind === "unsupported" || (context.product && !config.canonical.includes(context.product))) {
    return "User-agent: *\nDisallow: /\n";
  }
  const origin = context.product ? config.origins[context.product] : config.mainOrigin;
  // Shared pages/media must remain crawlable for OG previews and page-level noindex to be read.
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}

export function sitemapXml(urls: string[]) {
  const escape = (value: string) => value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!);
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${escape(url)}</loc></url>`).join("")}</urlset>`;
}
