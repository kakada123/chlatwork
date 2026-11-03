import { computed } from "vue";
import { readBirthdayAudioCatalog, type BirthdayAudioTrack } from "~/lib/birthday-audio";

const emptyCatalog = (): BirthdayAudioTrack[] => [];

export function useBirthdayAudioCatalog() {
  // Share public metadata between components; the separately deployed API remains authoritative.
  const { data, status, error, refresh } = useFetch<BirthdayAudioTrack[]>("/api/moments/birthday-audio", {
    key: "birthday-audio-catalog",
    default: emptyCatalog,
    transform: readBirthdayAudioCatalog,
    deep: false,
    retry: 0,
  });
  return {
    tracks: computed(() => data.value ?? []),
    loading: computed(() => status.value === "pending" || status.value === "idle"),
    error,
    refresh,
  };
}
