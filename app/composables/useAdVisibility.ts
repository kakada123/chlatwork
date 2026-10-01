import { canShowAdsForUser } from "~/lib/ad-visibility";

export function useAdVisibility() {
  const { user, isReady, fetchMe } = useAuth();
  const canShowAds = computed(() =>
    canShowAdsForUser(isReady.value, user.value),
  );

  onMounted(() => {
    if (!isReady.value) void fetchMe();
  });

  return { canShowAds: readonly(canShowAds) };
}
