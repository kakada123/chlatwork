import type { TelegramInlineKeyboard } from './telegram-bot.types';

export interface TelegramPollResult {
  optionId: string;
  label: string;
  votes: number;
  voters?: string[];
}

export interface TelegramVotingPoll {
  id: string;
  slug: string;
  title: string;
  question: string;
  identityMode: 'ANONYMOUS' | 'NAME_REQUIRED' | 'LOGIN_REQUIRED';
  voteDate?: string;
  totalVotes: number;
  results: TelegramPollResult[];
}

function buttonLabel(label: string, votes: number) {
  const suffix = ` · ${votes}`;
  const available = Math.max(1, 64 - suffix.length);
  const trimmed =
    label.length > available
      ? `${label.slice(0, Math.max(1, available - 1))}…`
      : label;
  return `${trimmed}${suffix}`;
}

export function buildTelegramPollMessage(poll: TelegramVotingPoll) {
  const lines = [
    `🗳 ${poll.title}`,
    '',
    poll.question,
    ...(poll.voteDate ? [`📅 ${poll.voteDate}`] : []),
    '',
    ...poll.results.flatMap((result, index) => {
      const percent = poll.totalVotes
        ? Math.round((result.votes / poll.totalVotes) * 100)
        : 0;
      const resultLine = `${index + 1}. ${result.label} — ${result.votes} (${percent}%)`;
      const names = result.voters?.length
        ? `   Voters: ${result.voters.join(', ')}`
        : '';
      return names ? [resultLine, names] : [resultLine];
    }),
    '',
    `Total votes: ${poll.totalVotes}`,
    poll.voteDate
      ? 'Tap an option below. Everyone can vote again tomorrow.'
      : 'Tap an option below. You can change your vote.',
  ];
  const message = lines.join('\n');
  if (message.length <= 4_096) return message;

  // Large groups still get complete counts even when the voter-name detail is too long for Telegram.
  return lines.filter((line) => !line.startsWith('   Voters: ')).join('\n');
}

export function buildTelegramPollKeyboard(
  poll: TelegramVotingPoll,
  publicUrl: string,
): TelegramInlineKeyboard {
  return {
    inline_keyboard: [
      ...poll.results.map((result) => [
        {
          text: buttonLabel(result.label, result.votes),
          callback_data: `poll:vote:${poll.id}:${result.optionId}`,
        },
      ]),
      [{ text: 'Open full Moment', url: publicUrl }],
    ],
  };
}
