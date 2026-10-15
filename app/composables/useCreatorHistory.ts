import type { CreatorToolId } from "~/data/creator-tools";
import {
  CREATOR_TOOLS,
  CREATOR_FEATURE_TO_TOOL as FEATURE_TO_TOOL,
} from "~/data/creator-tools";
import { getCreatorHistory } from "~/services/creator-ai.service";
import { containsThaiScript } from "~/lib/creator-output-language";

export type CreatorHistoryItem = {
  id: string;
  toolId: CreatorToolId;
  title: string;
  route: string;
  preview: string;
  createdAt: string;
};

export function useCreatorHistory() {
  const { user } = useAuth();
  const items = useState<CreatorHistoryItem[]>(
    "creator:session-history",
    () => [],
  );
  const owner = useState<string | null>("creator:history-owner", () => null);
  const requestVersion = useState<number>("creator:history-version", () => 0);

  watch(
    () => user.value?.id ?? null,
    (userId) => {
      if (owner.value !== userId) {
        requestVersion.value++;
        items.value = [];
        owner.value = userId;
      }
    },
    { immediate: true, flush: "sync" },
  );

  function add(
    item: Omit<CreatorHistoryItem, "createdAt">,
    expectedOwner: string | undefined,
  ) {
    if (
      !expectedOwner ||
      user.value?.id !== expectedOwner ||
      !item.id ||
      containsThaiScript(item)
    )
      return;
    // Every instance shares this revision so an older refresh cannot erase new work.
    requestVersion.value++;
    const createdAt = new Date().toISOString();
    items.value = [
      {
        ...item,
        createdAt,
      },
      ...items.value,
    ].slice(0, 6);
  }

  async function refresh() {
    const userId = user.value?.id;
    const version = ++requestVersion.value;
    if (!userId) return;
    let history;
    try {
      history = await getCreatorHistory();
    } catch {
      // Retain this account's session results when the optional recent list fails.
      return;
    }
    if (version !== requestVersion.value || user.value?.id !== userId) return;
    items.value = history.flatMap((entry) => {
      if (containsThaiScript(entry)) return [];
      const toolId = FEATURE_TO_TOOL[entry.feature];
      if (!toolId) return [];
      const tool = CREATOR_TOOLS.find((item) => item.id === toolId);
      if (!tool || !entry.result) return [];
      const preview =
        entry.result.sections[0]?.content ||
        entry.result.items?.[0]?.content ||
        entry.result.title;
      return [
        {
          id: entry.id,
          toolId,
          title: tool.title,
          route: tool.route,
          preview: preview.slice(0, 110),
          createdAt: entry.createdAt,
        },
      ];
    });
  }

  // Recheck existing session state as well as newly fetched history.
  const visibleItems = computed(() =>
    items.value.filter((item) => !containsThaiScript(item)),
  );
  return { items: visibleItems, add, refresh };
}
