import assert from "node:assert/strict";
import test from "node:test";
import {
  createLinkProfile,
  getLinkPlatform,
  LINK_THEMES,
  profileSaveBody,
} from "../app/lib/link-profile.ts";

test("new profiles are private and presets have distinct identities", () => {
  const profile = createLinkProfile("Kakada");
  assert.equal(profile.isPublished, false);
  assert.equal(profile.showBranding, true);
  assert.deepEqual(profile.links, []);
  assert.equal(LINK_THEMES.length, 8);
  assert.equal(new Set(LINK_THEMES.map((theme) => theme.id)).size, 8);
});

test("platform detection does not assign trusted branding to lookalikes", () => {
  for (const [url, platform] of [
    ["https://m.facebook.com/person", "facebook"],
    ["https://t.me/person", "telegram"],
    ["https://www.linkedin.com/in/person", "linkedin"],
    ["mailto:hi@example.com", "email"],
    ["tel:+85512345678", "phone"],
    ["https://facebook.com.evil.example", "custom"],
    ["https://notgithub.com", "custom"],
    ["invalid", "custom"],
  ]) {
    assert.equal(getLinkPlatform(url!), platform);
  }
});

test("save payload excludes API-owned metadata and leaves existing uploads untouched", () => {
  const profile = {
    ...createLinkProfile("Kakada"),
    slug: "kakada",
    id: "profile-id",
    viewCount: 42,
    createdAt: "today",
    avatarUrl: "/api/profiles/me/media/avatar?v=1",
    hasAvatarUpload: true,
    links: [
      {
        id: "link-id",
        title: "GitHub",
        url: " https://github.com/kakada ",
        isEnabled: true,
        clickCount: 12,
        type: "github",
        position: 7,
      },
    ],
  };
  const body = profileSaveBody(profile, false, false);
  for (const key of [
    "id",
    "viewCount",
    "createdAt",
    "avatarUrl",
    "backgroundUrl",
    "hasAvatarUpload",
  ])
    assert.equal(key in body, false);
  assert.deepEqual(body.links, [
    {
      id: "link-id",
      title: "GitHub",
      url: "https://github.com/kakada",
      isEnabled: true,
    },
  ]);
  profile.avatarUrl = "";
  assert.equal(profileSaveBody(profile, true, false).avatarUrl, "");
});
