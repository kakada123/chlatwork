import { extractSecurityLinks } from './security-links';

describe('Security URL extraction', () => {
  const message = { message_id: 1, chat: { id: 1, type: 'private' } };
  it('still scans a plain URL covered by a formatting entity', () => {
    const text = 'https://example.com/a';
    expect(
      extractSecurityLinks({
        ...message,
        text,
        entities: [{ type: 'bold', offset: 0, length: text.length }],
      }),
    ).toEqual([{ target: text }]);
  });
  it('retains the target and display label of a disguised link', () => {
    expect(
      extractSecurityLinks({
        ...message,
        text: 'Trusted bank',
        entities: [
          {
            type: 'text_link',
            offset: 0,
            length: 12,
            url: 'https://evil.example.com/login',
          },
        ],
      }),
    ).toEqual([
      { target: 'https://evil.example.com/login', label: 'Trusted bank' },
    ]);
  });
  it('finds plain and caption URLs when entities are missing', () => {
    expect(
      extractSecurityLinks({
        ...message,
        text: 'Go (https://example.com/login).',
        caption: 'Also www.example.com/a?x=1',
      }),
    ).toEqual([
      { target: 'https://example.com/login' },
      { target: 'www.example.com/a?x=1' },
    ]);
  });
  it('does not duplicate Telegram URL entities or lose encoded punctuation', () => {
    const text = 'https://example.com/a_(b)';
    expect(
      extractSecurityLinks({
        ...message,
        text,
        entities: [{ type: 'url', offset: 0, length: text.length }],
      }),
    ).toEqual([{ target: text }]);
  });
});
