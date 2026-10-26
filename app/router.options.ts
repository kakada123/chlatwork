import type { RouterConfig } from "@nuxt/schema";
import { createDomainConfig, productRouteRecords, resolveHost } from "./lib/product-domains";

export default <RouterConfig>{
  routes: (routes) => {
    const config = createDomainConfig(useRuntimeConfig().public.domains);
    const { product } = resolveHost(useRequestURL().host, config);
    return product ? productRouteRecords(routes, product) : routes;
  },
};
