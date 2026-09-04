import type { ConfigService } from '@nestjs/config';
import { AiFeature } from '@prisma/client';
import { CreatorPricingService } from './creator-pricing.service';
import { CreatorVideoToolsService } from './creator-video-tools.service';

describe('Creator pricing and subtitle utilities', () => {
  const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;

  it('uses centralized fixed credit defaults', () => {
    const pricing = new CreatorPricingService(config);
    expect(pricing.fixed(AiFeature.POST)).toBe(2);
    expect(pricing.fixed(AiFeature.SCRIPT)).toBe(4);
    expect(pricing.fixed(AiFeature.HOOK)).toBe(1);
  });

  it('bills a 61 second video as two complete minutes', () => {
    const pricing = new CreatorPricingService(config);
    expect(pricing.video(AiFeature.VIDEO_CAPTION, 61)).toBe(6);
    expect(pricing.video(AiFeature.VIDEO_SUBTITLE, 61)).toBe(10);
  });

  it('generates valid SRT timestamps without changing segment timing', () => {
    const tools = new CreatorVideoToolsService(config);
    expect(
      tools.srt([
        { start: 0, end: 3.2, text: 'សួស្តីអ្នកទាំងអស់គ្នា' },
        { start: 3.2, end: 6.5, text: 'ថ្ងៃនេះខ្ញុំនឹងបង្ហាញ' },
      ]),
    ).toBe(
      '1\n00:00:00,000 --> 00:00:03,200\nសួស្តីអ្នកទាំងអស់គ្នា\n\n' +
        '2\n00:00:03,200 --> 00:00:06,500\nថ្ងៃនេះខ្ញុំនឹងបង្ហាញ',
    );
  });
});
