export function canShowAdsForUser(
  isAuthReady: boolean,
  user: { name: string | null } | null,
): boolean {
  // Resolve the session first so exempt users never briefly load ads as guests.
  if (!isAuthReady) return false;

  // The exemption also applies to full names such as "Kakada Ngen".
  const nameParts = (user?.name ?? "").trim().toLowerCase().split(/\s+/);
  return !nameParts.includes("kakada");
}
