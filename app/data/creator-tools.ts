export type CreatorCategory = "create" | "video" | "repurpose" | "khmer";

export type CreatorToolId =
  | "create-post"
  | "script-generator"
  | "hook-generator"
  | "content-ideas"
  | "video-subtitle"
  | "video-caption"
  | "video-summary"
  | "video-content-pack"
  | "facebook-to-tiktok"
  | "video-to-social"
  | "long-to-short"
  | "khmer-grammar"
  | "khmer-rewrite"
  | "latin-to-khmer"
  | "khmer-humanize";

export type CreatorIconName =
  | "post"
  | "script"
  | "hook"
  | "ideas"
  | "subtitle"
  | "caption"
  | "summary"
  | "content-pack"
  | "repurpose"
  | "social"
  | "shorten"
  | "grammar"
  | "rewrite"
  | "convert"
  | "humanize";

export type CreatorResultKind =
  | "text"
  | "script"
  | "hooks"
  | "ideas"
  | "platforms"
  | "subtitle"
  | "summary"
  | "content-pack";

export type CreatorConfigField =
  "platform" | "language" | "tone" | "video-length" | "goal" | "shortness";

export type CreatorCreditCost =
  | { type: "fixed"; credits: number }
  | { type: "video"; minimum: number; perMinute: number };

export type CreatorToolDefinition = {
  id: CreatorToolId;
  title: string;
  shortTitle: string;
  description: string;
  category: CreatorCategory;
  route: string;
  icon: CreatorIconName;
  inputType: "text" | "video";
  inputLabel: string;
  inputPlaceholder: string;
  config: CreatorConfigField[];
  resultKind: CreatorResultKind;
  submitLabel: string;
  creditCost: CreatorCreditCost;
  featured?: boolean;
  fast?: boolean;
  imageAttachment?: boolean;
};

export const CREATOR_CATEGORIES = [
  {
    id: "create" as const,
    title: "Create",
    description: "Start fresh with a post, script, hook, or content idea.",
  },
  {
    id: "video" as const,
    title: "Video AI",
    description: "Turn one video into useful Khmer creator assets.",
  },
  {
    id: "repurpose" as const,
    title: "Repurpose",
    description: "Adapt content for another platform or shorter format.",
  },
  {
    id: "khmer" as const,
    title: "Khmer AI",
    description: "Write clearer, more natural Cambodian content.",
  },
] as const;

export const CREATOR_TOOLS: CreatorToolDefinition[] = [
  {
    id: "create-post",
    title: "Create Post",
    shortTitle: "Post",
    description: "Turn an idea into a ready-to-publish social post.",
    category: "create",
    route: "/creator/create/post",
    icon: "post",
    inputType: "text",
    inputLabel: "What should the post be about?",
    inputPlaceholder:
      "Example: Promote our new iced coffee for a hot afternoon in Phnom Penh…",
    config: ["platform", "language", "tone"],
    resultKind: "text",
    submitLabel: "Generate Post",
    creditCost: { type: "fixed", credits: 2 },
    imageAttachment: true,
  },
  {
    id: "script-generator",
    title: "Script Generator",
    shortTitle: "Script",
    description:
      "Build a clear short-video script with a hook, main message, and CTA.",
    category: "create",
    route: "/creator/create/script",
    icon: "script",
    inputType: "text",
    inputLabel: "What is your video about?",
    inputPlaceholder:
      "Example: Three easy ways small shops can improve their product videos…",
    config: ["platform", "video-length", "language", "tone"],
    resultKind: "script",
    submitLabel: "Generate Script",
    creditCost: { type: "fixed", credits: 4 },
  },
  {
    id: "hook-generator",
    title: "Hook Generator",
    shortTitle: "Hooks",
    description:
      "Get several scroll-stopping openings without slowing down your workflow.",
    category: "create",
    route: "/creator/create/hook",
    icon: "hook",
    inputType: "text",
    inputLabel: "What is your content about?",
    inputPlaceholder:
      "Example: Why most first-time creators give up too early…",
    config: ["platform", "tone"],
    resultKind: "hooks",
    submitLabel: "Generate Hooks",
    creditCost: { type: "fixed", credits: 1 },
    fast: true,
  },
  {
    id: "content-ideas",
    title: "Content Ideas",
    shortTitle: "Ideas",
    description: "Find practical content ideas matched to your niche and goal.",
    category: "create",
    route: "/creator/create/ideas",
    icon: "ideas",
    inputType: "text",
    inputLabel: "Your creator or business niche",
    inputPlaceholder:
      "Example: Khmer skincare reviews for young professionals…",
    config: ["platform", "goal"],
    resultKind: "ideas",
    submitLabel: "Generate Ideas",
    creditCost: { type: "fixed", credits: 2 },
  },
  {
    id: "video-subtitle",
    title: "Video → Khmer Subtitle",
    shortTitle: "Khmer Subtitle",
    description:
      "Prepare a Khmer transcript and editable SRT subtitles from your video.",
    category: "video",
    route: "/creator/video/subtitle",
    icon: "subtitle",
    inputType: "video",
    inputLabel: "Upload video",
    inputPlaceholder: "Choose a video to create Khmer subtitles.",
    config: [],
    resultKind: "subtitle",
    submitLabel: "Create Khmer Subtitles",
    creditCost: { type: "video", minimum: 5, perMinute: 5 },
  },
  {
    id: "video-caption",
    title: "Video → Caption",
    shortTitle: "Video Caption",
    description:
      "Create TikTok, Facebook, and Instagram captions from one video.",
    category: "video",
    route: "/creator/video/caption",
    icon: "caption",
    inputType: "video",
    inputLabel: "Upload video",
    inputPlaceholder: "Choose a video to generate platform captions.",
    config: ["language", "tone"],
    resultKind: "platforms",
    submitLabel: "Generate Captions",
    creditCost: { type: "video", minimum: 3, perMinute: 3 },
  },
  {
    id: "video-summary",
    title: "Video → Summary",
    shortTitle: "Video Summary",
    description: "Extract a clean summary, key points, and important topics.",
    category: "video",
    route: "/creator/video/summary",
    icon: "summary",
    inputType: "video",
    inputLabel: "Upload video",
    inputPlaceholder: "Choose a video to summarize.",
    config: ["language"],
    resultKind: "summary",
    submitLabel: "Summarize Video",
    creditCost: { type: "video", minimum: 3, perMinute: 3 },
  },
  {
    id: "video-content-pack",
    title: "Video → Content Pack",
    shortTitle: "Content Pack",
    description:
      "Turn one video into subtitles, captions, hooks, hashtags, a title, CTA, and summary.",
    category: "video",
    route: "/creator/video/content-pack",
    icon: "content-pack",
    inputType: "video",
    inputLabel: "Upload one video",
    inputPlaceholder: "Choose one video to create the complete content pack.",
    config: ["language", "tone"],
    resultKind: "content-pack",
    submitLabel: "Generate Content Pack",
    creditCost: { type: "video", minimum: 7, perMinute: 7 },
    featured: true,
  },
  {
    id: "facebook-to-tiktok",
    title: "Facebook → TikTok",
    shortTitle: "Facebook to TikTok",
    description:
      "Adapt a Facebook post into a faster TikTok hook, caption, and hashtags.",
    category: "repurpose",
    route: "/creator/repurpose/facebook-to-tiktok",
    icon: "repurpose",
    inputType: "text",
    inputLabel: "Paste your Facebook post",
    inputPlaceholder: "Paste the original Facebook content here…",
    config: ["language", "tone"],
    resultKind: "text",
    submitLabel: "Make TikTok Version",
    creditCost: { type: "fixed", credits: 2 },
  },
  {
    id: "video-to-social",
    title: "Video → Social Posts",
    shortTitle: "Social Posts",
    description:
      "Upload once and generate platform-specific posts for Facebook, TikTok, and Instagram.",
    category: "repurpose",
    route: "/creator/repurpose/video-to-social",
    icon: "social",
    inputType: "video",
    inputLabel: "Upload video",
    inputPlaceholder: "Choose a video to repurpose across social platforms.",
    config: ["language", "tone"],
    resultKind: "platforms",
    submitLabel: "Generate Social Posts",
    creditCost: { type: "video", minimum: 3, perMinute: 3 },
  },
  {
    id: "long-to-short",
    title: "Long → Short",
    shortTitle: "Long to Short",
    description: "Shorten long content while preserving the original meaning.",
    category: "repurpose",
    route: "/creator/repurpose/long-to-short",
    icon: "shorten",
    inputType: "text",
    inputLabel: "Paste your long text or script",
    inputPlaceholder: "Paste the content you want to shorten…",
    config: ["shortness"],
    resultKind: "text",
    submitLabel: "Shorten Content",
    creditCost: { type: "fixed", credits: 2 },
  },
  {
    id: "khmer-grammar",
    title: "Khmer Grammar",
    shortTitle: "Grammar",
    description:
      "Clean up Khmer grammar and phrasing while keeping your meaning.",
    category: "khmer",
    route: "/creator/khmer/grammar",
    icon: "grammar",
    inputType: "text",
    inputLabel: "Khmer text",
    inputPlaceholder: "បញ្ចូលអត្ថបទខ្មែរដែលអ្នកចង់កែ…",
    config: [],
    resultKind: "text",
    submitLabel: "Fix Khmer",
    creditCost: { type: "fixed", credits: 1 },
    fast: true,
  },
  {
    id: "khmer-rewrite",
    title: "Khmer Rewrite",
    shortTitle: "Rewrite",
    description:
      "Rewrite Khmer or English text in a clearer tone without losing its meaning.",
    category: "khmer",
    route: "/creator/khmer/rewrite",
    icon: "rewrite",
    inputType: "text",
    inputLabel: "Text to rewrite",
    inputPlaceholder: "Paste the text you want to improve…",
    config: ["tone"],
    resultKind: "text",
    submitLabel: "Rewrite",
    creditCost: { type: "fixed", credits: 1 },
  },
  {
    id: "latin-to-khmer",
    title: "Latin Khmer → Khmer",
    shortTitle: "Latin to Khmer",
    description: "Convert everyday Latin Khmer typing into Khmer script.",
    category: "khmer",
    route: "/creator/khmer/latin-to-khmer",
    icon: "convert",
    inputType: "text",
    inputLabel: "Latin Khmer",
    inputPlaceholder: "Example: nh jol jit video ng nas",
    config: [],
    resultKind: "text",
    submitLabel: "Convert to Khmer",
    creditCost: { type: "fixed", credits: 1 },
    fast: true,
  },
  {
    id: "khmer-humanize",
    title: "Tone / Humanize",
    shortTitle: "Humanize",
    description:
      "Make awkward or AI-looking text sound more natural for Cambodian audiences.",
    category: "khmer",
    route: "/creator/khmer/humanize",
    icon: "humanize",
    inputType: "text",
    inputLabel: "Text to humanize",
    inputPlaceholder:
      "Paste text that sounds too formal, robotic, or unnatural…",
    config: ["tone"],
    resultKind: "text",
    submitLabel: "Humanize Text",
    creditCost: { type: "fixed", credits: 1 },
  },
];

export const CREATOR_ROUTE_PATHS = [
  "/creator",
  ...CREATOR_TOOLS.map((tool) => tool.route),
];

export function getCreatorToolByRoute(route: string) {
  return CREATOR_TOOLS.find((tool) => tool.route === route) ?? null;
}

export function getCreatorToolsByCategory(category: CreatorCategory) {
  return CREATOR_TOOLS.filter((tool) => tool.category === category);
}

export function estimateCreatorCredits(
  cost: CreatorCreditCost,
  durationSeconds?: number,
) {
  if (cost.type === "fixed") return cost.credits;
  if (!durationSeconds || durationSeconds <= 0) return cost.minimum;
  return Math.max(
    cost.minimum,
    Math.ceil(durationSeconds / 60) * cost.perMinute,
  );
}
