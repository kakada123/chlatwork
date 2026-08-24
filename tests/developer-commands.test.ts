import assert from "node:assert/strict";
import test from "node:test";

import {
  DEVELOPER_COMMANDS,
  DEVELOPER_COMMAND_CATEGORIES,
} from "../app/data/developer-commands.ts";

test("developer command library has complete category coverage and unique IDs", () => {
  assert.equal(DEVELOPER_COMMAND_CATEGORIES.length, 37);
  assert.ok(DEVELOPER_COMMANDS.length >= 140);
  assert.equal(new Set(DEVELOPER_COMMANDS.map((item) => item.id)).size, DEVELOPER_COMMANDS.length);

  for (const category of DEVELOPER_COMMAND_CATEGORIES) {
    assert.ok(DEVELOPER_COMMANDS.some((item) => item.category === category), `${category} needs commands`);
  }
});

test("Vercel and Electron include practical first-release coverage", () => {
  const vercelCommands = DEVELOPER_COMMANDS.filter((item) => item.category === "Vercel");
  const electronCommands = DEVELOPER_COMMANDS.filter((item) => item.category === "Electron");

  assert.ok(vercelCommands.length >= 10);
  assert.ok(electronCommands.length >= 10);
  assert.ok(vercelCommands.some((item) => item.id === "vercel-deploy-production" && item.danger === "warning"));
  assert.ok(electronCommands.some((item) => item.id === "electron-publish" && item.danger === "warning"));
});

test("every command placeholder has customization metadata", () => {
  for (const item of DEVELOPER_COMMANDS) {
    const placeholders = [...item.command.matchAll(/<([a-z][a-z0-9-]*)>/g)].map((match) => match[1]);
    const variables = new Set((item.variables ?? []).map((entry) => entry.key));
    for (const placeholder of placeholders) assert.ok(variables.has(placeholder), `${item.id} is missing metadata for <${placeholder}>`);
  }
});

test("dangerous commands explain their consequence", () => {
  for (const item of DEVELOPER_COMMANDS.filter((entry) => entry.danger === "danger")) {
    assert.ok(item.consequence && item.consequence.length >= 20, `${item.id} needs a clear consequence`);
  }
});

test("platform variants remain explicit", () => {
  assert.deepEqual(DEVELOPER_COMMANDS.find((item) => item.id === "port-windows")?.platform, ["windows"]);
  assert.deepEqual(DEVELOPER_COMMANDS.find((item) => item.id === "port-unix")?.platform, ["macos", "linux"]);
});

test("public command examples do not contain private project or personal names", () => {
  const serializedCommands = JSON.stringify(DEVELOPER_COMMANDS).toLowerCase();

  for (const privateTerm of ["scan-and-go", "scan and go", "aeon", "kakada", "daneth", "mini-queue"]) {
    assert.equal(serializedCommands.includes(privateTerm), false, `private example leaked: ${privateTerm}`);
  }
});
