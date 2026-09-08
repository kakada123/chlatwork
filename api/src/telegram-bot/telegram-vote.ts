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

export function buildTelegramPollMessage(
  poll: TelegramVotingPoll,
  now = new Date(),
) {
  const closed =
    poll.closed || Boolean(poll.closesAt && new Date(poll.closesAt) <= now);
  const highest = Math.max(0, ...poll.results.map((result) => result.votes));
  const winners = poll.results.filter((result) => result.votes === highest);
  const lines = [
    `${closed ? '🎉 Final results ·' : '🗳'} ${poll.title}`,
    '',
    poll.question,
    ...(poll.voteDate ? [`📅 ${poll.voteDate}`] : []),
    ...(poll.closesAt
      ? [
          closed
            ? 'Voting closed.'
            : `⏳ ${Math.max(1, Math.ceil((new Date(poll.closesAt).getTime() - now.getTime()) / 60000))} min left · closes ${new Date(poll.closesAt).toISOString().replace('T', ' ').replace(':00.000Z', ' UTC')}`,
        ]
      : []),
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
    ...(closed
      ? [
          highest === 0
            ? 'No votes were cast.'
            : `${winners.length > 1 ? '🎉 Tied winners' : '🏆🎉 Winner'}: ${winners.map((result) => result.label).join(', ')}${highest ? ' 🥳' : ''}`,
        ]
      : []),
    ...(poll.roundId
      ? [
          closed
            ? `Joined: ${poll.participants?.length ?? 0}. Reply /split 60 with the bill total to split equally.`
            : 'Known group members join by default and split the bill equally (ចែកលុយស្មើ). Tap “Not joining” before time runs out.',
        ]
      : []),
    ...(poll.participants?.length
      ? [`Participants: ${poll.participants.join(', ')}`]
      : []),
    closed
      ? 'This round is final.'
      : poll.voteDate
        ? 'Tap an option below. Everyone can vote again tomorrow.'
        : 'Tap an option below. You can change your vote.',
  ];
  const message = lines.join('\n');
  if (message.length <= 4_096) return message;

  // Large groups still get complete counts even when the voter-name detail is too long for Telegram.
  return lines
    .filter(
      (line) =>
        !line.startsWith('   Voters: ') && !line.startsWith('Participants: '),
    )
    .join('\n');
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
