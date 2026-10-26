import { createError, getHeader, getRequestURL, send, sendRedirect, setHeader, setResponseStatus } from "h3";
import { isSameOriginMutation, legacyRedirect } from "../../app/lib/product-domains";
import { requestDomain, trustedRequestOrigin } from "../utils/product-domain";
import { robotsText, sitemapUrls, sitemapXml } from "../../app/lib/product-seo";
import { PUBLIC_SITEMAP_PATHS } from "../../app/data/site-routes";

export default defineEventHandler((event) => {
  const { config, context, host } = requestDomain(event);
  const path = getRequestURL(event).pathname;
  if (context.kind === "unsupported") {
    // Throwing here also rejects Nuxt's internal error render, turning a 404 into a visible 500 page.
    // Finish the response without rendering the app; unknown hosts and forged error headers stay blocked.
    const message = "This hostname is not configured";
    setResponseStatus(event, 404, "Not Found");
    setHeader(event, "X-Robots-Tag", "noindex, nofollow");
    setHeader(event, "Cache-Control", "no-store");
    if (path.startsWith("/api/")) {
      setHeader(event, "Content-Type", "application/json; charset=utf-8");
      return send(event, JSON.stringify({ statusCode: 404, statusMessage: message, message }));
    }
    setHeader(event, "Content-Type", "text/html; charset=utf-8");
    return send(event, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>404 - ChlatWork</title></head><body><main><h1>404</h1><h2>${message}</h2><p>Check the product domain and activation settings.</p><a href="${config.mainOrigin}">ChlatWork homepage</a></main></body></html>`);
  }
  // Generate per request: a static deployment-wide sitemap would leak the main site's routes onto every product host.
  if (path === "/sitemap.xml") {
    setHeader(event, "Content-Type", "application/xml; charset=utf-8");
    setHeader(event, "Cache-Control", "no-store");
    return send(event, sitemapXml(sitemapUrls(PUBLIC_SITEMAP_PATHS, config, context)));
  }
  if (path === "/robots.txt") {
    setHeader(event, "Content-Type", "text/plain; charset=utf-8");
    setHeader(event, "Cache-Control", "no-store");
    return send(event, robotsText(config, context));
  }
  if (context.kind === "preview" || (context.product && !config.canonical.includes(context.product)) || /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) {
    setHeader(event, "X-Robots-Tag", "noindex, nofollow");
  }
  if (path.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(event.method)) {
    if (!isSameOriginMutation(trustedRequestOrigin(event), getHeader(event, "origin"), getHeader(event, "sec-fetch-site"))) {
      throw createError({ statusCode: 403, statusMessage: "Cross-origin requests are not allowed" });
    }
  }
  // Redirect only safe document requests, after deployment and canonical activation are explicitly configured.
  if (context.kind === "main" && ["GET", "HEAD"].includes(event.method)) {
    const target = legacyRedirect(event.path, config);
    if (target) return sendRedirect(event, target, 308);
  }
});
