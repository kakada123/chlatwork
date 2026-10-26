import { TOOLS } from "~/lib/tool-registry";
import { getCreatorToolByRoute } from "~/data/creator-tools";
import { useFeatureAvailability } from "~/composables/useFeatureAvailability";

export default defineNuxtRouteMiddleware(async (to) => {
  // Product entry aliases must pass the same availability checks as their legacy tool pages.
  const path = typeof to.meta?.productLegacyPath === "string" ? to.meta.productLegacyPath : to.path;
  const websiteTool = TOOLS.find(
    (tool) => tool.route === path && tool.enabled,
  );
  const commandHub = path === "/developer-commands";
  const linkEditor = /^\/account\/link(?:\/|$)/.test(path);
  const creatorTool = getCreatorToolByRoute(path);
  const availability = useFeatureAvailability();
  const gated = websiteTool || creatorTool || commandHub || linkEditor;
  const hydratedSnapshot =
    useNuxtApp().isHydrating && availability.loaded.value;
  const workspace =
    ["/account", "/moments", "/creator"].includes(path) ||
    /^\/(?:admin|bot)(?:\/|$)/.test(path);
  if (workspace && !gated) {
    // Workspace access is governed by auth/role guards, not the public tool switch.
    if (!import.meta.server && !hydratedSnapshot) {
      void availability.refresh().catch(() => {});
    }
    return;
  }
  try {
    // Recheck on navigation; hydration can reuse the snapshot already fetched by SSR.
    if (!hydratedSnapshot) await availability.refresh();
  } catch {
    if (websiteTool || creatorTool || commandHub || linkEditor) {
      return abortNavigation(
        createError({
          statusCode: 503,
          statusMessage:
            "Tool availability could not be checked. Please try again.",
        }),
      );
    }
    return;
  }

  if (
    (websiteTool && !availability.websiteEnabled(websiteTool.key)) ||
    (linkEditor && !availability.websiteEnabled("chlatwork-link")) ||
    (creatorTool && !availability.creatorEnabled(creatorTool.id)) ||
    (commandHub && !availability.websiteEnabled("developer-commands"))
  ) {
    return abortNavigation(
      createError({
        statusCode: 503,
        statusMessage: "This tool is temporarily unavailable.",
      }),
    );
  }
});
