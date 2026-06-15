export type KhmerDigitMode = "none" | "khmer-to-latin" | "latin-to-khmer";
export type InvisibleCharacterMode = "space" | "remove" | "keep";

export type KhmerUnicodeFixerOptions = {
  normalizeUnicode: boolean;
  invisibleCharacters: InvisibleCharacterMode;
  normalizeWhitespace: boolean;
  trimLines: boolean;
  removeReplacementCharacters: boolean;
  digitMode: KhmerDigitMode;
};

export type KhmerUnicodeFixResult = {
  text: string;
  changes: string[];
  warnings: string[];
};

export const DEFAULT_KHMER_UNICODE_FIXER_OPTIONS: KhmerUnicodeFixerOptions = {
  normalizeUnicode: true,
  invisibleCharacters: "space",
  normalizeWhitespace: true,
  trimLines: true,
  removeReplacementCharacters: true,
  digitMode: "none",
};

const KHMER_DIGITS = "០១២៣៤៥៦៧៨៩";
const LATIN_DIGITS = "0123456789";
const INVISIBLE_CHARACTERS_PATTERN = /[\u200B\u200C\u200D\u2060\uFEFF]/g;
const NON_BREAKING_SPACE_PATTERN = /[\u00A0\u202F]/g;
const REPLACEMENT_CHARACTER_PATTERN = /\uFFFD/g;

function countMatches(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0;
}

function convertDigits(value: string, fromDigits: string, toDigits: string) {
  return value.replace(/[0-9០-៩]/g, (character) => {
    const index = fromDigits.indexOf(character);

    return index >= 0 ? toDigits[index] : character;
  });
}

function normalizeLineWhitespace(
  value: string,
  options: KhmerUnicodeFixerOptions,
) {
  const normalizedLines = value
    .split("\n")
    .map((line) => {
      const nextLine = options.normalizeWhitespace
        ? line.replace(/[ \t]{2,}/g, " ")
        : line;

      return options.trimLines ? nextLine.trim() : nextLine;
    });

  return normalizedLines.join("\n").replace(/\n{3,}/g, "\n\n");
}

function hasKhmerUnicode(value: string) {
  return /[\u1780-\u17FF\u19E0-\u19FF]/.test(value);
}

function looksLikeLegacyKhmerCopy(value: string) {
  const trimmed = value.trim();

  if (!trimmed || hasKhmerUnicode(trimmed)) {
    return false;
  }

  const letters = trimmed.match(/[A-Za-z]/g)?.length ?? 0;
  const punctuation = trimmed.match(/[;'"`~\\[\]{}]/g)?.length ?? 0;

  return letters >= 12 && punctuation >= 2;
}

export function fixKhmerUnicodeText(
  input: string,
  options: KhmerUnicodeFixerOptions = DEFAULT_KHMER_UNICODE_FIXER_OPTIONS,
): KhmerUnicodeFixResult {
  let text = input;
  const changes: string[] = [];
  const warnings: string[] = [];

  if (!input.trim()) {
    return {
      text: "",
      changes: [],
      warnings: ["Paste Khmer Unicode text to clean it."],
    };
  }

  if (options.normalizeUnicode) {
    const normalizedText = text.normalize("NFC");

    if (normalizedText !== text) {
      changes.push("Normalized Unicode characters with NFC.");
      text = normalizedText;
    }
  }

  const nonBreakingSpaceCount = countMatches(text, NON_BREAKING_SPACE_PATTERN);
  if (nonBreakingSpaceCount > 0) {
    text = text.replace(NON_BREAKING_SPACE_PATTERN, " ");
    changes.push(`Replaced ${nonBreakingSpaceCount} non-breaking spaces.`);
  }

  const invisibleCharacterCount = countMatches(
    text,
    INVISIBLE_CHARACTERS_PATTERN,
  );

  if (invisibleCharacterCount > 0 && options.invisibleCharacters !== "keep") {
    text = text.replace(
      INVISIBLE_CHARACTERS_PATTERN,
      options.invisibleCharacters === "space" ? " " : "",
    );
    changes.push(
      `${options.invisibleCharacters === "space" ? "Replaced" : "Removed"} ${invisibleCharacterCount} invisible characters.`,
    );
  }

  const replacementCharacterCount = countMatches(
    text,
    REPLACEMENT_CHARACTER_PATTERN,
  );

  if (replacementCharacterCount > 0 && options.removeReplacementCharacters) {
    text = text.replace(REPLACEMENT_CHARACTER_PATTERN, "");
    changes.push(`Removed ${replacementCharacterCount} replacement characters.`);
    warnings.push(
      "Replacement characters usually mean the source text was already damaged before cleanup.",
    );
  }

  if (options.digitMode === "khmer-to-latin") {
    const nextText = convertDigits(text, KHMER_DIGITS, LATIN_DIGITS);

    if (nextText !== text) {
      changes.push("Converted Khmer digits to Latin digits.");
      text = nextText;
    }
  }

  if (options.digitMode === "latin-to-khmer") {
    const nextText = convertDigits(text, LATIN_DIGITS, KHMER_DIGITS);

    if (nextText !== text) {
      changes.push("Converted Latin digits to Khmer digits.");
      text = nextText;
    }
  }

  if (options.normalizeWhitespace || options.trimLines) {
    const nextText = normalizeLineWhitespace(text, options);

    if (nextText !== text) {
      changes.push("Normalized repeated spacing and line breaks.");
      text = nextText;
    }
  }

  if (looksLikeLegacyKhmerCopy(input)) {
    warnings.push(
      "This looks like it may be copied from a legacy Khmer font. This tool only cleans real Unicode Khmer text.",
    );
  }

  if (!hasKhmerUnicode(text)) {
    warnings.push(
      "No Khmer Unicode characters were detected in the cleaned result.",
    );
  }

  return {
    text,
    changes: changes.length ? changes : ["No cleanup changes were needed."],
    warnings,
  };
}
