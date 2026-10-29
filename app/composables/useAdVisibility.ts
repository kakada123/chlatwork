import { canShowAdsForUser } from "~/lib/ad-visibility";
import { useFeatureAvailability } from "~/composables/useFeatureAvailability";

export function useAdVisibility() {
  const route = useRoute();
  const { sourcePath } = useProductDomain();
  const { user, isReady, fetchMe } = useAuth();
  const availability = useFeatureAvailability();
  // Unknown policy must not briefly load an ad before the admin's disabled setting arrives.
  const adsEnabled = computed(
    () => availability.loaded.value && availability.isEnabled("ads:sitewide"),
  );
  const canShowAds = computed(
    () =>
      adsEnabled.value &&
      // A full-screen blank canvas must not load ad overlays or reserve ad columns.
      route.meta.blankCanvas !== true &&
      // Public Link pages and their editor keep the creator's layout free of injected ads.
      !/^\/(?:u\/|link(?:\/|$)|account\/link(?:\/|$))/.test(sourcePath.value) &&
      canShowAdsForUser(isReady.value, user.value),
  );

  onMounted(() => {
    if (route.meta.localOnly === true) return;
    if (!isReady.value) void fetchMe();
    if (!availability.loaded.value)
      void availability.refresh().catch(() => undefined);
  });

  return { canShowAds: readonly(canShowAds), adsEnabled: readonly(adsEnabled) };
}
