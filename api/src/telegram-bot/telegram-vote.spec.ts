import {
  buildTelegramPollKeyboard,
  buildTelegramPollMessage,
  buildTelegramPollUpdates,
  type TelegramVotingPoll,
} from './telegram-vote';

const poll: TelegramVotingPoll = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'lunch-vote-abc123',
  title: 'Team lunch',
  question: 'Where should we eat?',
  identityMode: 'ANONYMOUS',
  totalVotes: 4,
  results: [
    { optionId: 'option-1', label: 'Khmer food', votes: 3 },
    { optionId: 'option-2', label: 'Pizza', votes: 1 },
  ],
};

describe('Telegram voting poll', () => {
  it('shows counts and percentages', () => {
    const message = buildTelegramPollMessage(poll);
    expect(message).toContain('Khmer food — 3 (75%)');
    expect(message).toContain('Total votes: 4');
  });

  it('shows the daily round and named voters when identity is visible', () => {
    const message = buildTelegramPollMessage({
      ...poll,
      identityMode: 'NAME_REQUIRED',
      voteDate: '2026-09-04',
      results: [
        {
          optionId: 'option-1',
          label: 'Khmer food',
          votes: 2,
          voters: ['Sokha', 'Dara'],
        },
      ],
      totalVotes: 2,
    });

    expect(message).toContain('📅 2026-09-04');
    expect(message).toContain('Voters: Sokha, Dara');
    expect(message).toContain('vote again tomorrow');
  });

  it('builds bounded callbacks for every option', () => {
    const keyboard = buildTelegramPollKeyboard(
      poll,
      'https://chlatwork.com/m/lunch-vote-abc123',
    );
    expect(keyboard.inline_keyboard[0]?.[0]?.callback_data).toBe(
      'poll:vote:00000000-0000-4000-8000-000000000001:option-1',
    );
    expect(
      keyboard.inline_keyboard[0]?.[0]?.callback_data?.length,
    ).toBeLessThanOrEqual(64);
    expect(keyboard.inline_keyboard.at(-1)?.[0]?.url).toContain(
      '/m/lunch-vote-abc123',
    );
  });

  it('uses real mentions with correct emoji offsets and literal display names', () => {
    const [message] = buildTelegramPollUpdates(
      { ...poll, identityMode: 'NAME_REQUIRED' },
      [{ telegramUserId: '123', displayName: '😀 <Dara> & Sokha' }],
    );
    const mention = message!.entities[0]!;
    expect(
      message!.text.slice(mention.offset, mention.offset + mention.length),
    ).toBe('😀 <Dara> & Sokha');
    expect(mention.user.id).toBe(123);
  });

  it('splits large rosters without dropping members or exceeding Telegram limits', () => {
    const members = Array.from({ length: 160 }, (_, index) => ({
      telegramUserId: String(index + 1),
      displayName: 'Member '.repeat(11),
    }));
    const messages = buildTelegramPollUpdates(
      { ...poll, identityMode: 'NAME_REQUIRED' },
      members,
    );
    expect(messages.length).toBeGreaterThan(1);
    expect(messages.flatMap((message) => message.entities)).toHaveLength(160);
    for (const message of messages) {
      expect(message.text.length).toBeLessThanOrEqual(4_096);
      expect(message.entities.length).toBeLessThanOrEqual(50);
      for (const mention of message.entities) {
        expect(
          message.text.slice(mention.offset, mention.offset + mention.length),
        ).toBe(mention.user.first_name);
      }
    }
  });

  it('omits participation reminders for anonymous polls and completed rosters', () => {
    expect(
      buildTelegramPollUpdates(poll, [
        { telegramUserId: '123', displayName: 'Dara' },
      ])[0]!.entities,
    ).toEqual([]);
    expect(
      buildTelegramPollUpdates(
        { ...poll, identityMode: 'NAME_REQUIRED' },
        [],
      )[0]!.text,
    ).not.toContain('Not voted yet');
  });
});


describe('Timed Telegram result presentation', () => {
  const timed = {
    ...poll,
    roundId: '00000000-0000-4000-8000-000000000003',
    closesAt: '2099-09-08T03:30:00Z',
  };
  it('formats fractional UTC deadlines in Cambodia time without changing the countdown', () => {
    const message = buildTelegramPollMessage(
      { ...timed, closesAt: '2026-09-09T03:30:00.903Z' },
      new Date('2026-09-09T03:26:01Z'),
    );
    expect(message).toContain(
      '⏳ 4 min left · closes 09 Sept 2026, 10:30 (Asia/Phnom_Penh)',
    );
    expect(message).not.toContain('.903Z');
  });
  it('uses the configured schedule timezone, including a different local date', () => {
    const message = buildTelegramPollMessage(
      {
        ...timed,
        closesAt: '2026-09-09T03:30:00.903Z',
        timeZone: 'America/New_York',
      },
      new Date('2026-09-09T03:26:01Z'),
    );
    expect(message).toContain(
      '⏳ 4 min left · closes 08 Sept 2026, 23:30 (America/New_York)',
    );
  });
  it('shows a countdown and separate join/opt-out buttons', () => {
    expect(
      buildTelegramPollMessage(timed, new Date('2099-09-08T03:00:00Z')),
    ).toContain('30 min left');
    expect(buildTelegramPollMessage(timed)).toContain('join by default');
    const buttons = buildTelegramPollKeyboard(
      timed,
      'https://example.com',
    ).inline_keyboard.flat();
    expect(buttons.some((button) => button.text === 'Not joining')).toBe(true);
    expect(
      buttons
        .filter((button) => button.callback_data)
        .every((button) => Buffer.byteLength(button.callback_data!) <= 64),
    ).toBe(true);
  });
  it('celebrates the winner and removes all actions after closing', () => {
    const final = { ...timed, closed: true, participants: ['Dara', 'Sokha'] };
    expect(buildTelegramPollMessage(final)).toContain(
      '🏆🎉 Winner: Khmer food',
    );
    expect(buildTelegramPollMessage(final)).toContain(
      'Participants: Dara, Sokha',
    );
    expect(
      buildTelegramPollKeyboard(final, 'https://example.com')
        .inline_keyboard.flat()
        .every((button) => !button.callback_data),
    ).toBe(true);
  });
  it('celebrates tied winners and does not invent a winner for zero votes', () => {
    expect(
      buildTelegramPollMessage({
        ...timed,
        closed: true,
        totalVotes: 2,
        results: poll.results.map((result) => ({ ...result, votes: 1 })),
      }),
    ).toContain('Tied winners: Khmer food, Pizza');
    const empty = buildTelegramPollMessage({
      ...timed,
      closed: true,
      totalVotes: 0,
      results: poll.results.map((result) => ({ ...result, votes: 0 })),
    });
    expect(empty).toContain('No votes were cast.');
    expect(empty).not.toContain('Winner:');
  });
});
