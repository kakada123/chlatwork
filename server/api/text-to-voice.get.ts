const MAX_AUDIO_SECONDS = 10;
const GOOGLE_TTS_TEXT_LIMIT = 180;
const KHMER_GRAPHEMES_PER_SECOND = 12;
const SUPPORTED_LANGUAGES = new Set(["km"]);

type VoiceProvider = "google" | "narakeet";

const VOICES: Record<
  string,
  {
    fileName: string;
    provider: VoiceProvider;
    upstreamVoice?: string;
  }
> = {
  "khmer-default": {
    fileName: "khmer-default",
    provider: "google",
  },
  "khmer-male-graham": {
    fileName: "khmer-graham-male",
    provider: "narakeet",
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
  const lang = String(query.lang ?? "km").toLowerCase();
  const voice = String(query.voice ?? "khmer-default").toLowerCase();
  const download = String(query.download ?? "") === "1";

  if (!text) {
    throw createError({
      statusCode: 400,
      statusMessage: "Text is required.",
    });
  }

  if (!SUPPORTED_LANGUAGES.has(lang)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Only Khmer text-to-voice is supported.",
    });
  }

  const selectedVoice = VOICES[voice];

  if (!selectedVoice) {
    throw createError({
      statusCode: 400,
      statusMessage: "The selected Khmer voice is not supported.",
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
  } else if (countGraphemes(text) > GOOGLE_TTS_TEXT_LIMIT) {
    throw createError({
      statusCode: 413,
      statusMessage: `Text must be ${GOOGLE_TTS_TEXT_LIMIT} characters or fewer for Google voice.`,
    });
  }

  const upstreamResponse =
    selectedVoice.provider === "narakeet"
      ? await synthesizeWithNarakeet(text, selectedVoice.upstreamVoice)
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

async function synthesizeWithNarakeet(text: string, voice?: string) {
  const apiKey = process.env.NARAKEET_API_KEY;

  if (!apiKey) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "Narakeet API key is not configured. Set NARAKEET_API_KEY to use this Khmer voice.",
    });
  }

  if (!voice) {
    throw createError({
      statusCode: 500,
      statusMessage: "Narakeet voice is not configured.",
    });
  }

  const upstreamUrl = new URL("https://api.narakeet.com/text-to-speech/mp3");
  upstreamUrl.searchParams.set("voice", voice);

  const upstreamResponse = await fetch(upstreamUrl, {
    body: text,
    headers: {
      Accept: "application/octet-stream",
      "Content-Type": "text/plain; charset=utf-8",
      "x-api-key": apiKey,
    },
    method: "POST",
  });

  return normalizeAudioResponse(upstreamResponse);
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
      statusMessage: errorDetail || "Unable to generate Khmer audio.",
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

function countGraphemes(value: string) {
  const Segmenter = (Intl as any).Segmenter;

  if (Segmenter) {
    const segmenter = new Segmenter("km", { granularity: "grapheme" });
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
