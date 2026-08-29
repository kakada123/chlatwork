import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function collectVuePages(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return collectVuePages(path);
    return entry.isFile() && entry.name.endsWith(".vue") ? [path] : [];
  });
}

test("the default layout provides one mobile app shell to every standard page", () => {
  const layout = readFileSync("app/layouts/default.vue", "utf8");
  const header = readFileSync("app/components/layout/MobileAppHeader.vue", "utf8");
  const bottomNav = readFileSync("app/components/layout/MobileBottomNav.vue", "utf8");

  assert.match(layout, /import MobileAppHeader from/);
  assert.match(layout, /import MobileBottomNav from/);
  assert.match(layout, /<MobileAppHeader\s+v-if="showSharedMobileHeader"/);
  assert.match(layout, /<MobileBottomNav/);
  assert.match(layout, /class="site-header[^"]*hidden[^"]*sm:block"/);
  assert.match(layout, /pb-\[calc\(6\.5rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(layout, /class="site-footer[^"]*hidden[^"]*sm:block"/);
  assert.doesNotMatch(layout, /aria-label="Open menu"|v-show="isMenuOpen"/);

  assert.match(header, /sticky top-0/);
  assert.match(header, /min-h-16/);
  assert.match(header, /size-11/);
  assert.match(header, /aria-label="Go back"/);
  assert.match(header, /aria-label="Search ChlatWork"/);

  assert.match(bottomNav, /fixed inset-x-0 bottom-0/);
  assert.match(bottomNav, /env\(safe-area-inset-bottom\)/);
  assert.match(bottomNav, /to="\/"/);
  assert.match(bottomNav, /to="\/tools"/);
  assert.match(bottomNav, /> Search/);
  assert.match(bottomNav, /> Account/);
  assert.match(bottomNav, /props\.searchActive \? activeClass : inactiveClass/);
  assert.match(bottomNav, /:aria-pressed="props\.searchActive === true"/);
  assert.match(bottomNav, /!props\.searchActive && \(props\.routePath === "\/"/);
  assert.match(bottomNav, /!props\.searchActive && props\.routePath\.startsWith\("\/tools"\)/);
  assert.match(bottomNav, /!props\.searchActive && \(props\.routePath === "\/account"/);
  assert.equal(
    bottomNav.match(/:external="props\.forceDocumentNavigation"/g)?.length,
    3,
  );
  assert.match(bottomNav, /dark:bg-white\/\[0\.10\] dark:text-white/);
  assert.doesNotMatch(bottomNav, /dark:bg-cyan-300|dark:text-slate-950/);
});

test("all page routes inherit the app shell unless they are responsive immersive experiences", () => {
  const pages = collectVuePages("app/pages");
  const layoutFreePages = pages
    .filter((path) => /layout:\s*false/.test(readFileSync(path, "utf8")))
    .sort();

  assert.ok(pages.length >= 64, `expected the complete page inventory, found ${pages.length}`);
  assert.deepEqual(layoutFreePages, [
    "app/pages/i/[token].vue",
    "app/pages/love-probation.vue",
    "app/pages/m/[slug].vue",
  ]);

  for (const path of pages.filter((page) => !layoutFreePages.includes(page))) {
    const page = readFileSync(path, "utf8");
    assert.doesNotMatch(page, /aria-label="Mobile primary navigation"/, `${path} must use the shared navigation`);
  }

  const invitation = readFileSync("app/pages/i/[token].vue", "utf8");
  const publicMoment = readFileSync("app/pages/m/[slug].vue", "utf8");
  const loveExperience = readFileSync("app/pages/love-probation.vue", "utf8");

  assert.match(invitation, /width:\s*min\(100%,\s*680px\)/);
  assert.match(invitation, /min-height:\s*100vh/);
  assert.match(publicMoment, /width:\s*min\(100%,\s*680px\)/);
  assert.match(publicMoment, /font-size:\s*clamp\(/);
  assert.match(loveExperience, /@media \(max-width:\s*560px\)/);
  assert.match(loveExperience, /\.love-page \{\s*padding:\s*28px 14px 24px;/);
});

test("global mobile safeguards contain route content and keep overlays above navigation", () => {
  const styles = readFileSync("app/assets/css/main.css", "utf8");
  const cookieConsent = readFileSync("app/components/CookieConsent.vue", "utf8");
  const layout = readFileSync("app/layouts/default.vue", "utf8");

  assert.match(styles, /@media \(max-width:\s*639px\)/);
  assert.match(styles, /overflow-x:\s*clip/);
  assert.match(styles, /site-content :where\(main, section, article, form, fieldset\)/);
  assert.match(styles, /site-content :where\(img, video, canvas, pre, table\)/);
  assert.match(styles, /overscroll-behavior-inline:\s*contain/);
  assert.match(cookieConsent, /bottom-\[calc\(5\.5rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(layout, /fixed inset-0 z-\[105\]/);
  assert.match(layout, /Quick destinations/);
  assert.match(layout, /mobile-header-search-input/);
  assert.match(layout, /enterkeyhint="search"/);
  assert.match(layout, /type="submit"/);
  assert.match(layout, /headerSearchActionLabel/);
  assert.match(layout, /mobile-pressable flex min-h-16/);
  assert.match(layout, /<ChevronRight/);
  assert.match(layout, /:show-quick-expense-slot="showQuickExpenseNavigationSlot"\s+force-document-navigation\s+search-active/);
  assert.match(layout, /@search="focusMobileHeaderSearch"/);
  assert.match(layout, /<MobileBottomNav\s+v-if="!isHeaderSearchOpen"/);
  assert.match(layout, /:overlay-active="isHeaderSearchOpen"/);
});

test("mobile navigation uses delayed skeletons and motion-safe app transitions", () => {
  const layout = readFileSync("app/layouts/default.vue", "utf8");
  const skeleton = readFileSync("app/components/layout/MobileRouteSkeleton.vue", "utf8");
  const styles = readFileSync("app/assets/css/main.css", "utf8");
  const config = readFileSync("nuxt.config.ts", "utf8");
  const home = readFileSync("app/components/landing/MobileLandingPage.vue", "utf8");
  const tools = readFileSync("app/components/tools/MobileToolsDirectory.vue", "utf8");

  assert.match(layout, /import MobileRouteSkeleton from/);
  assert.match(layout, /<MobileRouteSkeleton :has-shared-header="showSharedMobileHeader"/);
  assert.match(layout, /<Transition name="mobile-sheet">/);
  assert.match(skeleton, /REVEAL_DELAY_MS = 120/);
  assert.match(skeleton, /MIN_VISIBLE_MS = 240/);
  assert.match(skeleton, /nuxtApp\.hook\("page:start"/);
  assert.match(skeleton, /nuxtApp\.hook\("page:finish"/);
  assert.match(skeleton, /aria-label="Loading page"/);
  assert.match(config, /pageTransition:\s*\{\s*name: "mobile-page",\s*mode: "out-in"/);
  assert.match(styles, /\.mobile-skeleton/);
  assert.match(styles, /@keyframes mobile-skeleton-shimmer/);
  assert.match(styles, /\.mobile-page-enter-active/);
  assert.match(styles, /\.mobile-pressable:active/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(home, /recentToolsLoading/);
  assert.match(home, /aria-label="Loading recent tools"/);
  assert.match(tools, /<TransitionGroup name="mobile-grid"/);
});

test("the shared mobile header is the only route-level back control", () => {
  const paybackHeader = readFileSync("app/components/payback-calculator/PaybackCalculatorHeader.vue", "utf8");
  const pdfCategory = readFileSync("app/pages/tools/pdf.vue", "utf8");
  const dynamicCategory = readFileSync("app/pages/tools/[categorySlug].vue", "utf8");
  const developerGuide = readFileSync("app/pages/developer-guides/[guideSlug].vue", "utf8");

  for (const source of [paybackHeader, pdfCategory, dynamicCategory, developerGuide]) {
    assert.match(source, /class="hidden[^"]*sm:inline-flex"/);
  }
});
