export type ColorMode = "light" | "dark";

const STORAGE_KEY = "chlatwork-color-mode";
const LIGHT_THEME_COLOR = "#f9fafb";
const DARK_THEME_COLOR = "#1c1c1e";
const DARK_MODE_QUERY = "(prefers-color-scheme: dark)";

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
    return "dark";
  }

  return window.matchMedia(DARK_MODE_QUERY).matches ? "dark" : "light";
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
  const colorMode = useState<ColorMode>("color-mode", () => "dark");
  const isDark = computed(() => colorMode.value === "dark");
  const colorModeLabel = computed(() =>
    isDark.value ? "Dark mode" : "Light mode",
  );
  const nextColorModeLabel = computed(() =>
    isDark.value ? "Use light mode" : "Use dark mode",
  );

  const setColorMode = (mode: ColorMode) => {
    if (import.meta.client) {
      try {
        window.localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // The visual theme still updates when storage is blocked.
      }
    }

    syncColorMode(mode);
  };

  const toggleColorMode = () => {
    setColorMode(isDark.value ? "light" : "dark");
  };

  const syncColorMode = (mode: ColorMode) => {
    colorMode.value = mode;
    applyColorMode(mode);
  };

  let stopWatchingSystemColorMode: (() => void) | null = null;

  onMounted(() => {
    const initialMode = getStoredColorMode() ?? getSystemColorMode();

    syncColorMode(initialMode);

    if (!window.matchMedia) {
      return;
    }

    const systemColorMode = window.matchMedia(DARK_MODE_QUERY);
    const syncSystemColorMode = (event: MediaQueryListEvent) => {
      // Manual selection wins; OS changes apply only while the user has no saved preference.
      if (getStoredColorMode()) {
        return;
      }

      syncColorMode(event.matches ? "dark" : "light");
    };

    systemColorMode.addEventListener("change", syncSystemColorMode);
    stopWatchingSystemColorMode = () => {
      systemColorMode.removeEventListener("change", syncSystemColorMode);
    };
  });

  onBeforeUnmount(() => {
    stopWatchingSystemColorMode?.();
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
