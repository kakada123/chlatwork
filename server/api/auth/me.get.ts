import { createError, type H3Event } from "h3";
import { clearAuthCookies, getAccessToken, refreshAuthCookies, requestAuthApi, type AuthUser } from "../../utils/auth";

async function currentUser(event: H3Event, accessToken = getAccessToken(event)) {
  if (!accessToken) throw createError({ statusCode: 401, statusMessage: "Authentication required" });
  return await requestAuthApi<AuthUser>(event, "/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export default defineEventHandler(async (event) => {
  try {
    return { user: await currentUser(event) };
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 401) throw error;
    try {
      const auth = await refreshAuthCookies(event);
      if (!auth) throw new Error("No refresh token");
      return { user: await currentUser(event, auth.accessToken) };
    } catch {
      clearAuthCookies(event);
      throw createError({ statusCode: 401, statusMessage: "Authentication required" });
    }
  }
});
