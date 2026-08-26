import type { ColorMode } from "~/composables/useColorMode";

export default defineNuxtPlugin(() => {
  // The inline head script resolves the saved theme before CSS paints; hydrate Vue with the same value.
  const initialMode: ColorMode =
    document.documentElement.dataset.theme === "dark" ? "dark" : "light";

  useState<ColorMode>("color-mode", () => initialMode).value = initialMode;
});
