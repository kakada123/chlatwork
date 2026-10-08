import { readBody, setResponseHeader, setResponseStatus } from "h3";
import { requestAuthenticatedApi } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  const result = await requestAuthenticatedApi(event, "/youtube-downloader/jobs", {
    method: "POST",
    body: await readBody(event),
  });
  setResponseStatus(event, 202);
  return result;
});
