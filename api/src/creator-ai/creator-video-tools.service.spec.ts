import {
  matchesCreatorMediaMagic,
  verifiedCreatorMediaDuration,
} from './creator-video-tools.service';

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
