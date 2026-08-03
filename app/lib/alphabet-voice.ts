export type AlphabetVoiceEntry = {
  fileName: string;
  language: "en" | "km";
  text: string;
  voice: "english-default" | "khmer-default" | "khmer-female-nisa";
};

const KHMER_ENGLISH_LETTER_NAMES = [
  "អេ",
  "ប៊ី",
  "ស៊ី",
  "ឌី",
  "អ៊ី",
  "អេហ្វ",
  "ជី",
  "អេច",
  "អាយ",
  "ជេ",
  "ខេ",
  "អែល",
  "អឹម",
  "អិន",
  "អូ",
  "ភី",
  "ឃ្យូ",
  "អារ",
  "អេស",
  "ធី",
  "យូ",
  "វី",
  "ដាប់បែលយូ",
  "អិច",
  "វ៉ាយ",
  "ហ្ស៊ី",
] as const;

export function buildAlphabetVoiceEntries(): AlphabetVoiceEntry[] {
  const letters = Array.from({ length: 26 }, (_, index) =>
    String.fromCharCode(65 + index),
  );

  return [
    ...letters.map((letter) => ({
      fileName: letter,
      language: "en" as const,
      text: letter,
      voice: "english-default" as const,
    })),
    ...letters.map((letter, index) => ({
      fileName: `${letter}-khmer`,
      language: "km" as const,
      text: KHMER_ENGLISH_LETTER_NAMES[index]!,
      voice: "khmer-female-nisa" as const,
    })),
    ...Array.from({ length: 101 }, (_, index) => ({
      fileName: String(index),
      language: "km" as const,
      text: String(index).replace(/\d/g, (digit) =>
        String.fromCharCode(0x17e0 + Number(digit)),
      ),
      voice: "khmer-female-nisa" as const,
    })),
  ];
}

export function buildEnglishNumberVoiceEntries(): AlphabetVoiceEntry[] {
  return Array.from({ length: 101 }, (_, number) => ({
    fileName: String(number),
    language: "en" as const,
    text: String(number),
    voice: "english-default" as const,
  }));
}
