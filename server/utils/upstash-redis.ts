type UpstashPipelineResult<T = unknown> = {
  result?: T;
  error?: string;
};

const UPSTASH_TIMEOUT_MS = 3500;

function getNodeEnvValue(key: string) {
  const nodeProcess = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;

  return nodeProcess?.env?.[key]?.trim() || "";
}

function getUpstashRestConfig() {
  return {
    url:
      getNodeEnvValue("KV_REST_API_URL") ||
      getNodeEnvValue("UPSTASH_REDIS_REST_URL"),
    token:
      getNodeEnvValue("KV_REST_API_TOKEN") ||
      getNodeEnvValue("UPSTASH_REDIS_REST_TOKEN"),
  };
}

function isPlaceholderUpstashValue(value: string) {
  return (
    value.includes("example.invalid") ||
    value.startsWith("dummy_") ||
    value.includes("dummy")
  );
}

export function isUpstashRedisConfigured() {
  const config = getUpstashRestConfig();

  return Boolean(
    config.url &&
      config.token &&
      !isPlaceholderUpstashValue(config.url) &&
      !isPlaceholderUpstashValue(config.token),
  );
}

export async function runUpstashPipeline<T = unknown>(
  commands: unknown[][],
): Promise<Array<UpstashPipelineResult<T>>> {
  const config = getUpstashRestConfig();

  if (!isUpstashRedisConfigured()) {
    throw createError({
      statusCode: 503,
      statusMessage: "Short link storage is not configured.",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTASH_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw createError({
        statusCode: 502,
        statusMessage: "Short link storage is unavailable.",
      });
    }

    const results = (await response.json()) as Array<UpstashPipelineResult<T>>;
    const failedCommand = results.find((result) => result.error);

    if (failedCommand) {
      throw createError({
        statusCode: 502,
        statusMessage: "Short link storage rejected the request.",
      });
    }

    return results;
  } finally {
    clearTimeout(timeout);
  }
}
