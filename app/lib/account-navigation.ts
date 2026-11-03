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
  feature?: string;
}> = [
  { key: "overview", title: "Overview" },
  { key: "expenses", title: "Expense Tracker" },
  { key: "moments", title: "Your Moments" },
  { key: "payback", title: "PayBack history" },
  { key: "activity", title: "Tool activity" },
  { key: "favorite-tools", title: "Favorite tools" },
  { key: "favorite-commands", title: "Favorite commands", feature: "developer-commands" },
  { key: "settings", title: "Settings" },
  { key: "information", title: "Information & support" },
];
