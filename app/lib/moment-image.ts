import { MAX_MOMENT_SOURCE_BYTES, MAX_MOMENT_UPLOAD_BYTES } from "./moments.ts";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_DIMENSION = 1600;

export async function prepareMomentImage(file: File) {
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new Error("Use a JPG, PNG, or WebP photo.");
  }
  if (file.size > MAX_MOMENT_SOURCE_BYTES) {
    throw new Error("Each original photo must be 20MB or smaller.");
  }

  const sourceUrl = URL.createObjectURL(file);
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
    let blob = await canvasToBlob(canvas, 0.82);
    if (blob.size > MAX_MOMENT_UPLOAD_BYTES)
      blob = await canvasToBlob(canvas, 0.68);
    if (blob.size > MAX_MOMENT_UPLOAD_BYTES) {
      throw new Error(
        "This photo is still over 10MB after compression. Try a smaller image.",
      );
    }
    const base =
      file.name.replace(/\.[^.]+$/, "").slice(0, 120) || "moment-photo";
    return new File([blob], `${base}.webp`, { type: "image/webp" });
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

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("This photo could not be compressed.")),
      "image/webp",
      quality,
    );
  });
}
