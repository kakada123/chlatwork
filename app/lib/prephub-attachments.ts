export const PREP_FILE_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.docx,.pptx,.xlsx,.txt";
export const PREP_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const PREP_MAX_FILES = 20;
const extensions = new Set(
  PREP_FILE_ACCEPT.split(",").map((value) => value.slice(1)),
);

export function validatePrepFiles(
  files: readonly File[],
  existingCount = 0,
): "count" | "size" | "type" | null {
  if (files.length + existingCount > PREP_MAX_FILES) return "count";
  for (const file of files) {
    if (!file.size || file.size > PREP_MAX_FILE_BYTES) return "size";
    if (!extensions.has(file.name.split(".").at(-1)?.toLowerCase() ?? ""))
      return "type";
  }
  return null;
}

export function canPreviewPrepResource(resource: { mimeType: string }) {
  return ["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(
    resource.mimeType,
  );
}

export function prepResourceUrl(
  subjectId: string,
  resourceId: string,
  resourceBase?: string,
  preview = false,
) {
  if (
    resourceBase &&
    !/^\/api\/prephub\/(?:public\/[^/?#]+|subjects\/[^/?#]+)\/resources$/.test(
      resourceBase,
    )
  )
    throw new Error("Invalid attachment path.");
  const base =
    resourceBase ??
    `/api/prephub/subjects/${encodeURIComponent(subjectId)}/resources`;
  return `${base}/${encodeURIComponent(resourceId)}${preview ? "?preview=1" : ""}`;
}

/** Keep the server's per-file limit and stop on failure; acknowledged files can be removed before a retry. */
export async function uploadPrepFiles(
  files: readonly File[],
  send: (body: FormData, file: File) => Promise<unknown>,
  options: {
    current?: () => boolean;
    uploaded?: (file: File, index: number) => void;
  } = {},
) {
  for (const [index, file] of [...files].entries()) {
    if (options.current && !options.current()) return false;
    const body = new FormData();
    body.append("file", file);
    if ((await send(body, file)) === false) return false;
    if (options.current && !options.current()) return false;
    options.uploaded?.(file, index);
  }
  return true;
}
