export function canShowAdsForUser(
  isAuthReady: boolean,
  user: { name: string | null } | null,
): boolean {
  // Resolve the session first so exempt users never briefly load ads as guests.
  return isAuthReady && user?.name?.trim().toLowerCase() !== "kakada";
}
