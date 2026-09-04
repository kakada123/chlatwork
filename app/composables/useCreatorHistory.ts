import type { CreatorToolId } from "~/data/creator-tools";
import { CREATOR_TOOLS } from "~/data/creator-tools";
import { getCreatorHistory } from "~/services/creator-ai.service";

export type CreatorHistoryItem = {
  id: string;
  toolId: CreatorToolId;
  title: string;
  route: string;
  preview: string;
  createdAt: string;
};

export function useCreatorHistory() {
  const items = useState<CreatorHistoryItem[]>(
    "creator:session-history",
    () => [],
  );

  function add(item: Omit<CreatorHistoryItem, "id" | "createdAt">) {
    const createdAt = new Date().toISOString();
    items.value = [
      {
        ...item,
        id: `${item.toolId}-${createdAt}`,
        createdAt,
      },
      ...items.value,
    ].slice(0, 6);
  }

  async function refresh() {
    const history = await getCreatorHistory();
    items.value = history.flatMap((entry) => {
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

  return { items, add, refresh };
}

const FEATURE_TO_TOOL: Record<string, CreatorToolId> = {
  POST: "create-post",
  SCRIPT: "script-generator",
  HOOK: "hook-generator",
  CONTENT_IDEAS: "content-ideas",
  VIDEO_SUBTITLE: "video-subtitle",
  VIDEO_CAPTION: "video-caption",
  VIDEO_SUMMARY: "video-summary",
  VIDEO_CONTENT_PACK: "video-content-pack",
  FACEBOOK_TO_TIKTOK: "facebook-to-tiktok",
  VIDEO_TO_SOCIAL: "video-to-social",
  LONG_TO_SHORT: "long-to-short",
  KHMER_GRAMMAR: "khmer-grammar",
  KHMER_REWRITE: "khmer-rewrite",
  LATIN_TO_KHMER: "latin-to-khmer",
  HUMANIZE: "khmer-humanize",
};
