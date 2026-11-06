import { localizeMessageTree, translateMessage } from "../lib/i18n";
import type { ToolGuide, ToolGuideExample } from "./tool-guides";
import { TOOL_GUIDE_EXAMPLES_KM } from "./tool-guide-examples-km";

export type ToolGuideKm = {
  heroTitle?: string;
  heroDescription?: string;
  whatIs: string[];
  steps: string[];
  whyUse: string[];
  useCases: string[];
  tips: string[];
  commonMistakes?: string[];
  faqs: Array<{ question: string; answer: string }>;
  privacy?: string[];
  practicalExamples?: ToolGuideExample[];
  metaTitle?: string;
  metaDescription?: string;
};

export const TOOL_GUIDES_KM: Record<string, ToolGuideKm> = localizeMessageTree({
  "qr": {
    "heroTitle": "catalog.tool_guides.qr.hero_title",
    "heroDescription": "catalog.tool_guides.qr.hero_description",
    "whatIs": [
      "catalog.tool_guides.qr.what_is.0",
      "catalog.tool_guides.qr.what_is.1"
    ],
    "steps": [
      "catalog.tool_guides.qr.steps.0",
      "catalog.tool_guides.qr.steps.1",
      "catalog.tool_guides.qr.steps.2",
      "catalog.tool_guides.qr.steps.3",
      "catalog.tool_guides.qr.steps.4"
    ],
    "whyUse": [
      "catalog.tool_guides.qr.why_use.0",
      "catalog.tool_guides.qr.why_use.1",
      "catalog.tool_guides.qr.why_use.2",
      "catalog.tool_guides.qr.why_use.3"
    ],
    "useCases": [
      "catalog.tool_guides.qr.use_cases.0",
      "catalog.tool_guides.qr.use_cases.1",
      "catalog.tool_guides.qr.use_cases.2",
      "catalog.tool_guides.qr.use_cases.3"
    ],
    "tips": [
      "catalog.tool_guides.qr.tips.0",
      "catalog.tool_guides.qr.tips.1",
      "catalog.tool_guides.qr.tips.2"
    ],
    "commonMistakes": [
      "catalog.tool_guides.qr.common_mistakes.0",
      "catalog.tool_guides.qr.common_mistakes.1",
      "catalog.tool_guides.qr.common_mistakes.2"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.qr.faqs.0.question",
        "answer": "catalog.tool_guides.qr.faqs.0.answer"
      },
      {
        "question": "catalog.tool_guides.qr.faqs.1.question",
        "answer": "catalog.tool_guides.qr.faqs.1.answer"
      },
      {
        "question": "catalog.tool_guides.qr.faqs.2.question",
        "answer": "catalog.tool_guides.qr.faqs.2.answer"
      }
    ]
  },
  "wifi-qr": {
    "heroTitle": "catalog.tool_guides.wifi_qr.hero_title",
    "heroDescription": "catalog.tool_guides.wifi_qr.hero_description",
    "whatIs": [
      "catalog.tool_guides.wifi_qr.what_is.0",
      "catalog.tool_guides.wifi_qr.what_is.1"
    ],
    "steps": [
      "catalog.tool_guides.wifi_qr.steps.0",
      "catalog.tool_guides.wifi_qr.steps.1",
      "catalog.tool_guides.wifi_qr.steps.2",
      "catalog.tool_guides.wifi_qr.steps.3",
      "catalog.tool_guides.wifi_qr.steps.4"
    ],
    "whyUse": [
      "catalog.tool_guides.wifi_qr.why_use.0",
      "catalog.tool_guides.wifi_qr.why_use.1",
      "catalog.tool_guides.wifi_qr.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.wifi_qr.use_cases.0",
      "catalog.tool_guides.wifi_qr.use_cases.1",
      "catalog.tool_guides.wifi_qr.use_cases.2"
    ],
    "tips": [
      "catalog.tool_guides.wifi_qr.tips.0",
      "catalog.tool_guides.wifi_qr.tips.1"
    ],
    "commonMistakes": [
      "catalog.tool_guides.wifi_qr.common_mistakes.0",
      "catalog.tool_guides.wifi_qr.common_mistakes.1"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.wifi_qr.faqs.0.question",
        "answer": "catalog.tool_guides.wifi_qr.faqs.0.answer"
      },
      {
        "question": "catalog.tool_guides.wifi_qr.faqs.1.question",
        "answer": "catalog.tool_guides.wifi_qr.faqs.1.answer"
      }
    ]
  },
  "barcode": {
    "heroTitle": "catalog.tool_guides.barcode.hero_title",
    "heroDescription": "catalog.tool_guides.barcode.hero_description",
    "whatIs": [
      "catalog.tool_guides.barcode.what_is.0",
      "catalog.tool_guides.barcode.what_is.1"
    ],
    "steps": [
      "catalog.tool_guides.barcode.steps.0",
      "catalog.tool_guides.barcode.steps.1",
      "catalog.tool_guides.barcode.steps.2",
      "catalog.tool_guides.barcode.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.barcode.why_use.0",
      "catalog.tool_guides.barcode.why_use.1",
      "catalog.tool_guides.barcode.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.barcode.use_cases.0",
      "catalog.tool_guides.barcode.use_cases.1",
      "catalog.tool_guides.barcode.use_cases.2"
    ],
    "tips": [
      "catalog.tool_guides.barcode.tips.0",
      "catalog.tool_guides.barcode.tips.1"
    ],
    "commonMistakes": [
      "catalog.tool_guides.barcode.common_mistakes.0",
      "catalog.tool_guides.barcode.common_mistakes.1"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.barcode.faqs.0.question",
        "answer": "catalog.tool_guides.barcode.faqs.0.answer"
      }
    ]
  },
  "scan-qr": {
    "heroTitle": "catalog.tool_guides.scan_qr.hero_title",
    "heroDescription": "catalog.tool_guides.scan_qr.hero_description",
    "whatIs": [
      "catalog.tool_guides.scan_qr.what_is.0",
      "catalog.tool_guides.scan_qr.what_is.1"
    ],
    "steps": [
      "catalog.tool_guides.scan_qr.steps.0",
      "catalog.tool_guides.scan_qr.steps.1",
      "catalog.tool_guides.scan_qr.steps.2",
      "catalog.tool_guides.scan_qr.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.scan_qr.why_use.0",
      "catalog.tool_guides.scan_qr.why_use.1",
      "catalog.tool_guides.scan_qr.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.scan_qr.use_cases.0",
      "catalog.tool_guides.scan_qr.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.scan_qr.tips.0",
      "catalog.tool_guides.scan_qr.tips.1"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.scan_qr.faqs.0.question",
        "answer": "catalog.tool_guides.scan_qr.faqs.0.answer"
      }
    ]
  },
  "scan-barcode": {
    "heroTitle": "catalog.tool_guides.scan_barcode.hero_title",
    "heroDescription": "catalog.tool_guides.scan_barcode.hero_description",
    "whatIs": [
      "catalog.tool_guides.scan_barcode.what_is.0",
      "catalog.tool_guides.scan_barcode.what_is.1"
    ],
    "steps": [
      "catalog.tool_guides.scan_barcode.steps.0",
      "catalog.tool_guides.scan_barcode.steps.1",
      "catalog.tool_guides.scan_barcode.steps.2",
      "catalog.tool_guides.scan_barcode.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.scan_barcode.why_use.0",
      "catalog.tool_guides.scan_barcode.why_use.1",
      "catalog.tool_guides.scan_barcode.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.scan_barcode.use_cases.0",
      "catalog.tool_guides.scan_barcode.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.scan_barcode.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.scan_barcode.faqs.0.question",
        "answer": "catalog.tool_guides.scan_barcode.faqs.0.answer"
      }
    ]
  },
  "image-compress": {
    "heroTitle": "catalog.tool_guides.image_compress.hero_title",
    "heroDescription": "catalog.tool_guides.image_compress.hero_description",
    "whatIs": [
      "catalog.tool_guides.image_compress.what_is.0",
      "catalog.tool_guides.image_compress.what_is.1"
    ],
    "steps": [
      "catalog.tool_guides.image_compress.steps.0",
      "catalog.tool_guides.image_compress.steps.1",
      "catalog.tool_guides.image_compress.steps.2",
      "catalog.tool_guides.image_compress.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.image_compress.why_use.0",
      "catalog.tool_guides.image_compress.why_use.1",
      "catalog.tool_guides.image_compress.why_use.2",
      "catalog.tool_guides.image_compress.why_use.3"
    ],
    "useCases": [
      "catalog.tool_guides.image_compress.use_cases.0",
      "catalog.tool_guides.image_compress.use_cases.1",
      "catalog.tool_guides.image_compress.use_cases.2"
    ],
    "tips": [
      "catalog.tool_guides.image_compress.tips.0",
      "catalog.tool_guides.image_compress.tips.1"
    ],
    "commonMistakes": [
      "catalog.tool_guides.image_compress.common_mistakes.0",
      "catalog.tool_guides.image_compress.common_mistakes.1"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.image_compress.faqs.0.question",
        "answer": "catalog.tool_guides.image_compress.faqs.0.answer"
      },
      {
        "question": "catalog.tool_guides.image_compress.faqs.1.question",
        "answer": "catalog.tool_guides.image_compress.faqs.1.answer"
      }
    ]
  },
  "image-to-pdf": {
    "heroTitle": "catalog.tool_guides.image_to_pdf.hero_title",
    "heroDescription": "catalog.tool_guides.image_to_pdf.hero_description",
    "whatIs": [
      "catalog.tool_guides.image_to_pdf.what_is.0",
      "catalog.tool_guides.image_to_pdf.what_is.1"
    ],
    "steps": [
      "catalog.tool_guides.image_to_pdf.steps.0",
      "catalog.tool_guides.image_to_pdf.steps.1",
      "catalog.tool_guides.image_to_pdf.steps.2",
      "catalog.tool_guides.image_to_pdf.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.image_to_pdf.why_use.0",
      "catalog.tool_guides.image_to_pdf.why_use.1",
      "catalog.tool_guides.image_to_pdf.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.image_to_pdf.use_cases.0",
      "catalog.tool_guides.image_to_pdf.use_cases.1",
      "catalog.tool_guides.image_to_pdf.use_cases.2"
    ],
    "tips": [
      "catalog.tool_guides.image_to_pdf.tips.0",
      "catalog.tool_guides.image_to_pdf.tips.1"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.image_to_pdf.faqs.0.question",
        "answer": "catalog.tool_guides.image_to_pdf.faqs.0.answer"
      }
    ]
  },
  "pdf-to-jpg": {
    "heroTitle": "catalog.tool_guides.pdf_to_jpg.hero_title",
    "heroDescription": "catalog.tool_guides.pdf_to_jpg.hero_description",
    "whatIs": [
      "catalog.tool_guides.pdf_to_jpg.what_is.0",
      "catalog.tool_guides.pdf_to_jpg.what_is.1"
    ],
    "steps": [
      "catalog.tool_guides.pdf_to_jpg.steps.0",
      "catalog.tool_guides.pdf_to_jpg.steps.1",
      "catalog.tool_guides.pdf_to_jpg.steps.2",
      "catalog.tool_guides.pdf_to_jpg.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.pdf_to_jpg.why_use.0",
      "catalog.tool_guides.pdf_to_jpg.why_use.1",
      "catalog.tool_guides.pdf_to_jpg.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.pdf_to_jpg.use_cases.0",
      "catalog.tool_guides.pdf_to_jpg.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.pdf_to_jpg.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.pdf_to_jpg.faqs.0.question",
        "answer": "catalog.tool_guides.pdf_to_jpg.faqs.0.answer"
      }
    ]
  },
  "merge-pdf": {
    "heroTitle": "catalog.tool_guides.merge_pdf.hero_title",
    "heroDescription": "catalog.tool_guides.merge_pdf.hero_description",
    "whatIs": [
      "catalog.tool_guides.merge_pdf.what_is.0",
      "catalog.tool_guides.merge_pdf.what_is.1"
    ],
    "steps": [
      "catalog.tool_guides.merge_pdf.steps.0",
      "catalog.tool_guides.merge_pdf.steps.1",
      "catalog.tool_guides.merge_pdf.steps.2",
      "catalog.tool_guides.merge_pdf.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.merge_pdf.why_use.0",
      "catalog.tool_guides.merge_pdf.why_use.1",
      "catalog.tool_guides.merge_pdf.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.merge_pdf.use_cases.0",
      "catalog.tool_guides.merge_pdf.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.merge_pdf.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.merge_pdf.faqs.0.question",
        "answer": "catalog.tool_guides.merge_pdf.faqs.0.answer"
      }
    ]
  },
  "split-pdf": {
    "heroTitle": "catalog.tool_guides.split_pdf.hero_title",
    "heroDescription": "catalog.tool_guides.split_pdf.hero_description",
    "whatIs": [
      "catalog.tool_guides.split_pdf.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.split_pdf.steps.0",
      "catalog.tool_guides.split_pdf.steps.1",
      "catalog.tool_guides.split_pdf.steps.2",
      "catalog.tool_guides.split_pdf.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.split_pdf.why_use.0",
      "catalog.tool_guides.split_pdf.why_use.1"
    ],
    "useCases": [
      "catalog.tool_guides.split_pdf.use_cases.0",
      "catalog.tool_guides.split_pdf.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.split_pdf.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.split_pdf.faqs.0.question",
        "answer": "catalog.tool_guides.split_pdf.faqs.0.answer"
      }
    ]
  },
  "compress-pdf": {
    "heroTitle": "catalog.tool_guides.compress_pdf.hero_title",
    "heroDescription": "catalog.tool_guides.compress_pdf.hero_description",
    "whatIs": [
      "catalog.tool_guides.compress_pdf.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.compress_pdf.steps.0",
      "catalog.tool_guides.compress_pdf.steps.1",
      "catalog.tool_guides.compress_pdf.steps.2",
      "catalog.tool_guides.compress_pdf.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.compress_pdf.why_use.0",
      "catalog.tool_guides.compress_pdf.why_use.1"
    ],
    "useCases": [
      "catalog.tool_guides.compress_pdf.use_cases.0",
      "catalog.tool_guides.compress_pdf.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.compress_pdf.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.compress_pdf.faqs.0.question",
        "answer": "catalog.tool_guides.compress_pdf.faqs.0.answer"
      }
    ]
  },
  "remove-pdf-pages": {
    "heroTitle": "catalog.tool_guides.remove_pdf_pages.hero_title",
    "heroDescription": "catalog.tool_guides.remove_pdf_pages.hero_description",
    "whatIs": [
      "catalog.tool_guides.remove_pdf_pages.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.remove_pdf_pages.steps.0",
      "catalog.tool_guides.remove_pdf_pages.steps.1",
      "catalog.tool_guides.remove_pdf_pages.steps.2",
      "catalog.tool_guides.remove_pdf_pages.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.remove_pdf_pages.why_use.0",
      "catalog.tool_guides.remove_pdf_pages.why_use.1"
    ],
    "useCases": [
      "catalog.tool_guides.remove_pdf_pages.use_cases.0",
      "catalog.tool_guides.remove_pdf_pages.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.remove_pdf_pages.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.remove_pdf_pages.faqs.0.question",
        "answer": "catalog.tool_guides.remove_pdf_pages.faqs.0.answer"
      }
    ]
  },
  "reorder-pdf-pages": {
    "heroTitle": "catalog.tool_guides.reorder_pdf_pages.hero_title",
    "heroDescription": "catalog.tool_guides.reorder_pdf_pages.hero_description",
    "whatIs": [
      "catalog.tool_guides.reorder_pdf_pages.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.reorder_pdf_pages.steps.0",
      "catalog.tool_guides.reorder_pdf_pages.steps.1",
      "catalog.tool_guides.reorder_pdf_pages.steps.2",
      "catalog.tool_guides.reorder_pdf_pages.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.reorder_pdf_pages.why_use.0",
      "catalog.tool_guides.reorder_pdf_pages.why_use.1"
    ],
    "useCases": [
      "catalog.tool_guides.reorder_pdf_pages.use_cases.0",
      "catalog.tool_guides.reorder_pdf_pages.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.reorder_pdf_pages.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.reorder_pdf_pages.faqs.0.question",
        "answer": "catalog.tool_guides.reorder_pdf_pages.faqs.0.answer"
      }
    ]
  },
  "html-to-pdf": {
    "heroTitle": "catalog.tool_guides.html_to_pdf.hero_title",
    "heroDescription": "catalog.tool_guides.html_to_pdf.hero_description",
    "whatIs": [
      "catalog.tool_guides.html_to_pdf.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.html_to_pdf.steps.0",
      "catalog.tool_guides.html_to_pdf.steps.1",
      "catalog.tool_guides.html_to_pdf.steps.2"
    ],
    "whyUse": [
      "catalog.tool_guides.html_to_pdf.why_use.0",
      "catalog.tool_guides.html_to_pdf.why_use.1"
    ],
    "useCases": [
      "catalog.tool_guides.html_to_pdf.use_cases.0",
      "catalog.tool_guides.html_to_pdf.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.html_to_pdf.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.html_to_pdf.faqs.0.question",
        "answer": "catalog.tool_guides.html_to_pdf.faqs.0.answer"
      }
    ]
  },
  "text-to-pdf": {
    "heroTitle": "catalog.tool_guides.text_to_pdf.hero_title",
    "heroDescription": "catalog.tool_guides.text_to_pdf.hero_description",
    "whatIs": [
      "catalog.tool_guides.text_to_pdf.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.text_to_pdf.steps.0",
      "catalog.tool_guides.text_to_pdf.steps.1",
      "catalog.tool_guides.text_to_pdf.steps.2"
    ],
    "whyUse": [
      "catalog.tool_guides.text_to_pdf.why_use.0",
      "catalog.tool_guides.text_to_pdf.why_use.1"
    ],
    "useCases": [
      "catalog.tool_guides.text_to_pdf.use_cases.0",
      "catalog.tool_guides.text_to_pdf.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.text_to_pdf.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.text_to_pdf.faqs.0.question",
        "answer": "catalog.tool_guides.text_to_pdf.faqs.0.answer"
      }
    ]
  },
  "invoice-to-pdf": {
    "heroTitle": "catalog.tool_guides.invoice_to_pdf.hero_title",
    "heroDescription": "catalog.tool_guides.invoice_to_pdf.hero_description",
    "whatIs": [
      "catalog.tool_guides.invoice_to_pdf.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.invoice_to_pdf.steps.0",
      "catalog.tool_guides.invoice_to_pdf.steps.1",
      "catalog.tool_guides.invoice_to_pdf.steps.2",
      "catalog.tool_guides.invoice_to_pdf.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.invoice_to_pdf.why_use.0",
      "catalog.tool_guides.invoice_to_pdf.why_use.1",
      "catalog.tool_guides.invoice_to_pdf.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.invoice_to_pdf.use_cases.0",
      "catalog.tool_guides.invoice_to_pdf.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.invoice_to_pdf.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.invoice_to_pdf.faqs.0.question",
        "answer": "catalog.tool_guides.invoice_to_pdf.faqs.0.answer"
      }
    ]
  },
  "password-generator": {
    "heroTitle": "catalog.tool_guides.password_generator.hero_title",
    "heroDescription": "catalog.tool_guides.password_generator.hero_description",
    "whatIs": [
      "catalog.tool_guides.password_generator.what_is.0",
      "catalog.tool_guides.password_generator.what_is.1"
    ],
    "steps": [
      "catalog.tool_guides.password_generator.steps.0",
      "catalog.tool_guides.password_generator.steps.1",
      "catalog.tool_guides.password_generator.steps.2",
      "catalog.tool_guides.password_generator.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.password_generator.why_use.0",
      "catalog.tool_guides.password_generator.why_use.1",
      "catalog.tool_guides.password_generator.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.password_generator.use_cases.0",
      "catalog.tool_guides.password_generator.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.password_generator.tips.0",
      "catalog.tool_guides.password_generator.tips.1"
    ],
    "commonMistakes": [
      "catalog.tool_guides.password_generator.common_mistakes.0",
      "catalog.tool_guides.password_generator.common_mistakes.1"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.password_generator.faqs.0.question",
        "answer": "catalog.tool_guides.password_generator.faqs.0.answer"
      }
    ]
  },
  "khmer-unicode-fixer": {
    "heroTitle": "catalog.tool_guides.khmer_unicode_fixer.hero_title",
    "heroDescription": "catalog.tool_guides.khmer_unicode_fixer.hero_description",
    "whatIs": [
      "catalog.tool_guides.khmer_unicode_fixer.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.khmer_unicode_fixer.steps.0",
      "catalog.tool_guides.khmer_unicode_fixer.steps.1",
      "catalog.tool_guides.khmer_unicode_fixer.steps.2",
      "catalog.tool_guides.khmer_unicode_fixer.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.khmer_unicode_fixer.why_use.0",
      "catalog.tool_guides.khmer_unicode_fixer.why_use.1",
      "catalog.tool_guides.khmer_unicode_fixer.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.khmer_unicode_fixer.use_cases.0",
      "catalog.tool_guides.khmer_unicode_fixer.use_cases.1",
      "catalog.tool_guides.khmer_unicode_fixer.use_cases.2"
    ],
    "tips": [
      "catalog.tool_guides.khmer_unicode_fixer.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.khmer_unicode_fixer.faqs.0.question",
        "answer": "catalog.tool_guides.khmer_unicode_fixer.faqs.0.answer"
      }
    ]
  },
  "payback-calculator": {
    "heroTitle": "catalog.tool_guides.payback_calculator.hero_title",
    "heroDescription": "catalog.tool_guides.payback_calculator.hero_description",
    "whatIs": [
      "catalog.tool_guides.payback_calculator.what_is.0",
      "catalog.tool_guides.payback_calculator.what_is.1"
    ],
    "steps": [
      "catalog.tool_guides.payback_calculator.steps.0",
      "catalog.tool_guides.payback_calculator.steps.1",
      "catalog.tool_guides.payback_calculator.steps.2",
      "catalog.tool_guides.payback_calculator.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.payback_calculator.why_use.0",
      "catalog.tool_guides.payback_calculator.why_use.1",
      "catalog.tool_guides.payback_calculator.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.payback_calculator.use_cases.0",
      "catalog.tool_guides.payback_calculator.use_cases.1",
      "catalog.tool_guides.payback_calculator.use_cases.2"
    ],
    "tips": [
      "catalog.tool_guides.payback_calculator.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.payback_calculator.faqs.0.question",
        "answer": "catalog.tool_guides.payback_calculator.faqs.0.answer"
      }
    ]
  },
  "expense-tracker": {
    "heroTitle": "catalog.tool_guides.expense_tracker.hero_title",
    "heroDescription": "catalog.tool_guides.expense_tracker.hero_description",
    "whatIs": [
      "catalog.tool_guides.expense_tracker.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.expense_tracker.steps.0",
      "catalog.tool_guides.expense_tracker.steps.1",
      "catalog.tool_guides.expense_tracker.steps.2",
      "catalog.tool_guides.expense_tracker.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.expense_tracker.why_use.0",
      "catalog.tool_guides.expense_tracker.why_use.1",
      "catalog.tool_guides.expense_tracker.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.expense_tracker.use_cases.0",
      "catalog.tool_guides.expense_tracker.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.expense_tracker.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.expense_tracker.faqs.0.question",
        "answer": "catalog.tool_guides.expense_tracker.faqs.0.answer"
      }
    ]
  },
  "json-formatter": {
    "heroTitle": "catalog.tool_guides.json_formatter.hero_title",
    "heroDescription": "catalog.tool_guides.json_formatter.hero_description",
    "whatIs": [
      "catalog.tool_guides.json_formatter.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.json_formatter.steps.0",
      "catalog.tool_guides.json_formatter.steps.1",
      "catalog.tool_guides.json_formatter.steps.2",
      "catalog.tool_guides.json_formatter.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.json_formatter.why_use.0",
      "catalog.tool_guides.json_formatter.why_use.1",
      "catalog.tool_guides.json_formatter.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.json_formatter.use_cases.0",
      "catalog.tool_guides.json_formatter.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.json_formatter.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.json_formatter.faqs.0.question",
        "answer": "catalog.tool_guides.json_formatter.faqs.0.answer"
      }
    ]
  },
  "jwt-decoder": {
    "heroTitle": "catalog.tool_guides.jwt_decoder.hero_title",
    "heroDescription": "catalog.tool_guides.jwt_decoder.hero_description",
    "whatIs": [
      "catalog.tool_guides.jwt_decoder.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.jwt_decoder.steps.0",
      "catalog.tool_guides.jwt_decoder.steps.1",
      "catalog.tool_guides.jwt_decoder.steps.2"
    ],
    "whyUse": [
      "catalog.tool_guides.jwt_decoder.why_use.0",
      "catalog.tool_guides.jwt_decoder.why_use.1"
    ],
    "useCases": [
      "catalog.tool_guides.jwt_decoder.use_cases.0",
      "catalog.tool_guides.jwt_decoder.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.jwt_decoder.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.jwt_decoder.faqs.0.question",
        "answer": "catalog.tool_guides.jwt_decoder.faqs.0.answer"
      }
    ]
  },
  "base64": {
    "heroTitle": "catalog.tool_guides.base64.hero_title",
    "heroDescription": "catalog.tool_guides.base64.hero_description",
    "whatIs": [
      "catalog.tool_guides.base64.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.base64.steps.0",
      "catalog.tool_guides.base64.steps.1",
      "catalog.tool_guides.base64.steps.2",
      "catalog.tool_guides.base64.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.base64.why_use.0",
      "catalog.tool_guides.base64.why_use.1"
    ],
    "useCases": [
      "catalog.tool_guides.base64.use_cases.0",
      "catalog.tool_guides.base64.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.base64.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.base64.faqs.0.question",
        "answer": "catalog.tool_guides.base64.faqs.0.answer"
      }
    ]
  },
  "url-encoder": {
    "heroTitle": "catalog.tool_guides.url_encoder.hero_title",
    "heroDescription": "catalog.tool_guides.url_encoder.hero_description",
    "whatIs": [
      "catalog.tool_guides.url_encoder.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.url_encoder.steps.0",
      "catalog.tool_guides.url_encoder.steps.1",
      "catalog.tool_guides.url_encoder.steps.2"
    ],
    "whyUse": [
      "catalog.tool_guides.url_encoder.why_use.0",
      "catalog.tool_guides.url_encoder.why_use.1"
    ],
    "useCases": [
      "catalog.tool_guides.url_encoder.use_cases.0",
      "catalog.tool_guides.url_encoder.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.url_encoder.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.url_encoder.faqs.0.question",
        "answer": "catalog.tool_guides.url_encoder.faqs.0.answer"
      }
    ]
  },
  "regex-tester": {
    "heroTitle": "catalog.tool_guides.regex_tester.hero_title",
    "heroDescription": "catalog.tool_guides.regex_tester.hero_description",
    "whatIs": [
      "catalog.tool_guides.regex_tester.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.regex_tester.steps.0",
      "catalog.tool_guides.regex_tester.steps.1",
      "catalog.tool_guides.regex_tester.steps.2",
      "catalog.tool_guides.regex_tester.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.regex_tester.why_use.0",
      "catalog.tool_guides.regex_tester.why_use.1"
    ],
    "useCases": [
      "catalog.tool_guides.regex_tester.use_cases.0",
      "catalog.tool_guides.regex_tester.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.regex_tester.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.regex_tester.faqs.0.question",
        "answer": "catalog.tool_guides.regex_tester.faqs.0.answer"
      }
    ]
  },
  "uuid-generator": {
    "heroTitle": "catalog.tool_guides.uuid_generator.hero_title",
    "heroDescription": "catalog.tool_guides.uuid_generator.hero_description",
    "whatIs": [
      "catalog.tool_guides.uuid_generator.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.uuid_generator.steps.0",
      "catalog.tool_guides.uuid_generator.steps.1",
      "catalog.tool_guides.uuid_generator.steps.2"
    ],
    "whyUse": [
      "catalog.tool_guides.uuid_generator.why_use.0",
      "catalog.tool_guides.uuid_generator.why_use.1"
    ],
    "useCases": [
      "catalog.tool_guides.uuid_generator.use_cases.0",
      "catalog.tool_guides.uuid_generator.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.uuid_generator.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.uuid_generator.faqs.0.question",
        "answer": "catalog.tool_guides.uuid_generator.faqs.0.answer"
      }
    ]
  },
  "unix-timestamp": {
    "heroTitle": "catalog.tool_guides.unix_timestamp.hero_title",
    "heroDescription": "catalog.tool_guides.unix_timestamp.hero_description",
    "whatIs": [
      "catalog.tool_guides.unix_timestamp.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.unix_timestamp.steps.0",
      "catalog.tool_guides.unix_timestamp.steps.1",
      "catalog.tool_guides.unix_timestamp.steps.2"
    ],
    "whyUse": [
      "catalog.tool_guides.unix_timestamp.why_use.0",
      "catalog.tool_guides.unix_timestamp.why_use.1"
    ],
    "useCases": [
      "catalog.tool_guides.unix_timestamp.use_cases.0",
      "catalog.tool_guides.unix_timestamp.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.unix_timestamp.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.unix_timestamp.faqs.0.question",
        "answer": "catalog.tool_guides.unix_timestamp.faqs.0.answer"
      }
    ]
  },
  "cron-explainer": {
    "heroTitle": "catalog.tool_guides.cron_explainer.hero_title",
    "heroDescription": "catalog.tool_guides.cron_explainer.hero_description",
    "whatIs": [
      "catalog.tool_guides.cron_explainer.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.cron_explainer.steps.0",
      "catalog.tool_guides.cron_explainer.steps.1",
      "catalog.tool_guides.cron_explainer.steps.2"
    ],
    "whyUse": [
      "catalog.tool_guides.cron_explainer.why_use.0",
      "catalog.tool_guides.cron_explainer.why_use.1"
    ],
    "useCases": [
      "catalog.tool_guides.cron_explainer.use_cases.0",
      "catalog.tool_guides.cron_explainer.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.cron_explainer.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.cron_explainer.faqs.0.question",
        "answer": "catalog.tool_guides.cron_explainer.faqs.0.answer"
      }
    ]
  },
  "hash-generator": {
    "heroTitle": "catalog.tool_guides.hash_generator.hero_title",
    "heroDescription": "catalog.tool_guides.hash_generator.hero_description",
    "whatIs": [
      "catalog.tool_guides.hash_generator.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.hash_generator.steps.0",
      "catalog.tool_guides.hash_generator.steps.1",
      "catalog.tool_guides.hash_generator.steps.2"
    ],
    "whyUse": [
      "catalog.tool_guides.hash_generator.why_use.0",
      "catalog.tool_guides.hash_generator.why_use.1"
    ],
    "useCases": [
      "catalog.tool_guides.hash_generator.use_cases.0",
      "catalog.tool_guides.hash_generator.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.hash_generator.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.hash_generator.faqs.0.question",
        "answer": "catalog.tool_guides.hash_generator.faqs.0.answer"
      }
    ]
  },
  "youtube-downloader": {
    "heroTitle": "catalog.tool_guides.youtube_downloader.hero_title",
    "heroDescription": "catalog.tool_guides.youtube_downloader.hero_description",
    "whatIs": [
      "catalog.tool_guides.youtube_downloader.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.youtube_downloader.steps.0",
      "catalog.tool_guides.youtube_downloader.steps.1",
      "catalog.tool_guides.youtube_downloader.steps.2",
      "catalog.tool_guides.youtube_downloader.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.youtube_downloader.why_use.0",
      "catalog.tool_guides.youtube_downloader.why_use.1"
    ],
    "useCases": [
      "catalog.tool_guides.youtube_downloader.use_cases.0",
      "catalog.tool_guides.youtube_downloader.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.youtube_downloader.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.youtube_downloader.faqs.0.question",
        "answer": "catalog.tool_guides.youtube_downloader.faqs.0.answer"
      }
    ]
  },
  "calculator": {
    "heroTitle": "catalog.tool_guides.calculator.hero_title",
    "heroDescription": "catalog.tool_guides.calculator.hero_description",
    "whatIs": [
      "catalog.tool_guides.calculator.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.calculator.steps.0",
      "catalog.tool_guides.calculator.steps.1",
      "catalog.tool_guides.calculator.steps.2",
      "catalog.tool_guides.calculator.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.calculator.why_use.0",
      "catalog.tool_guides.calculator.why_use.1",
      "catalog.tool_guides.calculator.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.calculator.use_cases.0",
      "catalog.tool_guides.calculator.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.calculator.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.calculator.faqs.0.question",
        "answer": "catalog.tool_guides.calculator.faqs.0.answer"
      }
    ]
  },
  "stopwatch": {
    "heroTitle": "catalog.tool_guides.stopwatch.hero_title",
    "heroDescription": "catalog.tool_guides.stopwatch.hero_description",
    "whatIs": [
      "catalog.tool_guides.stopwatch.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.stopwatch.steps.0",
      "catalog.tool_guides.stopwatch.steps.1",
      "catalog.tool_guides.stopwatch.steps.2"
    ],
    "whyUse": [
      "catalog.tool_guides.stopwatch.why_use.0",
      "catalog.tool_guides.stopwatch.why_use.1",
      "catalog.tool_guides.stopwatch.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.stopwatch.use_cases.0",
      "catalog.tool_guides.stopwatch.use_cases.1",
      "catalog.tool_guides.stopwatch.use_cases.2"
    ],
    "tips": [
      "catalog.tool_guides.stopwatch.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.stopwatch.faqs.0.question",
        "answer": "catalog.tool_guides.stopwatch.faqs.0.answer"
      }
    ]
  },
  "text-to-voice": {
    "heroTitle": "catalog.tool_guides.text_to_voice.hero_title",
    "heroDescription": "catalog.tool_guides.text_to_voice.hero_description",
    "whatIs": [
      "catalog.tool_guides.text_to_voice.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.text_to_voice.steps.0",
      "catalog.tool_guides.text_to_voice.steps.1",
      "catalog.tool_guides.text_to_voice.steps.2",
      "catalog.tool_guides.text_to_voice.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.text_to_voice.why_use.0",
      "catalog.tool_guides.text_to_voice.why_use.1",
      "catalog.tool_guides.text_to_voice.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.text_to_voice.use_cases.0",
      "catalog.tool_guides.text_to_voice.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.text_to_voice.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.text_to_voice.faqs.0.question",
        "answer": "catalog.tool_guides.text_to_voice.faqs.0.answer"
      }
    ]
  },
  "chlatwork-link": {
    "heroTitle": "catalog.tool_guides.chlatwork_link.hero_title",
    "heroDescription": "catalog.tool_guides.chlatwork_link.hero_description",
    "whatIs": [
      "catalog.tool_guides.chlatwork_link.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.chlatwork_link.steps.0",
      "catalog.tool_guides.chlatwork_link.steps.1",
      "catalog.tool_guides.chlatwork_link.steps.2",
      "catalog.tool_guides.chlatwork_link.steps.3",
      "catalog.tool_guides.chlatwork_link.steps.4"
    ],
    "whyUse": [
      "catalog.tool_guides.chlatwork_link.why_use.0",
      "catalog.tool_guides.chlatwork_link.why_use.1",
      "catalog.tool_guides.chlatwork_link.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.chlatwork_link.use_cases.0",
      "catalog.tool_guides.chlatwork_link.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.chlatwork_link.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.chlatwork_link.faqs.0.question",
        "answer": "catalog.tool_guides.chlatwork_link.faqs.0.answer"
      }
    ]
  },
  "lucky-draw": {
    "heroTitle": "catalog.tool_guides.lucky_draw.hero_title",
    "heroDescription": "catalog.tool_guides.lucky_draw.hero_description",
    "whatIs": [
      "catalog.tool_guides.lucky_draw.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.lucky_draw.steps.0",
      "catalog.tool_guides.lucky_draw.steps.1",
      "catalog.tool_guides.lucky_draw.steps.2",
      "catalog.tool_guides.lucky_draw.steps.3"
    ],
    "whyUse": [
      "catalog.tool_guides.lucky_draw.why_use.0",
      "catalog.tool_guides.lucky_draw.why_use.1",
      "catalog.tool_guides.lucky_draw.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.lucky_draw.use_cases.0",
      "catalog.tool_guides.lucky_draw.use_cases.1",
      "catalog.tool_guides.lucky_draw.use_cases.2"
    ],
    "tips": [
      "catalog.tool_guides.lucky_draw.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.lucky_draw.faqs.0.question",
        "answer": "catalog.tool_guides.lucky_draw.faqs.0.answer"
      }
    ]
  },
  "kla-klok": {
    "heroTitle": "catalog.tool_guides.kla_klok.hero_title",
    "heroDescription": "catalog.tool_guides.kla_klok.hero_description",
    "whatIs": [
      "catalog.tool_guides.kla_klok.what_is.0"
    ],
    "steps": [
      "catalog.tool_guides.kla_klok.steps.0",
      "catalog.tool_guides.kla_klok.steps.1",
      "catalog.tool_guides.kla_klok.steps.2"
    ],
    "whyUse": [
      "catalog.tool_guides.kla_klok.why_use.0",
      "catalog.tool_guides.kla_klok.why_use.1",
      "catalog.tool_guides.kla_klok.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.kla_klok.use_cases.0",
      "catalog.tool_guides.kla_klok.use_cases.1"
    ],
    "tips": [
      "catalog.tool_guides.kla_klok.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.kla_klok.faqs.0.question",
        "answer": "catalog.tool_guides.kla_klok.faqs.0.answer"
      }
    ]
  },
  "khmer-calendar": {
    "heroTitle": "catalog.tool_guides.khmer_calendar.hero_title",
    "heroDescription": "catalog.tool_guides.khmer_calendar.hero_description",
    "whatIs": [
      "catalog.tool_guides.khmer_calendar.what_is.0",
      "catalog.tool_guides.khmer_calendar.what_is.1"
    ],
    "steps": [
      "catalog.tool_guides.khmer_calendar.steps.0",
      "catalog.tool_guides.khmer_calendar.steps.1"
    ],
    "whyUse": [
      "catalog.tool_guides.khmer_calendar.why_use.0",
      "catalog.tool_guides.khmer_calendar.why_use.1",
      "catalog.tool_guides.khmer_calendar.why_use.2"
    ],
    "useCases": [
      "catalog.tool_guides.khmer_calendar.use_cases.0",
      "catalog.tool_guides.khmer_calendar.use_cases.1",
      "catalog.tool_guides.khmer_calendar.use_cases.2"
    ],
    "tips": [
      "catalog.tool_guides.khmer_calendar.tips.0"
    ],
    "faqs": [
      {
        "question": "catalog.tool_guides.khmer_calendar.faqs.0.question",
        "answer": "catalog.tool_guides.khmer_calendar.faqs.0.answer"
      }
    ]
  }
}, "km");

export function getToolGuideKm(
  key: string,
  fallbackNameKm?: string,
  fallbackDescKm?: string,
): ToolGuideKm {
  if (TOOL_GUIDES_KM[key]) {
    const guide = TOOL_GUIDES_KM[key];
    return {
      ...guide,
      privacy: GUIDE_PRIVACY_KM[key] ?? [translateMessage("km", "catalog.common.local_processing")],
      practicalExamples: TOOL_GUIDE_EXAMPLES_KM[key],
      metaTitle: `${guide.heroTitle ?? fallbackNameKm ?? key} | ChlatWork`,
      metaDescription: guide.heroDescription ?? fallbackDescKm,
    };
  }

  const name = fallbackNameKm || key;
  const desc = fallbackDescKm || translateMessage("km", "catalog.common.description", { name });

  return {
    heroTitle: translateMessage("km", "catalog.common.title", { name }),
    heroDescription: desc,
    whatIs: [
      translateMessage("km", "catalog.common.introduction", { name }),
      translateMessage("km", "catalog.common.check_processing"),
    ],
    steps: [
      translateMessage("km", "catalog.common.open_tool", { name }),
      translateMessage("km", "catalog.common.adjust_options"),
      translateMessage("km", "catalog.common.review_output"),
      translateMessage("km", "catalog.common.download_output"),
    ],
    whyUse: [
      translateMessage("km", "catalog.common.benefit"),
      translateMessage("km", "catalog.common.processing_guidance"),
      translateMessage("km", "catalog.common.no_installation"),
    ],
    useCases: [
      translateMessage("km", "catalog.common.daily_work"),
      translateMessage("km", "catalog.common.use_cases"),
    ],
    tips: [
      translateMessage("km", "catalog.common.verify_details"),
    ],
    commonMistakes: [
      translateMessage("km", "catalog.common.common_mistake"),
    ],
    faqs: [
      {
        question: translateMessage("km", "catalog.common.free_question", { name }),
        answer: translateMessage("km", "catalog.common.free_answer"),
      },
      {
        question: translateMessage("km", "catalog.common.privacy_question"),
        answer: translateMessage("km", "catalog.common.privacy_answer"),
      },
    ],
  };
}

const GUIDE_PRIVACY_KM: Record<string, string[]> = localizeMessageTree({
  "khmer-calendar": [
    "catalog.tool_privacy.khmer_calendar.0"
  ],
  "youtube-downloader": [
    "catalog.tool_privacy.youtube_downloader.0",
    "catalog.tool_privacy.youtube_downloader.1",
    "catalog.tool_privacy.youtube_downloader.2"
  ],
  "chlatwork-link": [
    "catalog.tool_privacy.chlatwork_link.0",
    "catalog.tool_privacy.chlatwork_link.1",
    "catalog.tool_privacy.chlatwork_link.2"
  ],
  "text-to-voice": [
    "catalog.tool_privacy.text_to_voice.0",
    "catalog.tool_privacy.text_to_voice.1"
  ],
  "expense-tracker": [
    "catalog.tool_privacy.expense_tracker.0",
    "catalog.tool_privacy.expense_tracker.1"
  ],
  "payback-calculator": [
    "catalog.tool_privacy.payback_calculator.0",
    "catalog.tool_privacy.payback_calculator.1"
  ],
  "lucky-draw": [
    "catalog.tool_privacy.lucky_draw.0",
    "catalog.tool_privacy.lucky_draw.1"
  ]
}, "km");

/** Project all guide copy together so metadata and visible content use the same language. */
export function localizeToolGuide(guide: ToolGuide, locale: "en" | "km", tool = guide.tool): ToolGuide {
  if (locale === "en") return guide;
  const copy = getToolGuideKm(guide.tool.key, tool.name, tool.description);
  return {
    ...guide, ...copy,
    heroTitle: copy.heroTitle ?? tool.name,
    heroDescription: copy.heroDescription ?? tool.description,
    metaTitle: copy.metaTitle ?? `${tool.name} | ChlatWork`,
    metaDescription: copy.metaDescription ?? tool.description,
    ctaLabel: translateMessage("km", "catalog.common.open_action"),
    tool,
    practicalExamples: copy.practicalExamples ?? guide.practicalExamplesKm ?? [],
  };
}
