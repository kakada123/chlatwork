import { canShowAdsForUser } from "~/lib/ad-visibility";

export function useAdVisibility() {
  const route = useRoute();
  const { sourcePath } = useProductDomain();
  const { user, isReady, fetchMe } = useAuth();
  const canShowAds = computed(
    () =>
      // A full-screen blank canvas must not load ad overlays or reserve ad columns.
      route.meta.blankCanvas !== true &&
      // Public Link pages and their editor keep the creator's layout free of injected ads.
      !/^\/(?:u\/|link(?:\/|$)|account\/link(?:\/|$))/.test(sourcePath.value) &&
      canShowAdsForUser(isReady.value, user.value),
  );

  onMounted(() => {
    if (!isReady.value) void fetchMe();
  });

  return { canShowAds: readonly(canShowAds) };
}
