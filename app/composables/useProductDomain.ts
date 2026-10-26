import { canonicalUrl, createDomainConfig, destinationUrl, legacyPath, navigationUrl, resolveHost } from "~/lib/product-domains";

export function useProductDomain() {
  const config = createDomainConfig(useRuntimeConfig().public.domains);
  const host = useRequestURL().host;
  const context = resolveHost(host, config);
  const route = useRoute();
  const sourcePath = computed(() => legacyPath(context.product, route.path));
  const canonical = computed(() => canonicalUrl(`${sourcePath.value}${route.query.lang === "km" ? "?lang=km" : ""}`, config));
  return { config, context, product: context.product, sourcePath, canonical, destination: (path: string) => destinationUrl(path, config), linkTo: (path: string) => navigationUrl(path, config, context.product) };
}
