import {
  CreatorVideoToolsService,
  matchesCreatorMediaMagic,
  verifiedCreatorMediaDuration,
} from './creator-video-tools.service';
import type { ConfigService } from '@nestjs/config';

describe('Creator media validation', () => {
  it.each([
    ['audio/mp4', Buffer.from('0000ftypM4A ')],
    ['audio/mpeg', Buffer.from('ID3')],
    ['audio/wav', Buffer.from('RIFF0000WAVE')],
    ['audio/webm', Buffer.from([0x1a, 0x45, 0xdf, 0xa3])],
    ['audio/ogg', Buffer.from('OggS')],
    ['audio/flac', Buffer.from('fLaC')],
  ])('recognizes %s while rejecting a forged header', (mime, header) => {
    expect(matchesCreatorMediaMagic(header, mime)).toBe(true);
    expect(
      matchesCreatorMediaMagic(Buffer.from('<html>not audio</html>'), mime),
    ).toBe(false);
  });

  it('rejects an unknown MIME instead of accepting any MP4 header', () => {
    expect(
      matchesCreatorMediaMagic(
        Buffer.from('0000ftyp'),
        'application/octet-stream',
      ),
    ).toBe(false);
  });

  it('rejects missing audio and video disguised as audio-only MP4', () => {
    expect(() =>
      verifiedCreatorMediaDuration(
        { format: { duration: '10' }, streams: [{ codec_type: 'video' }] },
        'video/mp4',
      ),
    ).toThrow();
    expect(() =>
      verifiedCreatorMediaDuration(
        {
          format: { duration: '10' },
          streams: [{ codec_type: 'audio' }, { codec_type: 'video' }],
        },
        'audio/mp4',
      ),
    ).toThrow();
  });

  it('uses verified duration including delayed audio and rounds up for credits', () => {
    expect(
      verifiedCreatorMediaDuration(
        { format: { duration: '60.1' }, streams: [{ codec_type: 'audio' }] },
        'audio/mp4',
      ),
    ).toBe(61);
    expect(
      verifiedCreatorMediaDuration(
        {
          streams: [{ codec_type: 'audio', start_time: '2', duration: '60.1' }],
        },
        'audio/mp4',
      ),
    ).toBe(63);
  });

  it.each(['N/A', 'NaN', 'Infinity', '0', '-1'])(
    'rejects unverified duration %s',
    (duration) => {
      expect(() =>
        verifiedCreatorMediaDuration(
          { format: { duration }, streams: [{ codec_type: 'audio' }] },
          'audio/wav',
        ),
      ).toThrow();
    },
  );
});

describe('Creator subtitle phrases', () => {
  const tools = new CreatorVideoToolsService({} as ConfigService);

  it('shows Khmer speech as short, separate timed cues', () => {
    const source =
      'ពាក់មួកជាប់ហើយ អត់ទាន់ដោះ ហើយដោយសារប្រញាប់ដឹកឱ្យគេ ហើយឥឡូវហើយ យើងធ្វើ';
    const cues = tools
      .srt([{ start: 1, end: 13, text: source }], 'SHORT_PHRASES')
      .split('\n\n');
    const lines = cues.map((cue) => cue.split('\n'));

    expect(lines.map((line) => line[2])).toEqual([
      'ពាក់មួកជាប់ហើយ',
      'អត់ទាន់ដោះ',
      'ហើយដោយសារ',
      'ប្រញាប់ដឹកឱ្យគេ',
      'ហើយឥឡូវហើយ',
      'យើងធ្វើ',
    ]);
    expect(lines.map((line) => line[0])).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
    expect(lines[0][1]).toMatch(/^00:00:01,000 --> /);
    expect(lines.at(-1)![1]).toMatch(/ --> 00:00:13,000$/);
    for (let index = 1; index < lines.length; index++) {
      expect(lines[index][1].split(' --> ')[0]).toBe(
        lines[index - 1][1].split(' --> ')[1],
      );
    }
  });

  it('keeps an English phrase together and avoids unreadably fast cues', () => {
    const text = 'Today we are going to make a very simple example for everyone.';
    const cues = tools
      .srt([{ start: 0, end: 1, text }], 'SHORT_PHRASES')
      .split('\n\n');
    expect(cues).toHaveLength(1);
    expect(cues[0]).toContain(text);
  });
});
