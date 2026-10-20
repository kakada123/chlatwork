import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';

export function operationKey(userId: string, key: string) {
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(key))
    throw new BadRequestException('A valid idempotency key is required.');
  return `group:${userId}:${key}`;
}
export async function lockGroup(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  expectedVersion: number,
) {
  const [row] = await tx.$queryRaw<
    Array<{ status: string; version: number }>
  >`SELECT status,version FROM telegram_group_workspaces WHERE id=${workspaceId}::uuid FOR UPDATE`;
  if (!row || row.status !== 'ACTIVE')
    throw new ForbiddenException('Group is unavailable.');
  if (row.version !== expectedVersion)
    throw new ConflictException(
      'Refresh the group before saving your changes.',
    );
}
export async function auditMutation(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  userId: string,
  bot: string,
  action: string,
  key: string,
  input: unknown,
  result?: Prisma.InputJsonObject,
) {
  await tx.telegramGroupWorkspace.update({
    where: { id: workspaceId },
    data: { version: { increment: 1 }, updatedAt: new Date() },
  });
  await tx.telegramGroupAudit.create({
    data: {
      workspaceId,
      actorId: userId,
      bot,
      action,
      operationKey: key,
      details: {
        fingerprint: createHash('sha256')
          .update(JSON.stringify(input))
          .digest('hex'),
        ...(result ? { result } : {}),
      },
    },
  });
}
export async function replay(
  tx: Prisma.TransactionClient,
  key: string,
  workspaceId: string,
  action: string,
  input: unknown,
) {
  const old = await tx.telegramGroupAudit.findUnique({
    where: { operationKey: key },
  });
  if (!old) return false;
  const fingerprint = createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex');
  if (
    old.workspaceId !== workspaceId ||
    old.action !== action ||
    (old.details as Record<string, unknown>).fingerprint !== fingerprint
  )
    throw new ConflictException(
      'Idempotency key was already used for a different change.',
    );
  return true;
}
