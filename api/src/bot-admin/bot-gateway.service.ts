import { GroupConnectionsService } from '../group-workspaces/group-connections.service';
import { GroupAccessService } from '../group-workspaces/group-access.service';
import { GroupFeaturePolicy } from '../group-workspaces/group-feature-policy';
import { readMemberQrMention } from '../telegram-bot/telegram-member-qr';
import type { TelegramUser } from '../telegram-bot/telegram-bot.types';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  TelegramUpdate,
  TelegramInlineKeyboard,
} from '../telegram-bot/telegram-bot.types';
import { TelegramBotClient } from '../telegram-bot/telegram-bot.client';
import { CreatorTelegramClient } from '../creator-telegram/creator-telegram.client';
import {
  BotAccessService,
  botAccessAllowed,
  type BotKind,
} from './bot-access.service';
import { BotKhqrService, BOT_QR_MAX_BYTES } from './bot-khqr.service';

@Injectable()
export class BotGatewayService {
  constructor(
    private readonly access: BotAccessService,
    private readonly qr: BotKhqrService,
    private readonly config: ConfigService,
    private readonly chlatwork: TelegramBotClient,
    private readonly creator: CreatorTelegramClient,
    @Optional() private readonly groups?: GroupAccessService,
    @Optional() private readonly connections?: GroupConnectionsService,
    @Optional() private readonly policy?: GroupFeaturePolicy,
  ) {}

  // Return true when this update has been consumed or access was denied.
  async handle(kind: BotKind, update: TelegramUpdate) {
    const bot = kind === 'CREATOR' ? this.creator : this.chlatwork;
    const callback = update.callback_query;
    const message = callback?.message ?? update.message;
    const sender = callback?.from ?? update.inline_query?.from ?? message?.from;
    if (
      !sender ||
      sender.is_bot ||
      !Number.isSafeInteger(sender.id) ||
      sender.id <= 0
    )
      return true;
    if (!callback && message?.sender_chat) return true;
    if (
      callback &&
      (typeof callback.id !== 'string' ||
        callback.id.length > 256 ||
        typeof callback.data !== 'string' ||
        callback.data.length > 256)
    )
      return true;
    const privateChat =
      message?.chat?.type === 'private' && message.chat.id === sender.id;
    const group =
      message?.chat.type === 'group' || message?.chat.type === 'supergroup';
    if (
      !update.inline_query &&
      (!message ||
        (!privateChat && !group) ||
        !Number.isSafeInteger(message.chat.id) ||
        (group && message.chat.id >= 0))
    )
      return true;
    const command =
      /^\/([a-z][a-z0-9_]*|\$)(?:@([A-Za-z0-9_]+))?(?:\s|$)/i.exec(
        (message?.text ?? '').trim(),
      );
    if (
      command?.[2] &&
      command[2].toLowerCase() !== (await bot.getMe()).username?.toLowerCase()
    )
      return true;

    if (privateChat && !callback && command?.[1].toLowerCase() === 'start') {
      await this.access.register(kind, sender, true);
    }
    if (privateChat && !callback && message && this.connections) {
      try {
        if (await this.connections.handlePrivateStart(kind, message))
          return true;
        if (await this.connections.handleShared(kind, message)) return true;
      } catch (error) {
        if (
          !(error instanceof BadRequestException) &&
          !(error instanceof ForbiddenException)
        )
          throw error;
        await bot.sendMessage(sender.id, error.message);
        return true;
      }
    }
    const access = await this.access.lookup(kind, sender.id);
    const personallyAllowed = botAccessAllowed(access);
    const personalCommand = command?.[1].toLowerCase();
    // Reminder cancellation must pass through to ChlatWork without consuming a KHQR upload.
    const cancelQr =
      personalCommand === 'cancel' &&
      (kind !== 'CHLATWORK' ||
        /^\/cancel(?:@[A-Za-z0-9_]+)?$/i.test((message?.text ?? '').trim()));
    // Approved ChlatWork users still need the expense assistant's feature-filtered
    // menu. The gateway owns onboarding and group/account entry for other users.
    const assistantMenu =
      kind === 'CHLATWORK' &&
      personallyAllowed &&
      ['start', 'menu'].includes(personalCommand ?? '');
    if (
      this.groups &&
      !assistantMenu &&
      privateChat &&
      !callback &&
      ['start', 'menu', 'groups', 'status', 'credits'].includes(
        personalCommand ?? '',
      )
    ) {
      const base = this.config.getOrThrow<string>('FRONTEND_ORIGIN');
      if (
        personalCommand !== 'start' ||
        !/\s+myqr$/.test(message?.text ?? '')
      ) {
        // Account entry works before approval and never initializes a wallet.
        await bot.sendMessage(
          sender.id,
          personallyAllowed
            ? 'Manage your groups and personal account.'
            : 'Use My Groups to request manager approval. Group members can use enabled free features.',
          {
            inline_keyboard: [
              [
                {
                  text: 'My Groups',
                  web_app: {
                    url: new URL('/bot/groups?bot=' + kind, base).toString(),
                  },
                },
              ],
              [
                {
                  text: 'My account',
                  web_app: {
                    url: new URL('/bot/account?bot=' + kind, base).toString(),
                  },
                },
              ],
            ],
          },
        );
        return true;
      }
    }
    let freeGroup = false;
    if (group && kind === 'CHLATWORK' && this.groups && this.policy) {
      const data = callback?.data ?? '';
      const text = message?.text?.trim() ?? '';
      const feature =
        data.startsWith('split:') ||
        personalCommand === 'split' ||
        personalCommand === 'cancel' ||
        (!command &&
          /^\d+(?:[.,]\d+)?$/.test(text) &&
          message?.reply_to_message)
          ? 'split'
          : data.startsWith('poll:') ||
              data.startsWith('pv:') ||
              personalCommand === 'joinvote' ||
              personalCommand === 'vote'
            ? 'voting'
            : data.startsWith('khqr:member:') ||
                personalCommand === '$' ||
                /^tg_[1-9][0-9]{0,15}$/.test(personalCommand ?? '') ||
                /^khqr$/i.test(text) ||
                Boolean(message && readMemberQrMention(message))
              ? 'khqr'
              : null;
      if (
        [
          'dailyvote',
          'votetime',
          'voteduration',
          'resettodayvote',
          'stopdailyvote',
          'startvote',
          'endvote',
        ].includes(personalCommand ?? '')
      ) {
        await bot.sendMessage(
          message!.chat.id,
          'Group administrators can manage voting in My Groups in the bot’s private chat.',
        );
        return true;
      }
      if (feature) {
        try {
          const context = await this.groups.member(
            kind,
            String(message!.chat.id),
            String(sender.id),
          );
          if (!context) return true;
          await this.policy.assertEnabled(context, feature);
          if (callback && !(await this.policy.callback(context, data))) {
            await bot.answerCallback(
              callback.id,
              'This action is unavailable in this group.',
            );
            return true;
          }
          freeGroup = true;
        } catch {
          if (callback)
            await bot.answerCallback(callback.id, 'Group feature unavailable.');
          return true;
        }
      }
    }
    let qrAllowed = false;
    const qrAction =
      privateChat &&
      (personalCommand === 'myqr' ||
        callback?.data?.startsWith('myqr:') ||
        message?.photo?.length ||
        message?.document ||
        cancelQr ||
        (personalCommand === 'start' && /\s+myqr$/.test(message?.text ?? '')));
    if (!personallyAllowed && qrAction && access && this.groups)
      qrAllowed = Boolean(await this.groups.personalQr(kind, access.userId));
    const allowed = personallyAllowed || freeGroup || qrAllowed;
    if (!allowed) {
      if (update.inline_query) {
        await bot.answerInlineQuery(update.inline_query.id, []);
      } else if (callback) {
        await bot.answerCallback(
          callback.id,
          'Open the bot privately to check access.',
        );
      } else if (privateChat) {
        const status = access?.status;
        const text = !access
          ? 'Send /start to request access. New accounts need admin approval.'
          : status === 'PENDING'
            ? 'Your access request has been sent. Please wait for admin approval.\nUse /status to check again.'
            : 'Your access is currently unavailable. Contact support@chlatwork.com for help.';
        await bot.sendMessage(
          sender.id,
          `${text}\nSupport: support@chlatwork.com`,
        );
      } else if (message && command) {
        await bot.sendMessage(
          message.chat.id,
          'Please start this bot privately and check your access before using it here.',
        );
      }
      return true;
    }
    if (access) await this.access.activity(kind, access.userId);
    if (!privateChat) {
      if (
        command?.[1].toLowerCase() === 'myqr' ||
        callback?.data?.startsWith('myqr:')
      ) {
        if (callback)
          await bot.answerCallback(
            callback.id,
            'Manage your KHQR in private chat.',
          );
        else
          await bot.sendMessage(
            message!.chat.id,
            'Use /myqr in a private chat with this bot.',
          );
        return true;
      }
      return false;
    }
    if (command && ['status', 'support'].includes(command[1].toLowerCase())) {
      await bot.sendMessage(
        sender.id,
        'Your access is approved for this bot.\n/menu · /myqr\nSupport: support@chlatwork.com',
      );
      return true;
    }
    if (
      command?.[1].toLowerCase() === 'myqr' ||
      (personalCommand === 'start' && /\s+myqr$/.test(message?.text ?? '')) ||
      callback?.data === 'myqr:view'
    ) {
      if (callback) await bot.answerCallback(callback.id);
      await this.showQr(kind, access!.userId, sender.id);
      return true;
    }
    if (callback?.data?.startsWith('myqr:')) {
      await bot.answerCallback(callback.id);
      const action = callback.data.split(':');
      if (action[1] === 'upload' || action[1] === 'remove') {
        const token = await this.qr.begin(kind, access!.userId);
        if (action[1] === 'remove') {
          await bot.sendMessage(sender.id, 'Remove your saved KHQR?', {
            inline_keyboard: [
              [
                { text: 'Remove KHQR', callback_data: `myqr:delete:${token}` },
                { text: 'Cancel', callback_data: 'myqr:cancel' },
              ],
            ],
          });
        } else {
          await bot.sendMessage(
            sender.id,
            'Send your KHQR as a PNG/JPEG photo or file (up to 2 MB).\nThis upload expires in 10 minutes. /cancel to stop.',
          );
        }
      } else if (action[1] === 'cancel') {
        await this.qr.cancel(kind, access!.userId);
        await bot.sendMessage(sender.id, 'KHQR change cancelled.');
      } else if (
        ['save', 'delete'].includes(action[1]) &&
        /^[0-9a-f-]{36}$/.test(action[2] ?? '')
      ) {
        try {
          await this.qr.confirm(
            kind,
            access!.userId,
            action[2],
            action[1] === 'delete',
          );
          await bot.sendMessage(
            sender.id,
            action[1] === 'delete'
              ? 'Your KHQR was removed.'
              : 'Your KHQR is saved and can be requested in groups.',
          );
        } catch (error) {
          if (!(error instanceof Error) || !('getStatus' in error)) throw error;
          await bot.sendMessage(sender.id, error.message);
        }
      }
      return true;
    }
    const token = await this.qr.awaiting(
      kind,
      access!.userId,
      cancelQr,
    );
    if (token && cancelQr) {
      await this.qr.cancel(kind, access!.userId);
      await bot.sendMessage(sender.id, 'KHQR upload cancelled.');
      return true;
    }
    if (token && message && (message.photo?.length || message.document)) {
      try {
        const photo = message.photo?.at(-1);
        const file = message.document ?? photo;
        if (!file || (file.file_size ?? 0) > BOT_QR_MAX_BYTES)
          throw new BadRequestException('Choose a PNG/JPEG up to 2 MB.');
        const bytes = await bot.downloadFile(file.file_id, BOT_QR_MAX_BYTES);
        await this.qr.preview(kind, access!.userId, token, Buffer.from(bytes));
        // Replying to the original upload keeps the preview private and avoids a
        // public temporary URL. The old saved image survives until confirmation.
        await bot.sendMessage(
          sender.id,
          'Preview above. Save this user-provided KHQR and allow it to be shown when requested in groups? Bank ownership has not been verified.',
          {
            inline_keyboard: [
              [
                { text: 'Save & share', callback_data: `myqr:save:${token}` },
                { text: 'Cancel', callback_data: 'myqr:cancel' },
              ],
            ],
          },
          undefined,
          message.message_id,
        );
      } catch (error) {
        if (error instanceof BadRequestException)
          await bot.sendMessage(sender.id, error.message);
        else throw error;
      }
      return true;
    }
    return false;
  }

  async ensureMemberIdentity(kind: BotKind, sender: TelegramUser) {
    return this.access.registerMember(kind, sender);
  }

  private async showQr(kind: BotKind, userId: string, chatId: number) {
    const bot = kind === 'CREATOR' ? this.creator : this.chlatwork;
    const path = await this.qr.current(userId);
    if (path) {
      const base = this.config.getOrThrow<string>('FRONTEND_ORIGIN');
      await bot.sendPhoto(
        chatId,
        new URL(path, base).toString(),
        'Your saved KHQR · user-provided',
      );
    }
    const keyboard: TelegramInlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: path ? 'Replace KHQR' : 'Upload KHQR',
            callback_data: 'myqr:upload',
          },
          ...(path ? [{ text: 'Remove', callback_data: 'myqr:remove' }] : []),
        ],
      ],
    };
    await bot.sendMessage(
      chatId,
      path
        ? 'Manage your KHQR below.'
        : 'You have no saved KHQR. Upload one below.',
      keyboard,
    );
  }
}
