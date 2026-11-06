import { translateMessage } from "../lib/i18n.ts";
import type { BusinessService } from "./services";

const INVOICE_COPY_KEYS = {
  "name": "shared.services.invoice.name",
  "shortName": "shared.services.invoice.short_name",
  "eyebrow": "shared.services.invoice.eyebrow",
  "title": "shared.services.invoice.title",
  "description": "shared.services.invoice.description",
  "metaTitle": "shared.services.invoice.meta_title",
  "metaDescription": "shared.services.invoice.meta_description",
  "priceNote": "shared.services.invoice.price_note",
  "deliveryTime": "shared.services.invoice.delivery_time",
  "highlights": [
    "shared.services.invoice.highlights_1",
    "shared.services.invoice.highlights_2",
    "shared.services.invoice.highlights_3",
    "shared.services.invoice.highlights_4"
  ],
  "features": [
    "shared.services.invoice.features_1",
    "shared.services.invoice.features_2",
    "shared.services.invoice.features_3",
    "shared.services.invoice.features_4"
  ],
  "idealFor": [
    "shared.services.invoice.ideal_for_1",
    "shared.services.invoice.ideal_for_2",
    "shared.services.invoice.ideal_for_3"
  ],
  "process": [
    "shared.services.invoice.process_1",
    "shared.services.invoice.process_2",
    "shared.services.invoice.process_3",
    "shared.services.invoice.process_4"
  ]
} as const;

export function localizeBusinessService(service: BusinessService, locale: "en" | "km"): BusinessService {
  if (locale === "en" || service.slug !== "invoice-generator") return service;
  const localized = Object.fromEntries(Object.entries(INVOICE_COPY_KEYS).map(([field, keys]) => [field, Array.isArray(keys) ? keys.map(key => translateMessage(locale, key)) : translateMessage(locale, keys as string)]));
  return { ...service, ...localized };
}
