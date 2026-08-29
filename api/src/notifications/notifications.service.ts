import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@prisma/client';
import {
  TelegramMiniAppDataError,
  verifyTelegramMiniAppData,
} from '../auth/telegram-mini-app';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateTelegramNotificationsDto } from './dto/update-telegram-notifications.dto';

const TELEGRAM_USER_ID_PATTERN = /^[1-9]\d{0,19}$/;
const ENABLED_CONFIRMATION =
  'ChlatWork notifications are enabled. You can turn them off anytime from Account settings.';

interface TelegramBotApiResponse {
  ok?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getTelegramSettings(userId: string) {
    const [enabled, telegramAccount] = await Promise.all([
      this.getTelegramNotificationsEnabled(userId),
      this.findTelegramAccount(userId),
    ]);

    const available = Boolean(
      telegramAccount &&
      TELEGRAM_USER_ID_PATTERN.test(telegramAccount.providerUserId),
    );

    return {
      available,
      enabled,
    };
  }

  async updateTelegramSettings(
    userId: string,
    dto: UpdateTelegramNotificationsDto,
  ) {
    if (!dto.enabled) {
      await this.setTelegramNotificationsEnabled(userId, false);
      const telegramAccount = await this.findTelegramAccount(userId);
      return {
        available: Boolean(
          telegramAccount &&
          TELEGRAM_USER_ID_PATTERN.test(telegramAccount.providerUserId),
        ),
        enabled: false,
      };
    }

    if (!dto.initData) {
      throw new BadRequestException('Telegram Mini App data is required');
    }

    const telegramAccount = await this.findTelegramAccount(userId);
    if (
      !telegramAccount ||
      !TELEGRAM_USER_ID_PATTERN.test(telegramAccount.providerUserId)
    ) {
      throw new BadRequestException(
        'A Telegram account must be connected first',
      );
    }

    const profile = this.verifyMiniAppIdentity(dto.initData);
    if (profile.providerUserId !== telegramAccount.providerUserId) {
      throw new ForbiddenException(
        'Telegram account does not match the signed-in account',
      );
    }

    // Confirm delivery before persisting opt-in so a blocked bot never appears enabled in ChlatWork.
    await this.sendTelegramMessage(
      telegramAccount.providerUserId,
      ENABLED_CONFIRMATION,
    );
    await this.setTelegramNotificationsEnabled(userId, true);

    return { available: true, enabled: true };
  }

  async sendToUser(userId: string, text: string) {
    if (!(await this.getTelegramNotificationsEnabled(userId))) return false;

    const telegramAccount = await this.findTelegramAccount(userId);
    if (
      !telegramAccount ||
      !TELEGRAM_USER_ID_PATTERN.test(telegramAccount.providerUserId)
    ) {
      return false;
    }

    await this.sendTelegramMessage(telegramAccount.providerUserId, text);
    return true;
  }

  private findTelegramAccount(userId: string) {
    return this.prisma.socialAccount.findFirst({
      where: { userId, provider: AuthProvider.TELEGRAM },
      select: { providerUserId: true },
    });
  }

  private async getTelegramNotificationsEnabled(userId: string) {
    // Raw SQL keeps this deploy-safe before the generated Prisma client is refreshed with the migration.
    const rows = await this.prisma.$queryRaw<Array<{ enabled: boolean }>>`
      SELECT telegram_notifications_enabled AS "enabled"
      FROM users
      WHERE id = ${userId}::uuid
      LIMIT 1
    `;
    return rows[0]?.enabled ?? false;
  }

  private async setTelegramNotificationsEnabled(
    userId: string,
    enabled: boolean,
  ) {
    const enabledAt = enabled ? new Date() : null;
    await this.prisma.$executeRaw`
      UPDATE users
      SET telegram_notifications_enabled = ${enabled},
          telegram_notifications_enabled_at = ${enabledAt},
          "updatedAt" = NOW()
      WHERE id = ${userId}::uuid
    `;
  }

  private verifyMiniAppIdentity(initData: string) {
    try {
      return verifyTelegramMiniAppData(
        initData,
        this.config.getOrThrow<string>('TELEGRAM_BOT_TOKEN'),
      );
    } catch (error) {
      if (error instanceof TelegramMiniAppDataError) {
        throw new ForbiddenException(
          'Telegram Mini App data is invalid or expired',
        );
      }
      throw error;
    }
  }

  private async sendTelegramMessage(chatId: string, text: string) {
    if (!text.trim() || text.length > 4_096) {
      throw new BadRequestException('Telegram notification text is invalid');
    }

    const token = this.config.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    let response: Response;

    try {
      response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text }),
          signal: AbortSignal.timeout(8_000),
        },
      );
    } catch {
      // Never surface fetch details because they can contain the bot token URL.
      throw new ServiceUnavailableException(
        'Telegram notification could not be sent',
      );
    }

    let result: TelegramBotApiResponse = {};
    try {
      result = (await response.json()) as TelegramBotApiResponse;
    } catch {
      // A malformed provider response is handled like any other delivery failure.
    }
    if (!response.ok || result.ok !== true) {
      throw new ServiceUnavailableException(
        'Telegram notification could not be sent',
      );
    }
  }
}
