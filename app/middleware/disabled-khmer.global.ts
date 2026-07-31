import { getDisabledKhmerRedirect } from "~/data/site-routes";

export default defineNuxtRouteMiddleware((to) => {
  if (to.path !== "/km" && !to.path.startsWith("/km/")) {
    return;
  }

  const targetPath = getDisabledKhmerRedirect(to.path);

  return navigateTo(
    {
      path: targetPath,
      // Keep useful tool state only when the Khmer URL maps to a known English page.
      query: targetPath === "/" ? undefined : to.query,
    },
    {
      redirectCode: 301,
      replace: true,
    },
  );
});
