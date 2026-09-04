import {
  buildTelegramPollKeyboard,
  buildTelegramPollMessage,
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
});
