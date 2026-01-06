<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-lg font-bold">Barcode Generator</h1>
      <p class="text-sm text-gray-500">
        Generate barcodes (CODE128, EAN13, UPC, CODE39) and download as SVG.
      </p>
    </div>

    <section class="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
      <h2 class="text-sm font-semibold">Input</h2>

      <div class="grid gap-3 md:grid-cols-2">
        <div class="space-y-2">
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Value
          </label>

          <input
            v-model="state.value"
            type="text"
            class="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            placeholder="e.g. 8851234567890"
          />

          <div class="flex gap-2">
            <button
              @click="generate()"
              class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Generate
            </button>

            <button
              @click="clearAll()"
              class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Clear
            </button>

            <button
              @click="downloadSvg()"
              :disabled="!state.generated"
              class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Download SVG
            </button>
          </div>

          <p v-if="state.error" class="text-sm text-red-600">
            {{ state.error }}
          </p>
        </div>

        <div class="space-y-3">
          <h3 class="text-sm font-semibold">Options</h3>

          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Format
              </label>

              <select
                v-model="state.format"
                class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
              >
                <option value="CODE128">CODE128</option>
                <option value="EAN13">EAN13</option>
                <option value="UPC">UPC</option>
                <option value="CODE39">CODE39</option>
              </select>
            </div>

            <div>
              <label
                class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Height
              </label>

              <input
                v-model.number="state.height"
                type="number"
                min="20"
                max="200"
                class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
              />
            </div>

            <div>
              <label
                class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Bar width
              </label>

              <input
                v-model.number="state.width"
                type="number"
                min="1"
                max="5"
                class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
              />
            </div>

            <div class="flex items-end gap-2">
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" v-model="state.displayValue" />
                Show text
              </label>
            </div>
          </div>

          <p class="text-xs text-gray-500">
            Tip: Use <b>EAN13</b> for retail codes (12 digits recommended;
            checksum auto). Use <b>CODE128</b> for any text/number.
          </p>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold">Preview</h2>
        <p class="text-xs text-gray-500" v-if="state.generated">
          {{ state.format }} • h{{ state.height }} • w{{ state.width }}
        </p>
      </div>

      <div
        class="rounded-xl bg-gray-50 p-4 flex items-center justify-center min-h-[200px]"
      >
        <div class="bg-white border rounded-xl p-4">
          <!-- ✅ keep svg always in DOM -->
          <svg ref="svgRef"></svg>

          <p
            v-if="!state.generated"
            class="mt-3 text-sm text-gray-400 text-center"
          >
            Generate a barcode to preview here.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, onMounted } from "vue";

useSeoMeta({
  title: "Barcode Generator — ChlatWork",
  description:
    "Generate barcodes (CODE128, EAN13, UPC, CODE39) and download as SVG.",
  ogTitle: "Barcode Generator — ChlatWork",
  ogDescription: "Generate barcodes instantly and download as SVG.",
});

type BarcodeFormat = "CODE128" | "EAN13" | "UPC" | "CODE39";

// ✅ SSR-safe: load JsBarcode only on client
type JsBarcodeFn = (element: Element, text: string, options?: any) => void;
const JsBarcode = ref<JsBarcodeFn | null>(null);

const svgRef = ref<SVGSVGElement | null>(null);
const isMounted = ref(false);

const state = reactive({
  value: "",
  format: "CODE128" as BarcodeFormat,
  height: 80,
  width: 2,
  displayValue: true,
  generated: false,
  error: "",
});

onMounted(async () => {
  isMounted.value = true;

  // Only import on client
  const mod = await import("jsbarcode");
  JsBarcode.value = (mod.default ?? mod) as JsBarcodeFn;
});

// auto-regenerate when options change (if there is value)
watch(
  () => [state.format, state.height, state.width, state.displayValue],
  () => {
    if (!state.value.trim()) return;
    // avoid calling before mount / before jsbarcode loaded
    if (!import.meta.client || !isMounted.value || !JsBarcode.value) return;
    generate();
  }
);

function normalizeValue(v: string, fmt: BarcodeFormat): string {
  const raw = v.trim();

  if (fmt === "EAN13") return raw.replace(/\D/g, "");
  if (fmt === "UPC") return raw.replace(/\D/g, "");

  return raw;
}

function validate(v: string, fmt: BarcodeFormat): string | null {
  if (!v) return "Please enter a value.";

  if (fmt === "EAN13") {
    if (!/^\d+$/.test(v)) return "EAN13 must be digits only.";
    if (v.length !== 12 && v.length !== 13)
      return "EAN13: enter 12 digits (recommended) or 13 digits.";
  }

  if (fmt === "UPC") {
    if (!/^\d+$/.test(v)) return "UPC must be digits only.";
    if (v.length !== 11 && v.length !== 12)
      return "UPC: enter 11 digits (recommended) or 12 digits.";
  }

  if (fmt === "CODE39") {
    if (!/^[0-9A-Z\-.\s$/+%]*$/.test(v.toUpperCase()))
      return "CODE39 supports A-Z, 0-9 and - . space $ / + %";
  }

  return null;
}

function generate() {
  state.error = "";
  state.generated = false;

  // ✅ only client
  if (!import.meta.client) return;

  const fmt = state.format;
  const normalized = normalizeValue(state.value, fmt);

  const err = validate(normalized, fmt);
  if (err) {
    state.error = err;
    return;
  }

  if (!svgRef.value) {
    state.error = "Preview not ready. Try again.";
    return;
  }

  if (!JsBarcode.value) {
    state.error = "Barcode engine not ready yet. Try again.";
    return;
  }

  try {
    svgRef.value.innerHTML = "";

    JsBarcode.value(svgRef.value, normalized, {
      format: fmt,
      width: state.width,
      height: state.height,
      displayValue: state.displayValue,
      margin: 10,
    });

    state.generated = true;
  } catch (e: any) {
    state.error = e?.message ?? "Failed to generate barcode.";
  }
}

function clearAll() {
  state.value = "";
  state.error = "";
  state.generated = false;
  if (svgRef.value) svgRef.value.innerHTML = "";
}

function downloadSvg() {
  if (!import.meta.client) return;
  if (!state.generated || !svgRef.value) return;

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgRef.value);

  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const safeName =
    (state.value.trim().slice(0, 24) || "barcode")
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/-+/g, "-")
      .toLowerCase() + ".svg";

  const a = document.createElement("a");
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}
</script>
