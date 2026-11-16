import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { validateUpload, type Upload } from '../prephub/prephub.domain';
import { validTitle } from './work-tasks.domain';
import { attachmentSelect, WorkTasksStore } from './work-tasks.store';
@Injectable()
export class WorkTasksFiles {
  constructor(private readonly store: WorkTasksStore) {}
  upload(userId: string, taskId: string, file?: Upload) {
    const meta = validateUpload(file);
    return this.store.write(userId, async (tx) => {
      await this.store.task(tx, userId, taskId);
      if ((await tx.workAttachment.count({ where: { taskId } })) >= 20)
        throw new BadRequestException('A task can have up to 20 attachments.');
      let name = file!.originalname;
      const decoded = Buffer.from(name, 'latin1').toString('utf8');
      if (
        [...name].every((c) => c.charCodeAt(0) <= 255) &&
        Buffer.from(decoded, 'utf8').equals(Buffer.from(name, 'latin1'))
      )
        name = decoded;
      return tx.workAttachment.create({
        data: {
          taskId,
          title: name.replace(/[\x00-\x1f\x7f/\\]/g, '_').slice(0, 200),
          ...meta,
          data: new Uint8Array(file!.buffer),
        },
        select: attachmentSelect,
      });
    });
  }
  async file(userId: string, id: string) {
    const file = await this.store.db.workAttachment.findFirst({
      where: { id, task: { userId } },
    });
    if (!file) throw new NotFoundException('Attachment not found.');
    return file;
  }
  change(userId: string, id: string, title?: string) {
    return this.store.write(userId, async (tx) => {
      if (
        !(await tx.workAttachment.findFirst({
          where: { id, task: { userId } },
          select: { id: true },
        }))
      )
        throw new NotFoundException('Attachment not found.');
      if (title !== undefined)
        return tx.workAttachment.update({
          where: { id },
          data: { title: validTitle(title) },
          select: attachmentSelect,
        });
      await tx.workAttachment.delete({ where: { id } });
      return { deleted: true };
    });
  }
}
