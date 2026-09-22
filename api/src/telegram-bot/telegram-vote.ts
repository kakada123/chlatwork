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
  imageId?: string;
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
  roundId?: string;
  closesAt?: string;
  timeZone?: string;
  closed?: boolean;
  participants?: string[];
  totalVotes: number;
  results: TelegramPollResult[];
}

function buttonLabel(label: string) {
  return label.length > 64 ? `${label.slice(0, 63)}…` : label;
}

function formatVoteDeadline(closesAt: string, timeZone = 'Asia/Phnom_Penh') {
  // Report the final closing time in the schedule's local time zone.
  const localTime = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(closesAt));
  return `${localTime} (${timeZone})`;
}

export function buildTelegramPollMessage(
  poll: TelegramVotingPoll,
  now = new Date(),
) {
  const closed =
    poll.closed || Boolean(poll.closesAt && new Date(poll.closesAt) <= now);
  // Keep open polls compact; reveal counts and named ballots with final results.
  if (!closed) return `🗳 ${poll.title}`;
  const highest = Math.max(0, ...poll.results.map((result) => result.votes));
  const winners = poll.results.filter((result) => result.votes === highest);
  const showVoters = poll.identityMode !== 'ANONYMOUS';
  const lines = [
    `🏁 ${poll.title}`,
    ...(poll.question !== poll.title ? [poll.question] : []),
    ...(poll.voteDate ? [`📅 ${poll.voteDate}`] : []),
    ...(poll.closesAt
      ? [`Closed ${formatVoteDeadline(poll.closesAt, poll.timeZone)}`]
      : []),
    '',
    ...poll.results.flatMap((result) => [
      `${result.label} · ${result.votes}`,
      ...(showVoters && result.voters?.length
        ? [`  ↳ ${result.voters.join(', ')}`]
        : []),
    ]),
    `Votes: ${poll.totalVotes}${poll.roundId ? ` · Joined: ${poll.participants?.length ?? 0}` : ''}`,
    highest === 0
      ? 'No votes this round.'
      : `${winners.length > 1 ? '🤝 Tie' : '🏆 Winner'}: ${winners.map((result) => result.label).join(', ')}`,
    ...(poll.roundId
      ? ['Split equally: reply /split 60 (bill total).']
      : []),
  ];
  const message = lines.join('\n');
  if (message.length <= 4_096) return message;

  // Keep counts deliverable when a large voter list exceeds Telegram's limit.
  return [
    ...lines.filter((line) => !line.startsWith('  ↳ ')),
    'Voter names: tap Details.',
  ].join('\n');
}

export function buildTelegramPollKeyboard(
  poll: TelegramVotingPoll,
  publicUrl: string,
): TelegramInlineKeyboard {
  const closed =
    poll.closed ||
    Boolean(poll.closesAt && Date.parse(poll.closesAt) <= Date.now());
  const voteButtons = closed
    ? []
    : poll.results.map((result) => ({
        text: buttonLabel(result.label),
        callback_data: poll.roundId
          ? `poll:cast:${poll.roundId}:${result.optionId}`
          : `poll:vote:${poll.id}:${result.optionId}`,
      }));
  const voteRows: TelegramInlineKeyboard['inline_keyboard'] = [];
  for (let index = 0; index < voteButtons.length; index += 4) {
    voteRows.push(voteButtons.slice(index, index + 4));
  }
  return {
    inline_keyboard: [
      ...voteRows,
      ...(poll.roundId && !closed
        ? [
            [
              { text: 'Join ✅', callback_data: `poll:join:${poll.roundId}` },
              {
                text: 'Not joining',
                callback_data: `poll:leave:${poll.roundId}`,
              },
            ],
          ]
        : []),
      [{ text: 'Details', url: publicUrl }],
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
  const heading = '\n\nYour turn: ';
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
