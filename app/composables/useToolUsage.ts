export type ToolUsageSummaryItem = {
  toolKey: string;
  usageCount: number;
  lastUsedAt: string;
};

export type PopularToolUsageItem = {
  toolKey: string;
};

export function useToolUsage() {
  async function recordToolOpen(toolKey: string) {
    try {
      // Send only the public registry key; tool inputs and URL query data stay in the browser.
      await $fetch("/api/tool-usage", {
        method: "POST",
        body: { toolKey, event: "OPEN" },
      });
    } catch {
      // Analytics must never interrupt or block the tool itself.
    }
  }

  async function getToolUsageSummary() {
    return await $fetch<ToolUsageSummaryItem[]>("/api/tool-usage/summary");
  }

  async function getPopularToolUsage() {
    return await $fetch<PopularToolUsageItem[]>("/api/tool-usage/popular");
  }

  async function clearToolUsage() {
    return await $fetch<{ deleted: number }>("/api/tool-usage", { method: "DELETE" });
  }

  return {
    clearToolUsage,
    getPopularToolUsage,
    getToolUsageSummary,
    recordToolOpen,
  };
}
