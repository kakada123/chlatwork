import { AiFeature } from '@prisma/client';
import type {
  CreatorGenerationResult,
  TranscriptSegment,
} from './creator-ai.types';

export interface CreatorPromptSpec<T> {
  name: string;
  instructions: string;
  input: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
  premium: boolean;
  parse(value: unknown): T;
}

const BASE_INSTRUCTIONS = `You are ChlatWork Creator for Cambodian creators.
Follow the requested language and tone. Prefer natural Cambodian Khmer, not literal machine translation.
Keep commonly used English product and technical terms when they sound natural in Cambodia.
Preserve Khmer and English mixing, names, claims, meaning, and useful emoji where appropriate.
Do not invent factual claims, prices, testimonials, or guarantees. Do not translate unless requested.
Return only the structured output described by the schema.`;

const stringField = (maxLength: number) => ({
  type: 'string',
  minLength: 1,
  maxLength,
});

const stringList = (maxItems: number, maxLength = 100) => ({
  type: 'array',
  maxItems,
  items: stringField(maxLength),
});

function objectSchema(
  properties: Record<string, unknown>,
  required = Object.keys(properties),
) {
  return { type: 'object', additionalProperties: false, properties, required };
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected an object');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, maximum = 20_000) {
  if (typeof value !== 'string') throw new Error('Expected text');
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) {
    throw new Error('Text is empty or too long');
  }
  return normalized;
}

function texts(value: unknown, maximumItems: number, maximumLength = 500) {
  if (!Array.isArray(value) || value.length > maximumItems) {
    throw new Error('Expected a bounded text list');
  }
  return value.map((item) => text(item, maximumLength));
}

function payloadText(payload: Record<string, unknown>) {
  return JSON.stringify(payload);
}

export function buildCreatorTextPrompt(
  feature: AiFeature,
  payload: Record<string, unknown>,
): CreatorPromptSpec<CreatorGenerationResult> {
  const common = {
    instructions: BASE_INSTRUCTIONS,
    input: `Create the requested ${feature} result from this validated input:\n${payloadText(payload)}`,
  };

  switch (feature) {
    case AiFeature.POST:
      return {
        ...common,
        name: 'creator_post',
        schema: objectSchema({
          content: stringField(5_000),
          hashtags: stringList(15, 80),
          cta: stringField(500),
        }),
        maxOutputTokens: 1_500,
        premium: false,
        parse(value) {
          const data = record(value);
          return {
            title: 'Generated post',
            sections: [
              { id: 'post', label: 'Post', content: text(data.content, 5_000) },
              {
                id: 'hashtags',
                label: 'Hashtags',
                content: texts(data.hashtags, 15, 80).join(' '),
              },
              { id: 'cta', label: 'CTA', content: text(data.cta, 500) },
            ],
          };
        },
      };
    case AiFeature.SCRIPT:
      return {
        ...common,
        name: 'creator_script',
        schema: objectSchema({
          hook: stringField(1_000),
          mainContent: stringField(8_000),
          cta: stringField(1_000),
        }),
        maxOutputTokens: 3_000,
        premium: true,
        parse(value) {
          const data = record(value);
          return {
            title: 'Video script',
            sections: [
              { id: 'hook', label: 'Hook', content: text(data.hook, 1_000) },
              {
                id: 'main',
                label: 'Main content',
                content: text(data.mainContent, 8_000),
              },
              { id: 'cta', label: 'CTA', content: text(data.cta, 1_000) },
            ],
          };
        },
      };
    case AiFeature.HOOK:
      return hookPrompt(common, payload);
    case AiFeature.CONTENT_IDEAS:
      return ideasPrompt(common, payload);
    case AiFeature.KHMER_GRAMMAR:
      return simpleResultPrompt(common, 'khmer_grammar', 'Corrected Khmer', false);
    case AiFeature.KHMER_REWRITE:
      return simpleResultPrompt(common, 'khmer_rewrite', 'Rewritten text', false);
    case AiFeature.LATIN_TO_KHMER:
      return simpleResultPrompt(common, 'latin_to_khmer', 'Khmer text', false);
    case AiFeature.HUMANIZE:
      return simpleResultPrompt(common, 'khmer_humanize', 'Humanized text', true);
    case AiFeature.FACEBOOK_TO_TIKTOK:
      return facebookToTikTokPrompt(common);
    case AiFeature.LONG_TO_SHORT:
      return simpleResultPrompt(common, 'long_to_short', 'Shortened content', true);
    default:
      throw new Error(`Unsupported text feature: ${feature}`);
  }
}

function simpleResultPrompt(
  common: { instructions: string; input: string },
  name: string,
  title: string,
  premium: boolean,
): CreatorPromptSpec<CreatorGenerationResult> {
  return {
    ...common,
    name,
    schema: objectSchema({ result: stringField(12_000) }),
    maxOutputTokens: 3_000,
    premium,
    parse(value) {
      return {
        title,
        sections: [
          {
            id: 'result',
            label: title,
            content: text(record(value).result, 12_000),
          },
        ],
      };
    },
  };
}

function hookPrompt(
  common: { instructions: string; input: string },
  payload: Record<string, unknown>,
): CreatorPromptSpec<CreatorGenerationResult> {
  const count = Math.min(10, Math.max(1, Number(payload.count) || 5));
  return {
    ...common,
    name: 'creator_hooks',
    schema: objectSchema({
      hooks: {
        type: 'array',
        minItems: count,
        maxItems: count,
        items: objectSchema({
          type: { type: 'string', enum: ['CURIOSITY', 'STATEMENT', 'QUESTION', 'STORY', 'PROBLEM_SOLUTION'] },
          text: stringField(500),
        }),
      },
    }),
    maxOutputTokens: 1_500,
    premium: false,
    parse(value) {
      const hooks = record(value).hooks;
      if (!Array.isArray(hooks) || hooks.length !== count) {
        throw new Error('Invalid hook count');
      }
      return {
        title: 'Hook options',
        sections: [],
        items: hooks.map((item, index) => {
          const hook = record(item);
          return {
            id: `hook-${index + 1}`,
            title: text(hook.type, 40).replaceAll('_', ' '),
            content: text(hook.text, 500),
          };
        }),
      };
    },
  };
}

function ideasPrompt(
  common: { instructions: string; input: string },
  payload: Record<string, unknown>,
): CreatorPromptSpec<CreatorGenerationResult> {
  const count = Math.min(10, Math.max(1, Number(payload.count) || 5));
  return {
    ...common,
    name: 'creator_content_ideas',
    schema: objectSchema({
      ideas: {
        type: 'array',
        minItems: count,
        maxItems: count,
        items: objectSchema({
          title: stringField(160),
          hook: stringField(500),
          explanation: stringField(1_000),
        }),
      },
    }),
    maxOutputTokens: 2_500,
    premium: false,
    parse(value) {
      const ideas = record(value).ideas;
      if (!Array.isArray(ideas) || ideas.length !== count) {
        throw new Error('Invalid content idea count');
      }
      return {
        title: 'Content ideas',
        sections: [],
        items: ideas.map((item, index) => {
          const idea = record(item);
          return {
            id: `idea-${index + 1}`,
            title: text(idea.title, 160),
            content: text(idea.hook, 500),
            description: text(idea.explanation, 1_000),
          };
        }),
      };
    },
  };
}

function facebookToTikTokPrompt(common: {
  instructions: string;
  input: string;
}): CreatorPromptSpec<CreatorGenerationResult> {
  return {
    ...common,
    name: 'facebook_to_tiktok',
    schema: objectSchema({
      hook: stringField(500),
      caption: stringField(2_500),
      hashtags: stringList(15, 80),
    }),
    maxOutputTokens: 1_500,
    premium: false,
    parse(value) {
      const data = record(value);
      return {
        title: 'TikTok version',
        sections: [
          { id: 'hook', label: 'Hook', content: text(data.hook, 500) },
          {
            id: 'caption',
            label: 'Short caption',
            content: text(data.caption, 2_500),
          },
          {
            id: 'hashtags',
            label: 'Hashtags',
            content: texts(data.hashtags, 15, 80).join(' '),
          },
        ],
      };
    },
  };
}

export function buildTranscriptCleanupPrompt(
  segments: TranscriptSegment[],
): CreatorPromptSpec<string[]> {
  return {
    name: 'khmer_transcript_cleanup',
    instructions: `${BASE_INSTRUCTIONS}\nOnly fix obvious Khmer spelling, punctuation, and readability. Preserve meaning, names, product words, mixed English terms, and segment order. Never invent missing speech. Return exactly one text item per input segment.`,
    input: JSON.stringify(segments.map((segment) => segment.text)),
    schema: objectSchema({
      texts: {
        type: 'array',
        minItems: segments.length,
        maxItems: segments.length,
        items: stringField(2_000),
      },
    }),
    maxOutputTokens: 4_000,
    premium: false,
    parse(value) {
      const cleaned = texts(record(value).texts, segments.length, 2_000);
      if (cleaned.length !== segments.length) {
        throw new Error('Transcript segment count changed');
      }
      return cleaned;
    },
  };
}

export function buildVideoContentPrompt(
  feature: AiFeature,
  transcript: string,
  preferences: Record<string, unknown> = {},
): CreatorPromptSpec<CreatorGenerationResult> {
  const common = {
    instructions: BASE_INSTRUCTIONS,
    input: `Use this single normalized transcript as the source. Do not add unsupported facts. Preferences: ${JSON.stringify(preferences)}\nTranscript:\n${transcript}`,
  };

  if (feature === AiFeature.VIDEO_CAPTION || feature === AiFeature.VIDEO_TO_SOCIAL) {
    return {
      ...common,
      name: 'video_platform_captions',
      schema: objectSchema({
        facebook: stringField(4_000),
        tiktok: stringField(2_500),
        instagram: stringField(2_500),
      }),
      maxOutputTokens: 2_500,
      premium: false,
      parse(value) {
        const data = record(value);
        return {
          title: 'Platform captions',
          sections: [
            { id: 'tiktok', label: 'TikTok', content: text(data.tiktok, 2_500) },
            { id: 'facebook', label: 'Facebook', content: text(data.facebook, 4_000) },
            { id: 'instagram', label: 'Instagram', content: text(data.instagram, 2_500) },
          ],
        };
      },
    };
  }

  if (feature === AiFeature.VIDEO_SUMMARY) {
    return {
      ...common,
      name: 'video_summary',
      schema: objectSchema({
        summary: stringField(5_000),
        keyPoints: stringList(12, 500),
        topics: stringList(20, 120),
      }),
      maxOutputTokens: 2_000,
      premium: false,
      parse(value) {
        const data = record(value);
        return {
          title: 'Video summary',
          sections: [
            { id: 'summary', label: 'Summary', content: text(data.summary, 5_000) },
            { id: 'key-points', label: 'Key points', content: texts(data.keyPoints, 12, 500).map((item) => `• ${item}`).join('\n') },
            { id: 'topics', label: 'Important topics', content: texts(data.topics, 20, 120).join(', ') },
          ],
        };
      },
    };
  }

  if (feature === AiFeature.VIDEO_CONTENT_PACK) {
    return contentPackPrompt(common);
  }

  throw new Error(`Unsupported video generation feature: ${feature}`);
}

function contentPackPrompt(common: {
  instructions: string;
  input: string;
}): CreatorPromptSpec<CreatorGenerationResult> {
  return {
    ...common,
    name: 'video_content_pack',
    schema: objectSchema({
      captions: objectSchema({
        facebook: stringField(4_000),
        tiktok: stringField(2_500),
        instagram: stringField(2_500),
      }),
      hooks: stringList(10, 500),
      hashtags: stringList(20, 80),
      title: stringField(300),
      cta: stringField(500),
      summary: stringField(5_000),
      keyPoints: stringList(12, 500),
    }),
    maxOutputTokens: 4_000,
    premium: true,
    parse(value) {
      const data = record(value);
      const captions = record(data.captions);
      return {
        title: 'Video content pack',
        sections: [
          {
            id: 'caption',
            label: 'Captions',
            content: `TikTok\n${text(captions.tiktok, 2_500)}\n\nFacebook\n${text(captions.facebook, 4_000)}\n\nInstagram\n${text(captions.instagram, 2_500)}`,
          },
          { id: 'hooks', label: 'Hooks', content: texts(data.hooks, 10, 500).map((item, index) => `${index + 1}. ${item}`).join('\n') },
          { id: 'hashtags', label: 'Hashtags', content: texts(data.hashtags, 20, 80).join(' ') },
          { id: 'summary', label: 'Summary', content: text(data.summary, 5_000) },
          { id: 'title', label: 'Video title', content: text(data.title, 300) },
          { id: 'cta', label: 'CTA', content: text(data.cta, 500) },
          { id: 'key-points', label: 'Key points', content: texts(data.keyPoints, 12, 500).map((item) => `• ${item}`).join('\n') },
        ],
      };
    },
  };
}
