import type { ConfigService } from '@nestjs/config';

export function useGemini(config: ConfigService): boolean {
  return String(config.get('AI_USE_GEMINI')).toLowerCase() === 'true';
}

export function configuredAiKey(
  config: ConfigService,
  name: 'GEMINI_API_KEY' | 'OPENAI_API_KEY',
): string | null {
  const value = config.get<string>(name)?.trim();
  return value && !/^(dummy_|replace_)/i.test(value) ? value : null;
}
