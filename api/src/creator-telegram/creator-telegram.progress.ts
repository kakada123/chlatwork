import { AiFeature } from '@prisma/client';
import { CreatorTelegramClient } from './creator-telegram.client';

export const CREATOR_QUEUED_STATUS =
  '✅ Received! Your request is queued. I’ll reply here when it’s ready—no need to resend.';

const PROCESSING_STATUS: Partial<Record<AiFeature, string>> = {
  KHMER_GRAMMAR: '✍️ Checking your grammar…',
  KHMER_REWRITE: '✍️ Rewriting your text…',
  LATIN_TO_KHMER: '✍️ Converting your text to Khmer…',
  HUMANIZE: '✍️ Making your writing sound natural…',
};

/** One temporary status per request; stop and drain feedback before final delivery. */
export class CreatorTelegramProgress {
  private typingTimer?: ReturnType<typeof setInterval>;
  private slowTimer?: ReturnType<typeof setTimeout>;
  private deadlineTimer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private typing: Promise<unknown> | null = null;
  private editing: Promise<void> = Promise.resolve();

  constructor(
    private readonly bot: CreatorTelegramClient,
    private readonly chatId: number,
    private readonly messageId: number | null,
  ) {}

  start(feature: AiFeature, deadline: Date) {
    this.edit(PROCESSING_STATUS[feature] ?? '✍️ Working on your text…');
    this.pulse();
    // Telegram clears typing after five seconds. Skip overlapping slow calls.
    this.typingTimer = setInterval(() => this.pulse(), 4000);
    this.slowTimer = setTimeout(() => {
      this.edit(
        '⏳ Still working. No need to resend—I’ll reply here when it’s ready.',
      );
    }, 15000);
    // Never advertise activity beyond this worker's lease if generation hangs.
    this.deadlineTimer = setTimeout(
      () => void this.stop(),
      Math.max(0, deadline.getTime() - Date.now()),
    );
    this.typingTimer.unref();
    this.slowTimer.unref();
    this.deadlineTimer.unref();
  }

  async stop() {
    this.stopped = true;
    clearInterval(this.typingTimer);
    clearTimeout(this.slowTimer);
    clearTimeout(this.deadlineTimer);
    await Promise.all([this.editing, this.typing]);
  }

  private edit(text: string) {
    this.editing = this.editing
      .then(async () => {
        if (!this.stopped)
          await this.bot.updateStatus(this.chatId, this.messageId, text);
      })
      .catch(() => undefined);
  }

  private pulse() {
    if (this.stopped || this.typing) return;
    this.typing = Promise.resolve()
      .then(() => this.bot.sendChatAction(this.chatId, 'typing'))
      .catch(() => undefined)
      .finally(() => {
        this.typing = null;
      });
  }
}
