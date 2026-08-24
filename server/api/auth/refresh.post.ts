import { createError } from "h3";
import { clearAuthCookies, refreshAuthCookies } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  try {
    const auth = await refreshAuthCookies(event);
    if (!auth) throw createError({ statusCode: 401, statusMessage: "Refresh token is required" });
    return { user: auth.user };
  } catch (error) {
    clearAuthCookies(event);
    throw error;
  }
});
