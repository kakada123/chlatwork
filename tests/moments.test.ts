import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { MOMENT_COPY, getMomentDefaultStory } from "../app/data/moment-locales.ts";
import {
  buildMomentTitle,
  buildPreviewMoment,
  getMomentCounterCopy,
  getMomentFormError,
  isValidMomentDate,
} from "../app/lib/moments.ts";
import type { MomentDraft } from "../app/types/moment.ts";

const draft: MomentDraft = {
  recipientName: "Neth",
  occasion: "ANNIVERSARY",
  title: "Our favorite story",
  message: "Every day is better with you.",
  secretMessage: "Dinner is waiting at seven. ❤️",
  theme: "ROMANTIC",
  specialDate: "2025-05-22",
  publishAt: "",
  eventDate: "",
  venueName: "",
  eventAddress: "",
  mapUrl: "",
  dressCode: "",
  eventSchedule: "",
  hostName: "",
  pollQuestion: "",
  pollOptions: ["", ""],
  pollIdentityMode: "ANONYMOUS",
};

const readProjectFile = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Moment titles and dates are deterministic", () => {
  assert.equal(
    buildMomentTitle("Neth", "BIRTHDAY"),
    "🎂 Happy Birthday, Neth!",
  );
  assert.equal(isValidMomentDate("2026-02-29"), false);
  assert.equal(isValidMomentDate("2024-02-29"), true);
  assert.deepEqual(getMomentCounterCopy("2025-05-22", new Date(2025, 4, 24)), {
    value: 2,
    unit: "days",
    label: "of memories together",
  });
});

test("default story copy follows the selected Moment occasion", () => {
  const invitation = getMomentDefaultStory("INVITATION", "en", "Neth");
  const birthday = getMomentDefaultStory("BIRTHDAY", "en", "Neth");
  const khmerInvitation = getMomentDefaultStory("INVITATION", "km", "ណែត");

  assert.match(invitation.message, /We would be delighted/);
  assert.match(invitation.secret, /RSVP/);
  assert.match(birthday.message, /Happy birthday, Neth/);
  assert.match(khmerInvitation.message, /សូមអញ្ជើញ/);
  assert.notEqual(invitation.message, birthday.message);
});

test("Khmer Moment copy covers creation and receiver experiences", () => {
  assert.equal(
    buildMomentTitle("ណែត", "BIRTHDAY", "km"),
    "🎂 រីករាយថ្ងៃកំណើត ណែត!",
  );
  assert.deepEqual(
    getMomentCounterCopy("2025-05-22", new Date(2025, 4, 24), "km"),
    {
      value: 2,
      unit: "ថ្ងៃ",
      label: "នៃអនុស្សាវរីយ៍រួមគ្នា",
    },
  );
  assert.equal(
    getMomentFormError({ ...draft, secretMessage: " " }, 2, "km"),
    MOMENT_COPY.km.creator.errors.secret,
  );
  assert.match(MOMENT_COPY.km.publicPage.waitingTitle, /[\u1780-\u17ff]/u);
});

test("preview uses ordered extensible blocks and photos", () => {
  const preview = buildPreviewMoment(draft, ["blob:one", "blob:two"]);
  assert.deepEqual(
    preview.blocks.map((block) => block.type),
    ["HERO", "MESSAGE", "GALLERY", "COUNTER", "SECRET"],
  );
  assert.deepEqual(
    preview.media.map((media) => media.position),
    [0, 1],
  );
  assert.equal(getMomentFormError(draft, 2), "");
  assert.equal(
    getMomentFormError({ ...draft, secretMessage: " " }, 2),
    "Add the secret surprise message.",
  );
});

test("invitation Moments use only the event date", () => {
  const invitationPreview = buildPreviewMoment(
    {
      ...draft,
      occasion: "INVITATION",
      specialDate: "2026-08-28",
      eventDate: "2026-08-28T18:00",
    },
    [],
  );
  const creator = readProjectFile("app/components/moments/MomentCreator.vue");

  assert.equal(
    invitationPreview.blocks.filter((block) => block.type === "COUNTER").length,
    0,
  );
  assert.match(creator, /v-if="!\['INVITATION', 'VOTING'\]\.includes\(draft\.occasion\)"/);
});

test("voting Moments render a poll and allow photo-free publishing", () => {
  const votingDraft: MomentDraft = {
    ...draft,
    occasion: "VOTING",
    recipientName: "Lunch plan",
    pollQuestion: "",
    pollOptions: ["Khmer food", "Noodles", "BBQ"],
  };
  const preview = buildPreviewMoment(votingDraft, []);

  assert.ok(preview.blocks.some((block) => block.type === "POLL"));
  assert.equal(
    preview.blocks.find((block) => block.type === "POLL")?.data.question,
    "Lunch plan",
  );
  assert.equal(getMomentFormError(votingDraft, 0), "");
  assert.equal(
    getMomentFormError({ ...votingDraft, pollOptions: ["Same", "Same"] }, 0),
    MOMENT_COPY.en.creator.errors.pollOptions,
  );
  const creator = readProjectFile("app/components/moments/MomentCreator.vue");
  const experience = readProjectFile("app/components/moments/MomentExperience.vue");
  assert.match(creator, /draft\.occasion === "VOTING" && step\.value === 1\s*\? 3/);
  assert.match(experience, /v-if="photos\.length && !isVoting"/);
  assert.match(experience, /v-else-if="!isVoting"\s+class="moment-section secret-section"/);
  assert.match(experience, /<header v-if="!isVoting" class="moment-hero">/);
  assert.match(experience, /pollRequiresName/);
  assert.match(experience, /_selection/);
  assert.match(experience, /experienceCopy\.voters/);
  assert.match(creator, /value="LOGIN_REQUIRED"/);
  assert.match(experience, /showVoteLogin/);
  assert.match(experience, /:disabled="preview"/);
  assert.match(experience, /<form class="poll-form" :class="\{ 'is-preview': preview \}"/);
  const voteService = readProjectFile("api/src/moments/moments.service.ts");
  const voteController = readProjectFile("api/src/moments/moments.controller.ts");
  const voteProxy = readProjectFile("server/api/moments/[id]/vote.post.ts");
  const voteResults = readProjectFile("app/components/moments/MomentVotingResults.vue");
  const managerPage = readProjectFile("app/pages/moments/index.vue");
  assert.match(voteService, /`account:\$\{user!\.id\}`/);
  assert.match(voteService, /UnauthorizedException\('Log in to vote in this poll'\)/);
  assert.match(voteService, /momentVote\.upsert/);
  assert.match(voteService, /momentId_responseKey/);
  assert.match(voteController, /OptionalJwtAuthGuard/);
  assert.match(voteProxy, /requestOptionallyAuthenticatedApi/);
  assert.match(voteService, /pollSummary: await this\.getPollSummary/);
  assert.match(managerPage, /<MomentVotingResults/);
  assert.match(voteResults, /result\.voters\.join/);
});

test("published Moment surfaces are unlisted and validate image content", () => {
  const viewer = readProjectFile("app/pages/m/[slug].vue");
  const service = readProjectFile("api/src/moments/moments.service.ts");
  const sql = readProjectFile("database/updates/2026-08-24-create-moments.sql");

  assert.match(viewer, /noindex, nofollow, noarchive/);
  assert.match(service, /detectImageMime/);
  assert.match(service, /MAX_ACTIVE_MOMENTS = 3/);
  assert.match(service, /randomBytes\(8\)/);
  assert.match(service, /where: \{ id: momentId, creatorId: userId \}/);
  assert.match(service, /MomentBlockType\.SECRET/);
  assert.match(sql, /CREATE TABLE "moment_blocks"/);
  assert.match(sql, /"content" BYTEA/);
  assert.match(sql, /^BEGIN;$/m);
  assert.match(sql, /^COMMIT;$/m);
  assert.doesNotMatch(sql, /DROP TABLE|TRUNCATE|DELETE FROM/);
});

test("Moment API routes share one dynamic segment", () => {
  const projectFileExists = (path: string) =>
    existsSync(new URL(`../${path}`, import.meta.url));

  assert.equal(projectFileExists("server/api/moments/[slug].get.ts"), false);
  assert.equal(projectFileExists("server/api/moments/[id]/index.get.ts"), true);
  assert.equal(
    projectFileExists("server/api/moments/[id]/media.post.ts"),
    true,
  );
  assert.equal(
    projectFileExists("server/api/moments/[id]/media/[mediaId].get.ts"),
    true,
  );
});

test("Moment creator keeps dark interaction states readable", () => {
  const creator = readProjectFile("app/components/moments/MomentCreator.vue");

  assert.doesNotMatch(creator, /:global\(\.dark\)/);
  assert.match(
    creator,
    /html\.dark \.moments-creator \.secondary-button:hover:not\(:disabled\)/,
  );
  assert.match(creator, /html\.dark \.moments-creator \.success-copy/);
  assert.match(creator, /html\.dark \.moments-creator \.preview-link:hover/);
  assert.match(creator, /fetchError\.response\?\._data\?\.message/);
  assert.doesNotMatch(creator, /if \(locale\.value === "km"\) return creatorCopy\.value\.errors\.publishFailed/);
});

test("Khmer Moment headings use Khmer typography and spacing", () => {
  const creator = readProjectFile(
    "app/components/moments/MomentCreator.vue",
  );

  assert.match(
    creator,
    /\.moments-creator\.is-khmer \.creator-card h2 \{[\s\S]*?font-size: clamp\(1\.55rem, 3\.2vw, 2rem\);[\s\S]*?line-height: 1\.6;/,
  );
  assert.match(
    creator,
    /\.moments-creator\.is-khmer \.step-label \{[\s\S]*?letter-spacing: 0;[\s\S]*?text-transform: none;/,
  );
});

test("Khmer Moment detail applies Hanuman to nested text", () => {
  const experience = readProjectFile(
    "app/components/moments/MomentExperience.vue",
  );

  assert.match(
    experience,
    /\.moment-experience\.is-khmer\s+:where\(h1, h2, p, span, strong, figcaption, button\) \{\s+font-family: "Hanuman"/,
  );
  assert.match(
    experience,
    /\.moment-experience\.is-khmer \.occasion-pill,[\s\S]*?\.moment-experience\.is-khmer \.moment-footer \{\s+font-family: "Hanuman"/,
  );
  assert.match(
    experience,
    /\.moment-experience\.is-khmer \.moment-hero h1,[\s\S]*?letter-spacing: 0;/,
  );
});

test("profile lists account-owned Moments with the shared summary card", () => {
  const profile = readProjectFile("app/pages/account.vue");
  const manager = readProjectFile("app/pages/moments/index.vue");
  const card = readProjectFile(
    "app/components/moments/MomentSummaryCard.vue",
  );
  const types = readProjectFile("app/types/moment.ts");

  assert.match(profile, /useFetch<MomentSummary\[]>\("\/api\/moments\/mine"/);
  assert.match(
    profile,
    /import MomentSummaryCard from "~\/components\/moments\/MomentSummaryCard\.vue"/,
  );
  assert.match(profile, /v-for="moment in moments"/);
  assert.match(profile, /<MomentSummaryCard :moment="moment"/);
  assert.doesNotMatch(profile, /moments\.slice/);
  assert.match(
    manager,
    /import MomentSummaryCard from "~\/components\/moments\/MomentSummaryCard\.vue"/,
  );
  assert.match(manager, /<MomentSummaryCard[\s\S]*?deletable/);
  assert.match(card, /emit\('delete', moment\)/);
  assert.match(types, /export interface MomentSummary/);
});

test("sign out and Moment deletion use the shared confirmation dialog", () => {
  const account = readProjectFile("app/pages/account.vue");
  const manager = readProjectFile("app/pages/moments/index.vue");
  const dialog = readProjectFile("app/components/ui/ConfirmDialog.vue");

  assert.match(account, /<ConfirmDialog[\s\S]*?@confirm="signOut"/);
  assert.match(account, /@click="signOutDialogOpen = true"/);
  assert.match(manager, /@delete="requestMomentDelete"/);
  assert.match(manager, /<ConfirmDialog[\s\S]*?@confirm="removeMoment"/);
  assert.doesNotMatch(manager, /window\.confirm/);
  assert.match(dialog, /role="alertdialog"/);
  assert.match(dialog, /cancelButton\.value\?\.focus\(\)/);
  assert.match(dialog, /dark:bg-\[#101214\]/);
});

test("Invitation Moments collect private RSVP responses end to end", () => {
  const schema = readProjectFile("api/prisma/schema.prisma");
  const service = readProjectFile("api/src/moments/moments.service.ts");
  const controller = readProjectFile("api/src/moments/moments.controller.ts");
  const creator = readProjectFile("app/components/moments/MomentCreator.vue");
  const experience = readProjectFile("app/components/moments/MomentExperience.vue");
  const proxy = readProjectFile("server/api/moments/[id]/rsvp.post.ts");
  const sql = readProjectFile("database/updates/2026-08-25-add-moment-invitations.sql");

  assert.match(schema, /INVITATION/);
  assert.match(schema, /model MomentRsvp/);
  assert.match(schema, /@@unique\(\[momentId, responseKey\]\)/);
  assert.match(service, /createHash\('sha256'\)\.update\(rawResponseToken\)/);
  assert.match(service, /momentRsvp\.upsert/);
  assert.match(controller, /@Post\(':slug\/rsvp'\)/);
  assert.match(proxy, /requestAuthApi\(event, `\/moments\/\$\{slug\}\/rsvp`/);
  assert.match(creator, /draft\.occasion === "INVITATION"/);
  assert.match(creator, /creatorCopy\.eventName/);
  assert.match(creator, /v-model="draft\.hostName"/);
  assert.match(experience, /experienceCopy\.rsvpTitle/);
  assert.match(experience, /experienceCopy\.openMap/);
  assert.match(experience, /output=embed/);
  assert.match(experience, /'is-single': photos\.length === 1/);
  assert.match(experience, /formatKhmerEventDate\(date\)/);
  assert.match(experience, /'is-single': eventDetailCount === 1/);
  assert.match(experience, /experienceCopy\.invitationGalleryTitle/);
  assert.match(experience, /v-if="isInvitation"[\s\S]*?invitationNoteTitle/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "moment_rsvps"/);
  assert.match(creator, /getMomentDefaultStory\(draft\.occasion, nextLocale, draft\.recipientName\)/);
  const locales = readProjectFile("app/data/moment-locales.ts");
  assert.match(locales, /INVITATION: \{ message: "យើងខ្ញុំមានសេចក្តីរីករាយ/);
  assert.match(locales, /INVITATION: \{ message: "We would be delighted/);
});

test("personalized invitation guest links keep names private and connect RSVP identity", () => {
  const schema = readProjectFile("api/prisma/schema.prisma");
  const service = readProjectFile("api/src/moments/moments.service.ts");
  const controller = readProjectFile("api/src/moments/moments.controller.ts");
  const manager = readProjectFile("app/components/moments/MomentInvitationGuests.vue");
  const personalPage = readProjectFile("app/pages/i/[token].vue");
  const sql = readProjectFile("database/updates/2026-08-25-add-personalized-invitation-guests.sql");

  assert.match(schema, /model MomentInvitationGuest/);
  assert.match(schema, /token\s+String\s+@unique/);
  assert.match(schema, /guestId\s+String\?\s+@unique/);
  assert.match(service, /randomBytes\(18\)\.toString\('base64url'\)/);
  assert.match(service, /personalizedGuest\.maxGuests/);
  assert.match(controller, /@Post\(':id\/guests'\)/);
  assert.match(controller, /@Get\('invitations\/:token'\)/);
  assert.match(manager, /split\(\/\\r\?\\n\/\)/);
  assert.match(manager, /navigator\.share/);
  assert.match(manager, /copiedAction\.value = `\$\{guest\.id\}:\$\{kind\}`/);
  assert.match(manager, /copy-success-icon/);
  assert.match(manager, /:global\(html\.dark \.guest-manager\)/);
  assert.doesNotMatch(manager, /:global\(html\.dark\) \.guest-manager/);
  assert.match(personalPage, /:invitation-guest="invitation\.invitationGuest"/);
  const experience = readProjectFile("app/components/moments/MomentExperience.vue");
  assert.match(experience, /props\.invitationGuest\?\.displayName \|\| heroTitle\.value/);
  assert.doesNotMatch(experience, /<strong>\{\{ invitationGuest\.displayName \}\}<\/strong>/);
  assert.match(experience, /experienceCopy\.value\.invitationScroll/);
  assert.match(experience, /v-if="!invitationGuest" class="eyebrow"/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "moment_invitation_guests"/);
  assert.match(manager, /localizeMomentPath\(`\/i\/\$\{guest\.token\}`\)/);
});

test("Moment language stays scoped and follows shared links", () => {
  const creator = readProjectFile("app/components/moments/MomentCreator.vue");
  const viewer = readProjectFile("app/pages/m/[slug].vue");
  const manager = readProjectFile("app/pages/moments/index.vue");
  const language = readProjectFile("app/composables/useMomentLanguage.ts");
  const siteLanguage = readProjectFile("app/composables/useLanguage.ts");
  const login = readProjectFile("app/components/auth/AuthLoginDialog.vue");

  assert.match(creator, /<MomentLanguageToggle/);
  assert.match(
    creator,
    /import MomentLanguageToggle from "~\/components\/moments\/MomentLanguageToggle\.vue"/,
  );
  assert.match(
    viewer,
    /import MomentLanguageToggle from "~\/components\/moments\/MomentLanguageToggle\.vue"/,
  );
  assert.match(
    manager,
    /import MomentLanguageToggle from "~\/components\/moments\/MomentLanguageToggle\.vue"/,
  );
  assert.match(creator, /localizeMomentPath\(`\/m\/\$\{slug\}`\)/);
  assert.match(viewer, /<MomentExperience :moment="moment" :locale="locale"/);
  assert.match(viewer, /:dark="moment\.theme === 'ELEGANT'"/);
  assert.match(language, /query\.lang = "km"/);
  assert.match(siteLanguage, /const ENABLE_KHMER_LOCALIZATION = false/);
  assert.match(login, /ចូលគណនីដើម្បីបន្ត/);
});
