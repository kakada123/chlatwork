import {
  isUpstashRedisConfigured,
  runUpstashPipeline,
} from "../utils/upstash-redis";

const EXPENSE_SHARE_KEY_PREFIX = "expense:share:";
const EXPENSE_SHARE_TTL_SECONDS = 60 * 60 * 24 * 90;
const MAX_EXPENSE_SHARE_PAYLOAD_LENGTH = 10_000;

type CreateExpenseShareBody = {
  id?: unknown;
  payload?: unknown;
};

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");

  if (!isUpstashRedisConfigured()) {
    throw createError({
      statusCode: 503,
      statusMessage: "Short link storage is not configured.",
    });
  }

  const body = (await readBody(event)) as CreateExpenseShareBody;
  const requestedId = typeof body.id === "string" ? body.id.trim() : "";
  const payload = typeof body.payload === "string" ? body.payload.trim() : "";

  if (!payload) {
    throw createError({
      statusCode: 400,
      statusMessage: "Expense Tracker share payload is required.",
    });
  }

  if (payload.length > MAX_EXPENSE_SHARE_PAYLOAD_LENGTH) {
    throw createError({
      statusCode: 413,
      statusMessage: "Expense Tracker share payload is too large.",
    });
  }

  if (requestedId) {
    const id = await updateExpenseShareId(requestedId, payload);

    return {
      id,
      expiresInSeconds: EXPENSE_SHARE_TTL_SECONDS,
    };
  }

  const id = await createUniqueExpenseShareId(payload);

  return {
    id,
    expiresInSeconds: EXPENSE_SHARE_TTL_SECONDS,
  };
});

async function updateExpenseShareId(id: string, payload: string) {
  if (!/^[A-Za-z0-9_-]{6,32}$/.test(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid Expense Tracker short link.",
    });
  }

  const key = `${EXPENSE_SHARE_KEY_PREFIX}${id}`;

  // XX keeps shared-link edits scoped to an existing bearer-style share id.
  const [setResult] = await runUpstashPipeline<string | null>([
    ["SET", key, payload, "EX", EXPENSE_SHARE_TTL_SECONDS, "XX"],
  ]);

  if (setResult?.result === "OK") {
    return id;
  }

  throw createError({
    statusCode: 404,
    statusMessage: "Expense Tracker short link was not found.",
  });
}

async function createUniqueExpenseShareId(payload: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = createShareId();
    const key = `${EXPENSE_SHARE_KEY_PREFIX}${id}`;

    // NX protects an existing share if a random ID collision ever happens.
    const [setResult] = await runUpstashPipeline<string | null>([
      ["SET", key, payload, "EX", EXPENSE_SHARE_TTL_SECONDS, "NX"],
    ]);

    if (setResult?.result === "OK") {
      return id;
    }
  }

  throw createError({
    statusCode: 503,
    statusMessage: "Unable to create a unique short link.",
  });
}

function createShareId() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);

  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
