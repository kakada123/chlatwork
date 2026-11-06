import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { buildInvoicePdfHtml, getInvoiceColumnCount, getInvoicePdfTotals } from "../app/lib/invoice-pdf.ts";

const invoice = {
  companyName: "ហាងសុខសាន្ត", customerName: "កញ្ញា សុភា", invoiceNumber: "INV-42", date: "2026-11-06",
  items: [{ description: "សេវាកម្មរចនា", quantity: 2, price: 25 }, { description: "បោះពុម្ព", quantity: 3, price: 10 }],
  discount: 5, taxRate: 10, notes: "សូមអរគុណ!\nសូមរក្សាវិក្កយបត្រនេះ។",
};

test("Khmer invoice headings and totals are localized while authored text and calculations remain intact", () => {
  const original = structuredClone(invoice);
  const html = buildInvoicePdfHtml(invoice, "km");
  for (const label of ["វិក្កយបត្រ", "លេខវិក្កយបត្រ", "កាលបរិច្ឆេទ", "ចេញជូន", "បរិយាយ", "ចំនួន", "តម្លៃ", "ទឹកប្រាក់", "សរុបរង", "បញ្ចុះតម្លៃ", "ពន្ធ", "សរុប", "កំណត់សម្គាល់"]) assert.ok(html.includes(label), label);
  for (const authored of [invoice.companyName, invoice.customerName, invoice.invoiceNumber, invoice.date, invoice.notes, ...invoice.items.map((item) => item.description)]) assert.ok(html.includes(authored), authored);
  assert.deepEqual(getInvoicePdfTotals(invoice), { subtotal: 80, discount: 5, taxable: 75, tax: 7.5, total: 82.5 });
  for (const amount of ["$80.00", "-$5.00", "$7.50", "$82.50"]) assert.ok(html.includes(amount));
  assert.deepEqual(invoice, original);
});

test("invoice HTML treats every authored field as text and rejects invalid financial values", () => {
  const injection = '<img src=x onerror="alert(1)"><script>alert(2)</script> & \'quoted\'';
  const html = buildInvoicePdfHtml({ ...invoice, companyName: injection, customerName: injection, invoiceNumber: injection, date: injection, notes: injection, items: [{ description: injection, quantity: 1, price: 2 }] }, "km");
  assert.doesNotMatch(html, /<img|<script|src=x onerror="/);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(html, /&amp; &#39;quoted&#39;/);
  assert.throws(() => buildInvoicePdfHtml({ ...invoice, items: [{ description: "bad", quantity: Number.NaN, price: 1 }] }, "km"), /valid invoice/);
  assert.throws(() => buildInvoicePdfHtml({ ...invoice, items: [{ description: "bad", quantity: 1, price: -1 }] }, "km"), /valid invoice/);
  assert.throws(() => buildInvoicePdfHtml({ ...invoice, items: [{ description: "bad", quantity: Number.MAX_VALUE, price: Number.MAX_VALUE }] }, "km"), /too large/);
});

test("invoice pagination counts full browser columns without squeezing long invoices into one page", () => {
  assert.equal(getInvoiceColumnCount(698, 698, 96), 1);
  assert.equal(getInvoiceColumnCount(1492, 698, 96), 2);
  assert.equal(getInvoiceColumnCount(2286, 698, 96), 3);
  assert.equal(getInvoiceColumnCount(0, 698, 96), 1);
  const manyItems = Array.from({ length: 100 }, (_, index) => ({ description: `សេវាកម្មទី ${index + 1}`, quantity: 1, price: 1 }));
  const html = buildInvoicePdfHtml({ ...invoice, items: manyItems }, "km");
  assert.ok(html.includes("សេវាកម្មទី 1"));
  assert.ok(html.includes("សេវាកម្មទី 100"));
  assert.equal((html.match(/border-bottom:1px/g) ?? []).length, 100);
});

test("invoiceToPdf keeps the real English PDF path as its default", async () => {
  const output = resolve(".tmp/invoice-pdf-tests/invoice-module.mjs");
  mkdirSync(resolve(".tmp/invoice-pdf-tests"), { recursive: true });
  await build({ entryPoints: [resolve("app/lib/pdf-tools.ts")], outfile: output, bundle: true, platform: "node", format: "esm", packages: "external", alias: { "~": resolve("app") }, logLevel: "silent" });
  const { invoiceToPdf } = await import(pathToFileURL(output).href);
  const source = { ...invoice, companyName: "Example shop", customerName: "Example customer", notes: "Thank you", items: [{ description: "Service", quantity: 2, price: 25 }] };
  const original = structuredClone(source);
  const blob = await invoiceToPdf(source);
  const pdf = await blob.text();
  assert.equal(blob.type, "application/pdf");
  assert.match(pdf, /^%PDF-/);
  for (const label of ["INVOICE", "Subtotal", "Discount", "Tax", "Total", "Notes", "Example shop", "Service"]) assert.ok(pdf.includes(label), label);
  assert.ok(pdf.includes("$49.50"));
  assert.deepEqual(source, original);
});
