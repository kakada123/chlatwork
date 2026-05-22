import { isExtremeImageResolution } from "~/lib/file-validation";
import { sanitizeHtml } from "~/lib/sanitize-html";

export type PdfPageSizeOption = "a4" | "letter";

export type PdfGeneratedFile = {
  name: string;
  blob: Blob;
};

export type PdfToJpgResult = PdfGeneratedFile & {
  pageNumber: number;
};

export type TextToPdfOptions = {
  fontSize: number;
  pageSize: PdfPageSizeOption;
  margin: number;
};

export type InvoiceItem = {
  description: string;
  quantity: number;
  price: number;
};

export type InvoicePdfInput = {
  companyName: string;
  customerName: string;
  invoiceNumber: string;
  date: string;
  items: InvoiceItem[];
  discount: number;
  taxRate: number;
  notes: string;
};

const A4 = { width: 595.28, height: 841.89 };
const LETTER = { width: 612, height: 792 };
const HTML_TO_PDF_PAGE = {
  width: 794,
  minHeight: 1123,
  padding: 48,
};

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function buildPdfFileName(prefix: string) {
  return `chlatwork-${prefix}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

export function parsePageRanges(input: string, totalPages: number) {
  const pages = new Set<number>();
  const chunks = input
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (!chunks.length) {
    throw new Error("Enter at least one page or range.");
  }

  for (const chunk of chunks) {
    const match = chunk.match(/^(\d+)(?:\s*-\s*(\d+))?$/);

    if (!match) {
      throw new Error(`Invalid page range: ${chunk}`);
    }

    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);

    if (start < 1 || end < 1 || start > totalPages || end > totalPages) {
      throw new Error(`Page range ${chunk} is outside 1-${totalPages}.`);
    }

    const min = Math.min(start, end);
    const max = Math.max(start, end);

    for (let page = min; page <= max; page += 1) {
      pages.add(page);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

export function parsePageOrder(input: string, totalPages: number) {
  const pages = input
    .split(",")
    .map((chunk) => Number(chunk.trim()))
    .filter((page) => Number.isFinite(page));

  if (!pages.length) {
    throw new Error("Enter a page order, for example 3,1,2,4.");
  }

  const uniquePages = new Set(pages);

  if (uniquePages.size !== pages.length) {
    throw new Error("Each page can only appear once in the order.");
  }

  for (const page of pages) {
    if (!Number.isInteger(page) || page < 1 || page > totalPages) {
      throw new Error(`Page ${page} is outside 1-${totalPages}.`);
    }
  }

  return pages;
}

async function loadImageElement(file: File) {
  const url = URL.createObjectURL(file);

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function imageFileToJpegBytes(file: File, quality = 0.92) {
  const image = await loadImageElement(file);

  if (isExtremeImageResolution(image.naturalWidth, image.naturalHeight)) {
    throw new Error(
      "This image resolution is too large to process safely in the browser. Try resizing it first.",
    );
  }

  const maxCanvasSide = 2400;
  const scale = Math.min(
    1,
    maxCanvasSide / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available in this browser.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) =>
        nextBlob ? resolve(nextBlob) : reject(new Error("Unable to prepare image.")),
      "image/jpeg",
      quality,
    );
  });

  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

function getPdfPageSize(pageSize: PdfPageSizeOption) {
  return pageSize === "letter" ? LETTER : A4;
}

export async function getPdfPageCount(file: File) {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.load(await file.arrayBuffer(), {
    ignoreEncryption: true,
  });

  return pdf.getPageCount();
}

export async function createPdfFromImages(files: File[]) {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();

  for (const file of files) {
    const imageData = await imageFileToJpegBytes(file);
    const embeddedImage = await pdf.embedJpg(imageData.bytes);
    const page = pdf.addPage([A4.width, A4.height]);
    const scale = Math.min(
      (A4.width - 48) / embeddedImage.width,
      (A4.height - 48) / embeddedImage.height,
    );
    const width = embeddedImage.width * scale;
    const height = embeddedImage.height * scale;

    page.drawImage(embeddedImage, {
      x: (A4.width - width) / 2,
      y: (A4.height - height) / 2,
      width,
      height,
    });
  }

  const bytes = await pdf.save({ useObjectStreams: true });

  return new Blob([bytes], { type: "application/pdf" });
}

export async function mergePdfFiles(files: File[]) {
  const { PDFDocument } = await import("pdf-lib");
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const sourcePdf = await PDFDocument.load(await file.arrayBuffer(), {
      ignoreEncryption: true,
    });
    const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());

    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  const bytes = await mergedPdf.save({ useObjectStreams: true });

  return new Blob([bytes], { type: "application/pdf" });
}

export async function extractPdfPages(file: File, pages: number[]) {
  const { PDFDocument } = await import("pdf-lib");
  const sourcePdf = await PDFDocument.load(await file.arrayBuffer(), {
    ignoreEncryption: true,
  });
  const nextPdf = await PDFDocument.create();
  const copiedPages = await nextPdf.copyPages(
    sourcePdf,
    pages.map((page) => page - 1),
  );

  for (const page of copiedPages) {
    nextPdf.addPage(page);
  }

  const bytes = await nextPdf.save({ useObjectStreams: true });

  return new Blob([bytes], { type: "application/pdf" });
}

export async function removePdfPages(file: File, pagesToRemove: number[]) {
  const totalPages = await getPdfPageCount(file);
  const removeSet = new Set(pagesToRemove);
  const pagesToKeep = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (page) => !removeSet.has(page),
  );

  if (!pagesToKeep.length) {
    throw new Error("You cannot remove every page from the PDF.");
  }

  return extractPdfPages(file, pagesToKeep);
}

export async function reorderPdfPages(file: File, order: number[]) {
  return extractPdfPages(file, order);
}

export async function compressPdf(file: File) {
  const { PDFDocument } = await import("pdf-lib");
  const sourcePdf = await PDFDocument.load(await file.arrayBuffer(), {
    ignoreEncryption: true,
  });
  const nextPdf = await PDFDocument.create();
  const copiedPages = await nextPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());

  for (const page of copiedPages) {
    nextPdf.addPage(page);
  }

  // Browser-side compression is intentionally conservative: rebuilding can drop
  // safe document metadata, but it cannot reliably recompress all embedded images.
  nextPdf.setTitle("");
  nextPdf.setAuthor("");
  nextPdf.setSubject("");
  nextPdf.setKeywords([]);
  nextPdf.setProducer("ChlatWork PDF Tools");
  nextPdf.setCreator("ChlatWork PDF Tools");

  const bytes = await nextPdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  return new Blob([bytes], { type: "application/pdf" });
}

export async function renderPdfToJpgs(file: File, quality = 0.92, scale = 1.6) {
  const pdfjsLib = await import("pdfjs-dist");
  const workerModule = (await import("pdfjs-dist/build/pdf.worker.mjs?url")) as {
    default: string;
  };

  pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;

  const sourceBytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: sourceBytes }).promise;
  const results: PdfToJpgResult[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas is not available in this browser.");
    }

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (nextBlob) =>
          nextBlob ? resolve(nextBlob) : reject(new Error("Unable to render JPG.")),
        "image/jpeg",
        quality,
      );
    });

    results.push({
      pageNumber,
      blob,
      name: `${file.name.replace(/\.pdf$/i, "")}-page-${pageNumber}.jpg`,
    });
  }

  await pdf.destroy();

  return results;
}

async function imageDataUrlToSize(dataUrl: string) {
  return await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Unable to render HTML preview."));
    image.src = dataUrl;
  });
}

async function waitForHtmlRenderFrame() {
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => undefined);
  }

  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

function createHtmlPdfRenderNode(html: string) {
  const wrapper = document.createElement("div");
  const container = document.createElement("article");

  Object.assign(wrapper.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${HTML_TO_PDF_PAGE.width}px`,
    overflow: "hidden",
    pointerEvents: "none",
    transform: "translateX(-120vw)",
    zIndex: "-1",
  });

  Object.assign(container.style, {
    boxSizing: "border-box",
    width: `${HTML_TO_PDF_PAGE.width}px`,
    minHeight: `${HTML_TO_PDF_PAGE.minHeight}px`,
    padding: `${HTML_TO_PDF_PAGE.padding}px`,
    backgroundColor: "#ffffff",
    color: "#111827",
    fontFamily: "Arial, sans-serif",
    lineHeight: "1.55",
  });

  container.innerHTML = sanitizeHtml(html);
  wrapper.appendChild(container);
  document.body.appendChild(wrapper);

  return { container, wrapper };
}

export async function htmlToPdf(html: string) {
  const { jsPDF } = await import("jspdf");
  const { toJpeg } = await import("html-to-image");
  const { container, wrapper } = createHtmlPdfRenderNode(html);

  try {
    // html-to-image clones computed styles, so the captured node must stay on-canvas.
    await waitForHtmlRenderFrame();

    const dataUrl = await toJpeg(container, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: HTML_TO_PDF_PAGE.width,
      height: Math.max(HTML_TO_PDF_PAGE.minHeight, container.scrollHeight),
    });
    const imageSize = await imageDataUrlToSize(dataUrl);
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const scale = Math.min(pageWidth / imageSize.width, pageHeight / imageSize.height);
    const width = imageSize.width * scale;
    const height = imageSize.height * scale;

    doc.addImage(dataUrl, "JPEG", (pageWidth - width) / 2, 0, width, height);

    return doc.output("blob");
  } finally {
    wrapper.remove();
  }
}

export async function textToPdf(text: string, options: TextToPdfOptions) {
  const { jsPDF } = await import("jspdf");
  const size = getPdfPageSize(options.pageSize);
  const doc = new jsPDF({
    unit: "pt",
    format: [size.width, size.height],
    orientation: "portrait",
  });
  const margin = Math.max(24, options.margin);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const lineHeight = options.fontSize * 1.35;
  let y = margin;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(options.fontSize);

  for (const paragraph of text.split("\n")) {
    const lines = doc.splitTextToSize(paragraph || " ", pageWidth - margin * 2);

    for (const line of lines) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      doc.text(line, margin, y);
      y += lineHeight;
    }
  }

  return doc.output("blob");
}

export async function invoiceToPdf(input: InvoicePdfInput) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 54;

  const subtotal = input.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
  const discount = Math.max(0, input.discount);
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * (Math.max(0, input.taxRate) / 100);
  const total = taxable + tax;
  const money = (value: number) => `$${value.toFixed(2)}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("INVOICE", 48, y);
  doc.setFontSize(11);
  doc.text(input.companyName || "Company name", pageWidth - 48, y, {
    align: "right",
  });

  y += 42;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Invoice #: ${input.invoiceNumber || "-"}`, 48, y);
  doc.text(`Date: ${input.date || "-"}`, 48, y + 16);
  doc.text(`Bill to: ${input.customerName || "Customer name"}`, 48, y + 38);

  y += 82;
  doc.setFillColor(243, 244, 246);
  doc.rect(48, y - 18, pageWidth - 96, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Description", 60, y);
  doc.text("Qty", 350, y, { align: "right" });
  doc.text("Price", 440, y, { align: "right" });
  doc.text("Amount", pageWidth - 60, y, { align: "right" });

  doc.setFont("helvetica", "normal");
  y += 28;

  for (const item of input.items.filter((row) => row.description.trim())) {
    const amount = item.quantity * item.price;

    if (y > 720) {
      doc.addPage();
      y = 54;
    }

    doc.text(item.description, 60, y, { maxWidth: 250 });
    doc.text(String(item.quantity), 350, y, { align: "right" });
    doc.text(money(item.price), 440, y, { align: "right" });
    doc.text(money(amount), pageWidth - 60, y, { align: "right" });
    y += 26;
  }

  y += 18;
  const summaryX = pageWidth - 220;
  const summaryValueX = pageWidth - 60;

  doc.text("Subtotal", summaryX, y);
  doc.text(money(subtotal), summaryValueX, y, { align: "right" });
  y += 18;
  doc.text("Discount", summaryX, y);
  doc.text(`-${money(discount)}`, summaryValueX, y, { align: "right" });
  y += 18;
  doc.text(`Tax (${input.taxRate || 0}%)`, summaryX, y);
  doc.text(money(tax), summaryValueX, y, { align: "right" });
  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Total", summaryX, y);
  doc.text(money(total), summaryValueX, y, { align: "right" });

  if (input.notes.trim()) {
    y += 46;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Notes", 48, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(input.notes, pageWidth - 96), 48, y + 18);
  }

  return doc.output("blob");
}
