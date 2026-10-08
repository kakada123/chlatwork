import { readBody, setResponseHeader } from "h3";
import { requestAuthenticatedApi } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  return requestAuthenticatedApi(event, "/youtube-downloader/preview", {
    method: "POST",
    body: await readBody(event),
  });
});
