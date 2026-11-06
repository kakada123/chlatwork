import { translateMessage } from "../lib/i18n.ts";

// Library wording identifies semantic catalog keys; no translated copy lives in this adapter.
const TOOL_ERROR_KEYS: Record<string, string> = {
  "Please enter text or URL.": "tools.common.errors.pleaseEnterTextOrURL",
  "Too long (max ~2000 chars).": "tools.common.errors.tooLongMax2000Chars",
  "Please enter a value.": "tools.common.errors.pleaseEnterAValue",
  "For Khmer language, QR Code is recommended. Standard barcodes support only numbers and basic English characters.": "tools.codes.errors.forKhmerLanguageQRCodeIsRecommendedStandardBarcodesSupportOnlyNumbersAndBasicEnglishCharacters",
  "Barcode value must use printable ASCII characters.": "tools.common.errors.barcodeValueMustUsePrintableASCIICharacters",
  "EAN13 must be digits only.": "tools.codes.errors.eAN13MustBeDigitsOnly",
  "EAN13: enter 12 digits (recommended) or 13 digits.": "tools.codes.errors.eAN13Enter12DigitsRecommendedOr13Digits",
  "UPC must be digits only.": "tools.codes.errors.uPCMustBeDigitsOnly",
  "UPC: enter 11 digits (recommended) or 12 digits.": "tools.codes.errors.uPCEnter11DigitsRecommendedOr12Digits",
  "CODE39 supports A-Z, 0-9 and - . space $ / + %": "tools.codes.errors.cODE39SupportsAZ09AndSpace",
  "Select at least one character set.": "tools.common.errors.selectAtLeastOneCharacterSet",
  "Paste a JWT to decode it.": "tools.common.errors.pasteAJWTToDecodeIt",
  "A JWT should contain at least header and payload sections.": "tools.common.errors.aJWTShouldContainAtLeastHeaderAndPayloadSections",
  "Use standard 5-field cron: minute hour day-of-month month day-of-week.": "tools.common.errors.useStandard5FieldCronMinuteHourDayOfMonthMonthDayOfWeek",
  "No matching run time found within six years.": "tools.common.errors.noMatchingRunTimeFoundWithinSixYears",
  "No QR code was found in the selected image.": "tools.codes.errors.noQRCodeWasFoundInTheSelectedImage",
  "No barcode was found in the selected image.": "tools.codes.errors.noBarcodeWasFoundInTheSelectedImage",
  "Failed to scan the QR image.": "tools.codes.errors.failedToScanTheQRImage",
  "Failed to scan the barcode image.": "tools.codes.errors.failedToScanTheBarcodeImage",
  "Failed to scan camera frame for QR code.": "tools.codes.errors.failedToScanCameraFrameForQRCode",
  "Failed to scan camera frame for barcode.": "tools.codes.errors.failedToScanCameraFrameForBarcode",
  "Camera API is unavailable. Use HTTPS (or localhost) and a modern browser.": "tools.scanner.errors.cameraAPIIsUnavailableUseHTTPSOrLocalhostAndAModernBrowser",
  "The selected image could not be loaded.": "tools.common.errors.theSelectedImageCouldNotBeLoaded",
  "Image scanning is only available in the browser.": "tools.scanner.errors.imageScanningIsOnlyAvailableInTheBrowser",
  "Camera scanning is only available in the browser.": "tools.scanner.errors.cameraScanningIsOnlyAvailableInTheBrowser",
  "Could not load the spending summary. Apply the filter to try again.": "tools.expenseTracker.errors.couldNotLoadTheSpendingSummaryApplyTheFilterToTryAgain",
  "Choose a valid start and end date.": "tools.common.errors.chooseAValidStartAndEndDate",
  "Choose a valid day to search.": "tools.common.errors.chooseAValidDayToSearch",
  "Could not load expenses for these dates. Try applying the filter again.": "tools.expenseTracker.errors.couldNotLoadExpensesForTheseDatesTryApplyingTheFilterAgain",
  "Could not load entries for this day. Try searching again.": "tools.expenseTracker.errors.couldNotLoadEntriesForThisDayTrySearchingAgain",
  "This entry changed elsewhere. Your edits are kept here; reload the page to get the latest version.": "tools.expenseTracker.errors.thisEntryChangedElsewhereYourEditsAreKeptHereReloadThePageToGetTheLatestVersion",
  "Could not save changes. Your edits are kept here. Try saving again.": "tools.expenseTracker.errors.couldNotSaveChangesYourEditsAreKeptHereTrySavingAgain",
  "This entry changed elsewhere. Close this dialog and search again to load the latest version.": "tools.expenseTracker.errors.thisEntryChangedElsewhereCloseThisDialogAndSearchAgainToLoadTheLatestVersion",
  "Could not save this entry. Your changes are still in this dialog. Try again.": "tools.expenseTracker.errors.couldNotSaveThisEntryYourChangesAreStillInThisDialogTryAgain",
  "Could not load your expense dashboard. Reload the page to try again.": "tools.expenseTracker.errors.couldNotLoadYourExpenseDashboardReloadThePageToTryAgain",
  "Your expense draft is kept on this device. Reload to try importing it again.": "tools.expenseTracker.errors.yourExpenseDraftIsKeptOnThisDeviceReloadToTryImportingItAgain",
  "Unable to generate hashes.": "tools.common.errors.unableToGenerateHashes",
  "Enter valid invoice text and finite, non-negative item quantities and prices.": "tools.invoice.errors.enterValidInvoiceTextAndFiniteNonNegativeItemQuantitiesAndPrices",
  "The invoice total is too large to render safely.": "tools.invoice.errors.theInvoiceTotalIsTooLargeToRenderSafely",
  "The Khmer invoice font could not be loaded. Reload the page and try again.": "tools.invoice.errors.theKhmerInvoiceFontCouldNotBeLoadedReloadThePageAndTryAgain",
  "The invoice has too many pages to render safely.": "tools.invoice.errors.theInvoiceHasTooManyPagesToRenderSafely",
  "Unable to read this file.": "tools.common.errors.unableToReadThisFile",
  "Unable to prepare these images.": "tools.common.errors.unableToPrepareTheseImages",
  "Unable to generate the PDF. Please try again.": "tools.common.errors.unableToGenerateThePDFPleaseTryAgain",
  "One image resolution is too large to process safely in the browser. Try resizing it first.": "tools.common.errors.oneImageResolutionIsTooLargeToProcessSafelyInTheBrowserTryResizingItFirst",
  "Canvas is not available in this browser.": "tools.common.errors.canvasIsNotAvailableInThisBrowser",
  "Please select a base date.": "tools.common.errors.pleaseSelectABaseDate",
  "Please select both dates.": "tools.common.errors.pleaseSelectBothDates",
  "Camera permission was denied. Please allow camera access in your browser settings and try again.": "tools.scanner.errors.cameraPermissionWasDeniedPleaseAllowCameraAccessInYourBrowserSettingsAndTryAgain",
  "No camera was found on this device, or it is currently unavailable.": "tools.scanner.errors.noCameraWasFoundOnThisDeviceOrItIsCurrentlyUnavailable",
  "Camera is being used by another app. Close other camera apps and try again.": "tools.scanner.errors.cameraIsBeingUsedByAnotherAppCloseOtherCameraAppsAndTryAgain",
  "Unable to access camera. Please allow permission and check your browser settings.": "tools.scanner.errors.unableToAccessCameraPleaseAllowPermissionAndCheckYourBrowserSettings",
  "Enter at least one page or range.": "tools.common.errors.enterAtLeastOnePageOrRange",
  "Enter a page order, for example 3,1,2,4.": "tools.common.errors.enterAPageOrderForExample3124",
  "Each page can only appear once in the order.": "tools.common.errors.eachPageCanOnlyAppearOnceInTheOrder",
  "You cannot remove every page from the PDF.": "tools.common.errors.youCannotRemoveEveryPageFromThePDF",
  "Amount must be 0 or more.": "tools.common.errors.amountMustBe0OrMore"
};

const PDF_OPTION_KEYS: Record<string, string> = {
  "Letter": "tools.imageToPdf.options.letter",
  "Auto / Fit image": "tools.imageToPdf.options.autoFitImage",
  "Portrait": "tools.imageToPdf.options.portrait",
  "Landscape": "tools.imageToPdf.options.landscape",
  "None": "tools.imageToPdf.options.none",
  "Small": "tools.imageToPdf.options.small",
  "Medium": "tools.imageToPdf.options.medium",
  "1 image per page": "tools.imageToPdf.options.1ImagePerPage",
  "2 images per page": "tools.imageToPdf.options.2ImagesPerPage",
  "4 images per page": "tools.imageToPdf.options.4ImagesPerPage"
};

const SPEECH_ERROR_KEYS: Record<string, string> = {
  "Enter text before speaking.": "tools.textToVoice.errors.enterTextBeforeSpeaking",
  "Enter text before downloading.": "tools.textToVoice.errors.enterTextBeforeDownloading",
  "Your browser does not support text-to-speech.": "tools.textToVoice.errors.yourBrowserDoesNotSupportTextToSpeech",
  "Unable to play speech with the selected voice.": "tools.textToVoice.errors.unableToPlaySpeechWithTheSelectedVoice",
  "Only ChlatWork API audio can be downloaded.": "tools.textToVoice.errors.onlyChlatWorkAPIAudioCanBeDownloaded",
  "Unable to generate audio.": "tools.textToVoice.errors.unableToGenerateAudio",
  "This voice is temporarily unavailable. Please choose another voice or use Auto.": "tools.textToVoice.errors.thisVoiceIsTemporarilyUnavailablePleaseChooseAnotherVoiceOrUseAuto"
};

const CRON_NAME_KEYS: Record<string, string> = {
  "Minute": "tools.cron.names.minuteLabel",
  "Hour": "tools.cron.names.hourLabel",
  "Day of month": "tools.cron.names.dayOfMonthLabel",
  "Month": "tools.cron.names.monthLabel",
  "Day of week": "tools.cron.names.dayOfWeekLabel",
  "minute": "tools.cron.names.minute",
  "hour": "tools.cron.names.hour",
  "day of month": "tools.cron.names.dayOfMonth",
  "month": "tools.cron.names.month",
  "day of week": "tools.cron.names.dayOfWeek",
  "jan": "tools.cron.names.jan",
  "feb": "tools.cron.names.feb",
  "mar": "tools.cron.names.mar",
  "apr": "tools.cron.names.apr",
  "may": "tools.cron.names.may",
  "jun": "tools.cron.names.jun",
  "jul": "tools.cron.names.jul",
  "aug": "tools.cron.names.aug",
  "sep": "tools.cron.names.sep",
  "oct": "tools.cron.names.oct",
  "nov": "tools.cron.names.nov",
  "dec": "tools.cron.names.dec",
  "sun": "tools.cron.names.sun",
  "mon": "tools.cron.names.mon",
  "tue": "tools.cron.names.tue",
  "wed": "tools.cron.names.wed",
  "thu": "tools.cron.names.thu",
  "fri": "tools.cron.names.fri",
  "sat": "tools.cron.names.sat"
};

function tr(khmer: boolean, key: string, params?: Record<string, unknown>): string {
  return translateMessage(khmer ? "km" : "en", key, params);
}

export function localizeToolError(message: string, khmer: boolean): string {
  if (!message || /[\u1780-\u17ff]/.test(message)) return message;
  if (Object.hasOwn(TOOL_ERROR_KEYS, message)) return tr(khmer, TOOL_ERROR_KEYS[message]);
  // Preserve provider/browser diagnostics in English; the Khmer UI gets actionable catalog copy.
  if (!khmer) return message;
  const line = message.match(/^Line (\d+): (.+)$/);
  if (line) return tr(khmer, "tools.common.errors.line", { line: line[1], message: localizeToolError(line[2], khmer) });
  const range = message.match(/^Invalid page range: (.+)$/);
  if (range) return tr(khmer, "tools.pdf.errors.invalidRange", { range: range[1] });
  const outside = message.match(/^Page(?: range)? (.+) is outside (1-\d+)\.$/);
  if (outside) return tr(khmer, "tools.pdf.errors.outsideRange", { page: outside[1], range: outside[2] });
  const maxFiles = message.match(/(?:You can add up to|Only) (\d+) /);
  if (maxFiles) return tr(khmer, "tools.common.errors.maxFiles", { count: maxFiles[1] });
  const supported = message.match(/^Some files were skipped\. Supported types: (.+)$/);
  if (supported) return tr(khmer, "tools.common.errors.supportedTypes", { types: supported[1] });
  const fileLimit = message.match(/(?:must be|Choose a file) ([\d.]+\s*(?:KB|MB|GB))/);
  if (fileLimit) return tr(khmer, "tools.common.errors.fileLimit", { limit: fileLimit[1] });
  const pageLimit = message.match(/more than (\d+) pages/);
  if (pageLimit) return tr(khmer, "tools.pdf.errors.maxPages", { count: pageLimit[1] });
  if (/JSON|Unexpected token|Expected property|Unterminated string/i.test(message)) return tr(khmer, "tools.common.errors.invalidJson");
  if (/cron|Invalid (minute|hour|month|day of)/i.test(message)) return tr(khmer, "tools.cron.errors.invalidExpression");
  if (/regular expression|regex/i.test(message)) return tr(khmer, "tools.regex.errors.invalidExpression");
  if (/base64|encoded|encoding|URI|URL text|input/i.test(message)) return tr(khmer, "tools.common.errors.invalidInput");
  if (/\b(?:timezone|timestamp|date)\b/i.test(message)) return tr(khmer, "tools.common.errors.invalidDate");
  if (/password|character set/i.test(message)) return tr(khmer, "tools.password.errors.generation");
  if (/JWT/i.test(message)) return tr(khmer, "tools.jwt.errors.decode");
  if (/QR|barcode/i.test(message)) return tr(khmer, "tools.codes.errors.generation");
  if (/file|image|PDF|page|canvas/i.test(message)) return tr(khmer, "tools.common.errors.fileProcessing");
  return tr(khmer, "tools.common.errors.operation");
}

export function localizePdfOption(label: string, khmer: boolean): string {
  return Object.hasOwn(PDF_OPTION_KEYS, label) ? tr(khmer, PDF_OPTION_KEYS[label]) : label;
}

export function localizeCronLine(line: string, khmer: boolean): string {
  const name = (value: string) => Object.hasOwn(CRON_NAME_KEYS, value) ? tr(khmer, CRON_NAME_KEYS[value]) : value;
  return line
    .replace(/every (\d+) ([a-z ]+)s\b/g, (_, count: string, unit: string) => tr(khmer, "tools.cron.everyCount", { count, unit: name(unit) }))
    .replace(/every ([a-z ]+)/g, (_, unit: string) => tr(khmer, "tools.cron.every", { unit: name(unit) }))
    .replace(/\bat\b/g, tr(khmer, "tools.cron.at"))
    .replace(/Minute|Hour|Day of month|Month|Day of week|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|sun|mon|tue|wed|thu|fri|sat)\b/g, name);
}

/** Source errors stay in state, so changing the locale also updates an existing alert. */
export function localizeSpeechError(message: string, khmer: boolean): string {
  if (!message || /[\u1780-\u17ff]/.test(message)) return message;
  if (Object.hasOwn(SPEECH_ERROR_KEYS, message)) return tr(khmer, SPEECH_ERROR_KEYS[message]);
  const duration = message.match(/^Text is estimated at ([\d.]+)s\. Limit is ([\d.]+)s for this voice\.$/);
  if (duration) return tr(khmer, "tools.textToVoice.errors.duration", { seconds: duration[1], limit: duration[2] });
  const audio = message.match(/^Unable to (prepare|play|load|resume|download) (Khmer|English) audio\.(.*)$/);
  if (audio) return tr(khmer, `tools.textToVoice.errors.${audio[1]}Audio${audio[3] ? "Retry" : ""}`, {
    language: tr(khmer, audio[2] === "Khmer" ? "tools.textToVoice.languageLabels.khmer" : "tools.textToVoice.languageLabels.english"),
  });
  return localizeToolError(message, khmer);
}

/** Compression can report successful savings, skipped items, or a processing failure. */
export function localizeImageMessage(message: string, khmer: boolean): string {
  if (!message || /[\u1780-\u17ff]/.test(message)) return message;
  const saved = message.match(/^Saved (.+)\.$/);
  if (saved) return tr(khmer, "tools.imageCompress.messages.saved", { size: saved[1] });
  const bigger = message.match(/^Skipped because output would be ([\d.]+)% bigger\./);
  if (bigger) return tr(khmer, "tools.imageCompress.messages.bigger", { percent: bigger[1] });
  const added = message.match(/^Added (\d+) images?\. Batch size is limited to (\d+) images\.$/);
  if (added) return tr(khmer, "tools.imageCompress.messages.added", { count: added[1], limit: added[2], pluralSuffix: added[1] === "1" ? "" : "s" });
  const skipped = message.match(/^(\d+) images? skipped because the output was bigger or failed to export\.$/);
  if (skipped) return tr(khmer, "tools.imageCompress.messages.skipped", { count: skipped[1], pluralSuffix: skipped[1] === "1" ? "" : "s" });
  if (message === "Batch limit reached. Remove images before adding more.") return tr(khmer, "tools.imageCompress.messages.full");
  if (message === "Those images are already in the batch.") return tr(khmer, "tools.imageCompress.messages.duplicates");
  if (message === "No images were compressed. Try lower quality or reduce max width.") return tr(khmer, "tools.imageCompress.messages.none");
  return localizeToolError(message, khmer);
}

export function localizeJwtDateLabel(value: string, khmer: boolean): string {
  return value.replace(/\((expired|active)\)$/, (_, status: string) => `(${tr(khmer, `tools.jwtDecoder.status.${status}`)})`);
}

export function localizePdfCompressionNote(value: string, khmer: boolean): string {
  if (!value) return value;
  const reduced = value.match(/^Reduced by (.+)\.$/);
  return reduced ? tr(khmer, "tools.pdf.messages.reduced", { size: reduced[1] }) : tr(khmer, "tools.pdf.messages.optimized");
}
