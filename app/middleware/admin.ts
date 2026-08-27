export default defineNuxtRouteMiddleware(async () => {
  const { user, isReady, fetchMe } = useAuth();

  if (!isReady.value) {
    await fetchMe();
  }

  if (!user.value) {
    return navigateTo({ path: "/login", query: { redirect: "/admin" } });
  }

  if (user.value.role !== "ADMIN") {
    return navigateTo("/account");
  }
});
