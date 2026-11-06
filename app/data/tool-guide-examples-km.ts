import { localizeMessageTree } from "../lib/i18n";
import type { ToolGuideExample } from "./tool-guides";

const example = (title: string, scenario: string, steps: string[], result: string): ToolGuideExample => ({ title, scenario, steps, result });

export const TOOL_GUIDE_EXAMPLES_KM: Record<string, ToolGuideExample[]> = localizeMessageTree({
  "pdf-to-jpg": [
    {
      "title": "catalog.tool_examples.pdf_to_jpg.0.title",
      "scenario": "catalog.tool_examples.pdf_to_jpg.0.scenario",
      "steps": [
        "catalog.tool_examples.pdf_to_jpg.0.steps.0",
        "catalog.tool_examples.pdf_to_jpg.0.steps.1",
        "catalog.tool_examples.pdf_to_jpg.0.steps.2"
      ],
      "result": "catalog.tool_examples.pdf_to_jpg.0.result"
    },
    {
      "title": "catalog.tool_examples.pdf_to_jpg.1.title",
      "scenario": "catalog.tool_examples.pdf_to_jpg.1.scenario",
      "steps": [
        "catalog.tool_examples.pdf_to_jpg.1.steps.0",
        "catalog.tool_examples.pdf_to_jpg.1.steps.1",
        "catalog.tool_examples.pdf_to_jpg.1.steps.2"
      ],
      "result": "catalog.tool_examples.pdf_to_jpg.1.result"
    }
  ],
  "compress-pdf": [
    {
      "title": "catalog.tool_examples.compress_pdf.0.title",
      "scenario": "catalog.tool_examples.compress_pdf.0.scenario",
      "steps": [
        "catalog.tool_examples.compress_pdf.0.steps.0",
        "catalog.tool_examples.compress_pdf.0.steps.1",
        "catalog.tool_examples.compress_pdf.0.steps.2"
      ],
      "result": "catalog.tool_examples.compress_pdf.0.result"
    },
    {
      "title": "catalog.tool_examples.compress_pdf.1.title",
      "scenario": "catalog.tool_examples.compress_pdf.1.scenario",
      "steps": [
        "catalog.tool_examples.compress_pdf.1.steps.0",
        "catalog.tool_examples.compress_pdf.1.steps.1",
        "catalog.tool_examples.compress_pdf.1.steps.2"
      ],
      "result": "catalog.tool_examples.compress_pdf.1.result"
    }
  ],
  "remove-pdf-pages": [
    {
      "title": "catalog.tool_examples.remove_pdf_pages.0.title",
      "scenario": "catalog.tool_examples.remove_pdf_pages.0.scenario",
      "steps": [
        "catalog.tool_examples.remove_pdf_pages.0.steps.0",
        "catalog.tool_examples.remove_pdf_pages.0.steps.1",
        "catalog.tool_examples.remove_pdf_pages.0.steps.2"
      ],
      "result": "catalog.tool_examples.remove_pdf_pages.0.result"
    },
    {
      "title": "catalog.tool_examples.remove_pdf_pages.1.title",
      "scenario": "catalog.tool_examples.remove_pdf_pages.1.scenario",
      "steps": [
        "catalog.tool_examples.remove_pdf_pages.1.steps.0",
        "catalog.tool_examples.remove_pdf_pages.1.steps.1",
        "catalog.tool_examples.remove_pdf_pages.1.steps.2"
      ],
      "result": "catalog.tool_examples.remove_pdf_pages.1.result"
    }
  ],
  "reorder-pdf-pages": [
    {
      "title": "catalog.tool_examples.reorder_pdf_pages.0.title",
      "scenario": "catalog.tool_examples.reorder_pdf_pages.0.scenario",
      "steps": [
        "catalog.tool_examples.reorder_pdf_pages.0.steps.0",
        "catalog.tool_examples.reorder_pdf_pages.0.steps.1",
        "catalog.tool_examples.reorder_pdf_pages.0.steps.2"
      ],
      "result": "catalog.tool_examples.reorder_pdf_pages.0.result"
    },
    {
      "title": "catalog.tool_examples.reorder_pdf_pages.1.title",
      "scenario": "catalog.tool_examples.reorder_pdf_pages.1.scenario",
      "steps": [
        "catalog.tool_examples.reorder_pdf_pages.1.steps.0",
        "catalog.tool_examples.reorder_pdf_pages.1.steps.1",
        "catalog.tool_examples.reorder_pdf_pages.1.steps.2"
      ],
      "result": "catalog.tool_examples.reorder_pdf_pages.1.result"
    }
  ],
  "html-to-pdf": [
    {
      "title": "catalog.tool_examples.html_to_pdf.0.title",
      "scenario": "catalog.tool_examples.html_to_pdf.0.scenario",
      "steps": [
        "catalog.tool_examples.html_to_pdf.0.steps.0",
        "catalog.tool_examples.html_to_pdf.0.steps.1",
        "catalog.tool_examples.html_to_pdf.0.steps.2"
      ],
      "result": "catalog.tool_examples.html_to_pdf.0.result"
    },
    {
      "title": "catalog.tool_examples.html_to_pdf.1.title",
      "scenario": "catalog.tool_examples.html_to_pdf.1.scenario",
      "steps": [
        "catalog.tool_examples.html_to_pdf.1.steps.0",
        "catalog.tool_examples.html_to_pdf.1.steps.1",
        "catalog.tool_examples.html_to_pdf.1.steps.2"
      ],
      "result": "catalog.tool_examples.html_to_pdf.1.result"
    }
  ],
  "text-to-pdf": [
    {
      "title": "catalog.tool_examples.text_to_pdf.0.title",
      "scenario": "catalog.tool_examples.text_to_pdf.0.scenario",
      "steps": [
        "catalog.tool_examples.text_to_pdf.0.steps.0",
        "catalog.tool_examples.text_to_pdf.0.steps.1",
        "catalog.tool_examples.text_to_pdf.0.steps.2"
      ],
      "result": "catalog.tool_examples.text_to_pdf.0.result"
    },
    {
      "title": "catalog.tool_examples.text_to_pdf.1.title",
      "scenario": "catalog.tool_examples.text_to_pdf.1.scenario",
      "steps": [
        "catalog.tool_examples.text_to_pdf.1.steps.0",
        "catalog.tool_examples.text_to_pdf.1.steps.1",
        "catalog.tool_examples.text_to_pdf.1.steps.2"
      ],
      "result": "catalog.tool_examples.text_to_pdf.1.result"
    }
  ],
  "invoice-to-pdf": [
    {
      "title": "catalog.tool_examples.invoice_to_pdf.0.title",
      "scenario": "catalog.tool_examples.invoice_to_pdf.0.scenario",
      "steps": [
        "catalog.tool_examples.invoice_to_pdf.0.steps.0",
        "catalog.tool_examples.invoice_to_pdf.0.steps.1",
        "catalog.tool_examples.invoice_to_pdf.0.steps.2"
      ],
      "result": "catalog.tool_examples.invoice_to_pdf.0.result"
    },
    {
      "title": "catalog.tool_examples.invoice_to_pdf.1.title",
      "scenario": "catalog.tool_examples.invoice_to_pdf.1.scenario",
      "steps": [
        "catalog.tool_examples.invoice_to_pdf.1.steps.0",
        "catalog.tool_examples.invoice_to_pdf.1.steps.1",
        "catalog.tool_examples.invoice_to_pdf.1.steps.2"
      ],
      "result": "catalog.tool_examples.invoice_to_pdf.1.result"
    }
  ],
  "wifi-qr": [
    {
      "title": "catalog.tool_examples.wifi_qr.0.title",
      "scenario": "catalog.tool_examples.wifi_qr.0.scenario",
      "steps": [
        "catalog.tool_examples.wifi_qr.0.steps.0",
        "catalog.tool_examples.wifi_qr.0.steps.1",
        "catalog.tool_examples.wifi_qr.0.steps.2"
      ],
      "result": "catalog.tool_examples.wifi_qr.0.result"
    },
    {
      "title": "catalog.tool_examples.wifi_qr.1.title",
      "scenario": "catalog.tool_examples.wifi_qr.1.scenario",
      "steps": [
        "catalog.tool_examples.wifi_qr.1.steps.0",
        "catalog.tool_examples.wifi_qr.1.steps.1",
        "catalog.tool_examples.wifi_qr.1.steps.2"
      ],
      "result": "catalog.tool_examples.wifi_qr.1.result"
    }
  ],
  "text-to-voice": [
    {
      "title": "catalog.tool_examples.text_to_voice.0.title",
      "scenario": "catalog.tool_examples.text_to_voice.0.scenario",
      "steps": [
        "catalog.tool_examples.text_to_voice.0.steps.0",
        "catalog.tool_examples.text_to_voice.0.steps.1",
        "catalog.tool_examples.text_to_voice.0.steps.2"
      ],
      "result": "catalog.tool_examples.text_to_voice.0.result"
    },
    {
      "title": "catalog.tool_examples.text_to_voice.1.title",
      "scenario": "catalog.tool_examples.text_to_voice.1.scenario",
      "steps": [
        "catalog.tool_examples.text_to_voice.1.steps.0",
        "catalog.tool_examples.text_to_voice.1.steps.1",
        "catalog.tool_examples.text_to_voice.1.steps.2"
      ],
      "result": "catalog.tool_examples.text_to_voice.1.result"
    }
  ],
  "khmer-unicode-fixer": [
    {
      "title": "catalog.tool_examples.khmer_unicode_fixer.0.title",
      "scenario": "catalog.tool_examples.khmer_unicode_fixer.0.scenario",
      "steps": [
        "catalog.tool_examples.khmer_unicode_fixer.0.steps.0",
        "catalog.tool_examples.khmer_unicode_fixer.0.steps.1",
        "catalog.tool_examples.khmer_unicode_fixer.0.steps.2"
      ],
      "result": "catalog.tool_examples.khmer_unicode_fixer.0.result"
    },
    {
      "title": "catalog.tool_examples.khmer_unicode_fixer.1.title",
      "scenario": "catalog.tool_examples.khmer_unicode_fixer.1.scenario",
      "steps": [
        "catalog.tool_examples.khmer_unicode_fixer.1.steps.0",
        "catalog.tool_examples.khmer_unicode_fixer.1.steps.1",
        "catalog.tool_examples.khmer_unicode_fixer.1.steps.2"
      ],
      "result": "catalog.tool_examples.khmer_unicode_fixer.1.result"
    }
  ],
  "calculator": [
    {
      "title": "catalog.tool_examples.calculator.0.title",
      "scenario": "catalog.tool_examples.calculator.0.scenario",
      "steps": [
        "catalog.tool_examples.calculator.0.steps.0",
        "catalog.tool_examples.calculator.0.steps.1",
        "catalog.tool_examples.calculator.0.steps.2"
      ],
      "result": "catalog.tool_examples.calculator.0.result"
    },
    {
      "title": "catalog.tool_examples.calculator.1.title",
      "scenario": "catalog.tool_examples.calculator.1.scenario",
      "steps": [
        "catalog.tool_examples.calculator.1.steps.0",
        "catalog.tool_examples.calculator.1.steps.1",
        "catalog.tool_examples.calculator.1.steps.2"
      ],
      "result": "catalog.tool_examples.calculator.1.result"
    }
  ],
  "lucky-draw": [
    {
      "title": "catalog.tool_examples.lucky_draw.0.title",
      "scenario": "catalog.tool_examples.lucky_draw.0.scenario",
      "steps": [
        "catalog.tool_examples.lucky_draw.0.steps.0",
        "catalog.tool_examples.lucky_draw.0.steps.1",
        "catalog.tool_examples.lucky_draw.0.steps.2"
      ],
      "result": "catalog.tool_examples.lucky_draw.0.result"
    },
    {
      "title": "catalog.tool_examples.lucky_draw.1.title",
      "scenario": "catalog.tool_examples.lucky_draw.1.scenario",
      "steps": [
        "catalog.tool_examples.lucky_draw.1.steps.0",
        "catalog.tool_examples.lucky_draw.1.steps.1",
        "catalog.tool_examples.lucky_draw.1.steps.2"
      ],
      "result": "catalog.tool_examples.lucky_draw.1.result"
    }
  ]
}, "km");
