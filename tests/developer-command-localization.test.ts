import assert from "node:assert/strict";
import test from "node:test";
import { DEVELOPER_COMMANDS, DEVELOPER_COMMAND_CATEGORIES } from "../app/data/developer-commands.ts";
import { localizeCommandCategory, localizeDeveloperCommand } from "../app/data/developer-commands-km.ts";
import { localizeCronLine, localizePdfOption, localizeToolError } from "../app/data/tool-ui-km.ts";

const hasKhmer = (text: string) => /[\u1780-\u17ff]/.test(text);

test("every developer command has Khmer titles, descriptions, consequences, and variable labels", () => {
  for (const command of DEVELOPER_COMMANDS) {
    const localized = localizeDeveloperCommand(command, "km");
    assert.ok(hasKhmer(localized.title), `${command.id}: title`);
    assert.ok(hasKhmer(localized.description), `${command.id}: description`);
    if (command.consequence) assert.ok(hasKhmer(localized.consequence ?? ""), `${command.id}: consequence`);
    for (const variable of localized.variables ?? []) {
      assert.ok(hasKhmer(variable.label), `${command.id}: ${variable.label}`);
    }
  }
});

test("localization preserves command execution, favorites, category keys, and editable values", () => {
  for (const command of DEVELOPER_COMMANDS) {
    assert.deepEqual(localizeDeveloperCommand(command, "en"), command);
    const localized = localizeDeveloperCommand(command, "km");
    for (const key of ["id", "command", "category", "context", "danger", "platform", "keywords"] as const) {
      assert.deepEqual(localized[key], command[key], `${command.id}: ${key}`);
    }
    assert.deepEqual(
      localized.variables?.map(({ label: _label, ...value }) => value),
      command.variables?.map(({ label: _label, ...value }) => value),
      `${command.id}: editable values`,
    );
  }
  assert.equal(localizeCommandCategory("All", "km"), "ទាំងអស់");
  for (const category of DEVELOPER_COMMAND_CATEGORIES) {
    assert.ok(localizeCommandCategory(category, "km"));
    assert.equal(localizeCommandCategory(category, "en"), category);
  }
});

test("tool errors retain actionable file limits and supported types in Khmer", () => {
  assert.match(localizeToolError("Some files were skipped because each image must be 20MB or smaller.", true), /20MB/);
  assert.match(localizeToolError("Some files were skipped. Supported types: .png, .jpg.", true), /\.png, \.jpg/);
  assert.match(localizeToolError("You can add up to 40 images.", true), /40/);
  assert.equal(localizeToolError("Choose a file", false), "Choose a file");
  assert.equal(localizeToolError("សូមជ្រើសឯកសារ", true), "សូមជ្រើសឯកសារ");
});

test("cron and PDF layout labels translate without changing technical values", () => {
  assert.equal(localizePdfOption("A4", true), "A4");
  assert.ok(hasKhmer(localizePdfOption("Portrait", true)));
  assert.equal(localizePdfOption("Portrait", false), "Portrait");
  const cron = localizeCronLine("Minute: every 5 minutes", true);
  assert.match(cron, /5/);
  assert.ok(hasKhmer(cron));
  assert.doesNotMatch(cron, /Minute|every|minutes/);
  assert.equal(localizeCronLine("Minute: every 5 minutes", false), "Minute: every 5 minutes");
});

test("speech alerts translate at display time and preserve source detail for English mode", async () => {
  const { localizeSpeechError } = await import("../app/data/tool-ui-km.ts");
  const message = "Unable to load Khmer audio. Check the internet connection and try again.";
  assert.ok(hasKhmer(localizeSpeechError(message, true)));
  assert.equal(localizeSpeechError(message, false), message);
  assert.match(localizeSpeechError("Text is estimated at 14s. Limit is 10s for this voice.", true), /14.*10/);
});

test("image compression success and warning messages retain their outcome and numeric detail", async () => {
  const { localizeImageMessage } = await import("../app/data/tool-ui-km.ts");
  assert.match(localizeImageMessage("Saved 12.5 KB.", true), /12\.5 KB/);
  assert.match(localizeImageMessage("Skipped because output would be 14.2% bigger. Try lower quality or reduce max width.", true), /14\.2%/);
  assert.equal(localizeImageMessage("Saved 12.5 KB.", false), "Saved 12.5 KB.");
  assert.match(localizeToolError("Line 2: EAN13 must be digits only.", true), /2.*EAN13/);
});
