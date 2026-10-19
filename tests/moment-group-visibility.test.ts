import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import { renderToString } from "@vue/server-renderer";
import { compileTemplate, parse } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import { MOMENT_COPY } from "../app/data/moment-locales.ts";

async function renderTemplate(path: string, context: Record<string, unknown>) {
  const { descriptor } = parse(readFileSync(path, "utf8"), { filename: path });
  const compiled = compileTemplate({
    source: descriptor.template!.content,
    filename: path,
    id: path,
  });
  assert.deepEqual(compiled.errors, []);
  const module = { exports: {} as { render: (...args: any[]) => vue.VNode } };
  const output = ts.transpileModule(compiled.code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function("require", "module", "exports", output)(
    () => vue,
    module,
    module.exports,
  );
  const app = vue.createSSRApp({
    render: () => module.exports.render(context, []),
  });
  app.component("NuxtLink", {
    props: ["to"],
    setup:
      (props, { slots }) =>
      () =>
        vue.h(
          "a",
          {
            href:
              typeof props.to === "string"
                ? props.to
                : `${props.to.path}?${new URLSearchParams(props.to.query)}`,
          },
          slots.default?.(),
        ),
  });
  for (const name of [
    "Images",
    "CalendarClock",
    "ExternalLink",
    "Trash2",
    "Plus",
    "MomentLanguageToggle",
    "ConfirmDialog",
  ]) {
    app.component(name, { render: () => null });
  }
  for (const name of [
    "MomentSummaryCard",
    "MomentInvitationGuests",
    "MomentVotingResults",
  ]) {
    app.component(name, {
      render: () => vue.h("div", { "data-component": name }),
    });
  }
  return renderToString(app);
}

const moment = {
  id: "poll",
  slug: "private-poll",
  title: "Lunch",
  recipientName: "Group",
  status: "PUBLISHED",
  occasion: "VOTING",
  _count: { media: 11 },
  groupWorkspaceId: "workspace",
  groupTitle: "Lunch time",
};

for (const locale of ["en", "km"] as const) {
  test(`group poll card routes to group management without public sharing or deletion (${locale})`, async () => {
    const html = await renderTemplate(
      "app/components/moments/MomentSummaryCard.vue",
      {
        moment,
        managerCopy: MOMENT_COPY[locale].manager,
        isKhmer: locale === "km",
        stacked: true,
        statusKind: "published",
        statusLabel: "Published",
        createdDate: "Today",
        deletable: true,
        deleting: false,
        localizeMomentPath: (path: string) => path,
        getMomentOccasion: () => ({ emoji: "🗳️" }),
      },
    );
    assert.match(html, /href="\/bot\/groups\/workspace\?bot=CHLATWORK"/);
    assert.doesNotMatch(html, /\/m\/private-poll|<button/);
    assert.match(html, /Lunch time/);
  });
}

test("personal published cards retain their public page and deletion control", async () => {
  const html = await renderTemplate(
    "app/components/moments/MomentSummaryCard.vue",
    {
      moment: { ...moment, groupWorkspaceId: null },
      managerCopy: MOMENT_COPY.en.manager,
      isKhmer: false,
      stacked: false,
      statusKind: "published",
      statusLabel: "Published",
      createdDate: "Today",
      deletable: true,
      deleting: false,
      localizeMomentPath: (path: string) => path,
      getMomentOccasion: () => ({ emoji: "🗳️" }),
    },
  );
  assert.match(html, /href="\/m\/private-poll"/);
  assert.match(html, /<button/);
});

test("My Moments shows the group card without mounting the personal voting editor", async () => {
  const html = await renderTemplate("app/pages/moments/index.vue", {
    moments: [moment],
    managerCopy: MOMENT_COPY.en.manager,
    isKhmer: false,
    status: "success",
    error: null,
    deleteError: "",
    voteResetError: "",
    deletingId: "",
    resettingVoteId: "",
    momentPendingDelete: null,
    momentPendingVoteReset: null,
    localizeMomentPath: (path: string) => path,
  });
  assert.match(html, /data-component="MomentSummaryCard"/);
  assert.doesNotMatch(html, /data-component="MomentVotingResults"/);
});
