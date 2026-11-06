import { translateMessage } from "./i18n.ts";
export type DesktopAccountSection =
  | "overview"
  | "expenses"
  | "moments"
  | "payback"
  | "activity"
  | "favorite-tools"
  | "favorite-commands"
  | "settings"
  | "information";

export const DESKTOP_ACCOUNT_SECTIONS: ReadonlyArray<{
  key: DesktopAccountSection;
  title: string;
  titleKey: string;
  titleKm?: string;
  feature?: string;
}> = [
  { key: "overview", titleKey: "shared.components_admin_activity_dashboard.overview", title: translateMessage("en", "shared.components_admin_activity_dashboard.overview"), titleKm: translateMessage("km", "shared.components_admin_activity_dashboard.overview") },
  { key: "expenses", titleKey: "shared.pages_account.expense_tracker", title: translateMessage("en", "shared.pages_account.expense_tracker"), titleKm: translateMessage("km", "shared.pages_account.expense_tracker") },
  { key: "moments", titleKey: "shared.pages_account.your_moments", title: translateMessage("en", "shared.pages_account.your_moments"), titleKm: translateMessage("km", "shared.pages_account.your_moments") },
  { key: "payback", titleKey: "shared.pages_account.pay_back_history", title: translateMessage("en", "shared.pages_account.pay_back_history"), titleKm: translateMessage("km", "shared.pages_account.pay_back_history") },
  { key: "activity", titleKey: "shared.pages_account.tool_activity", title: translateMessage("en", "shared.pages_account.tool_activity"), titleKm: translateMessage("km", "shared.pages_account.tool_activity") },
  { key: "favorite-tools", titleKey: "shared.pages_account.favorite_tools", title: translateMessage("en", "shared.pages_account.favorite_tools"), titleKm: translateMessage("km", "shared.pages_account.favorite_tools") },
  { key: "favorite-commands", titleKey: "shared.pages_account.favorite_commands", title: translateMessage("en", "shared.pages_account.favorite_commands"), titleKm: translateMessage("km", "shared.pages_account.favorite_commands"), feature: "developer-commands" },
  { key: "settings", titleKey: "shared.account_sections.settings", title: translateMessage("en", "shared.account_sections.settings"), titleKm: translateMessage("km", "shared.account_sections.settings") },
  { key: "information", titleKey: "shared.account_sections.information", title: translateMessage("en", "shared.account_sections.information"), titleKm: translateMessage("km", "shared.account_sections.information") },
];
