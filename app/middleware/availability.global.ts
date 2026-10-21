import { TOOLS } from "~/lib/tool-registry";
import { getCreatorToolByRoute } from "~/data/creator-tools";
import { useFeatureAvailability } from "~/composables/useFeatureAvailability";

export default defineNuxtRouteMiddleware(async (to) => {
  const websiteTool = TOOLS.find(
    (tool) => tool.route === to.path && tool.enabled,
  );
  const commandHub = to.path === "/developer-commands";
  const linkEditor = /^\/account\/link(?:\/|$)/.test(to.path);
  const creatorTool = getCreatorToolByRoute(to.path);
  const availability = useFeatureAvailability();
  const gated = websiteTool || creatorTool || commandHub || linkEditor;
  const hydratedSnapshot =
    useNuxtApp().isHydrating && availability.loaded.value;
  const workspace =
    ["/account", "/moments", "/creator"].includes(to.path) ||
    /^\/(?:admin|bot)(?:\/|$)/.test(to.path);
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
