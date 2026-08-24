function safeRedirect(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/account";
}

export default defineNuxtRouteMiddleware(async (to) => {
  const { user, isReady, fetchMe } = useAuth();

  if (!isReady.value) {
    await fetchMe();
  }

  if (user.value) {
    return navigateTo(safeRedirect(to.query.redirect));
  }
});
