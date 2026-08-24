import { readAuthBody, requestAuthApi, setAuthCookies, type AuthTokenResponse } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const body = await readAuthBody<{ idToken: string }>(event);
  const auth = await requestAuthApi<AuthTokenResponse>(event, "/auth/telegram", { method: "POST", body });
  setAuthCookies(event, auth);
  return { user: auth.user };
});
