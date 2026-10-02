import { BadRequestException } from '@nestjs/common';
import {
  normalizeProfileSlug,
  normalizeLinkUrl,
  detectLinkType,
  validateReorder,
} from './profile-policy';

describe('ChlatWork Link public input boundaries', () => {
  it('normalizes usernames and rejects reserved or ambiguous slugs', () => {
    expect(normalizeProfileSlug(' Kakada ')).toBe('kakada');
    for (const slug of [
      'admin',
      'chlatwork',
      'ab',
      'a/b',
      '-abc',
      'abc-',
      'a'.repeat(41),
    ]) {
      expect(() => normalizeProfileSlug(slug)).toThrow(BadRequestException);
    }
  });
  it('accepts web, email, and phone links without permitting executable URLs', () => {
    expect(normalizeLinkUrl('https://example.com/shop?q=book')).toContain(
      '/shop?q=book',
    );
    expect(normalizeLinkUrl('mailto:hello@example.com')).toBe(
      'mailto:hello@example.com',
    );
    expect(normalizeLinkUrl('tel:+85512345678')).toBe('tel:+85512345678');
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,test',
      '//example.com',
      'https://user:pass@example.com',
      'https://localhost',
      'https://127.0.0.1',
      'mailto:bad',
      'tel:abc',
      'https://example.com\n',
    ]) {
      expect(() => normalizeLinkUrl(url)).toThrow(BadRequestException);
    }
  });
  it('detects actual platform hosts without trusting lookalikes', () => {
    expect(detectLinkType('https://www.instagram.com/kakada')).toBe(
      'instagram',
    );
    expect(detectLinkType('https://t.me/kakada')).toBe('telegram');
    expect(detectLinkType('https://github.com/kakada')).toBe('github');
    expect(detectLinkType('https://instagram.com.evil.example')).toBe('custom');
    expect(detectLinkType('https://notinstagram.com')).toBe('custom');
    expect(detectLinkType('mailto:hi@example.com')).toBe('email');
  });
  it('requires an exact permutation when reordering links', () => {
    expect(() => validateReorder(['a', 'b'], ['b', 'a'])).not.toThrow();
    for (const ids of [['a'], ['a', 'a'], ['a', 'foreign']]) {
      expect(() => validateReorder(['a', 'b'], ids)).toThrow(
        BadRequestException,
      );
    }
  });
});
