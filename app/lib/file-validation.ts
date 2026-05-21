export const MAX_PDF_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_IMAGE_FILE_SIZE = 20 * 1024 * 1024;
export const MAX_MERGE_PDF_FILES = 20;
export const MAX_IMAGE_BATCH_FILES = 40;
export const MAX_PDF_PAGE_COUNT = 500;
export const MAX_IMAGE_PIXEL_COUNT = 40_000_000;

export const PDF_MIME_TYPES = ["application/pdf"];
export const PDF_EXTENSIONS = ["pdf"];

export const PDF_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PDF_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

export const EXTENDED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
export const EXTENDED_IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
];

export const BROWSER_IMAGE_MIME_TYPES = [
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
];
export const BROWSER_IMAGE_EXTENSIONS = [
  "avif",
  "bmp",
  "gif",
  "jpg",
  "jpeg",
  "png",
  "webp",
];

export type FileValidationOptions = {
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  currentFileCount?: number;
  label: string;
  maxFileSize: number;
  maxFiles?: number;
};

export type FileValidationResult = {
  acceptedFiles: File[];
  errors: string[];
};

export function formatFileLimit(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)}KB`;
  }

  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

export function validateFiles(
  files: File[],
  options: FileValidationOptions,
): FileValidationResult {
  const errors: string[] = [];
  const acceptedFiles: File[] = [];
  const currentFileCount = options.currentFileCount ?? 0;
  const remainingSlots =
    options.maxFiles === undefined
      ? Number.POSITIVE_INFINITY
      : Math.max(0, options.maxFiles - currentFileCount);

  if (remainingSlots <= 0) {
    pushUnique(
      errors,
      `You can add up to ${options.maxFiles} ${options.label}${
        options.maxFiles === 1 ? "" : "s"
      }.`,
    );
    return { acceptedFiles, errors };
  }

  for (const file of files) {
    if (acceptedFiles.length >= remainingSlots) {
      pushUnique(
        errors,
        `Only ${options.maxFiles} ${options.label}${
          options.maxFiles === 1 ? "" : "s"
        } can be processed at once.`,
      );
      continue;
    }

    if (!isAllowedFile(file, options.allowedMimeTypes, options.allowedExtensions)) {
      pushUnique(
        errors,
        `Some files were skipped. Supported types: ${options.allowedExtensions
          .map((extension) => `.${extension}`)
          .join(", ")}.`,
      );
      continue;
    }

    if (file.size > options.maxFileSize) {
      pushUnique(
        errors,
        `Some files were skipped because each ${options.label} must be ${formatFileLimit(
          options.maxFileSize,
        )} or smaller.`,
      );
      continue;
    }

    acceptedFiles.push(file);
  }

  return { acceptedFiles, errors };
}

export function isExtremeImageResolution(width: number, height: number) {
  return width > 0 && height > 0 && width * height > MAX_IMAGE_PIXEL_COUNT;
}

function isAllowedFile(
  file: File,
  allowedMimeTypes: string[],
  allowedExtensions: string[],
) {
  const extension = getExtension(file.name);
  return allowedMimeTypes.includes(file.type) || allowedExtensions.includes(extension);
}

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function pushUnique(errors: string[], message: string) {
  if (!errors.includes(message)) {
    errors.push(message);
  }
}
