import { TOOLS } from "~/lib/tool-registry";
import { getCreatorToolByRoute } from "~/data/creator-tools";
import { useFeatureAvailability } from "~/composables/useFeatureAvailability";

export default defineNuxtRouteMiddleware(async (to) => {
  const websiteTool = TOOLS.find(
    (tool) => tool.route === to.path && tool.enabled,
  );
  const commandHub = to.path === "/developer-commands";
  const creatorTool = getCreatorToolByRoute(to.path);
  const availability = useFeatureAvailability();
  try {
    // Recheck on navigation so another admin's change is visible without a reload.
    await availability.refresh();
  } catch {
    if (websiteTool || creatorTool || commandHub) {
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
