import {
  CREATOR_FEATURE_TO_TOOL,
  type CreatorToolId,
} from "~/data/creator-tools";

const creatorFeatureForTool = Object.fromEntries(
  Object.entries(CREATOR_FEATURE_TO_TOOL).map(([feature, tool]) => [
    tool,
    feature,
  ]),
) as Record<CreatorToolId, string>;

export function useFeatureAvailability() {
  const disabled = useState<string[]>(
    "feature-availability:disabled",
    () => [],
  );

  async function refresh() {
    const response = await $fetch<{ disabled: string[] }>(
      "/api/feature-availability",
    );
    disabled.value = response.disabled;
  }

  const isEnabled = (key: string) => !disabled.value.includes(key);
  const websiteEnabled = (toolKey: string) => isEnabled(`website:${toolKey}`);
  const creatorEnabled = (toolId: CreatorToolId) =>
    isEnabled(`creator:${creatorFeatureForTool[toolId]}`);

  return { disabled, refresh, isEnabled, websiteEnabled, creatorEnabled };
}
