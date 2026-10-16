import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface PollChoice {
  id: string;
  label: string;
  imageId?: string;
}
export function preparePollEdit(
  data: unknown,
  input: Array<{ id?: string; label: string }>,
  expectedIds?: string[],
) {
  const record = data as Record<string, unknown>;
  const old = (
    Array.isArray(record?.options) ? record.options : []
  ) as PollChoice[];
  const { options, ids } = validatePollChoices(input);
  const byId = new Map(old.map((option) => [option.id, option]));
  if (
    (expectedIds &&
      (expectedIds.length !== old.length ||
        new Set(expectedIds).size !== old.length ||
        expectedIds.some((id) => !byId.has(id)))) ||
    ids.some((id) => !byId.has(id))
  )
    throw new ConflictException('Refresh the poll before editing its choices');
  if (options.some((option) => option.id === undefined) && !expectedIds)
    throw new BadRequestException(
      'Current choice IDs are required when adding choices',
    );
  let nextOptionNumber = Math.max(
    typeof record.nextOptionNumber === 'number' &&
      Number.isSafeInteger(record.nextOptionNumber)
      ? record.nextOptionNumber
      : 1,
    ...old.map((option) => Number(option.id.slice(7)) + 1),
  );
  return {
    options: options.map((option) => ({
      id: option.id ?? `option-${nextOptionNumber++}`,
      label: option.label,
      ...(option.id && byId.get(option.id)?.imageId
        ? { imageId: byId.get(option.id)!.imageId }
        : {}),
    })),
    get nextOptionNumber() {
      return nextOptionNumber;
    },
    removed: old.filter((option) => !ids.includes(option.id)),
  };
}

// Caller owns the Moment row lock. This transaction helper is shared by website
// and workspace editors so renamed choices retain all existing ballots.
export async function editPoll(
  tx: Prisma.TransactionClient,
  momentId: string,
  block: { id: string; data: Prisma.JsonValue },
  options: Array<{ id?: string; label: string }>,
  expectedIds?: string[],
  extra: Record<string, unknown> = {},
) {
  const edit = preparePollEdit(block.data, options, expectedIds);
  if (edit.removed.length)
    await tx.momentVote.deleteMany({
      where: {
        momentId,
        optionId: { in: edit.removed.map((option) => option.id) },
      },
    });
  await tx.momentBlock.update({
    where: { id: block.id },
    data: {
      data: {
        ...(block.data as Prisma.JsonObject),
        ...extra,
        options: edit.options,
        nextOptionNumber: edit.nextOptionNumber,
      } as Prisma.InputJsonValue,
    },
  });
  const images = edit.removed.flatMap((option) =>
    option.imageId ? [option.imageId] : [],
  );
  if (images.length)
    await tx.momentMedia.deleteMany({
      where: { momentId, id: { in: images } },
    });
}

export function validatePollChoices(
  input: Array<{ id?: string; label: string }>,
) {
  const options = input.map((option) => ({
    ...option,
    label: option.label.trim(),
  }));
  const ids = options.flatMap((option) => (option.id ? [option.id] : []));
  if (
    options.length < 2 ||
    options.length > 15 ||
    new Set(ids).size !== ids.length ||
    new Set(options.map((option) => option.label.toLowerCase())).size !==
      options.length ||
    options.some(
      (option) =>
        !option.label ||
        option.label.length > 120 ||
        (option.id !== undefined &&
          !/^option-[1-9][0-9]{0,8}$/.test(option.id)),
    )
  )
    throw new BadRequestException('Use two to fifteen different poll choices');
  return { options, ids };
}
