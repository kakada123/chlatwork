import type { Product } from "./product-domains.ts";

export interface ProductMobileItem {
  key: string;
  label: string;
  labelKm: string;
  icon:
    | "home"
    | "edit"
    | "share"
    | "account"
    | "recent"
    | "credits"
    | "add"
    | "legacy"
    | "rules";
  to?: string;
  action?: "expense";
  externalPath?: string;
}

const account: ProductMobileItem = {
  key: "account",
  label: "Account",
  labelKm: "គណនី",
  icon: "account",
  to: "/account",
};
const navigation: Record<Product, ProductMobileItem[]> = {
  // JekLuy has a dedicated single-screen shell without account navigation.
  jekluy: [],
  // Food has a dedicated discovery shell with search, map, and recipes.
  food: [],
  creator: [
    { key: "home", label: "Create", labelKm: "បង្កើត", icon: "home", to: "/" },
    {
      key: "recent",
      label: "Recent",
      labelKm: "ថ្មីៗ",
      icon: "recent",
      to: "/#creator-recent-title",
    },
    {
      key: "credits",
      label: "Credits",
      labelKm: "ក្រេឌីត",
      icon: "credits",
      to: "/creator/credits",
    },
    account,
  ],
  link: [
    { key: "home", label: "Home", labelKm: "ទំព័រដើម", icon: "home", to: "/" },
    {
      key: "edit",
      label: "Edit",
      labelKm: "កែទំព័រ",
      icon: "edit",
      to: "/account/link",
    },
    {
      key: "share",
      label: "Share",
      labelKm: "ចែករំលែក",
      icon: "share",
      to: "/account/link/share",
    },
    account,
  ],
  moment: [
    { key: "home", label: "Create", labelKm: "បង្កើត", icon: "add", to: "/" },
    {
      key: "mine",
      label: "My Moments",
      labelKm: "Moments ខ្ញុំ",
      icon: "recent",
      to: "/moments",
    },
    account,
  ],
  expense: [
    {
      key: "home",
      label: "Overview",
      labelKm: "សង្ខេប",
      icon: "home",
      to: "/",
    },
    {
      key: "add",
      label: "Add expense",
      labelKm: "បន្ថែមចំណាយ",
      icon: "add",
      action: "expense",
    },
    account,
  ],
  draw: [
    { key: "home", label: "Draw", labelKm: "ចាប់ឆ្នោត", icon: "home", to: "/" },
    {
      key: "legacy",
      label: "Old lists",
      labelKm: "បញ្ជីចាស់",
      icon: "legacy",
      externalPath: "/tools/lucky-draw",
    },
    account,
  ],
  games: [
    {
      key: "home",
      label: "Play",
      labelKm: "លេង",
      icon: "home",
      to: "/kla-klok",
    },
    {
      key: "rules",
      label: "Rules",
      labelKm: "របៀបលេង",
      icon: "rules",
      to: "/kla-klok#kla-klok-rules",
    },
    account,
  ],
};

export function getProductMobileNavigation(
  product: Product,
): readonly ProductMobileItem[] {
  return navigation[product];
}

export function isProductMobileItemActive(
  product: Product,
  item: ProductMobileItem,
  path: string,
  hash: string,
) {
  const editingLink = /^\/account\/link(?:\/|$)/.test(path);
  if (item.key === "account")
    return (
      (path === "/login" || /^\/account(?:\/|$)/.test(path)) &&
      !(product === "link" && editingLink)
    );
  if (product === "link" && item.key === "share")
    return path === "/account/link/share";
  if (product === "link" && item.key === "edit")
    return editingLink && path !== "/account/link/share";
  if (product === "creator") {
    if (item.key === "recent")
      return (
        path.startsWith("/creator/history/") || hash === "#creator-recent-title"
      );
    if (item.key === "credits")
      return path === "/creator/credits" || path === "/creator/admin/credits";
    if (item.key === "home")
      return (
        (path === "/" ||
          path === "/creator" ||
          /^\/creator\/(?:create|video|khmer|repurpose)\//.test(path)) &&
        hash !== "#creator-recent-title"
      );
  }
  if (product === "games") {
    if (item.key === "rules")
      return path === "/kla-klok" && hash === "#kla-klok-rules";
    if (item.key === "home")
      return path === "/kla-klok" && hash !== "#kla-klok-rules";
  }
  return Boolean(
    item.to && !item.action && !item.externalPath && item.to === path,
  );
}

export function mobileProductTarget(
  product: Product,
  path: string,
  locale: string,
) {
  if (product !== "moment" || locale !== "km") return path;
  const url = new URL(path, "https://navigation.invalid");
  url.searchParams.set("lang", "km");
  return `${url.pathname}${url.search}${url.hash}`;
}
