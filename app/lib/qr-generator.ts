export type QrEcLevel = "L" | "M" | "Q" | "H";

export type QrGeneratorState = {
  text: string;
  size: number;
  margin: number;
  ecLevel: QrEcLevel;
  autoGenerate: boolean;
  generated: boolean;
  error: string;
};

export function createQrGeneratorState(): QrGeneratorState {
  return {
    text: "",
    size: 320,
    margin: 2,
    ecLevel: "M",
    autoGenerate: true,
    generated: false,
    error: "",
  };
}

export function validateQrText(value: string): string | null {
  if (!value.trim()) {
    return "Please enter text or URL.";
  }

  if (value.trim().length > 2000) {
    return "Too long (max ~2000 chars).";
  }

  return null;
}

export function buildQrDownloadFileName(text: string): string {
  return (
    (text.trim().slice(0, 18) || "qr")
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/-+/g, "-")
      .toLowerCase() + ".png"
  );
}
