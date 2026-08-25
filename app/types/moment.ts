export type MomentOccasion =
  | "ANNIVERSARY"
  | "BIRTHDAY"
  | "LOVE"
  | "FRIENDSHIP"
  | "GRADUATION"
  | "WEDDING"
  | "BABY"
  | "MOTHERS_DAY"
  | "FATHERS_DAY"
  | "HOLIDAY"
  | "FAREWELL"
  | "INVITATION"
  | "OTHER";

export type MomentTheme = "ROMANTIC" | "CUTE" | "MINIMAL" | "ELEGANT";
export type MomentBlockType =
  | "HERO" | "MESSAGE" | "GALLERY" | "COUNTER" | "SECRET"
  | "EVENT_DETAILS" | "LOCATION" | "SCHEDULE" | "RSVP";

export type MomentRsvpChoice = "YES" | "MAYBE" | "NO";
export interface MomentRsvpSummary { yes: number; maybe: number; no: number; guests: number }

export interface MomentSummary {
  id: string;
  slug: string;
  recipientName: string;
  occasion: MomentOccasion;
  title: string;
  theme: MomentTheme;
  status: "DRAFT" | "PUBLISHED";
  publishAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  _count: { media: number };
  rsvpSummary?: MomentRsvpSummary;
}

export interface MomentBlock {
  id: string;
  type: MomentBlockType;
  position: number;
  data: Record<string, unknown>;
}

export interface MomentMedia {
  id: string;
  position: number;
  url: string;
}

export interface ReadyMoment {
  status: "ready";
  slug: string;
  recipientName: string;
  occasion: MomentOccasion;
  title: string;
  theme: MomentTheme;
  blocks: MomentBlock[];
  media: MomentMedia[];
}

export interface LockedMoment {
  status: "locked";
  recipientName: string;
  unlockAt: string;
}

export type PublicMoment = ReadyMoment | LockedMoment;

export interface MomentDraft {
  recipientName: string;
  occasion: MomentOccasion;
  title: string;
  message: string;
  secretMessage: string;
  theme: MomentTheme;
  specialDate: string;
  publishAt: string;
  eventDate: string;
  venueName: string;
  eventAddress: string;
  mapUrl: string;
  dressCode: string;
  eventSchedule: string;
}
