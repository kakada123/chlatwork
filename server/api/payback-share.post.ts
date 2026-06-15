import {
  isUpstashRedisConfigured,
  runUpstashPipeline,
} from "../utils/upstash-redis";

const PAYBACK_SHARE_KEY_PREFIX = "payback:share:";
const PAYBACK_SHARE_TTL_SECONDS = 60 * 60 * 24 * 90;
const MAX_PAYBACK_SHARE_PAYLOAD_LENGTH = 10_000;

type CreatePaybackShareBody = {
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

  const body = (await readBody(event)) as CreatePaybackShareBody;
  const payload = typeof body.payload === "string" ? body.payload.trim() : "";

  if (!payload) {
    throw createError({
      statusCode: 400,
      statusMessage: "PayBack share payload is required.",
    });
  }

  if (payload.length > MAX_PAYBACK_SHARE_PAYLOAD_LENGTH) {
    throw createError({
      statusCode: 413,
      statusMessage: "PayBack share payload is too large.",
    });
  }

  const id = await createUniquePaybackShareId(payload);

  return {
    id,
    expiresInSeconds: PAYBACK_SHARE_TTL_SECONDS,
  };
});

async function createUniquePaybackShareId(payload: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = createShareId();
    const key = `${PAYBACK_SHARE_KEY_PREFIX}${id}`;

    // NX protects an existing share if a random ID collision ever happens.
    const [setResult] = await runUpstashPipeline<string | null>([
      ["SET", key, payload, "EX", PAYBACK_SHARE_TTL_SECONDS, "NX"],
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
