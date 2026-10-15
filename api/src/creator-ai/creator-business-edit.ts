import type { CreatorGenerationResult } from './creator-ai.types';
import { containsThaiScript } from './creator-output-language';

/** A source message can hold only the main result, never explanations or wallet data. */
export function creatorBusinessEditText(
  result: CreatorGenerationResult,
): string {
  const text = result.sections[0]?.content?.trim();
  if (!text || text.length > 4096 || containsThaiScript(text)) {
    throw new Error('Creator result cannot replace a Telegram message');
  }
  return text;
}
