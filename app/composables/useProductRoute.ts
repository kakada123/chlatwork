import { legacyPath } from "~/lib/product-domains";

export function useProductRoute() {
  const route = useRoute();
  const { product } = useProductDomain();
  // Shell decisions for embedded expense chrome, favorites, and guides still use catalog paths.
  return new Proxy(route, {
    get(target, key) {
      if (key === "path") return legacyPath(product, target.path);
      return Reflect.get(target, key);
    },
  });
}
