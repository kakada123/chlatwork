import { createError, readMultipartFormData } from "h3";
import { requestAuthenticatedApi } from "../../../utils/auth";

// Keep this proxy ceiling aligned with the temporary API upload allowance.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  const parts = await readMultipartFormData(event);
  const file = parts?.find((part) => part.name === "file" && part.filename);
  if (!file?.data || !file.type || !file.filename) {
    throw createError({
      statusCode: 400,
      statusMessage: "Choose an image to upload",
    });
  }
  if (file.data.byteLength > MAX_IMAGE_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: "Each Moment image must be 10MB or smaller",
    });
  }

  const form = new FormData();
  form.append(
    "file",
    new Blob([file.data], { type: file.type }),
    file.filename,
  );
  return await requestAuthenticatedApi(
    event,
    `/moments/${getRouterParam(event, "id")}/media`,
    {
      method: "POST",
      body: form,
    },
  );
});
