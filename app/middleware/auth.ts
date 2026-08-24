export default defineNuxtRouteMiddleware(async (to) => {
  const { user, isReady, fetchMe } = useAuth();

  if (!isReady.value) {
    await fetchMe();
  }

  if (!user.value) {
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }
});
