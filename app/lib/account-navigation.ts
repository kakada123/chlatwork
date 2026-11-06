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
  titleKm?: string;
  feature?: string;
}> = [
  { key: "overview", title: "Overview", titleKm: "ទិដ្ឋភាពទូទៅ" },
  { key: "expenses", title: "Expense Tracker", titleKm: "តាមដានចំណាយ" },
  { key: "moments", title: "Your Moments", titleKm: "អនុស្សាវរីយ៍របស់អ្នក" },
  { key: "payback", title: "PayBack history", titleKm: "ប្រវត្តិ PayBack" },
  { key: "activity", title: "Tool activity", titleKm: "សកម្មភាពឧបករណ៍" },
  { key: "favorite-tools", title: "Favorite tools", titleKm: "ឧបករណ៍ដែលចូលចិត្ត" },
  { key: "favorite-commands", title: "Favorite commands", titleKm: "ពាក្យបញ្ជាដែលចូលចិត្ត", feature: "developer-commands" },
  { key: "settings", title: "Settings", titleKm: "ការកំណត់" },
  { key: "information", title: "Information & support", titleKm: "ព័ត៌មាន និងជំនួយ" },
];
