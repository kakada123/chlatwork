import { requestAuthenticatedApi } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  return await requestAuthenticatedApi(event, "/personal/reminders", { query });
});
