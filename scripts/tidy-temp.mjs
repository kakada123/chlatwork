import { lstatSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const validArgs = new Set(["--dry-run", "--clean"]);

if (args.some((arg) => !validArgs.has(arg))) {
  console.error("Usage: npm run tidy:temp -- [--dry-run] [--clean]");
  process.exit(1);
}

const dryRun = args.includes("--dry-run");
const clean = args.includes("--clean");

// Identify obsolete generated build, cache, and validation outputs.
// Application source, fixtures, real test directories, and standard .nuxt/.output dev builds stay in place.
function isGeneratedArtifact(name, directory) {
  if (/secret|credential|service-account|firebase|(?:^|[.-])env(?:[.-]|$)/i.test(name)) {
    return false;
  }
  if (name === ".cache" || name.startsWith(".cache-")) {
    return true;
  }
  if (/^\.codex-(?:tmp|validate|schema|test-tmp|prisma-[a-z0-9_-]+|build-[a-z0-9_.-]+)$/i.test(name)) {
    return true;
  }
  if (/^\.jest-cache(?:-[a-z0-9_-]+)?$/i.test(name)) {
    return true;
  }
  if (/^\.tmp-(?:git|codex)$/i.test(name)) {
    return true;
  }
  if (name === "node-compile-cache" || name === "tmp") {
    return true;
  }
  if (/^\.(?:nuxt|output)-[a-z0-9_-]+$/i.test(name)) {
    return true;
  }
  // Inside api/, .nuxt is an obsolete validation artifact (api is NestJS, not Nuxt)
  if (directory === "api" && name === ".nuxt") {
    return true;
  }
  return false;
}

const actions = [];

try {
  if (!clean) {
    for (const directory of [".tmp", ".tmp/archive", ".tmp/archive/root", ".tmp/archive/api"]) {
      try {
        const stats = lstatSync(join(root, directory));
        if (stats.isSymbolicLink() || !stats.isDirectory()) {
          throw new Error(`Archive parent must be a real directory: ${directory}`);
        }
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }

  for (const directory of [".", "api"]) {
    const sourceRoot = join(root, directory);
    if (!lstatSync(sourceRoot).isDirectory()) continue;
    if (lstatSync(sourceRoot).isSymbolicLink()) {
      throw new Error(`Refusing symbolic link: ${directory}`);
    }

    for (const name of readdirSync(sourceRoot)) {
      if (!isGeneratedArtifact(name, directory)) continue;

      const source = join(sourceRoot, name);
      if (lstatSync(source).isSymbolicLink()) {
        throw new Error(`Refusing symbolic link: ${relative(root, source)}`);
      }

      if (clean) {
        actions.push({ source, type: "remove" });
      } else {
        const destination = join(root, ".tmp/archive", directory === "." ? "root" : "api", name);
        try {
          lstatSync(destination);
          throw new Error(`Archive already exists: ${relative(root, destination)}`);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
        actions.push({ source, destination, type: "archive" });
      }
    }
  }

  // Also clean .tmp/archive if --clean is requested and it exists
  if (clean) {
    const archiveDir = join(root, ".tmp/archive");
    try {
      if (lstatSync(archiveDir).isDirectory()) {
        actions.push({ source: archiveDir, type: "remove" });
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  for (const action of actions) {
    if (action.type === "remove") {
      if (!dryRun) {
        rmSync(action.source, { recursive: true, force: true });
      }
      console.log(`${dryRun ? "Would remove" : "Removed"}: ${relative(root, action.source)}`);
    } else {
      if (!dryRun) {
        mkdirSync(dirname(action.destination), { recursive: true });
        renameSync(action.source, action.destination);
      }
      console.log(`${relative(root, action.source)} -> ${relative(root, action.destination)}`);
    }
  }

  const actionVerb = clean ? (dryRun ? "Would remove" : "Removed") : (dryRun ? "Would group" : "Grouped");
  console.log(`${actionVerb} ${actions.length} generated files and directories.`);
} catch (error) {
  console.error(`Temporary-file cleanup stopped: ${error.message}`);
  if (error.code === "EPERM" || error.code === "EACCES") {
    console.error("Run from your local terminal with elevated permissions:");
    console.error("  rm -rf .cache .cache-* .codex-* .jest-cache* .nuxt-* .output-* .tmp-git node-compile-cache tmp api/.cache api/.nuxt api/.codex-*");
  }
  process.exitCode = 1;
}
