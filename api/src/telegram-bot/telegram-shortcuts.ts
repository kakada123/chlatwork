import type { TelegramReplyMarkup } from './telegram-bot.types';

interface TelegramShortcut {
  text: string;
  command: string;
  feature?: string;
}

type ShortcutRows = readonly (readonly TelegramShortcut[])[];

export const MENU_SHORTCUT = { text: '☰ Menu', command: 'menu' } as const;

export const CHLATWORK_SHORTCUTS: ShortcutRows = [
  [
    { text: '➕ Add expense', command: 'add', feature: 'telegram:expenses' },
    { text: '📊 Today', command: 'today', feature: 'telegram:spending' },
  ],
  [
    { text: '🕘 Recent', command: 'recent', feature: 'telegram:spending' },
    { text: '💬 Ask spending', command: 'ask', feature: 'telegram:spending' },
  ],
  [
    { text: '🗳 Share a vote', command: 'vote', feature: 'telegram:voting' },
    MENU_SHORTCUT,
  ],
];

export const CREATOR_SHORTCUTS: ShortcutRows = [
  [
    {
      text: '✍️ Grammar',
      command: 'grammar',
      feature: 'creator:KHMER_GRAMMAR',
    },
    {
      text: '🔄 Rewrite',
      command: 'rewrite',
      feature: 'creator:KHMER_REWRITE',
    },
  ],
  [
    {
      text: 'Latin → Khmer',
      command: 'latin',
      feature: 'creator:LATIN_TO_KHMER',
    },
    {
      text: 'Khmer → Latin',
      command: 'khmer_to_latin',
      feature: 'creator:KHMER_TO_LATIN',
    },
  ],
  [
    {
      text: 'Khmer → English',
      command: 'khmer_to_english',
      feature: 'creator:KHMER_TO_ENGLISH',
    },
    {
      text: 'Latin → English',
      command: 'latin_to_english',
      feature: 'creator:LATIN_TO_ENGLISH',
    },
  ],
  [
    {
      text: 'English → Latin',
      command: 'english_to_latin',
      feature: 'creator:ENGLISH_TO_LATIN',
    },
    { text: '✨ Humanize', command: 'humanize', feature: 'creator:HUMANIZE' },
  ],
  [
    { text: '💳 Credits', command: 'credits' },
    { text: '⚙️ Settings', command: 'settings' },
  ],
  [MENU_SHORTCUT],
];

export function telegramShortcutCommand(text: string, rows: ShortcutRows) {
  return rows.flat().find((shortcut) => shortcut.text === text.trim())?.command;
}

export function telegramShortcutKeyboard(
  rows: ShortcutRows,
  disabledKeys: readonly string[],
): TelegramReplyMarkup {
  const disabled = new Set(disabledKeys);
  return {
    keyboard: rows
      .map((row) =>
        row
          .filter(
            (shortcut) => !shortcut.feature || !disabled.has(shortcut.feature),
          )
          .map(({ text }) => ({ text })),
      )
      .filter((row) => row.length > 0),
    is_persistent: true,
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}
