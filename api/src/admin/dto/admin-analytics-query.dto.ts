import { IsIn, IsOptional } from 'class-validator';

export class AdminAnalyticsQueryDto {
  @IsOptional()
  @IsIn(['7d', '30d', '90d'])
  range: '7d' | '30d' | '90d' = '30d';
}
