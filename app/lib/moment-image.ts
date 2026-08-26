import { MAX_MOMENT_SOURCE_BYTES, MAX_MOMENT_UPLOAD_BYTES } from "./moments.ts";

const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const ACCEPTED_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif)$/i;
const MAX_DIMENSION = 1600;

export async function prepareMomentImage(file: File) {
  // Some iPhone browsers omit the MIME type for HEIC files, so the extension is a safe fallback before re-encoding.
  if (
    !ACCEPTED_TYPES.has(file.type.toLowerCase()) &&
    !ACCEPTED_EXTENSIONS.test(file.name)
  ) {
    throw new Error("Use a JPG, PNG, WebP, HEIC, or HEIF photo.");
  }
  if (file.size > MAX_MOMENT_SOURCE_BYTES) {
    throw new Error("Each original photo must be 20MB or smaller.");
  }

  const isHeic =
    ["image/heic", "image/heif"].includes(file.type.toLowerCase()) ||
    /\.(heic|heif)$/i.test(file.name);
  let sourceBlob: Blob = file;
  if (isHeic) {
    try {
      const { default: heic2any } = await import("heic2any");
      const converted = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      });
      sourceBlob = Array.isArray(converted) ? converted[0]! : converted;
    } catch {
      throw new Error(
        "This iPhone photo could not be converted. Try sharing it as JPEG.",
      );
    }
  }

  const sourceUrl = URL.createObjectURL(sourceBlob);
  try {
    const image = await loadImage(sourceUrl);
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot prepare the photo.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Re-encoding removes EXIF location/device metadata before personal photos leave the browser.
    let blob = await canvasToBlob(canvas, "image/webp", 0.82);
    if (blob.size > MAX_MOMENT_UPLOAD_BYTES)
      blob = await canvasToBlob(canvas, "image/webp", 0.68);

    // Older Safari versions can silently return another format when WebP encoding is unavailable.
    // Send a compressed JPEG fallback and let the API normalize it to WebP before storage.
    if (blob.type !== "image/webp") {
      const fallbackType =
        sourceBlob.type === "image/png" ? "image/png" : "image/jpeg";
      blob = await canvasToBlob(canvas, fallbackType, 0.82);
      if (blob.size > MAX_MOMENT_UPLOAD_BYTES)
        blob = await canvasToBlob(canvas, "image/jpeg", 0.68);
    }
    if (blob.size > MAX_MOMENT_UPLOAD_BYTES) {
      throw new Error(
        "This photo is still over 10MB after compression. Try a smaller image.",
      );
    }
    const base =
      file.name.replace(/\.[^.]+$/, "").slice(0, 120) || "moment-photo";
    const extension =
      blob.type === "image/webp"
        ? "webp"
        : blob.type === "image/png"
          ? "png"
          : "jpg";
    return new File([blob], `${base}.${extension}`, { type: blob.type });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This photo could not be opened."));
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: "image/webp" | "image/jpeg" | "image/png",
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("This photo could not be compressed.")),
      mimeType,
      quality,
    );
  });
}
