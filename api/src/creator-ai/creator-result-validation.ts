export type ContentPackField =
  | 'result'
  | 'captions'
  | 'captions.facebook'
  | 'captions.tiktok'
  | 'captions.instagram'
  | 'hooks'
  | 'hashtags'
  | 'title'
  | 'cta'
  | 'summary'
  | 'keyPoints';
export type ResultValidationIssue =
  | 'EXPECTED_OBJECT'
  | 'EXPECTED_TEXT'
  | 'EMPTY_TEXT'
  | 'TEXT_TOO_LONG'
  | 'EXPECTED_LIST'
  | 'LIST_TOO_LONG';

export class CreatorResultValidationError extends Error {
  constructor(
    readonly field: ContentPackField,
    readonly issue: ResultValidationIssue,
  ) {
    super('Creator result field failed validation');
  }
}

export function resultObject(
  value: unknown,
  field: ContentPackField,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new CreatorResultValidationError(field, 'EXPECTED_OBJECT');
  return value as Record<string, unknown>;
}

export function resultText(
  value: unknown,
  maximum: number,
  field: ContentPackField,
) {
  if (typeof value !== 'string')
    throw new CreatorResultValidationError(field, 'EXPECTED_TEXT');
  const normalized = value.trim();
  if (!normalized) throw new CreatorResultValidationError(field, 'EMPTY_TEXT');
  // JSON Schema measures Unicode code points, not JavaScript UTF-16 units.
  if (Array.from(normalized).length > maximum)
    throw new CreatorResultValidationError(field, 'TEXT_TOO_LONG');
  return normalized;
}

export function resultTextList(
  value: unknown,
  maximumItems: number,
  maximumLength: number,
  field: ContentPackField,
) {
  if (!Array.isArray(value))
    throw new CreatorResultValidationError(field, 'EXPECTED_LIST');
  if (value.length > maximumItems)
    throw new CreatorResultValidationError(field, 'LIST_TOO_LONG');
  return value.map((item) => resultText(item, maximumLength, field));
}
