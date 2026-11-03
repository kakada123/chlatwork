import { requestAuthApi } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  const tracks = await requestAuthApi(event, "/moments/birthday-audio");
  setResponseHeader(event, "Cache-Control", "public, max-age=300");
  return tracks;
});
