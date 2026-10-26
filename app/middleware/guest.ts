import { safeReturnPath } from "~/lib/product-domains";

export default defineNuxtRouteMiddleware(async (to) => {
  const { user, isReady, fetchMe } = useAuth();

  if (!isReady.value) {
    await fetchMe();
  }

  if (user.value) {
    return navigateTo(safeReturnPath(to.query.redirect));
  }
});
