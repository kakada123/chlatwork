export type ImageCodeScanMode = "barcode" | "qr";

export type ImageCodeScanResult = {
  rawValue: string;
  format: string;
};

const QR_DETECTOR_FORMATS = ["qr_code"];
const BARCODE_DETECTOR_FORMATS = [
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "ean_13",
  "ean_8",
  "itf",
  "upc_a",
  "upc_e",
];

type BarcodeDetectorResult = {
  rawValue?: string;
  format?: string;
};

type BarcodeDetectorLike = {
  detect(image: ImageBitmapSource): Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorCtorLike = {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
};

type ZxingModule = typeof import("@zxing/library");

let zxingModulePromise: Promise<ZxingModule> | null = null;

function getBarcodeDetectorCtor() {
  return (
    globalThis as typeof globalThis & {
      BarcodeDetector?: BarcodeDetectorCtorLike;
    }
  ).BarcodeDetector;
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.decoding = "async";
    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("The selected image could not be loaded."));
    };
    image.src = imageUrl;
  });
}

function dedupeResults(results: ImageCodeScanResult[]) {
  const seen = new Set<string>();

  return results.filter((result) => {
    const key = `${result.format}:${result.rawValue}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function sourceToCanvas(source: ImageBitmapSource) {
  if (!import.meta.client) {
    return null;
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }

  const isVideo = source instanceof HTMLVideoElement;
  const isImage = source instanceof HTMLImageElement;

  const width = isVideo ? source.videoWidth : isImage ? source.naturalWidth : 0;
  const height = isVideo
    ? source.videoHeight
    : isImage
      ? source.naturalHeight
      : 0;

  if (width <= 0 || height <= 0) {
    return null;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);
  return { canvas, ctx, width, height };
}

async function getZxingModule() {
  zxingModulePromise ??= import("@zxing/library");
  return zxingModulePromise;
}

function zxingFormatToDetectorLike(
  BarcodeFormat: ZxingModule["BarcodeFormat"],
  format: ZxingModule["BarcodeFormat"],
) {
  const name = String(BarcodeFormat[format] ?? "unknown");
  return name.toLowerCase();
}

async function detectWithZxing(
  source: ImageBitmapSource,
  mode: ImageCodeScanMode,
): Promise<ImageCodeScanResult[]> {
  const canvasState = sourceToCanvas(source);
  if (!canvasState) {
    return [];
  }

  const { ctx, width, height } = canvasState;
  const imageData = ctx.getImageData(0, 0, width, height);
  const zxing = await getZxingModule();

  const hints = new Map();
  const possibleFormats =
    mode === "qr"
      ? [zxing.BarcodeFormat.QR_CODE]
      : [
          zxing.BarcodeFormat.CODE_128,
          zxing.BarcodeFormat.CODE_39,
          zxing.BarcodeFormat.CODE_93,
          zxing.BarcodeFormat.CODABAR,
          zxing.BarcodeFormat.EAN_13,
          zxing.BarcodeFormat.EAN_8,
          zxing.BarcodeFormat.ITF,
          zxing.BarcodeFormat.UPC_A,
          zxing.BarcodeFormat.UPC_E,
        ];

  hints.set(zxing.DecodeHintType.POSSIBLE_FORMATS, possibleFormats);

  const reader = new zxing.MultiFormatReader();
  reader.setHints(hints);

  const luminanceSource = new zxing.RGBLuminanceSource(
    imageData.data,
    imageData.width,
    imageData.height,
  );
  const binaryBitmap = new zxing.BinaryBitmap(
    new zxing.HybridBinarizer(luminanceSource),
  );

  try {
    const result = reader.decode(binaryBitmap);
    const text = result.getText().trim();
    if (!text) {
      return [];
    }

    return [
      {
        rawValue: text,
        format: zxingFormatToDetectorLike(
          zxing.BarcodeFormat,
          result.getBarcodeFormat(),
        ),
      },
    ];
  } catch {
    return [];
  } finally {
    reader.reset();
  }
}

async function detectFromSource(
  source: ImageBitmapSource,
  mode: ImageCodeScanMode,
) {
  const BarcodeDetector = getBarcodeDetectorCtor();
  if (!BarcodeDetector) {
    return detectWithZxing(source, mode);
  }

  const desiredFormats =
    mode === "qr" ? QR_DETECTOR_FORMATS : BARCODE_DETECTOR_FORMATS;

  let supportedFormats = desiredFormats;
  if (typeof BarcodeDetector.getSupportedFormats === "function") {
    const supported = await BarcodeDetector.getSupportedFormats();
    supportedFormats = desiredFormats.filter((format) =>
      supported.includes(format),
    );
  }

  const detector = supportedFormats.length
    ? new BarcodeDetector({ formats: supportedFormats })
    : new BarcodeDetector();

  const detectedCodes = await detector.detect(source);
  const nativeResults = dedupeResults(
    detectedCodes
      .map((code) => ({
        rawValue: code.rawValue?.trim() ?? "",
        format: code.format?.trim() ?? "unknown",
      }))
      .filter((code) => code.rawValue.length > 0),
  );

  if (nativeResults.length > 0) {
    return nativeResults;
  }

  return detectWithZxing(source, mode);
}

export async function scanImageFileForCodes(
  file: File,
  mode: ImageCodeScanMode,
): Promise<ImageCodeScanResult[]> {
  if (!import.meta.client) {
    throw new Error("Image scanning is only available in the browser.");
  }

  const image = await loadImageFromFile(file);
  return detectFromSource(image, mode);
}

export async function scanVideoFrameForCodes(
  videoEl: HTMLVideoElement,
  mode: ImageCodeScanMode,
): Promise<ImageCodeScanResult[]> {
  if (!import.meta.client) {
    throw new Error("Camera scanning is only available in the browser.");
  }

  if (videoEl.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return [];
  }

  return detectFromSource(videoEl, mode);
}
