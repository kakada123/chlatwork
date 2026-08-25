import { createError } from "h3";
import { apiBaseUrl } from "../../../../utils/auth";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug");
  const mediaId = getRouterParam(event, "mediaId");
  try {
    const response = await $fetch.raw<ArrayBuffer>(
      `${apiBaseUrl(event)}/moments/${slug}/media/${mediaId}`,
      { responseType: "arrayBuffer" },
    );
    setResponseHeader(
      event,
      "Content-Type",
      response.headers.get("content-type") || "application/octet-stream",
    );
    setResponseHeader(event, "Cache-Control", "private, max-age=86400");
    setResponseHeader(event, "X-Content-Type-Options", "nosniff");
    return new Uint8Array(response._data);
  } catch (error) {
    const fetchError = error as { response?: { status?: number } };
    throw createError({
      statusCode: fetchError.response?.status ?? 502,
      statusMessage:
        fetchError.response?.status === 404
          ? "Photo not found"
          : "Could not load photo",
    });
  }
});
