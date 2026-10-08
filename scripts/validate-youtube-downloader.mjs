import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { parse, compileScript, compileTemplate } from "@vue/compiler-sfc";

const require = createRequire(import.meta.url);
const ts = require("../api/node_modules/typescript");
const filename = "app/pages/tools/youtube-downloader.vue";
const { descriptor, errors } = parse(readFileSync(filename, "utf8"), { filename });
if (errors.length) throw errors[0];
const script = compileScript(descriptor, { id: "youtube-downloader" });
const template = compileTemplate({
  source: descriptor.template.content,
  filename,
  id: "youtube-downloader",
  compilerOptions: { bindingMetadata: script.bindings },
});
if (template.errors.length) throw template.errors[0];

// Standalone compilation avoids loading Nuxt configuration or real environment files.
const sources = [
  [filename, script.content],
  ...[
    "app/lib/youtube-downloader.ts",
    "app/composables/useYoutubeDownloader.ts",
    "server/api/youtube-downloader/preview.post.ts",
    "server/api/youtube-downloader/jobs/index.post.ts",
    "server/api/youtube-downloader/jobs/[id].get.ts",
    "server/api/youtube-downloader/jobs/[id].delete.ts",
    "server/api/youtube-downloader/jobs/[id]/ticket.post.ts",
  ].map((path) => [path, readFileSync(path, "utf8")]),
];
for (const [path, source] of sources) {
  const result = ts.transpileModule(source, {
    fileName: path.replace(/\.vue$/, ".ts"),
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
  });
  const failures =
    result.diagnostics?.filter((item) => item.category === ts.DiagnosticCategory.Error) ?? [];
  if (failures.length)
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(failures, {
        getCurrentDirectory: () => process.cwd(),
        getCanonicalFileName: (name) => name,
        getNewLine: () => "\n",
      }),
    );
}
console.log(
  "YouTube downloader Vue script/template and seven frontend/server TypeScript sources compile.",
);
