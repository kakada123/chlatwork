import type { LinkProfile } from "../types/link-profile.ts";

export const LINK_THEMES = [
  {
    id: "minimal",
    name: "Minimal White",
    background: "#f8fafc",
    accent: "#0f172a",
    dark: false,
  },
  {
    id: "midnight",
    name: "Midnight",
    background: "linear-gradient(160deg, #0f172a, #1e1b4b)",
    accent: "#c4b5fd",
    dark: true,
  },
  {
    id: "glass",
    name: "Glass",
    background: "linear-gradient(135deg, #312e81, #0e7490, #6d28d9)",
    accent: "#a5f3fc",
    dark: true,
  },
  {
    id: "purple",
    name: "Soft Purple",
    background: "linear-gradient(150deg, #faf5ff, #ede9fe)",
    accent: "#7c3aed",
    dark: false,
  },
  {
    id: "ocean",
    name: "Ocean",
    background: "linear-gradient(150deg, #ecfeff, #bae6fd)",
    accent: "#0369a1",
    dark: false,
  },
  {
    id: "creator",
    name: "Creator",
    background: "linear-gradient(150deg, #fff1f2, #ffedd5, #fce7f3)",
    accent: "#be185d",
    dark: false,
  },
  {
    id: "developer",
    name: "Developer",
    background: "#111827",
    accent: "#6ee7b7",
    dark: true,
  },
  {
    id: "business",
    name: "Business",
    background: "linear-gradient(160deg, #f1f5f9, #e2e8f0)",
    accent: "#1e3a8a",
    dark: false,
  },
] as const;

export function createLinkProfile(displayName = ""): LinkProfile {
  return {
    slug: "",
    displayName,
    headline: "",
    bio: "",
    avatarUrl: null,
    backgroundUrl: null,
    theme: "minimal",
    backgroundMode: "preset",
    backgroundColor: "#f8fafc",
    gradientColor: "#e9d5ff",
    colorMode: "preset",
    font: "sans",
    radius: "rounded",
    buttonStyle: "solid",
    showBranding: true,
    isPublished: false,
    seoTitle: "",
    seoDescription: "",
    links: [],
  };
}

export function getLinkPlatform(value: string) {
  if (/^mailto:/i.test(value)) return "email";
  if (/^tel:/i.test(value)) return "phone";
  try {
    const host = new URL(value).hostname.toLowerCase();
    const platforms: Record<string, string[]> = {
      instagram: ["instagram.com"],
      facebook: ["facebook.com", "fb.com"],
      linkedin: ["linkedin.com"],
      tiktok: ["tiktok.com"],
      youtube: ["youtube.com", "youtu.be"],
      telegram: ["t.me", "telegram.me"],
      github: ["github.com"],
      x: ["x.com", "twitter.com"],
      discord: ["discord.com", "discord.gg"],
      whatsapp: ["wa.me", "whatsapp.com"],
    };
    return (
      Object.entries(platforms).find(([, hosts]) =>
        hosts.some((domain) => host === domain || host.endsWith(`.${domain}`)),
      )?.[0] ?? "custom"
    );
  } catch {
    return "custom";
  }
}

export function profileSaveBody(
  profile: LinkProfile,
  avatarChanged: boolean,
  backgroundChanged: boolean,
) {
  const { avatarUrl, backgroundUrl, links } = profile;
  return {
    slug: profile.slug,
    displayName: profile.displayName,
    headline: profile.headline,
    bio: profile.bio,
    theme: profile.theme,
    backgroundMode: profile.backgroundMode,
    backgroundColor: profile.backgroundColor,
    gradientColor: profile.gradientColor,
    colorMode: profile.colorMode,
    font: profile.font,
    radius: profile.radius,
    buttonStyle: profile.buttonStyle,
    showBranding: profile.showBranding,
    isPublished: profile.isPublished,
    seoTitle: profile.seoTitle,
    seoDescription: profile.seoDescription,
    ...(avatarChanged ? { avatarUrl: avatarUrl || "" } : {}),
    ...(backgroundChanged ? { backgroundUrl: backgroundUrl || "" } : {}),
    links: links.map(({ id, title, url, isEnabled }) => ({
      ...(id ? { id } : {}),
      title,
      url: url.trim(),
      isEnabled,
    })),
  };
}
