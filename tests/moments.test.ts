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

  assert.match(invitation.message, /Neth, we would be delighted/);
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
  assert.match(service, /createHash\('sha256'\)\.update\(dto\.responseToken\)/);
  assert.match(service, /momentRsvp\.upsert/);
  assert.match(controller, /@Post\(':slug\/rsvp'\)/);
  assert.match(proxy, /requestAuthApi\(event, `\/moments\/\$\{slug\}\/rsvp`/);
  assert.match(creator, /draft\.occasion === "INVITATION"/);
  assert.match(experience, /experienceCopy\.rsvpTitle/);
  assert.match(experience, /experienceCopy\.openMap/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "moment_rsvps"/);
  assert.match(creator, /getMomentDefaultStory\(draft\.occasion, nextLocale, draft\.recipientName\)/);
  const locales = readProjectFile("app/data/moment-locales.ts");
  assert.match(locales, /INVITATION: \{ message: `\$\{name\} យើងខ្ញុំមានសេចក្តីរីករាយ/);
  assert.match(locales, /INVITATION: \{ message: `\$\{name\}, we would be delighted/);
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
