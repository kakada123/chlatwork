import type { TaskReport } from "./work-tasks.ts";
export type SheetCell = string | number | null | undefined;
export interface ReportSheet {
  name: string;
  rows: SheetCell[][];
  widths?: number[];
}
export function reportSheets(report: TaskReport): ReportSheet[] {
  const d = report.draft;
  return [
    {
      name: "Report",
      widths: [30, 100],
      rows: [
        ["MBO report", d.title],
        ["Employee", d.employeeName],
        ["Evaluation period", `${d.from} — ${d.to}`],
        ["Time zone", report.timeZone],
        ["Executive accomplishment summary", d.summary],
        [
          "Objectives and progress",
          "See Objectives sheet. Status is user-set; contribution counts are not performance scores.",
        ],
        ["Key completed contributions", report.contributions.length],
        [
          "Outcomes and measurable impact",
          "See Contributions for user-written impact and Objectives for explicitly verified metrics.",
        ],
        [
          "Supporting evidence",
          "See contribution evidence and objective verification evidence.",
        ],
        ["Challenges", d.challenges],
        ["Lessons learned", d.lessons],
        ["Pending follow-ups", report.followUps.length],
        ["Next-period priorities", d.priorities],
        ["Generated at", report.generatedAt],
      ],
    },
    {
      name: "Objectives",
      widths: [40, 20, 20, 50, 20, 18, 18, 18, 55, 20],
      rows: [
        [
          "Objective",
          "Period start",
          "Period end",
          "Success criteria",
          "User-set status",
          "Target",
          "Verified actual",
          "Unit",
          "Verification evidence",
          "Completed contributions",
        ],
        ...report.objectives.map((o) => [
          o.title,
          o.periodStart.slice(0, 10),
          o.periodEnd.slice(0, 10),
          o.successCriteria,
          o.status,
          o.targetValue == null ? "" : Number(o.targetValue),
          o.verifiedAt && o.actualValue != null ? Number(o.actualValue) : "",
          o.metricUnit,
          o.verifiedAt ? o.verificationEvidence : "",
          o.completedContributions,
        ]),
      ],
    },
    {
      name: "Contributions",
      widths: [38, 22, 25, 30, 40, 45, 45, 45, 50, 30, 35, 18, 18, 14],
      rows: [
        [
          "Title",
          "Completed at (UTC)",
          "Project",
          "Category",
          "Objectives",
          "Summary",
          "Contribution",
          "Outcome / impact (user statement)",
          "Evidence",
          "Skills",
          "Notes / description",
          "Estimated minutes",
          "Actual minutes",
          "Highlighted",
          "Task ID",
          "Current status",
          "Start at (UTC)",
          "Due at (UTC)",
          "Tags",
          "Created at (UTC)",
          "Updated at (UTC)",
          "Personal milestone",
        ],
        ...report.contributions.map((t) => [
          t.title,
          t.completedAt,
          t.projectName,
          t.category,
          t.objectiveTitles.join("; "),
          t.summary,
          t.contribution,
          t.impact,
          t.evidence.join("\n"),
          t.skills,
          [t.description, t.notes].filter(Boolean).join("\n\n"),
          t.estimatedMinutes,
          t.actualMinutes,
          t.highlighted ? "Yes" : "",
          t.id,
          t.status,
          t.startAt,
          t.dueAt,
          (t.tags ?? []).join("; "),
          t.createdAt,
          t.updatedAt,
          t.isMilestone ? "Yes" : "",
        ]),
      ],
    },
    {
      name: "Follow-ups",
      widths: [40, 24, 50, 50, 24],
      rows: [
        [
          "Task",
          "Follow-up at (UTC)",
          "Note",
          "Next action",
          "Reminder at (UTC)",
        ],
        ...report.followUps.map((f) => [
          f.title,
          f.followUpAt,
          f.note,
          f.nextAction,
          f.remindAt,
        ]),
      ],
    },
  ];
}
function csvCell(value: SheetCell) {
  if (typeof value === "number") return String(value);
  let text = String(value ?? "");
  // CSV has no cell type. Prefix formula-like strings so opening the file cannot execute user text.
  if (/^[\s\uFEFF]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function reportCsv(report: TaskReport) {
  return (
    "\uFEFF" +
    reportSheets(report)[2]!
      .rows.map((row) => row.map(csvCell).join(","))
      .join("\r\n")
  );
}
function xml(value: unknown) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(
      /[<>&"']/g,
      (c) =>
        ({
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          '"': "&quot;",
          "'": "&apos;",
        })[c]!,
    );
}
function column(index: number) {
  let text = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    text = String.fromCharCode(65 + ((n - 1) % 26)) + text;
  return text;
}
function worksheet(sheet: ReportSheet) {
  const cols =
    sheet.widths
      ?.map(
        (width, i) =>
          `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`,
      )
      .join("") ?? "";
  const rows = sheet.rows
    .map(
      (row, r) =>
        `<row r="${r + 1}"${r === 0 ? ' ht="30" customHeight="1"' : ""}>${row
          .map((value, c) => {
            const ref = column(c) + (r + 1),
              style = r === 0 ? 1 : 0;
            return typeof value === "number" && Number.isFinite(value)
              ? `<c r="${ref}" s="${style}"><v>${value}</v></c>`
              : `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
          })
          .join("")}</row>`,
    )
    .join("");
  const range = `A1:${column(Math.max(0, ...sheet.rows.map((r) => r.length - 1)))}${sheet.rows.length}`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="${range}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="30"/><cols>${cols}</cols><sheetData>${rows}</sheetData><autoFilter ref="${range}"/><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`;
}
const encoder = new TextEncoder();
function join(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
/** Small stored-ZIP writer for fixed OOXML paths. No compression library or executable workbook content. */
function zip(files: Record<string, string>) {
  const locals: Uint8Array[] = [],
    central: Uint8Array[] = [];
  let offset = 0;
  for (const [path, content] of Object.entries(files)) {
    const name = encoder.encode(path),
      data = encoder.encode(content),
      crc = crc32(data),
      local = new Uint8Array(30 + name.length),
      lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(12, 33, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    locals.push(local, data);
    const entry = new Uint8Array(46 + name.length),
      cv = new DataView(entry.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(14, 33, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    entry.set(name, 46);
    central.push(entry);
    offset += local.length + data.length;
  }
  const directory = join(central),
    end = new Uint8Array(22),
    v = new DataView(end.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(8, central.length, true);
  v.setUint16(10, central.length, true);
  v.setUint32(12, directory.length, true);
  v.setUint32(16, offset, true);
  return join([...locals, directory, end]);
}
export function reportXlsx(report: TaskReport) {
  const sheets = reportSheets(report),
    ns = "http://schemas.openxmlformats.org/package/2006/relationships";
  const files: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
    "_rels/.rels": `<?xml version="1.0"?><Relationships xmlns="${ns}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0"?><Relationships xmlns="${ns}">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml":
      '<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF075985"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
  };
  for (const [sheet, i] of sheets.map((s, i) => [s, i] as const))
    files[`xl/worksheets/sheet${i + 1}.xml`] = worksheet(sheet);
  return zip(files);
}
export function downloadReport(data: BlobPart, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
/** Render the same visible report using browser fonts so Khmer and user-entered Unicode stay intact. */
export async function reportPdf(element: HTMLElement, name: string) {
  await document.fonts.ready;
  const [{ jsPDF }, { toCanvas }] = await Promise.all([
    import("jspdf"),
    import("html-to-image"),
  ]);
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true }),
    margin = 36,
    pageWidth = pdf.internal.pageSize.getWidth(),
    pageHeight = pdf.internal.pageSize.getHeight(),
    width = pageWidth - margin * 2,
    bottom = pageHeight - margin;
  let y = margin;
  for (const block of element.querySelectorAll<HTMLElement>(
    ".tasks-report-block",
  )) {
    const canvas = await toCanvas(block, {
      pixelRatio: 1.5,
      backgroundColor: "#ffffff",
      skipFonts: false,
    });
    const ratio = width / canvas.width;
    let top = 0;
    while (top < canvas.height) {
      if (bottom - y < 24) {
        pdf.addPage();
        y = margin;
      }
      let cut = Math.min(canvas.height, top + Math.floor((bottom - y) / ratio));
      if (cut < canvas.height) {
        // Split oversized paragraphs at a blank text row instead of slicing glyphs between pages.
        const ctx = canvas.getContext("2d")!;
        let found = false;
        for (let row = cut - 1; row > Math.max(top + 1, cut - 160); row--) {
          const pixels = ctx.getImageData(4, row, canvas.width - 8, 1).data;
          let ink = false;
          for (let p = 0; p < pixels.length; p += 4) {
            if (
              pixels[p]! < 245 ||
              pixels[p + 1]! < 245 ||
              pixels[p + 2]! < 245
            ) {
              ink = true;
              break;
            }
          }
          if (!ink) {
            cut = row + 1;
            found = true;
            break;
          }
        }
        if (!found && y > margin) {
          pdf.addPage();
          y = margin;
          continue;
        }
      }
      const piece = document.createElement("canvas");
      piece.width = canvas.width;
      piece.height = cut - top;
      piece
        .getContext("2d")!
        .drawImage(
          canvas,
          0,
          top,
          canvas.width,
          piece.height,
          0,
          0,
          canvas.width,
          piece.height,
        );
      pdf.addImage(
        piece.toDataURL("image/png"),
        "PNG",
        margin,
        y,
        width,
        piece.height * ratio,
      );
      y += piece.height * ratio;
      top = cut;
      if (top < canvas.height) {
        pdf.addPage();
        y = margin;
      }
    }
    y += 10;
  }
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text(`${i} / ${pages}`, pageWidth - margin, pageHeight - 18, {
      align: "right",
    });
  }
  pdf.save(name);
}
