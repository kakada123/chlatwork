import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

const presets = ['google-sans', 'hanuman'] as const;

export class UpdateAppearanceDto {
  @IsIn([...presets])
  khmerFont: (typeof presets)[number];
}

@Controller('appearance')
export class AppearanceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  async get() {
    const [row] = await this.prisma.$queryRaw<UpdateAppearanceDto[]>
      `SELECT khmer_font AS "khmerFont" FROM site_appearance WHERE id = 1`;
    return { khmerFont: row?.khmerFont ?? 'google-sans' };
  }

  @Put('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async save(@Body() { khmerFont }: UpdateAppearanceDto) {
    // The singleton key makes simultaneous first saves atomic.
    await this.prisma.$executeRaw`
      INSERT INTO site_appearance (id, khmer_font) VALUES (1, ${khmerFont})
      ON CONFLICT (id) DO UPDATE SET khmer_font = EXCLUDED.khmer_font
    `;
    return { khmerFont };
  }
}
