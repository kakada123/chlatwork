import { clearAuthCookies, getAccessToken, getRefreshToken, requestAuthApi } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const accessToken = getAccessToken(event);
  const refreshToken = getRefreshToken(event);
  try {
    await requestAuthApi(event, "/auth/logout", {
      method: "POST",
      body: refreshToken ? { refreshToken } : {},
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
  } finally {
    clearAuthCookies(event);
  }
  return { message: "Logged out successfully" };
});
