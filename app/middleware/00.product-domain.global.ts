import { legacyPath, PRODUCTS, productForPath, productPath } from "~/lib/product-domains";

export default defineNuxtRouteMiddleware((to) => {
  const { context, config, product } = useProductDomain();
  if (context.kind === "unsupported") throw createError({ statusCode: 404, statusMessage: "This hostname is not configured" });
  if (!product) return;
  if (product === "games" && to.path === "/") return navigateTo({ path: PRODUCTS.games.home, query: to.query, hash: to.hash }, { redirectCode: 302 });
  const source = legacyPath(product, to.path);
  const owner = productForPath(source);
  const shared = /^\/(?:account|login|admin|bot)(?:\/|$)/.test(source) ||
    ["/privacy-policy", "/terms", "/cookies", "/disclaimer", "/contact", "/about"].includes(source);
  if (owner === product) {
    const target = productPath(product, source);
    if (target !== to.path) return navigateTo({ path: target, query: to.query, hash: to.hash }, { redirectCode: 302 });
  } else if (!shared && to.matched.length) {
    return navigateTo(`${config.mainOrigin}${to.fullPath}`, { external: true, redirectCode: 302 });
  }
});
