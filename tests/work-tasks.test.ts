import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluationPeriod,
  isTaskDone,
  groupTaskRecords,
} from "../app/lib/work-tasks.ts";
import { allowedTasksRoute } from "../server/utils/tasks-routes.ts";
import {
  reportCsv,
  reportXlsx,
  reportSheets,
} from "../app/lib/tasks-report-export.ts";
const report: any = {
  draft: {
    title: "MBO",
    employeeName: "",
    from: "2026-11-01",
    to: "2026-11-30",
    summary: "User summary",
    challenges: "",
    lessons: "",
    priorities: "",
  },
  timeZone: "Asia/Phnom_Penh",
  generatedAt: "2026-11-16T00:00:00Z",
  contributions: [
    {
      id: "t",
      title: '=HYPERLINK("bad")',
      summary: "Actual summary",
      description: "line 1\nline 2",
      contribution: "Fix",
      impact: "",
      evidence: ["https://example.com/pr"],
      skills: "TypeScript",
      notes: "",
      category: "Bug Fix",
      priority: "HIGH",
      completedAt: "2026-11-15T12:00:00Z",
      projectName: "POS",
      objectiveTitles: ["Reliability", "Quality"],
      estimatedMinutes: 30,
      actualMinutes: 20,
      highlighted: true,
    },
  ],
  objectives: [],
  followUps: [],
};
test("periods follow the account calendar and support month/quarter/week", () => {
  const now = new Date("2026-11-15T19:00:00Z");
  assert.deepEqual(evaluationPeriod("today", "Asia/Phnom_Penh", now), {
    from: "2026-11-16",
    to: "2026-11-16",
  });
  assert.deepEqual(evaluationPeriod("quarter", "Asia/Phnom_Penh", now), {
    from: "2026-10-01",
    to: "2026-12-31",
  });
  assert.deepEqual(evaluationPeriod("week", "Asia/Phnom_Penh", now), {
    from: "2026-11-16",
    to: "2026-11-22",
  });
  assert.equal(
    isTaskDone({ status: "ARCHIVED", previousStatus: "DONE" }),
    true,
  );
  assert.equal(isTaskDone({ status: "PLANNED" }), false);
});
test("report exports share the selected dataset and escape spreadsheet formula injection", () => {
  const csv = reportCsv(report);
  assert.match(csv, /'=HYPERLINK/);
  assert.match(csv, /"line 1\nline 2"/);
  assert.equal(reportSheets(report)[2].rows.length, 2);
  const bytes = reportXlsx(report);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 2)), "PK");
  const xml = new TextDecoder().decode(bytes);
  assert.match(xml, /inlineStr/);
  assert.doesNotMatch(xml, /<f>/);
  assert.match(xml, /autoFilter/);
  assert.match(xml, /freeze|frozen/);
  assert.match(xml, /User summary/);
});
test("Tasks proxy permits only named routes and authenticated file operations", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assert.equal(allowedTasksRoute(`attachments/${id}`, "GET"), true);
  assert.equal(allowedTasksRoute("reports/preview", "POST"), true);
  assert.equal(allowedTasksRoute("../admin", "GET"), false);
  assert.equal(allowedTasksRoute("work-log", "GET"), false);
});

test("Khmer workbooks store the selected font in Excel styles", () => {
  const khmerReport = { ...report, draft: { ...report.draft, title: "របាយការណ៍" } };
  const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
  assert.match(decode(reportXlsx(khmerReport)), /<name val="Google Sans"/);
  assert.match(decode(reportXlsx(khmerReport, "hanuman")), /<name val="Hanuman"/);
});
