import type {
  TelegramMessage,
  TelegramMessageEntity,
} from './telegram-bot.types';
import type { SecurityScanInput } from './security.types';

export function extractSecurityLinks(
  message: TelegramMessage,
): SecurityScanInput['links'] {
  const links: SecurityScanInput['links'] = [];
  const append = (text: string, entities?: TelegramMessageEntity[]) => {
    for (const entity of entities ?? []) {
      if (entity.type === 'text_link' && entity.url) {
        links.push({
          target: entity.url,
          label: text.slice(entity.offset, entity.offset + entity.length),
        });
      } else if (entity.type === 'url') {
        links.push({
          target: text.slice(entity.offset, entity.offset + entity.length),
        });
      }
    }
    // Telegram normally supplies entities; plain URL fallback also covers edited/caption payloads.
    for (const match of text.matchAll(
      /(?:https?:\/\/|www\.)[^\s<>"\u0000-\u001f]+/gi,
    )) {
      if (
        (entities ?? []).some(
          (entity) =>
            (entity.type === 'url' || entity.type === 'text_link') &&
            entity.offset <= match.index! &&
            entity.offset + entity.length >= match.index! + match[0].length,
        )
      )
        continue;
      let target = match[0].replace(/[.,]+$/, '');
      for (const [open, close] of [
        ['(', ')'],
        ['[', ']'],
        ['{', '}'],
      ]) {
        while (
          target.endsWith(close!) &&
          target.split(close!).length > target.split(open!).length
        )
          target = target.slice(0, -1);
      }
      if (target) links.push({ target });
    }
  };
  append(message.text ?? '', message.entities);
  append(message.caption ?? '', message.caption_entities);
  // Keep a disguised link's label even if the same target also appears as plain text.
  return links.filter(
    (link, index) =>
      links.findIndex(
        (item) => item.target === link.target && item.label === link.label,
      ) === index,
  );
}
