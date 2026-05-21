const MAX_AUDIO_SECONDS = 10;
const GOOGLE_TTS_TEXT_LIMIT = 180;
const KHMER_GRAPHEMES_PER_SECOND = 12;
const SUPPORTED_LANGUAGES = new Set(["km", "en"]);

type TextLanguage = "km" | "en";
type VoiceProvider = "google" | "narakeet";

const VOICES: Record<
  string,
  {
    fileName: string;
    provider: VoiceProvider;
    narrationLanguage?: string;
    upstreamVoice?: string;
  }
> = {
  "khmer-default": {
    fileName: "khmer-default",
    provider: "google",
  },
  "english-default": {
    fileName: "english-default",
    provider: "google",
  },
  "khmer-male-graham": {
    fileName: "khmer-graham-male",
    provider: "narakeet",
    narrationLanguage: "km-KH",
    upstreamVoice: "graham",
  },
  "khmer-male-sovath": {
    fileName: "khmer-sovath-male",
    provider: "narakeet",
    upstreamVoice: "sovath",
  },
  "khmer-female-nisa": {
    fileName: "khmer-nisa-female",
    provider: "narakeet",
    upstreamVoice: "nisa",
  },
};

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const text = String(query.text ?? "").replace(/\s+/g, " ").trim();
  const lang = normalizeLanguage(query.lang ?? "km");
  const voice = String(query.voice ?? "auto").toLowerCase();
  const download = String(query.download ?? "") === "1";

  if (!text) {
    throw createError({
      statusCode: 400,
      statusMessage: "Text is required.",
    });
  }

  if (!lang || !SUPPORTED_LANGUAGES.has(lang)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Only Khmer and English text-to-voice are supported.",
    });
  }

  const selectedVoice = resolveVoice(voice, lang);

  if (!selectedVoice) {
    throw createError({
      statusCode: 400,
      statusMessage: "The selected voice is not supported.",
    });
  }

  if (selectedVoice.provider === "narakeet" && lang !== "km") {
    throw createError({
      statusCode: 400,
      statusMessage: "Narakeet voices are currently available for Khmer text only.",
    });
  }

  if (selectedVoice.provider === "narakeet") {
    const estimatedAudioSeconds = estimateSpeechSeconds(text);

    if (estimatedAudioSeconds > MAX_AUDIO_SECONDS) {
      throw createError({
        statusCode: 413,
        statusMessage: `Text is estimated at ${estimatedAudioSeconds}s. Limit is ${MAX_AUDIO_SECONDS}s for Narakeet voices.`,
      });
    }
  } else if (countGraphemes(text, lang) > GOOGLE_TTS_TEXT_LIMIT) {
    throw createError({
      statusCode: 413,
      statusMessage: `Text must be ${GOOGLE_TTS_TEXT_LIMIT} characters or fewer for Google voice.`,
    });
  }

  const upstreamResponse =
    selectedVoice.provider === "narakeet"
      ? await synthesizeWithNarakeet(text, selectedVoice)
      : await synthesizeWithGoogle(text, lang);

  return new Response(upstreamResponse.body, {
    headers: {
      "Cache-Control": "private, max-age=86400",
      ...(download
        ? {
            "Content-Disposition": `attachment; filename="${selectedVoice.fileName}.mp3"`,
          }
        : {}),
      "Content-Type": upstreamResponse.contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
});

function normalizeLanguage(value: unknown): TextLanguage | null {
  const language = String(value ?? "").toLowerCase();

  if (language.startsWith("km")) {
    return "km";
  }

  if (language.startsWith("en")) {
    return "en";
  }

  return null;
}

function resolveVoice(voice: string, lang: TextLanguage) {
  if (voice === "auto") {
    return VOICES[lang === "km" ? "khmer-default" : "english-default"];
  }

  return VOICES[voice] ?? null;
}

async function synthesizeWithGoogle(text: string, lang: string) {
  const upstreamUrl = new URL("https://translate.google.com/translate_tts");
  upstreamUrl.search = new URLSearchParams({
    ie: "UTF-8",
    client: "tw-ob",
    tl: lang,
    q: text,
  }).toString();

  const upstreamResponse = await fetch(upstreamUrl, {
    headers: {
      Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  });

  return normalizeAudioResponse(upstreamResponse);
}

async function synthesizeWithNarakeet(
  text: string,
  voiceConfig: (typeof VOICES)[string],
) {
  const config = useRuntimeConfig();
  const apiKey =
    String(config.narakeetApiKey || "").trim() ||
    String(getNodeEnvValue("NARAKEET_API_KEY") || "").trim();

  if (!apiKey) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "Narakeet API key is not configured. Set NARAKEET_API_KEY to use this Khmer voice.",
    });
  }

  if (!voiceConfig.upstreamVoice) {
    throw createError({
      statusCode: 500,
      statusMessage: "Narakeet voice is not configured.",
    });
  }

  const upstreamUrl = new URL("https://api.narakeet.com/text-to-speech/mp3");
  upstreamUrl.searchParams.set("voice", voiceConfig.upstreamVoice);

  const upstreamResponse = await fetch(upstreamUrl, {
    body: buildNarakeetScript(text, voiceConfig),
    headers: {
      Accept: "application/octet-stream",
      "Content-Type": "text/plain; charset=utf-8",
      "x-api-key": apiKey,
    },
    method: "POST",
  });

  return normalizeAudioResponse(upstreamResponse);
}

function buildNarakeetScript(text: string, voiceConfig: (typeof VOICES)[string]) {
  if (!voiceConfig.narrationLanguage) {
    return text;
  }

  return [
    "---",
    `narration-language: ${voiceConfig.narrationLanguage}`,
    "---",
    "",
    text,
  ].join("\n");
}

function getNodeEnvValue(key: string) {
  const nodeProcess = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;

  return nodeProcess?.env?.[key] || "";
}

async function normalizeAudioResponse(upstreamResponse: Response) {
  const upstreamContentType = upstreamResponse.headers.get("content-type") || "";
  const isAudioResponse =
    upstreamContentType.includes("audio") ||
    upstreamContentType.includes("application/octet-stream");

  if (!upstreamResponse.ok || !upstreamResponse.body || !isAudioResponse) {
    const errorDetail = await readUpstreamError(upstreamResponse);
    throw createError({
      statusCode: 502,
      statusMessage: errorDetail || "Unable to generate audio.",
    });
  }

  return {
    body: upstreamResponse.body,
    contentType: upstreamContentType.includes("application/octet-stream")
      ? "audio/mpeg"
      : upstreamContentType || "audio/mpeg",
  };
}

async function readUpstreamError(upstreamResponse: Response) {
  try {
    const body = await upstreamResponse.text();
    try {
      const parsed = JSON.parse(body);

      return String(
        parsed.message ||
          parsed.error ||
          parsed.statusMessage ||
          parsed.detail ||
          body,
      ).slice(0, 200);
    } catch {
      return body.slice(0, 200);
    }
  } catch {
    return "";
  }
}

function countGraphemes(value: string, lang: TextLanguage = "km") {
  const Segmenter = (Intl as any).Segmenter;

  if (Segmenter) {
    const segmenter = new Segmenter(lang, { granularity: "grapheme" });
    return Array.from(segmenter.segment(value)).length;
  }

  return Array.from(value).length;
}

function estimateSpeechSeconds(value: string) {
  const graphemeCount = countGraphemes(value.replace(/\s+/g, " ").trim());

  if (graphemeCount === 0) {
    return 0;
  }

  return Math.ceil(graphemeCount / KHMER_GRAPHEMES_PER_SECOND);
}
