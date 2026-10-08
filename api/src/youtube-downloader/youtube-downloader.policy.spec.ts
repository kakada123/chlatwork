import {
  normalizeYoutubeUrl,
  readYoutubePreview,
  selectYoutubeFormat,
} from './youtube-downloader.policy';

const id = 'BaW_jenozKc';
const format = (height: number) => ({
  format_id: `v${height}`,
  height,
  ext: 'mp4',
  vcodec: 'avc1.640028',
  acodec: 'none',
});
const metadata = () => ({
  id,
  title: 'My video',
  duration: 120,
  availability: 'public',
  formats: [
    format(360),
    format(720),
    format(1080),
    { format_id: 'audio', ext: 'm4a', vcodec: 'none', acodec: 'mp4a.40.2' },
  ],
});

describe('YouTube video policy', () => {
  test.each([
    `https://www.youtube.com/watch?v=${id}&list=ignored`,
    `https://m.youtube.com/shorts/${id}?feature=share`,
    `https://youtu.be/${id}?si=ignored`,
    `https://youtube.com/embed/${id}`,
  ])('normalizes a supported link: %s', (url) => {
    expect(normalizeYoutubeUrl(url)).toEqual({
      videoId: id,
      url: `https://www.youtube.com/watch?v=${id}`,
    });
  });

  test.each([
    'https://youtube.com.evil.test/watch?v=BaW_jenozKc',
    'https://evil.test/?youtube.com=BaW_jenozKc',
    `https://user:password@youtube.com/watch?v=${id}`,
    `https://youtube.com:8443/watch?v=${id}`,
    `http://youtube.com/watch?v=${id}`,
    `file:///watch?v=${id}`,
    'https://youtube.com/playlist?list=abc',
    'https://youtube.com/watch?v=invalid',
    `https://youtu.be/${id}/extra`,
    `https://youtube.com/watch?v=${id}&v=XXXXXXXXXXX`,
    `https://youtube.com/redirect?v=${id}`,
  ])('rejects an unsafe or unsupported link: %s', (url) => {
    expect(() => normalizeYoutubeUrl(url)).toThrow();
  });

  it('returns sanitized metadata and available compatible qualities only', () => {
    expect(readYoutubePreview(metadata(), id)).toEqual({
      videoId: id,
      title: 'My video',
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      durationSeconds: 120,
      qualities: [360, 720, 1080],
    });
    expect(selectYoutubeFormat(metadata(), id, 720)).toBe('v720+audio');
  });

  test.each([
    { is_live: true },
    { live_status: 'is_upcoming' },
    { has_drm: true },
    { availability: 'private' },
    { age_limit: 18 },
    { duration: 1201 },
    { duration: 0 },
    { duration: null },
    { id: 'XXXXXXXXXXX' },
    { formats: [format(720)] },
    { formats: [{ ...format(720), vcodec: 'vp9' }] },
    { formats: [{ ...format(720), acodec: 'mp4a.40.2', filesize: 209715201 }] },
  ])('rejects restricted, oversized or unsupported metadata: %s', (override) => {
    expect(() => readYoutubePreview({ ...metadata(), ...override }, id)).toThrow();
  });

  it('excludes DRM formats and heights above 1080', () => {
    const raw = metadata();
    raw.formats.push({ ...format(480), has_drm: true } as ReturnType<typeof format>);
    raw.formats.push(format(2160));
    expect(readYoutubePreview(raw, id).qualities).toEqual([360, 720, 1080]);
  });
  it('offers portrait Shorts quality by the shorter dimension', () => {
    const audio = { format_id: 'audio', ext: 'm4a', vcodec: 'none', acodec: 'mp4a.40.2' };
    expect(
      readYoutubePreview({ ...metadata(), formats: [{ ...format(1280), width: 720 }, audio] }, id)
        .qualities,
    ).toEqual([720]);
    expect(
      selectYoutubeFormat(
        { ...metadata(), formats: [{ ...format(1280), width: 720 }, audio] },
        id,
        720,
      ),
    ).toBe('v1280+audio');
  });
  it('selects the eligible progressive file instead of an oversized competing adaptive format', () => {
    const raw = {
      ...metadata(),
      formats: [
        { ...format(720), format_id: 'progressive', acodec: 'mp4a.40.2', filesize: 100_000_000 },
        { ...format(720), format_id: 'oversized', filesize: 250_000_000, tbr: 5000 },
        {
          format_id: 'audio',
          ext: 'm4a',
          vcodec: 'none',
          acodec: 'mp4a.40.2',
          filesize: 10_000_000,
        },
      ],
    };
    expect(readYoutubePreview(raw, id).qualities).toEqual([720]);
    expect(selectYoutubeFormat(raw, id, 720)).toBe('progressive');
  });
  it('rejects provider format IDs that could become format expressions', () => {
    expect(() =>
      selectYoutubeFormat(
        { ...metadata(), formats: [{ ...format(720), format_id: '18/best', acodec: 'mp4a.40.2' }] },
        id,
        720,
      ),
    ).toThrow();
  });
});
