import { localizeMessageTree, translateMessage } from "../lib/i18n";
import type { PdfToolDef, PdfToolKey } from "./pdf-tools";

type PdfCopy = Pick<PdfToolDef, "name" | "description" | "metaTitle" | "metaDescription" | "actionLabel" | "emptyState" | "faq" | "howItWorks"> & Partial<Pick<PdfToolDef, "betaNotice" | "comingSoonNotice" | "evidence">>;

export const PDF_TOOL_TRANSLATIONS_KM: Record<PdfToolKey, PdfCopy> = localizeMessageTree({
  "pdf-to-jpg": {
    "name": "catalog.pdf.pdf_to_jpg.name",
    "description": "catalog.pdf.pdf_to_jpg.description",
    "metaTitle": "catalog.pdf.pdf_to_jpg.meta_title",
    "metaDescription": "catalog.pdf.pdf_to_jpg.meta_description",
    "actionLabel": "catalog.pdf.pdf_to_jpg.action_label",
    "emptyState": "catalog.pdf.pdf_to_jpg.empty_state",
    "faq": [
      {
        "question": "catalog.pdf.pdf_to_jpg.faq.0.question",
        "answer": "catalog.pdf.pdf_to_jpg.faq.0.answer"
      },
      {
        "question": "catalog.pdf.pdf_to_jpg.faq.1.question",
        "answer": "catalog.pdf.pdf_to_jpg.faq.1.answer"
      }
    ],
    "howItWorks": [
      "catalog.pdf.pdf_to_jpg.how_it_works.0",
      "catalog.pdf.pdf_to_jpg.how_it_works.1",
      "catalog.pdf.pdf_to_jpg.how_it_works.2"
    ]
  },
  "merge-pdf": {
    "name": "catalog.pdf.merge_pdf.name",
    "description": "catalog.pdf.merge_pdf.description",
    "metaTitle": "catalog.pdf.merge_pdf.meta_title",
    "metaDescription": "catalog.pdf.merge_pdf.meta_description",
    "actionLabel": "catalog.pdf.merge_pdf.action_label",
    "emptyState": "catalog.pdf.merge_pdf.empty_state",
    "faq": [
      {
        "question": "catalog.pdf.merge_pdf.faq.0.question",
        "answer": "catalog.pdf.merge_pdf.faq.0.answer"
      },
      {
        "question": "catalog.pdf.merge_pdf.faq.1.question",
        "answer": "catalog.pdf.merge_pdf.faq.1.answer"
      }
    ],
    "howItWorks": [
      "catalog.pdf.merge_pdf.how_it_works.0",
      "catalog.pdf.merge_pdf.how_it_works.1",
      "catalog.pdf.merge_pdf.how_it_works.2"
    ]
  },
  "split-pdf": {
    "name": "catalog.pdf.split_pdf.name",
    "description": "catalog.pdf.split_pdf.description",
    "metaTitle": "catalog.pdf.split_pdf.meta_title",
    "metaDescription": "catalog.pdf.split_pdf.meta_description",
    "actionLabel": "catalog.pdf.split_pdf.action_label",
    "emptyState": "catalog.pdf.split_pdf.empty_state",
    "faq": [
      {
        "question": "catalog.pdf.split_pdf.faq.0.question",
        "answer": "catalog.pdf.split_pdf.faq.0.answer"
      },
      {
        "question": "catalog.pdf.split_pdf.faq.1.question",
        "answer": "catalog.pdf.split_pdf.faq.1.answer"
      }
    ],
    "howItWorks": [
      "catalog.pdf.split_pdf.how_it_works.0",
      "catalog.pdf.split_pdf.how_it_works.1",
      "catalog.pdf.split_pdf.how_it_works.2"
    ]
  },
  "compress-pdf": {
    "name": "catalog.pdf.compress_pdf.name",
    "description": "catalog.pdf.compress_pdf.description",
    "metaTitle": "catalog.pdf.compress_pdf.meta_title",
    "metaDescription": "catalog.pdf.compress_pdf.meta_description",
    "actionLabel": "catalog.pdf.compress_pdf.action_label",
    "emptyState": "catalog.pdf.compress_pdf.empty_state",
    "comingSoonNotice": "catalog.pdf.compress_pdf.coming_soon_notice",
    "evidence": {
      "knownFailureCases": [
        "catalog.pdf.compress_pdf.evidence.known_failure_cases.0",
        "catalog.pdf.compress_pdf.evidence.known_failure_cases.1"
      ],
      "browserLimitations": [
        "catalog.pdf.compress_pdf.evidence.browser_limitations.0"
      ]
    },
    "faq": [
      {
        "question": "catalog.pdf.compress_pdf.faq.0.question",
        "answer": "catalog.pdf.compress_pdf.faq.0.answer"
      },
      {
        "question": "catalog.pdf.compress_pdf.faq.1.question",
        "answer": "catalog.pdf.compress_pdf.faq.1.answer"
      }
    ],
    "howItWorks": [
      "catalog.pdf.compress_pdf.how_it_works.0",
      "catalog.pdf.compress_pdf.how_it_works.1",
      "catalog.pdf.compress_pdf.how_it_works.2"
    ]
  },
  "remove-pdf-pages": {
    "name": "catalog.pdf.remove_pdf_pages.name",
    "description": "catalog.pdf.remove_pdf_pages.description",
    "metaTitle": "catalog.pdf.remove_pdf_pages.meta_title",
    "metaDescription": "catalog.pdf.remove_pdf_pages.meta_description",
    "actionLabel": "catalog.pdf.remove_pdf_pages.action_label",
    "emptyState": "catalog.pdf.remove_pdf_pages.empty_state",
    "faq": [
      {
        "question": "catalog.pdf.remove_pdf_pages.faq.0.question",
        "answer": "catalog.pdf.remove_pdf_pages.faq.0.answer"
      },
      {
        "question": "catalog.pdf.remove_pdf_pages.faq.1.question",
        "answer": "catalog.pdf.remove_pdf_pages.faq.1.answer"
      }
    ],
    "howItWorks": [
      "catalog.pdf.remove_pdf_pages.how_it_works.0",
      "catalog.pdf.remove_pdf_pages.how_it_works.1",
      "catalog.pdf.remove_pdf_pages.how_it_works.2"
    ]
  },
  "reorder-pdf-pages": {
    "name": "catalog.pdf.reorder_pdf_pages.name",
    "description": "catalog.pdf.reorder_pdf_pages.description",
    "metaTitle": "catalog.pdf.reorder_pdf_pages.meta_title",
    "metaDescription": "catalog.pdf.reorder_pdf_pages.meta_description",
    "actionLabel": "catalog.pdf.reorder_pdf_pages.action_label",
    "emptyState": "catalog.pdf.reorder_pdf_pages.empty_state",
    "faq": [
      {
        "question": "catalog.pdf.reorder_pdf_pages.faq.0.question",
        "answer": "catalog.pdf.reorder_pdf_pages.faq.0.answer"
      },
      {
        "question": "catalog.pdf.reorder_pdf_pages.faq.1.question",
        "answer": "catalog.pdf.reorder_pdf_pages.faq.1.answer"
      }
    ],
    "howItWorks": [
      "catalog.pdf.reorder_pdf_pages.how_it_works.0",
      "catalog.pdf.reorder_pdf_pages.how_it_works.1",
      "catalog.pdf.reorder_pdf_pages.how_it_works.2"
    ]
  },
  "html-to-pdf": {
    "name": "catalog.pdf.html_to_pdf.name",
    "description": "catalog.pdf.html_to_pdf.description",
    "metaTitle": "catalog.pdf.html_to_pdf.meta_title",
    "metaDescription": "catalog.pdf.html_to_pdf.meta_description",
    "actionLabel": "catalog.pdf.html_to_pdf.action_label",
    "emptyState": "catalog.pdf.html_to_pdf.empty_state",
    "betaNotice": "catalog.pdf.html_to_pdf.beta_notice",
    "evidence": {
      "knownFailureCases": [
        "catalog.pdf.html_to_pdf.evidence.known_failure_cases.0",
        "catalog.pdf.html_to_pdf.evidence.known_failure_cases.1"
      ],
      "browserLimitations": [
        "catalog.pdf.html_to_pdf.evidence.browser_limitations.0"
      ]
    },
    "faq": [
      {
        "question": "catalog.pdf.html_to_pdf.faq.0.question",
        "answer": "catalog.pdf.html_to_pdf.faq.0.answer"
      },
      {
        "question": "catalog.pdf.html_to_pdf.faq.1.question",
        "answer": "catalog.pdf.html_to_pdf.faq.1.answer"
      }
    ],
    "howItWorks": [
      "catalog.pdf.html_to_pdf.how_it_works.0",
      "catalog.pdf.html_to_pdf.how_it_works.1",
      "catalog.pdf.html_to_pdf.how_it_works.2"
    ]
  },
  "text-to-pdf": {
    "name": "catalog.pdf.text_to_pdf.name",
    "description": "catalog.pdf.text_to_pdf.description",
    "metaTitle": "catalog.pdf.text_to_pdf.meta_title",
    "metaDescription": "catalog.pdf.text_to_pdf.meta_description",
    "actionLabel": "catalog.pdf.text_to_pdf.action_label",
    "emptyState": "catalog.pdf.text_to_pdf.empty_state",
    "faq": [
      {
        "question": "catalog.pdf.text_to_pdf.faq.0.question",
        "answer": "catalog.pdf.text_to_pdf.faq.0.answer"
      },
      {
        "question": "catalog.pdf.text_to_pdf.faq.1.question",
        "answer": "catalog.pdf.text_to_pdf.faq.1.answer"
      }
    ],
    "howItWorks": [
      "catalog.pdf.text_to_pdf.how_it_works.0",
      "catalog.pdf.text_to_pdf.how_it_works.1",
      "catalog.pdf.text_to_pdf.how_it_works.2"
    ]
  },
  "invoice-to-pdf": {
    "name": "catalog.pdf.invoice_to_pdf.name",
    "description": "catalog.pdf.invoice_to_pdf.description",
    "metaTitle": "catalog.pdf.invoice_to_pdf.meta_title",
    "metaDescription": "catalog.pdf.invoice_to_pdf.meta_description",
    "actionLabel": "catalog.pdf.invoice_to_pdf.action_label",
    "emptyState": "catalog.pdf.invoice_to_pdf.empty_state",
    "faq": [
      {
        "question": "catalog.pdf.invoice_to_pdf.faq.0.question",
        "answer": "catalog.pdf.invoice_to_pdf.faq.0.answer"
      },
      {
        "question": "catalog.pdf.invoice_to_pdf.faq.1.question",
        "answer": "catalog.pdf.invoice_to_pdf.faq.1.answer"
      }
    ],
    "howItWorks": [
      "catalog.pdf.invoice_to_pdf.how_it_works.0",
      "catalog.pdf.invoice_to_pdf.how_it_works.1",
      "catalog.pdf.invoice_to_pdf.how_it_works.2"
    ]
  }
}, "km");

export function localizePdfTool(tool: PdfToolDef, locale: "en" | "km"): PdfToolDef {
  if (locale === "en") return tool;
  return {
    ...tool,
    ...PDF_TOOL_TRANSLATIONS_KM[tool.key],
    privacyNote: translateMessage("km", "catalog.common.pdf_privacy"),
  };
}
