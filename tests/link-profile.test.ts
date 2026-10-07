import assert from "node:assert/strict";
import test from "node:test";
import {
  createLinkProfile,
  getLinkPlatform,
  getLinkEditingOrder,
  LINK_THEMES,
  profileSaveBody,
  reorderEnabledProfileLinks,
} from "../app/lib/link-profile.ts";

test("new profiles are private and presets have distinct identities", () => {
  const profile = createLinkProfile("Kakada");
  assert.equal(profile.isPublished, false);
  assert.equal(profile.showBranding, true);
  assert.deepEqual(profile.links, []);
  assert.equal(LINK_THEMES.length, 8);
  assert.equal(new Set(LINK_THEMES.map((theme) => theme.id)).size, 8);
});

test("new rows appear first for editing while the save payload keeps them last", () => {
  const first = {
    editorKey: "1",
    id: "first",
    title: "First",
    url: "https://example.com/first",
    isEnabled: true,
  };
  const second = {
    editorKey: "2",
    title: "Second",
    url: "https://example.com/second",
    isEnabled: true,
  };
  const newest = { editorKey: "3", title: "", url: "", isEnabled: true };
  const links = [first, second, newest];

  assert.deepEqual(getLinkEditingOrder(links, ["3", "2"]), [
    newest,
    second,
    first,
  ]);
  assert.deepEqual(links, [first, second, newest]);
  newest.title = "New link";
  newest.url = "https://example.com/new";
  const body = profileSaveBody({ ...createLinkProfile(), links }, false, false);
  assert.deepEqual(body.links.map((link) => link.title), [
    "First",
    "Second",
    "New link",
  ]);
  assert.equal("editorKey" in body.links[2]!, false);
});

test("removing a new row does not bring it back into the editing list", () => {
  const remaining = { editorKey: "1" };
  assert.deepEqual(getLinkEditingOrder([remaining], ["2"]), [remaining]);
});

test("preview sorting preserves disabled rows and saves the new shared order", () => {
  const first = {
    title: "First",
    url: "https://example.com/first",
    isEnabled: true,
  };
  const hidden = {
    title: "Hidden",
    url: "https://example.com/hidden",
    isEnabled: false,
  };
  const newest = {
    title: "New link",
    url: "https://example.com/new",
    isEnabled: true,
  };
  const links = [first, hidden, newest];
  const sorted = reorderEnabledProfileLinks(links, [newest, first]);
  assert.deepEqual(sorted, [newest, hidden, first]);
  assert.equal(sorted[1], hidden);
  assert.deepEqual(links, [first, hidden, newest]);
  const body = profileSaveBody(
    { ...createLinkProfile(), links: sorted },
    false,
    false,
  );
  assert.deepEqual(body.links.map((link) => link.title), [
    "New link",
    "Hidden",
    "First",
  ]);
});

test("preview sorting requires every enabled row exactly once", () => {
  const first = {
    title: "First",
    url: "https://example.com/first",
    isEnabled: true,
  };
  const second = {
    title: "Second",
    url: "https://example.com/second",
    isEnabled: true,
  };
  const hidden = {
    title: "Hidden",
    url: "https://example.com/hidden",
    isEnabled: false,
  };
  const links = [first, hidden, second];
  for (const invalid of [
    [],
    [first],
    [first, first],
    [first, hidden],
    [first, { ...second }],
    [first, second, hidden],
  ]) {
    assert.equal(reorderEnabledProfileLinks(links, invalid), links);
  }
  assert.deepEqual(reorderEnabledProfileLinks([hidden], []), [hidden]);
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
