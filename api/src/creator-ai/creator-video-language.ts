import type { CreatorLanguage } from './dto/creator-ai.dto';
import { containsThaiScript } from './creator-output-language';

export function videoLanguage(value: unknown): CreatorLanguage {
  return value === 'ENGLISH' || value === 'KHMER_ENGLISH' ? value : 'KHMER';
}

export function videoLanguageInstruction(language: CreatorLanguage) {
  if (language === 'ENGLISH') {
    return 'The requested output language is English. Write the output in English, translating the source faithfully when necessary.';
  }
  return language === 'KHMER_ENGLISH'
    ? 'The requested output is Cambodian Khmer mixed naturally with English. Use Khmer script for Khmer speech. Never substitute Thai script.'
    : 'The requested output is Cambodian Khmer in Khmer script. Preserve English names and product terms where appropriate. Never substitute Thai script.';
}

export function assertVideoLanguage(
  texts: string[],
  language: CreatorLanguage,
) {
  const content = texts.join(' ');
  // A script mismatch must fail and refund, not turn a misheard Thai transcript
  // into plausible Khmer by translating speech the user never actually said.
  if (
    containsThaiScript(content) ||
    (language === 'KHMER' && !/[\u1780-\u17B3]/u.test(content))
  ) {
    throw new Error(
      'Creator video output did not match the requested language',
    );
  }
}
