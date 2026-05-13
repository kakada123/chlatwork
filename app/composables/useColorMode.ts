export type ColorMode = "light" | "dark";

const STORAGE_KEY = "chlatwork-color-mode";
const LIGHT_THEME_COLOR = "#f9fafb";
const DARK_THEME_COLOR = "#1c1c1e";

function isColorMode(value: string | null): value is ColorMode {
  return value === "light" || value === "dark";
}

function getStoredColorMode(): ColorMode | null {
  if (!import.meta.client) {
    return null;
  }

  try {
    const storedMode = window.localStorage.getItem(STORAGE_KEY);
    return isColorMode(storedMode) ? storedMode : null;
  } catch {
    return null;
  }
}

function getSystemColorMode(): ColorMode {
  if (!import.meta.client || !window.matchMedia) {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyColorMode(mode: ColorMode) {
  if (!import.meta.client) {
    return;
  }

  const root = document.documentElement;
  const isDark = mode === "dark";

  root.classList.toggle("dark", isDark);
  root.dataset.theme = mode;
  root.style.colorScheme = mode;

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
}

export function useColorMode() {
  const colorMode = useState<ColorMode>("color-mode", () => "light");
  const isDark = computed(() => colorMode.value === "dark");
  const colorModeLabel = computed(() =>
    isDark.value ? "Dark mode" : "Light mode",
  );
  const nextColorModeLabel = computed(() =>
    isDark.value ? "Use light mode" : "Use dark mode",
  );

  let mediaQuery: MediaQueryList | null = null;

  const setColorMode = (mode: ColorMode) => {
    colorMode.value = mode;

    if (import.meta.client) {
      try {
        window.localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // The visual theme still updates when storage is blocked.
      }
    }

    applyColorMode(mode);
  };

  const toggleColorMode = () => {
    setColorMode(isDark.value ? "light" : "dark");
  };

  const syncSystemColorMode = () => {
    if (getStoredColorMode()) {
      return;
    }

    const systemMode = getSystemColorMode();
    colorMode.value = systemMode;
    applyColorMode(systemMode);
  };

  onMounted(() => {
    const initialMode = getStoredColorMode() ?? getSystemColorMode();

    colorMode.value = initialMode;
    applyColorMode(initialMode);

    if (!window.matchMedia) {
      return;
    }

    mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", syncSystemColorMode);
  });

  onBeforeUnmount(() => {
    mediaQuery?.removeEventListener("change", syncSystemColorMode);
  });

  return {
    colorMode,
    colorModeLabel,
    isDark,
    nextColorModeLabel,
    setColorMode,
    toggleColorMode,
  };
}
