import { translateMessage } from "./i18n.ts";

const BOT_CODE_KEYS: Record<string, string> = {
  "NOT_REQUESTED": "shared.bot_codes.not_requested",
  "PENDING": "shared.bot_codes.pending",
  "APPROVED": "shared.bot_codes.approved",
  "REJECTED": "shared.bot_codes.rejected",
  "SUSPENDED": "shared.bot_codes.suspended",
  "ACTIVE": "shared.bot_codes.active",
  "CONNECTED": "shared.bot_codes.connected",
  "DISCONNECTED": "shared.bot_codes.disconnected",
  "MISSING_PERMISSIONS": "shared.bot_codes.missing_permissions",
  "BOT_REMOVED": "shared.bot_codes.bot_removed",
  "NEEDS_RECONNECTION": "shared.bot_codes.needs_reconnection",
  "MIGRATED": "shared.bot_codes.migrated",
  "FEATURES_SAVED": "shared.bot_codes.features_saved",
  "VOTE_SAVED": "shared.bot_codes.vote_saved",
  "VOTE_RESET": "shared.bot_codes.vote_reset",
  "VOTE_CAST": "shared.bot_codes.vote_cast",
  "PARTICIPATION_CHANGED": "shared.bot_codes.participation_changed",
  "SPLIT_CREATED": "shared.bot_codes.split_created",
  "KHQR_SHOWN": "shared.bot_codes.khqr_shown",
  "KHQR_SAVED": "shared.bot_codes.khqr_saved",
  "KHQR_REMOVED": "shared.bot_codes.khqr_removed",
  "ACCESS_REVIEW": "shared.bot_codes.access_review",
  "PLATFORM_STATUS": "shared.bot_codes.platform_status",
  "GRANT": "shared.bot_codes.grant",
  "RESERVE": "shared.bot_codes.reserve",
  "CHARGE": "shared.bot_codes.charge",
  "REFUND": "shared.bot_codes.refund",
  "PURCHASE": "shared.bot_codes.purchase",
  "EXPIRE": "shared.bot_codes.expire",
  "ADMIN_ADJUSTMENT": "shared.bot_codes.admin_adjustment"
};

/** Format known system codes for display; API values and authored content stay intact. */
export function localizeBotCode(value: string | null | undefined, locale: "en" | "km"): string {
  if (!value) return "—";
  return Object.hasOwn(BOT_CODE_KEYS, value) ? translateMessage(locale, BOT_CODE_KEYS[value]!) : value;
}
