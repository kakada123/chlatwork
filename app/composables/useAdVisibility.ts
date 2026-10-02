import { canShowAdsForUser } from "~/lib/ad-visibility";

export function useAdVisibility() {
  const route = useRoute();
  const { user, isReady, fetchMe } = useAuth();
  const canShowAds = computed(() =>
    // Public Link pages and their editor keep the creator's layout free of injected ads.
    !/^\/(?:u\/|link(?:\/|$)|account\/link(?:\/|$))/.test(route.path) &&
    canShowAdsForUser(isReady.value, user.value),
  );

  onMounted(() => {
    if (!isReady.value) void fetchMe();
  });

  return { canShowAds: readonly(canShowAds) };
}
