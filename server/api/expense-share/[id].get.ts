import { runUpstashPipeline } from "../../utils/upstash-redis";

const EXPENSE_SHARE_KEY_PREFIX = "expense:share:";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");

  const id = String(getRouterParam(event, "id") || "").trim();

  if (!/^[A-Za-z0-9_-]{6,32}$/.test(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid Expense Tracker short link.",
    });
  }

  const [getResult] = await runUpstashPipeline<string>([
    ["GET", `${EXPENSE_SHARE_KEY_PREFIX}${id}`],
  ]);

  if (!getResult?.result) {
    throw createError({
      statusCode: 404,
      statusMessage: "Expense Tracker short link was not found.",
    });
  }

  return {
    payload: getResult.result,
  };
});
