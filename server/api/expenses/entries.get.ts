import { requestAuthenticatedApi } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  const { from, to } = getQuery(event);
  if (typeof from !== "string" || typeof to !== "string")
    throw createError({
      statusCode: 400,
      statusMessage: "Choose a date range",
    });
  const query = new URLSearchParams({ from, to });
  return await requestAuthenticatedApi(event, `/expenses/entries?${query}`);
});
