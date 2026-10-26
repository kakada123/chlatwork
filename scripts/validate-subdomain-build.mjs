import { resolve } from "node:path";
import { lstat, symlink, unlink, writeFile } from "node:fs/promises";
import { buildNuxt, loadNuxt, writeTypes } from "@nuxt/kit";

// Validation must never load a developer's real env files or global Nuxt configuration.
const outputDir = resolve(`.tmp/subdomains/output-${Date.now()}`);
const nuxt = await loadNuxt({
  cwd: process.cwd(),
  dotenv: false,
  globalRc: false,
  overrides: {
    dev: false,
    buildDir: resolve(".tmp/subdomains/nuxt"),
    // Root tsconfig references .nuxt; validation deliberately keeps generated files in .tmp.
    vite: { esbuild: { tsconfigRaw: JSON.stringify({ compilerOptions: { target: "ESNext", useDefineForClassFields: true } }) } },
    nitro: { output: { dir: outputDir } },
  },
});
let validationLink = false;
try {
  await writeTypes(nuxt);
  // Vue's TypeScript transform follows root tsconfig references. The symlink stores all output in .tmp.
  if (!(await lstat(".nuxt").catch(() => null))) {
    await symlink(".tmp/subdomains/nuxt", ".nuxt");
    validationLink = true;
  }
  await buildNuxt(nuxt);
  await writeFile(".tmp/subdomains/latest-output.txt", outputDir);
} finally {
  if (validationLink) await unlink(".nuxt");
  await nuxt.close();
}
