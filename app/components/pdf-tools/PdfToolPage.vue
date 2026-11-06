<script setup lang="ts">
import {
  PDF_TOOL_BY_KEY,
  getPdfRelatedTools,
  type PdfToolKey,
} from "~/data/pdf-tools";
import { findToolGuideByToolRoute } from "~/data/tool-guides";
import { useLanguage } from "~/composables/useLanguage";
import ModernDateInput from "~/components/ModernDateInput.vue";
import PageRangeInput from "~/components/pdf-tools/PageRangeInput.vue";
import PdfFileDropzone from "~/components/pdf-tools/PdfFileDropzone.vue";
import PdfFileList from "~/components/pdf-tools/PdfFileList.vue";
import PdfRelatedTools from "~/components/pdf-tools/PdfRelatedTools.vue";
import PdfResultDownload from "~/components/pdf-tools/PdfResultDownload.vue";
import PdfToolPageLayout from "~/components/pdf-tools/PdfToolPageLayout.vue";
import PrivacyNotice from "~/components/pdf-tools/PrivacyNotice.vue";
import ToolPageDetails from "~/components/tools/ToolPageDetails.vue";
import {
  MAX_MERGE_PDF_FILES,
  MAX_PDF_FILE_SIZE,
  MAX_PDF_PAGE_COUNT,
  PDF_EXTENSIONS,
  PDF_MIME_TYPES,
  validateFiles,
} from "~/lib/file-validation";
import { sanitizeHtml } from "~/lib/sanitize-html";
import {
  buildPdfFileName,
  compressPdf,
  extractPdfPages,
  formatFileSize,
  getPdfPageCount,
  htmlToPdf,
  invoiceToPdf,
  mergePdfFiles,
  parsePageOrder,
  parsePageRanges,
  removePdfPages,
  renderPdfToJpgs,
  reorderPdfPages,
  textToPdf,
  type InvoiceItem,
  type PdfPageSizeOption,
} from "~/lib/pdf-tools";

const props = defineProps<{
  toolKey: PdfToolKey;
}>();

type ResultItem = {
  name: string;
  blob: Blob;
  url: string;
  pageNumber?: number;
};

const toolKey = computed(() => props.toolKey);
const tool = computed(() => PDF_TOOL_BY_KEY[props.toolKey]);
const { isKhmer } = useLanguage();

const PDF_TOOL_COPY_KM: Record<PdfToolKey, { actionLabel: string; emptyState: string }> = {
  "pdf-to-jpg": {
    actionLabel: "បម្លែងទៅជា JPG",
    emptyState: "ទម្លាក់ឯកសារ PDF មួយនៅទីនេះ ដើម្បីបម្លែងគ្រប់ទំព័រទៅជារូបភាព JPG។",
  },
  "merge-pdf": {
    actionLabel: "បញ្ចូល PDF ចូលគ្នា",
    emptyState: "ទម្លាក់ឯកសារ PDF ចាប់ពី ២ ឡើងទៅនៅទីនេះ ដើម្បីបញ្ចូលចូលគ្នា។",
  },
  "split-pdf": {
    actionLabel: "បំបែកឯកសារ PDF",
    emptyState: "ទម្លាក់ឯកសារ PDF មួយនៅទីនេះ រួចជ្រើសរើសទំព័រដែលត្រូវរក្សាទុក។",
  },
  "compress-pdf": {
    actionLabel: "បង្រួមទំហំ PDF",
    emptyState: "ទម្លាក់ឯកសារ PDF មួយនៅទីនេះ ដើម្បីកសាងឡើងវិញ និងកាត់បន្ថយទំហំ។",
  },
  "remove-pdf-pages": {
    actionLabel: "លុបទំព័រចេញ",
    emptyState: "ទម្លាក់ឯកសារ PDF មួយនៅទីនេះ រួចបញ្ចូលលេខទំព័រដែលត្រូវលុប។",
  },
  "reorder-pdf-pages": {
    actionLabel: "តម្រៀបទំព័រឡើងវិញ",
    emptyState: "ទម្លាក់ឯកសារ PDF មួយនៅទីនេះ រួចកំណត់លំដាប់លំដោយទំព័រថ្មី។",
  },
  "html-to-pdf": {
    actionLabel: "បង្កើត PDF ពី HTML",
    emptyState: "បញ្ចូលកូដ HTML ដើម្បីបង្កើតឯកសារ PDF។",
  },
  "text-to-pdf": {
    actionLabel: "បង្កើត PDF ពីអត្ថបទ",
    emptyState: "បញ្ចូលអត្ថបទដើម្បីបង្កើតឯកសារ PDF។",
  },
  "invoice-to-pdf": {
    actionLabel: "បង្កើតវិក្កយបត្រ PDF",
    emptyState: "បំពេញព័ត៌មានវិក្កយបត្រដើម្បីបង្កើតឯកសារ PDF។",
  },
};

const currentActionLabel = computed(() =>
  isKhmer.value && PDF_TOOL_COPY_KM[props.toolKey]
    ? PDF_TOOL_COPY_KM[props.toolKey].actionLabel
    : tool.value.actionLabel,
);

const currentEmptyState = computed(() =>
  isKhmer.value && PDF_TOOL_COPY_KM[props.toolKey]
    ? PDF_TOOL_COPY_KM[props.toolKey].emptyState
    : tool.value.emptyState,
);
const guide = computed(() => findToolGuideByToolRoute(tool.value.route));
const { websiteEnabled } = useFeatureAvailability();
const relatedTools = computed(() =>
  getPdfRelatedTools(tool.value).filter((relatedTool) => websiteEnabled(relatedTool.key)),
);
const toolFaq = computed(() => guide.value?.faqs.slice(0, 5) ?? tool.value.faq);
const files = ref<File[]>([]);
const results = ref<ResultItem[]>([]);
const error = ref("");
const isProcessing = ref(false);
const pageCount = ref<number | null>(null);
const compressionNote = ref("");
const pageRange = ref("1-3");
const pagesToRemove = ref("2");
const pageOrder = ref("");
const jpgQuality = ref(0.92);
const jpgScale = ref(1.6);
const textInput = ref("Paste your text here...");
const textFontSize = ref(12);
const textPageSize = ref<PdfPageSizeOption>("a4");
const textMargin = ref(48);
const htmlInput = ref(`<h1>Document title</h1>
<p>Write simple printable HTML here. Inline styles are supported for basic formatting.</p>
<ul>
  <li>Files stay on your device.</li>
  <li>The PDF is generated in your browser.</li>
</ul>`);
const sanitizedHtmlPreview = computed(() => sanitizeHtml(htmlInput.value));
const invoice = reactive({
  companyName: "ChlatWork",
  customerName: "Customer Name",
  invoiceNumber: `INV-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`,
  date: new Date().toISOString().slice(0, 10),
  discount: 0,
  taxRate: 0,
  notes: "Thank you for your business.",
  items: [
    { description: "Service item", quantity: 1, price: 50 },
  ] as InvoiceItem[],
});

const usesFiles = computed(() => Boolean(tool.value.accept));
const canProcess = computed(() => {
  if (isProcessing.value) {
    return false;
  }

  if (props.toolKey === "html-to-pdf") {
    return htmlInput.value.trim().length > 0;
  }

  if (props.toolKey === "text-to-pdf") {
    return textInput.value.trim().length > 0;
  }

  if (props.toolKey === "invoice-to-pdf") {
    return invoice.items.some((item) => item.description.trim());
  }

  if (props.toolKey === "merge-pdf") {
    return files.value.length >= 2;
  }

  return files.value.length > 0;
});

useSeoMeta({
  title: computed(() => tool.value.metaTitle),
  description: computed(() => tool.value.metaDescription),
  ogTitle: computed(() => tool.value.metaTitle),
  ogDescription: computed(() => tool.value.metaDescription),
  ogType: "website",
  ogUrl: computed(() => `https://chlatwork.com${tool.value.route}`),
  twitterCard: "summary_large_image",
  twitterTitle: computed(() => tool.value.metaTitle),
  twitterDescription: computed(() => tool.value.metaDescription),
});

useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: `https://chlatwork.com${tool.value.route}`,
    },
  ],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: toolFaq.value.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      }),
    },
  ],
}));

watch(
  () => files.value,
  async (nextFiles) => {
    pageCount.value = null;

    if (!nextFiles.length || !isSinglePdfTool(props.toolKey)) {
      return;
    }

    try {
      const nextPageCount = await getPdfPageCount(nextFiles[0]);

      if (nextPageCount > MAX_PDF_PAGE_COUNT) {
        files.value = [];
        error.value = `This PDF has more than ${MAX_PDF_PAGE_COUNT} pages. Use a smaller PDF to keep processing safe in the browser.`;
        return;
      }

      pageCount.value = nextPageCount;

      if (props.toolKey === "reorder-pdf-pages" && pageCount.value) {
        pageOrder.value = Array.from(
          { length: pageCount.value },
          (_, index) => index + 1,
        ).join(",");
      }
    } catch (caught: any) {
      error.value = caught?.message ?? "Unable to read this PDF.";
    }
  },
  { deep: false },
);

onBeforeUnmount(() => {
  clearResults();
  files.value = [];
});

function isSinglePdfTool(key: PdfToolKey) {
  return [
    "pdf-to-jpg",
    "split-pdf",
    "compress-pdf",
    "remove-pdf-pages",
    "reorder-pdf-pages",
  ].includes(key);
}

function addFiles(nextFiles: File[]) {
  const maxFiles =
    props.toolKey === "merge-pdf"
      ? MAX_MERGE_PDF_FILES
      : 1;
  const { acceptedFiles, errors } = validateFiles(nextFiles, {
    allowedExtensions: PDF_EXTENSIONS,
    allowedMimeTypes: PDF_MIME_TYPES,
    currentFileCount: tool.value.multiple ? files.value.length : 0,
    label: "PDF",
    maxFileSize: MAX_PDF_FILE_SIZE,
    maxFiles,
  });

  error.value = errors[0] ?? "";

  if (!acceptedFiles.length) {
    return;
  }

  clearResults();
  compressionNote.value = "";
  files.value = tool.value.multiple ? [...files.value, ...acceptedFiles] : [acceptedFiles[0]];
}

function removeFile(index: number) {
  clearResults();
  files.value = files.value.filter((_, fileIndex) => fileIndex !== index);
}

function moveFile(index: number, direction: -1 | 1) {
  const targetIndex = index + direction;

  if (targetIndex < 0 || targetIndex >= files.value.length) {
    return;
  }

  const nextFiles = [...files.value];
  [nextFiles[index], nextFiles[targetIndex]] = [nextFiles[targetIndex], nextFiles[index]];
  clearResults();
  files.value = nextFiles;
}

function clearResults() {
  for (const result of results.value) {
    URL.revokeObjectURL(result.url);
  }

  results.value = [];
}

function setResults(nextResults: Array<Omit<ResultItem, "url">>) {
  clearResults();
  results.value = nextResults.map((result) => ({
    ...result,
    url: URL.createObjectURL(result.blob),
  }));
}

async function ensurePageCount() {
  if (!files.value[0]) {
    throw new Error("Choose a PDF first.");
  }

  if (!pageCount.value) {
    pageCount.value = await getPdfPageCount(files.value[0]);
  }

  return pageCount.value;
}

async function processTool() {
  if (!canProcess.value) {
    return;
  }

  isProcessing.value = true;
  error.value = "";
  compressionNote.value = "";

  try {
    switch (props.toolKey) {
      case "pdf-to-jpg": {
        const jpgs = await renderPdfToJpgs(files.value[0], jpgQuality.value, jpgScale.value);
        setResults(jpgs);
        break;
      }

      case "merge-pdf": {
        const blob = await mergePdfFiles(files.value);
        setResults([{ blob, name: buildPdfFileName("merged-pdf") }]);
        break;
      }

      case "split-pdf": {
        const count = await ensurePageCount();
        const pages = parsePageRanges(pageRange.value, count);
        const blob = await extractPdfPages(files.value[0], pages);
        setResults([{ blob, name: buildPdfFileName("split-pdf") }]);
        break;
      }

      case "compress-pdf": {
        const blob = await compressPdf(files.value[0]);
        const delta = files.value[0].size - blob.size;
        compressionNote.value =
          delta > 0
            ? `Reduced by ${formatFileSize(delta)}.`
            : "This PDF was already optimized or contains content that cannot be safely recompressed in-browser.";
        setResults([{ blob, name: buildPdfFileName("compressed-pdf") }]);
        break;
      }

      case "remove-pdf-pages": {
        const count = await ensurePageCount();
        const pages = parsePageRanges(pagesToRemove.value, count);
        const blob = await removePdfPages(files.value[0], pages);
        setResults([{ blob, name: buildPdfFileName("pages-removed") }]);
        break;
      }

      case "reorder-pdf-pages": {
        const count = await ensurePageCount();
        const order = parsePageOrder(pageOrder.value, count);
        const blob = await reorderPdfPages(files.value[0], order);
        setResults([{ blob, name: buildPdfFileName("reordered-pdf") }]);
        break;
      }

      case "html-to-pdf": {
        const blob = await htmlToPdf(htmlInput.value);
        setResults([{ blob, name: buildPdfFileName("html-to-pdf") }]);
        break;
      }

      case "text-to-pdf": {
        const blob = await textToPdf(textInput.value, {
          fontSize: textFontSize.value,
          pageSize: textPageSize.value,
          margin: textMargin.value,
        });
        setResults([{ blob, name: buildPdfFileName("text-to-pdf") }]);
        break;
      }

      case "invoice-to-pdf": {
        const blob = await invoiceToPdf(invoice);
        setResults([{ blob, name: buildPdfFileName("invoice") }]);
        break;
      }
    }
  } catch (caught: any) {
    error.value = caught?.message ?? "Unable to process this file.";
  } finally {
    isProcessing.value = false;
  }
}

function addInvoiceItem() {
  invoice.items.push({ description: "", quantity: 1, price: 0 });
}

function removeInvoiceItem(index: number) {
  if (invoice.items.length === 1) {
    invoice.items = [{ description: "", quantity: 1, price: 0 }];
    return;
  }

  invoice.items.splice(index, 1);
}
</script>

<template>
  <PdfToolPageLayout :tool="tool">
    <section
      v-if="tool.status === 'soon'"
      class="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm dark:border-cyan-300/20 dark:bg-cyan-300/10 sm:p-6"
    >
      <p class="text-xs font-black uppercase tracking-[0.16em] text-sky-700 dark:text-cyan-300">
        {{ isKhmer ? "Beta · នឹងត្រឡប់មកវិញឆាប់ៗ" : "Beta · Coming back soon" }}
      </p>
      <h2 class="mt-3 text-xl font-black text-slate-950 dark:text-white">
        {{ isKhmer ? "មុខងារបង្រួមទំហំ PDF ពិតប្រាកដកំពុងត្រូវបានអភិវឌ្ឍឡើងវិញ" : "Real PDF compression is being rebuilt" }}
      </h2>
      <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-white/65">
        {{ isKhmer ? "ការកសាងឯកសារឡើងវិញលើ browser អាចធ្វើឱ្យ PDF ដែលបាន optimize រួចមិនថយចុះទំហំ ឬធំជាងមុន ដូច្នេះមុខងារនេះត្រូវបានផ្អាកបណ្តោះអាសន្នរហូតដល់លទ្ធផលអាចវាស់វែងបានជាក់លាក់។" : "The previous browser rebuild could leave an optimized PDF unchanged or make it larger, so compression is paused until the result can be measured confidently." }}
      </p>
      <ul class="mt-4 grid list-inside list-disc gap-2 text-sm text-slate-700 dark:text-white/75 sm:grid-cols-2">
        <li>{{ isKhmer ? "ការកាត់បន្ថយទំហំ និង DPI នៃរូបភាព" : "Image downsampling and DPI reduction" }}</li>
        <li>{{ isKhmer ? "ការកំណត់គុណភាពរូបភាព JPEG" : "JPEG quality controls" }}</li>
        <li>{{ isKhmer ? "សម្អាត Object ដែលមិនប្រើប្រាស់ក្នុងឯកសារ" : "Unused-object cleanup" }}</li>
        <li>{{ isKhmer ? "ប្រៀបធៀបទំហំមុន និងក្រោយ ព្រមទាំងភាគរយដែលបានកាត់បន្ថយ" : "Before/after size and saved percentage" }}</li>
      </ul>
      <NuxtLink
        to="/tools/pdf"
        class="mt-5 inline-flex h-11 items-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 dark:ring-1 dark:ring-white/15"
      >
        {{ isKhmer ? "រុករកឧបករណ៍ PDF ដែលមាន" : "Explore available PDF tools" }}
      </NuxtLink>
    </section>

    <section v-else class="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div class="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
        <PrivacyNotice />

        <PdfFileDropzone
          v-if="usesFiles"
          :accept="tool.accept"
          :multiple="tool.multiple"
          :disabled="isProcessing"
          :title="files.length ? (isKhmer ? `បានជ្រើស ${files.length}` : `${files.length} selected`) : (isKhmer ? 'ជ្រើសរើស ឬទម្លាក់ឯកសារនៅទីនេះ' : 'Choose or drop files')"
          :description="currentEmptyState"
          @files-selected="addFiles"
        />

        <PdfFileList
          v-if="usesFiles"
          :files="files"
          :allow-reorder="tool.multiple"
          @remove="removeFile"
          @move="moveFile"
        />

        <div class="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <h2 class="text-sm font-black text-slate-950 dark:text-white">{{ isKhmer ? "ជម្រើស" : "Options" }}</h2>

          <div v-if="toolKey === 'pdf-to-jpg'" class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="text-sm font-semibold text-slate-900 dark:text-white">
                {{ isKhmer ? "គុណភាពរូបភាព" : "Image quality" }}
              </label>
              <ModernSelect
                v-model.number="jpgQuality"
                class="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              >
                <option :value="0.82">{{ isKhmer ? "ឯកសារតូច" : "Small file" }}</option>
                <option :value="0.92">{{ isKhmer ? "មធ្យម" : "Balanced" }}</option>
                <option :value="0.98">{{ isKhmer ? "គុណភាពខ្ពស់" : "High quality" }}</option>
              </ModernSelect>
            </div>
            <div>
              <label class="text-sm font-semibold text-slate-900 dark:text-white">
                {{ isKhmer ? "កម្រិតច្បាស់" : "Render scale" }}
              </label>
              <ModernSelect
                v-model.number="jpgScale"
                class="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              >
                <option :value="1.2">{{ isKhmer ? "ធម្មតា" : "Light" }}</option>
                <option :value="1.6">{{ isKhmer ? "មធ្យម" : "Balanced" }}</option>
                <option :value="2">{{ isKhmer ? "ច្បាស់ល្អ" : "Sharp" }}</option>
              </ModernSelect>
            </div>
          </div>

          <PageRangeInput
            v-else-if="toolKey === 'split-pdf'"
            v-model="pageRange"
            :label="isKhmer ? 'ទំព័រដែលត្រូវរក្សាទុក' : 'Pages to keep'"
            placeholder="1-3, 5, 8-10"
            :help="isKhmer ? 'ប្រើសញ្ញាក្បៀសដើម្បីបំបែកទំព័រ ឬជួរទំព័រ ដូចជា 1-3, 5, 8-10។' : 'Use comma-separated pages and ranges.'"
            :page-count="pageCount ?? undefined"
          />

          <PageRangeInput
            v-else-if="toolKey === 'remove-pdf-pages'"
            v-model="pagesToRemove"
            :label="isKhmer ? 'ទំព័រដែលត្រូវលុប' : 'Pages to remove'"
            placeholder="2, 5-7"
            :help="isKhmer ? 'ឯកសារលទ្ធផលនឹងរក្សាទុកគ្រប់ទំព័រទាំងអស់ លើកលែងតែទំព័រទាំងនេះ។' : 'The output keeps every page except these pages.'"
            :page-count="pageCount ?? undefined"
          />

          <PageRangeInput
            v-else-if="toolKey === 'reorder-pdf-pages'"
            v-model="pageOrder"
            :label="isKhmer ? 'លំដាប់លំដោយទំព័រថ្មី' : 'New page order'"
            placeholder="3,1,2,4"
            :help="isKhmer ? 'បញ្ចូលលេខទំព័រនីមួយៗម្តង តាមលំដាប់លំដោយដែលអ្នកចង់បាន។' : 'Enter each page once in the order you want.'"
            :page-count="pageCount ?? undefined"
          />

          <div v-else-if="toolKey === 'html-to-pdf'" class="grid gap-4 lg:grid-cols-2">
            <div>
              <label class="text-sm font-semibold text-slate-900 dark:text-white">
                {{ isKhmer ? "បញ្ចូលកូដ HTML" : "HTML input" }}
              </label>
              <textarea
                v-model="htmlInput"
                class="mt-2 min-h-[320px] w-full resize-y rounded-xl border border-slate-200 bg-white p-3 font-mono text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200/60 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-slate-900 dark:text-white">{{ isKhmer ? "ទិដ្ឋភាពមុន" : "Preview" }}</h3>
              <ClientOnly>
                <div
                  class="mt-2 min-h-[320px] overflow-auto rounded-xl border border-slate-200 bg-[#ffffff] p-4 text-sm leading-6 text-[#111827] shadow-inner shadow-slate-200/50 dark:border-white/10 dark:bg-[#ffffff] dark:text-[#111827] dark:shadow-black/20"
                  v-html="sanitizedHtmlPreview"
                />
                <template #fallback>
                  <div
                    class="mt-2 min-h-[320px] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-[#ffffff] p-4 font-mono text-sm leading-6 text-[#111827] shadow-inner shadow-slate-200/50 dark:border-white/10 dark:bg-[#ffffff] dark:text-[#111827] dark:shadow-black/20"
                  >
                    {{ htmlInput }}
                  </div>
                </template>
              </ClientOnly>
            </div>
          </div>

          <div v-else-if="toolKey === 'text-to-pdf'" class="space-y-3">
            <textarea
              v-model="textInput"
              class="min-h-[260px] w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200/60 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
            />
            <div class="grid gap-3 sm:grid-cols-3">
              <div>
                <label class="text-xs font-bold uppercase text-slate-500 dark:text-white/50">
                  {{ isKhmer ? "ទំហំអក្សរ" : "Font size" }}
                </label>
                <input
                  v-model.number="textFontSize"
                  type="number"
                  min="8"
                  max="32"
                  class="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                />
              </div>
              <div>
                <label class="text-xs font-bold uppercase text-slate-500 dark:text-white/50">
                  {{ isKhmer ? "ទំហំទំព័រ" : "Page size" }}
                </label>
                <ModernSelect
                  v-model="textPageSize"
                  class="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                >
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                </ModernSelect>
              </div>
              <div>
                <label class="text-xs font-bold uppercase text-slate-500 dark:text-white/50">
                  {{ isKhmer ? "គែមទំព័រ (Margin)" : "Margin" }}
                </label>
                <input
                  v-model.number="textMargin"
                  type="number"
                  min="24"
                  max="96"
                  class="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                />
              </div>
            </div>
          </div>

          <div v-else-if="toolKey === 'invoice-to-pdf'" class="space-y-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <input v-model="invoice.companyName" class="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white" :placeholder="isKhmer ? 'ឈ្មោះក្រុមហ៊ុន / ហាង' : 'Company name'" />
              <input v-model="invoice.customerName" class="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white" :placeholder="isKhmer ? 'ឈ្មោះអតិថិជន' : 'Customer name'" />
              <input v-model="invoice.invoiceNumber" class="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white" :placeholder="isKhmer ? 'លេខវិក្កយបត្រ' : 'Invoice number'" />
              <ModernDateInput v-model="invoice.date" :aria-label="isKhmer ? 'កាលបរិច្ឆេទវិក្កយបត្រ' : 'Invoice date'" />
            </div>

            <div class="space-y-2">
              <div
                v-for="(item, index) in invoice.items"
                :key="index"
                class="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04] sm:grid-cols-[1fr_90px_120px_auto]"
              >
                <input v-model="item.description" class="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white" :placeholder="isKhmer ? 'បរិយាយទំនិញ / សេវាកម្ម' : 'Item description'" />
                <input v-model.number="item.quantity" type="number" min="0" class="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white" :placeholder="isKhmer ? 'ចំនួន' : 'Qty'" />
                <input v-model.number="item.price" type="number" min="0" step="0.01" class="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white" :placeholder="isKhmer ? 'តម្លៃ' : 'Price'" />
                <button type="button" class="h-11 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200 dark:hover:bg-red-400/15" @click="removeInvoiceItem(index)">
                  {{ isKhmer ? "លុប" : "Remove" }}
                </button>
              </div>
            </div>

            <button
              type="button"
              class="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10]"
              @click="addInvoiceItem"
            >
              {{ isKhmer ? "បន្ថែមទំនិញ" : "Add item" }}
            </button>

            <div class="grid gap-3 sm:grid-cols-3">
              <input v-model.number="invoice.discount" type="number" min="0" class="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white" :placeholder="isKhmer ? 'បញ្ចុះតម្លៃ' : 'Discount'" />
              <input v-model.number="invoice.taxRate" type="number" min="0" class="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white" :placeholder="isKhmer ? 'ពន្ធ %' : 'Tax %'" />
              <input v-model="invoice.notes" class="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white" :placeholder="isKhmer ? 'កំណត់ចំណាំ' : 'Notes'" />
            </div>
          </div>

          <p v-else class="text-sm leading-6 text-slate-500 dark:text-white/55">
            {{ currentEmptyState }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-slate-950 dark:text-white dark:ring-1 dark:ring-white/15 dark:hover:bg-slate-800 dark:hover:text-white dark:disabled:bg-white/20 dark:disabled:text-white/40"
            :disabled="!canProcess"
            @click="processTool"
          >
            {{ isProcessing ? (isKhmer ? "កំពុងដំណើរការ..." : "Processing...") : currentActionLabel }}
          </button>

          <p v-if="isProcessing" class="text-sm text-slate-500 dark:text-white/55">
            {{ isKhmer ? "កំពុងដំណើរការនៅលើ Browser របស់អ្នកដោយផ្ទាល់..." : "Working locally in your browser..." }}
          </p>
        </div>

        <p
          v-if="error"
          class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100"
        >
          {{ error }}
        </p>

        <p
          v-if="compressionNote"
          class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100"
        >
          {{ compressionNote }}
        </p>
      </div>

      <aside class="space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
          <h2 class="text-sm font-black text-slate-950 dark:text-white">{{ isKhmer ? "ភាពឯកជនខ្ពស់" : "Privacy-first" }}</h2>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-white/65">
            {{ isKhmer ? "ទិន្នន័យត្រូវបានដំណើរការលើ browser របស់អ្នក។ សម្រាប់ឯកសារធំ ល្បឿនដំណើរការអាស្រ័យលើ browser និងអង្គចងចាំ (RAM) នៃឧបករណ៍របស់អ្នក។" : `${tool.privacyNote} For larger files, performance depends on your browser and device memory.` }}
          </p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
          <h2 class="text-sm font-black text-slate-950 dark:text-white">{{ isKhmer ? "ស្ថានភាព" : "Status" }}</h2>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-white/65">
            {{ results.length ? (isKhmer ? "លទ្ធផលរួចរាល់សម្រាប់ការទាញយក។" : "Result ready for download.") : (isKhmer ? "សូមបញ្ចូលទិន្នន័យដើម្បីបង្កើតលទ្ធផល។" : "Add input to generate a result.") }}
          </p>
        </div>
      </aside>
    </section>

    <PdfResultDownload v-if="tool.status !== 'soon'" :results="results" />
    <PdfRelatedTools v-if="relatedTools.length" :tools="relatedTools" />
    <ToolPageDetails
      v-if="guide"
      :guide="guide"
      :show-related="false"
    />
  </PdfToolPageLayout>
</template>
