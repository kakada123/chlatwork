<script setup lang="ts">
import type { Component } from "vue";
import {
  ArrowLeftRight,
  Barcode,
  Binary,
  Braces,
  Calculator,
  CalendarClock,
  Code2,
  Dices,
  FileCode2,
  FileImage,
  FileOutput,
  FileText,
  FileX2,
  Files,
  Fingerprint,
  Hash,
  Image,
  ImageDown,
  Images,
  KeyRound,
  Languages,
  Link2,
  ListChecks,
  ListRestart,
  Minimize2,
  QrCode,
  Receipt,
  ReceiptText,
  Regex,
  ScanBarcode,
  ScanLine,
  Scissors,
  ShieldCheck,
  Sparkles,
  Volume2,
  Wifi,
  Wrench,
  Clock3,
} from "lucide-vue-next";

const props = defineProps<{
  name: string;
}>();

// Centralizing the catalogue keeps every tool on one coherent icon system.
const ICONS: Record<string, Component> = {
  "payback-calculator": ArrowLeftRight,
  "image-compress": ImageDown,
  "image-to-pdf": FileImage,
  "pdf-to-jpg": Images,
  "merge-pdf": Files,
  "split-pdf": Scissors,
  "compress-pdf": Minimize2,
  "remove-pdf-pages": FileX2,
  "reorder-pdf-pages": ListRestart,
  "html-to-pdf": FileCode2,
  "text-to-pdf": FileText,
  "invoice-to-pdf": Receipt,
  qr: QrCode,
  "scan-qr": ScanLine,
  "wifi-qr": Wifi,
  "text-to-voice": Volume2,
  "khmer-unicode-fixer": Languages,
  calculator: CalendarClock,
  barcode: Barcode,
  "scan-barcode": ScanBarcode,
  "expense-tracker": ReceiptText,
  "lucky-draw": Dices,
  "json-formatter": Braces,
  "jwt-decoder": ShieldCheck,
  base64: Binary,
  "url-encoder": Link2,
  "regex-tester": Regex,
  "uuid-generator": Fingerprint,
  "unix-timestamp": Clock3,
  "cron-explainer": CalendarClock,
  "hash-generator": Hash,
  "password-generator": KeyRound,
  pdf: Files,
  image: Image,
  "qr-barcode": QrCode,
  "date-time": Clock3,
  calculators: Calculator,
  productivity: ListChecks,
  "developer-tools": Code2,
  "security-encoding": ShieldCheck,
  "khmer-tools": Languages,
  scanners: ScanLine,
  generators: Sparkles,
  "file-conversion": FileOutput,
};

const icon = computed(() => ICONS[props.name] ?? Wrench);
</script>

<template>
  <component
    :is="icon"
    :stroke-width="1.8"
    aria-hidden="true"
  />
</template>
