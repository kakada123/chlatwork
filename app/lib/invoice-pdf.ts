import { translateMessage } from "./i18n.ts";
import type { InvoicePdfInput } from "./pdf-tools";

export type InvoicePdfLocale = "en" | "km";
export type InvoicePdfOptions = { locale?: InvoicePdfLocale };

const INVOICE_LABEL_FIELDS = [
  "title", "company", "number", "date", "customer", "customerName", "description", "quantity", "price", "amount",
  "subtotal", "discount", "tax", "total", "notes",
] as const;
type InvoiceLabel = (typeof INVOICE_LABEL_FIELDS)[number];

export function getInvoicePdfLabels(locale: InvoicePdfLocale) {
  return Object.fromEntries(INVOICE_LABEL_FIELDS.map((field) => [field, translateMessage(locale, `tools.invoice.labels.${field}`)])) as Record<InvoiceLabel, string>;
}

export function getInvoicePdfTotals(input: InvoicePdfInput) {
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const discount = Math.max(0, input.discount);
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * (Math.max(0, input.taxRate) / 100);
  return { subtotal, discount, taxable, tax, total: taxable + tax };
}

function escapeInvoiceText(value: string): string {
  // Authored names, descriptions and notes are text, never invoice markup or CSS.
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character]!));
}

function validateInvoiceForHtml(input: InvoicePdfInput) {
  const textFields = [input.companyName, input.customerName, input.invoiceNumber, input.date, input.notes];
  if (textFields.some((value) => typeof value !== "string") || !Array.isArray(input.items)
    || input.items.some((item) => !item || typeof item.description !== "string"
      || !Number.isFinite(item.quantity) || !Number.isFinite(item.price) || item.quantity < 0 || item.price < 0)
    || !Number.isFinite(input.discount) || !Number.isFinite(input.taxRate)) {
    throw new Error("Enter valid invoice text and finite, non-negative item quantities and prices.");
  }
}

/** Browser text shaping renders Khmer conjuncts; all authored values are escaped before insertion. */
export function buildInvoicePdfHtml(input: InvoicePdfInput, locale: InvoicePdfLocale = "en"): string {
  validateInvoiceForHtml(input);
  const labels = getInvoicePdfLabels(locale);
  const totals = getInvoicePdfTotals(input);
  if (Object.values(totals).some((value) => !Number.isFinite(value))) {
    throw new Error("The invoice total is too large to render safely.");
  }
  const text = escapeInvoiceText;
  const separator = locale === "km" ? "៖" : ":";
  const money = (value: number) => `$${value.toFixed(2)}`;
  const cell = "padding:10px 8px;overflow-wrap:anywhere;white-space:pre-wrap;";
  const row = "display:grid;grid-template-columns:minmax(0,1fr) 64px 100px 110px;break-inside:avoid;";
  const summary = (label: string, value: string, bold = false) => `<div style="display:flex;justify-content:space-between;gap:20px;padding:5px 0;${bold ? "font-weight:700;font-size:18px;" : ""}"><span>${label}</span><span>${value}</span></div>`;
  const items = input.items.filter((item) => item.description.trim()).map((item) => `<div style="${row}border-bottom:1px solid #e5e7eb;">
    <div style="${cell}">${text(item.description)}</div>
    <div style="${cell}text-align:right;">${item.quantity}</div>
    <div style="${cell}text-align:right;">${money(item.price)}</div>
    <div style="${cell}text-align:right;">${money(item.quantity * item.price)}</div>
  </div>`).join("");
  return `<div lang="${locale === "km" ? "km" : "en"}" style="font-family:Hanuman,Arial,sans-serif;font-size:14px;line-height:1.7;color:#111827;">
    <header style="break-inside:avoid;margin-bottom:24px;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;">
        <h1 style="font-family:inherit;font-size:30px;line-height:1.6;font-weight:700;margin:0;">${labels.title}</h1>
        <p style="max-width:50%;white-space:pre-wrap;overflow-wrap:anywhere;text-align:right;margin:6px 0;">${text(input.companyName || labels.company)}</p>
      </div>
      <p style="margin:16px 0 4px;overflow-wrap:anywhere;">${labels.number}${separator} ${text(input.invoiceNumber || "-")}</p>
      <p style="margin:4px 0;overflow-wrap:anywhere;">${labels.date}${separator} ${text(input.date || "-")}</p>
      <p style="margin:16px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;">${labels.customer}${separator} ${text(input.customerName || labels.customerName)}</p>
    </header>
    <div style="${row}background:#f3f4f6;font-weight:700;">
      <div style="${cell}">${labels.description}</div><div style="${cell}text-align:right;">${labels.quantity}</div>
      <div style="${cell}text-align:right;">${labels.price}</div><div style="${cell}text-align:right;">${labels.amount}</div>
    </div>
    ${items}
    <section style="break-inside:avoid;margin:24px 0 24px auto;width:310px;max-width:100%;">
      ${summary(labels.subtotal, money(totals.subtotal))}${summary(labels.discount, `-${money(totals.discount)}`)}
      ${summary(`${labels.tax} (${input.taxRate || 0}%)`, money(totals.tax))}${summary(labels.total, money(totals.total), true)}
    </section>
    ${input.notes.trim() ? `<section><h2 style="font-family:inherit;font-size:16px;line-height:1.7;font-weight:700;margin:0 0 8px;break-after:avoid;">${labels.notes}</h2><p style="margin:0;white-space:pre-wrap;overflow-wrap:anywhere;">${text(input.notes)}</p></section>` : ""}
  </div>`;
}

/** CSS columns are page-width; overflowing content continues in the next browser-shaped column. */
export function getInvoiceColumnCount(scrollWidth: number, columnWidth: number, columnGap: number): number {
  return Math.max(1, Math.ceil((scrollWidth + columnGap) / (columnWidth + columnGap)));
}
