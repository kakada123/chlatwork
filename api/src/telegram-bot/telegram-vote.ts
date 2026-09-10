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
  roundId?: string;
  closesAt?: string;
  timeZone?: string;
  closed?: boolean;
  participants?: string[];
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

function formatVoteDeadline(closesAt: string, timeZone = 'Asia/Phnom_Penh') {
  // Display the schedule's local time while retaining the absolute deadline for voting.
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
  const highest = Math.max(0, ...poll.results.map((result) => result.votes));
  const winners = poll.results.filter((result) => result.votes === highest);
  const showVoters = poll.identityMode !== 'ANONYMOUS';
  const lines = [
    `${closed ? '🏁' : '🗳'} ${poll.title}`,
    ...(poll.question !== poll.title ? [poll.question] : []),
    ...(poll.voteDate && (!poll.closesAt || closed)
      ? [`📅 ${poll.voteDate}`]
      : []),
    ...(!closed && poll.closesAt
      ? [
          `⏳ ${Math.max(1, Math.ceil((new Date(poll.closesAt).getTime() - now.getTime()) / 60000))} min left · closes ${formatVoteDeadline(poll.closesAt, poll.timeZone)}`,
        ]
      : []),
    '',
    ...(closed || showVoters
      ? poll.results.flatMap((result) => [
          `${result.label} · ${result.votes}`,
          ...(showVoters && result.voters?.length
            ? [`  ↳ ${result.voters.join(', ')}`]
            : []),
        ])
      : []),
    `Votes: ${poll.totalVotes}${poll.roundId ? ` · Joined: ${poll.participants?.length ?? 0}` : ''}`,
    ...(closed
      ? [
          highest === 0
            ? 'No votes this round.'
            : `${winners.length > 1 ? '🤝 Tie' : '🏆 Winner'}: ${winners.map((result) => result.label).join(', ')}`,
        ]
      : []),
    ...(poll.roundId
      ? [
          closed
            ? 'Split equally: reply /split 60 (bill total).'
            : 'Joined by default · equal split. Tap “Not joining” to skip.',
        ]
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
  return {
    inline_keyboard: [
      ...(closed
        ? []
        : poll.results.map((result) => [
            {
              text: buttonLabel(result.label, result.votes),
              callback_data: poll.roundId
                ? `poll:cast:${poll.roundId}:${result.optionId}`
                : `poll:vote:${poll.id}:${result.optionId}`,
            },
          ])),
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
