export type CommandPlatform = "macos" | "linux" | "windows";
export type CommandDanger = "safe" | "warning" | "danger";

export type CommandVariable = {
  key: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  options?: string[];
};

export type DeveloperCommand = {
  id: string;
  category: string;
  title: string;
  description: string;
  command: string;
  keywords: string[];
  platform?: CommandPlatform[];
  danger: CommandDanger;
  variables?: CommandVariable[];
  context?: "shell" | "psql" | "redis";
  consequence?: string;
};
