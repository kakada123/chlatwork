import { createHash } from 'node:crypto';
import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureAvailabilityService } from '../feature-availability/feature-availability.service';
import type { BotKind } from '../bot-admin/bot-access.service';
import { GroupAccessService } from './group-access.service';
import type { GroupContext, GroupFeatures } from './group-workspaces.types';

const PLATFORM = {
  voting: ['telegram:group-voting', 'telegram:voting'],
  split: ['telegram:bill-split'],
  khqr: ['telegram:khqr'],
  creator: [],
};
@Injectable()
export class GroupFeaturePolicy {
  constructor(
    private readonly groups: GroupAccessService,
    @Optional() private readonly availability: FeatureAvailabilityService,
    private readonly prisma: PrismaService,
  ) {}
  async assertEnabled(context: GroupContext, feature: keyof GroupFeatures) {
    const current = await this.groups.connection(
      context.bot,
      context.workspaceId,
    );
    if (
      !this.groups.active(current) ||
      current.chatId !== context.chatId ||
      !current[feature]
    )
      throw new ForbiddenException('Group feature unavailable.');
    for (const key of PLATFORM[feature])
      if (this.availability && !(await this.availability.isEnabled(key)))
        throw new ForbiddenException('Group feature unavailable.');
    // Cached bot IDs are safe; its role in this particular group is checked live.
    if (
      !(await this.groups.verifyRole(
        context.bot,
        context.chatId,
        String(await this.groups.botId(context.bot)),
        false,
      ))
    )
      throw new ForbiddenException('Group feature unavailable.');
    return current;
  }
  async chat(
    bot: BotKind,
    chatId: string,
    feature: keyof GroupFeatures,
    telegramUserId?: string,
  ) {
    const context = telegramUserId
      ? await this.groups.member(bot, chatId, telegramUserId)
      : await this.groups.forChat(bot, chatId);
    if (!context) throw new ForbiddenException('Group feature unavailable.');
    return this.assertEnabled(context, feature);
  }
  async paid(bot: BotKind, chatId: string, telegramUserId: string) {
    return this.chat(bot, chatId, 'creator', telegramUserId);
  }

  async record(
    bot: BotKind,
    chatId: string,
    telegramUserId: string,
    action:
      'VOTE_CAST' | 'PARTICIPATION_CHANGED' | 'SPLIT_CREATED' | 'KHQR_SHOWN',
    event: string,
  ) {
    const context = await this.groups.forChat(bot, chatId);
    if (!context) return;
    const key = createHash('sha256')
      .update(JSON.stringify([bot, chatId, telegramUserId, action, event]))
      .digest('hex');
    await this.prisma.telegramGroupAudit.upsert({
      where: { operationKey: 'usage:' + key },
      create: {
        workspaceId: context.workspaceId,
        bot,
        telegramUserId: BigInt(telegramUserId),
        action,
        operationKey: 'usage:' + key,
      },
      update: {},
    });
  }

  async callback(context: GroupContext, data: string) {
    let match = /^poll:(cast|join|leave):([0-9a-f-]{36})(?::|$)/i.exec(data);
    if (match)
      return Boolean(
        await this.prisma.momentVoteRound.findFirst({
          where: {
            id: match[2],
            telegramChatId: BigInt(context.chatId),
            moment: { groupWorkspaceId: context.workspaceId },
          },
          select: { id: true },
        }),
      );
    match = /^poll:(vote|daily):([0-9a-f-]{36})(?::|$)/i.exec(data);
    if (match)
      return Boolean(
        await this.prisma.moment.findFirst({
          where: { id: match[2], groupWorkspaceId: context.workspaceId },
          select: { id: true },
        }),
      );
    const split = /^split:toggle:([0-9a-f-]{36})(?::|$)/i.exec(data);
    if (split)
      return Boolean(
        await this.prisma.telegramGroupSplitParticipant.findFirst({
          where: {
            id: split[1],
            split: { telegramChatId: BigInt(context.chatId) },
          },
          select: { id: true },
        }),
      );
    // Legacy reset/confirmation keyboards carry compact IDs and are handled only
    // for approved administrators by their existing sender-bound validation.
    return data.startsWith('khqr:member:');
  }
}
