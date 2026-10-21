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

// Share in-flight reads within one app, without sharing SSR state across requests.
const refreshRequests = new WeakMap<object, Promise<void>>();

export function useFeatureAvailability() {
  const app = useNuxtApp();
  const disabled = useState<string[]>(
    "feature-availability:disabled",
    () => [],
  );
  const loaded = useState("feature-availability:loaded", () => false);

  function refresh({ force = false }: { force?: boolean } = {}): Promise<void> {
    const pending = refreshRequests.get(app);
    if (pending && !force) return pending;
    const request = $fetch<{ disabled: string[] }>("/api/feature-availability")
      .then((response) => {
        // A read started before an admin save must not replace the newer snapshot.
        const latest = refreshRequests.get(app);
        if (latest !== request) return latest;
        disabled.value = response.disabled;
        loaded.value = true;
      })
      .finally(() => {
        if (refreshRequests.get(app) === request) refreshRequests.delete(app);
      });
    refreshRequests.set(app, request);
    return request;
  }

  const isEnabled = (key: string) => !disabled.value.includes(key);
  const websiteEnabled = (toolKey: string) => isEnabled(`website:${toolKey}`);
  const creatorEnabled = (toolId: CreatorToolId) =>
    isEnabled(`creator:${creatorFeatureForTool[toolId]}`);

  return {
    disabled,
    loaded,
    refresh,
    isEnabled,
    websiteEnabled,
    creatorEnabled,
  };
}
