import { setResponseHeader } from "h3";
import { requestAuthenticatedApi } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  return requestAuthenticatedApi(event, "/admin/member-khqr/groups");
});
