export type BarcodeFormat = "CODE128" | "EAN13" | "UPC" | "CODE39";

export type BarcodeGeneratorState = {
  value: string;
  format: BarcodeFormat;
  height: number;
  width: number;
  displayValue: boolean;
  generated: boolean;
  error: string;
};

export function createBarcodeGeneratorState(): BarcodeGeneratorState {
  return {
    value: "",
    format: "CODE128",
    height: 80,
    width: 2,
    displayValue: true,
    generated: false,
    error: "",
  };
}

export function normalizeBarcodeValue(
  value: string,
  format: BarcodeFormat,
): string {
  const raw = value.trim();

  if (format === "EAN13" || format === "UPC") {
    if (hasNonAsciiBarcodeCharacters(raw)) {
      return raw;
    }

    return raw.replace(/\D/g, "");
  }

  return raw;
}

export function hasNonAsciiBarcodeCharacters(value: string): boolean {
  return /[^\x00-\x7F]/.test(value);
}

export function validateBarcodeValue(
  value: string,
  format: BarcodeFormat,
): string | null {
  if (!value) {
    return "Please enter a value.";
  }

  // These 1D barcode formats are scanner code standards, not Unicode text
  // containers. Khmer and other non-ASCII text should be shared as a QR code.
  if (hasNonAsciiBarcodeCharacters(value)) {
    return "For Khmer language, QR Code is recommended. Standard barcodes support only numbers and basic English characters.";
  }

  if (!/^[\x20-\x7E]+$/.test(value)) {
    return "Barcode value must use printable ASCII characters.";
  }

  if (format === "EAN13") {
    if (!/^\d+$/.test(value)) {
      return "EAN13 must be digits only.";
    }

    if (value.length !== 12 && value.length !== 13) {
      return "EAN13: enter 12 digits (recommended) or 13 digits.";
    }
  }

  if (format === "UPC") {
    if (!/^\d+$/.test(value)) {
      return "UPC must be digits only.";
    }

    if (value.length !== 11 && value.length !== 12) {
      return "UPC: enter 11 digits (recommended) or 12 digits.";
    }
  }

  if (format === "CODE39") {
    if (!/^[0-9A-Z\-.\s$/+%]*$/.test(value.toUpperCase())) {
      return "CODE39 supports A-Z, 0-9 and - . space $ / + %";
    }
  }

  return null;
}

export function buildBarcodeDownloadFileName(value: string): string {
  return (
    (value.trim().slice(0, 24) || "barcode")
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/-+/g, "-")
      .toLowerCase() + ".svg"
  );
}
