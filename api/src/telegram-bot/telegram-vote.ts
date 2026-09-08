import type {
  TelegramInlineKeyboard,
  TelegramTextMention,
} from './telegram-bot.types';

export interface TelegramVotingMember {
  telegramUserId: string;
  displayName: string;
}

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

export function buildTelegramPollUpdates(
  poll: TelegramVotingPoll,
  pendingMembers: TelegramVotingMember[],
) {
  const messages: Array<{ text: string; entities: TelegramTextMention[] }> = [
    { text: buildTelegramPollMessage(poll), entities: [] },
  ];
  // Announcing who remains would reveal participation in an anonymous poll.
  if (poll.identityMode === 'ANONYMOUS') return messages;
  const heading = '\n\nNot voted yet (known group members):\n';
  let current = messages[0]!;
  if (pendingMembers.length) {
    if (current.text.length + heading.length + 80 > 4_096) {
      current = { text: '', entities: [] };
      messages.push(current);
    }
    current.text += heading;
  }
  for (const member of pendingMembers) {
    const name = member.displayName.slice(0, 80) || 'Telegram member';
    // Telegram offsets use UTF-16 code units, matching JavaScript string lengths.
    if (
      current.text.length + name.length + 2 > 4_096 ||
      current.entities.length >= 50
    ) {
      current = { text: heading.trimStart(), entities: [] };
      messages.push(current);
    }
    const separator = current.entities.length ? ', ' : '';
    current.text += separator;
    current.entities.push({
      type: 'text_mention',
      offset: current.text.length,
      length: name.length,
      user: {
        id: Number(member.telegramUserId),
        first_name: name,
        is_bot: false,
      },
    });
    current.text += name;
  }
  return messages;
}
