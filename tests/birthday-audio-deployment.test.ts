import assert from "node:assert/strict";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import test from "node:test";
import { build } from "vite";
import vue from "@vitejs/plugin-vue";

test("birthday client components bundle when the separately deployed API is unavailable", async () => {
  const root = process.cwd();
  assert.match(readFileSync(".vercelignore", "utf8"), /^\/api\/$/m);
  const result = await build({
    configFile: false,
    envDir: false,
    logLevel: "silent",
    cacheDir: resolve(".tmp/birthday-deployment/vite"),
    resolve: { alias: [
      { find: "~~", replacement: root },
      { find: "~", replacement: resolve("app") },
    ] },
    plugins: [vue(), {
      name: "match-vercel-api-exclusion",
      enforce: "pre",
      load(id) {
        if (id.startsWith(`${root}/api/`)) throw new Error(`Vercel excludes backend source: ${id}`);
      },
    }],
    build: {
      write: false,
      minify: false,
      lib: {
        entry: ["MomentExperience", "BirthdayAudioEditor", "BirthdayMusicPlayer"].map((name) => resolve(`app/components/moments/${name}.vue`)),
        formats: ["es"],
      },
      rollupOptions: { external: ["vue", "lucide-vue-next", "canvas-confetti"] },
    },
  });
  const bundles = (Array.isArray(result) ? result : [result]).flatMap((item) => "output" in item ? item.output : []);
  assert.ok(bundles.some((item) => item.type === "chunk"), "expected production JS chunks");
});
