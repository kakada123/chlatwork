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
  | "VOTING"
  | "OTHER";

export type MomentTheme = "ROMANTIC" | "CUTE" | "MINIMAL" | "ELEGANT";
export type MomentBlockType =
  | "HERO" | "MESSAGE" | "GALLERY" | "COUNTER" | "SECRET"
  | "EVENT_DETAILS" | "LOCATION" | "SCHEDULE" | "RSVP" | "POLL";

export type MomentRsvpChoice = "YES" | "MAYBE" | "NO";
export type MomentPollIdentityMode = "ANONYMOUS" | "NAME_REQUIRED" | "LOGIN_REQUIRED";
export type InvitationRecipientType = "INDIVIDUAL" | "COUPLE" | "FAMILY" | "GROUP";
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
  pollSummary?: MomentPollSummary;
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
  pollSummary?: MomentPollSummary;
}

export interface MomentPollResult { optionId: string; label: string; votes: number; voters?: string[] }
export interface MomentPollSummary { totalVotes: number; identityMode?: MomentPollIdentityMode; results: MomentPollResult[] }

export interface LockedMoment {
  status: "locked";
  recipientName: string;
  unlockAt: string;
}

export type PublicMoment = ReadyMoment | LockedMoment;

export interface InvitationGuestIdentity {
  token: string;
  displayName: string;
  recipientType: InvitationRecipientType;
  maxGuests: number;
}

export type PersonalInvitation = PublicMoment & { invitationGuest: InvitationGuestIdentity };

export interface InvitationGuest {
  id: string;
  token: string;
  displayName: string;
  recipientType: InvitationRecipientType;
  maxGuests: number;
  sentAt: string | null;
  rsvp: null | {
    choice: MomentRsvpChoice;
    guestCount: number;
    note: string | null;
    updatedAt: string;
  };
}

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
  hostName: string;
  pollQuestion: string;
  pollOptions: string[];
  pollIdentityMode: MomentPollIdentityMode;
}
