export type PdfPageSize = "A4" | "Letter" | "Auto";
export type PdfOrientation = "portrait" | "landscape";
export type PdfMargin = "none" | "small" | "medium";
export type PdfImagesPerPage = 1 | 2 | 4;

export type ImageItem = {
  id: string;
  file: File;
  name: string;
  sizeLabel: string;
  previewUrl: string;
};

export type PdfPage = {
  id: string;
  images: ImageItem[];
};

export type PdfImageData = {
  dataUrl: string;
  width: number;
  height: number;
};

export const PAGE_SIZE_OPTIONS: Array<{ value: PdfPageSize; label: string }> = [
  { value: "A4", label: "A4" },
  { value: "Letter", label: "Letter" },
  { value: "Auto", label: "Auto / Fit image" },
];

export const ORIENTATION_OPTIONS: Array<{ value: PdfOrientation; label: string }> = [
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
];

export const MARGIN_OPTIONS: Array<{ value: PdfMargin; label: string }> = [
  { value: "none", label: "None" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
];

export const IMAGES_PER_PAGE_OPTIONS: Array<{ value: PdfImagesPerPage; label: string }> = [
  { value: 1, label: "1 image per page" },
  { value: 2, label: "2 images per page" },
  { value: 4, label: "4 images per page" },
];

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
]);

const HEIC_IMAGE_TYPES = new Set(["image/heic", "image/heif"]);
const PDF_GAP = 12;
const PT_PER_PIXEL = 72 / 96;

export function useImageToPdfTool() {
  const pages = ref<PdfPage[]>([]);
  const pageSize = ref<PdfPageSize>("A4");
  const orientation = ref<PdfOrientation>("portrait");
  const margin = ref<PdfMargin>("small");
  const imagesPerPage = ref<PdfImagesPerPage>(1);
  const uploadKey = ref(0);
  const isPreparingFiles = ref(false);
  const isSorting = ref(false);
  const isGenerating = ref(false);
  const error = ref("");

  const flatImages = computed(() => pages.value.flatMap((page) => page.images));
  const imageCount = computed(() => flatImages.value.length);
  const pageCount = computed(() => pages.value.length);
  const canConvert = computed(() => imageCount.value > 0 && !isGenerating.value);

  const pageSizeLabel = computed(
    () => PAGE_SIZE_OPTIONS.find((option) => option.value === pageSize.value)?.label ?? "A4",
  );
  const orientationLabel = computed(
    () =>
      ORIENTATION_OPTIONS.find((option) => option.value === orientation.value)?.label ??
      "Portrait",
  );
  const marginLabel = computed(
    () => MARGIN_OPTIONS.find((option) => option.value === margin.value)?.label ?? "Small",
  );
  const imagesPerPageLabel = computed(
    () =>
      IMAGES_PER_PAGE_OPTIONS.find((option) => option.value === imagesPerPage.value)?.label ??
      "1 image per page",
  );

  const pageGridClass = computed(() => {
    if (imagesPerPage.value === 1) {
      return "grid-cols-1";
    }

    if (imagesPerPage.value === 2) {
      return orientation.value === "portrait"
        ? "grid-cols-1 grid-rows-2"
        : "grid-cols-2 grid-rows-1";
    }

    return "grid-cols-2 grid-rows-2";
  });

  const pageAspectStyle = computed(() => {
    if (pageSize.value === "Letter") {
      return {
        aspectRatio: orientation.value === "portrait" ? "8.5 / 11" : "11 / 8.5",
      };
    }

    return {
      aspectRatio: orientation.value === "portrait" ? "210 / 297" : "297 / 210",
    };
  });

  const dragGroup = {
    name: "pdf-images",
    pull: true,
    put: true,
  };

  function formatFileSize(bytes: number) {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function createImageId() {
    return (
      globalThis.crypto?.randomUUID?.() ??
      `image-${Date.now()}-${Math.random().toString(16).slice(2)}`
    );
  }

  function createPageId() {
    return `page-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function isSupportedImage(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    return SUPPORTED_IMAGE_TYPES.has(file.type) || SUPPORTED_IMAGE_EXTENSIONS.has(extension);
  }

  function createImageItem(file: File): ImageItem {
    return {
      id: createImageId(),
      file,
      name: file.name,
      sizeLabel: formatFileSize(file.size),
      previewUrl: URL.createObjectURL(file),
    };
  }

  function revokeImagePreview(image: ImageItem) {
    URL.revokeObjectURL(image.previewUrl);
  }

  function flattenPages() {
    return pages.value.flatMap((page) => page.images);
  }

  function chunkImages(items: ImageItem[], perPage: PdfImagesPerPage): PdfPage[] {
    const nextPages: PdfPage[] = [];

    for (let index = 0; index < items.length; index += perPage) {
      nextPages.push({
        id: createPageId(),
        images: items.slice(index, index + perPage),
      });
    }

    return nextPages;
  }

  function regroupPages(items = flattenPages()) {
    // Keep the preview and export order in sync whenever the layout changes.
    pages.value = chunkImages(items, imagesPerPage.value);
  }

  async function normalizeUploadFile(file: File): Promise<File | null> {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

    if (!SUPPORTED_IMAGE_TYPES.has(file.type) && !SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
      return null;
    }

    if (HEIC_IMAGE_TYPES.has(file.type) || extension === "heic" || extension === "heif") {
      const heic2any = (await import("heic2any")).default as any;
      const converted = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.92,
      });

      const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
      const baseName = file.name.replace(/\.(heic|heif)$/i, "");

      return new File([jpegBlob], `${baseName}.jpg`, {
        type: "image/jpeg",
        lastModified: file.lastModified,
      });
    }

    return file;
  }

  async function addFiles(files: File[]) {
    const hasHeicFile = files.some((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      return HEIC_IMAGE_TYPES.has(file.type) || extension === "heic" || extension === "heif";
    });

    isPreparingFiles.value = hasHeicFile;

    const acceptedFiles = await Promise.all(files.map((file) => normalizeUploadFile(file)));
    const normalizedFiles = acceptedFiles.filter((file): file is File => Boolean(file));
    const rejectedFiles = files.filter((file) => !isSupportedImage(file));

    if (rejectedFiles.length > 0) {
      error.value = `Unsupported file type: ${rejectedFiles[0].name}. Use JPG, PNG, WebP, or HEIC.`;
    } else {
      error.value = "";
    }

    if (!normalizedFiles.length) {
      isPreparingFiles.value = false;
      return;
    }

    const nextImages = normalizedFiles.map((file) => createImageItem(file));
    regroupPages([...flattenPages(), ...nextImages]);
    isPreparingFiles.value = false;
  }

  function getGlobalImageIndex(pageIndex: number, imageIndex: number) {
    return (
      pages.value
        .slice(0, pageIndex)
        .reduce((sum, page) => sum + page.images.length, 0) + imageIndex
    );
  }

  function removeImage(pageIndex: number, imageIndex: number) {
    const nextImages = flattenPages();
    const globalIndex = getGlobalImageIndex(pageIndex, imageIndex);
    const [removed] = nextImages.splice(globalIndex, 1);

    if (removed) {
      revokeImagePreview(removed);
    }

    regroupPages(nextImages);
  }

  function moveImage(pageIndex: number, imageIndex: number, direction: -1 | 1) {
    const nextImages = flattenPages();
    const globalIndex = getGlobalImageIndex(pageIndex, imageIndex);
    const targetIndex = globalIndex + direction;

    if (targetIndex < 0 || targetIndex >= nextImages.length) {
      return;
    }

    [nextImages[globalIndex], nextImages[targetIndex]] = [
      nextImages[targetIndex],
      nextImages[globalIndex],
    ];

    regroupPages(nextImages);
  }

  function isFirstImage(pageIndex: number, imageIndex: number) {
    return getGlobalImageIndex(pageIndex, imageIndex) === 0;
  }

  function isLastImage(pageIndex: number, imageIndex: number) {
    return getGlobalImageIndex(pageIndex, imageIndex) === imageCount.value - 1;
  }

  function emptySlotCount(usedImages: number) {
    return Math.max(imagesPerPage.value - usedImages, 0);
  }

  function clearAll() {
    for (const image of flattenPages()) {
      revokeImagePreview(image);
    }

    pages.value = [];
    error.value = "";
    isPreparingFiles.value = false;
    pageSize.value = "A4";
    orientation.value = "portrait";
    margin.value = "small";
    imagesPerPage.value = 1;
    uploadKey.value += 1;
  }

  function buildOutputFileName() {
    const stamp = new Date().toISOString().slice(0, 10);
    return `chlatwork-image-to-pdf-${stamp}.pdf`;
  }

  async function loadImageFromFile(file: File) {
    const url = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
        element.src = url;
      });

      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function fileToJpegDataUrl(file: File): Promise<PdfImageData> {
    const image = await loadImageFromFile(file);
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

    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.92),
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }

  function getLayoutShape() {
    if (imagesPerPage.value === 1) {
      return { columns: 1, rows: 1 };
    }

    if (imagesPerPage.value === 2) {
      return orientation.value === "portrait"
        ? { columns: 1, rows: 2 }
        : { columns: 2, rows: 1 };
    }

    return { columns: 2, rows: 2 };
  }

  function getMarginValue() {
    if (margin.value === "medium") {
      return 40;
    }

    if (margin.value === "small") {
      return 24;
    }

    return 0;
  }

  function getPageBox(size: PdfPageSize) {
    if (size === "A4") {
      return { width: 595.28, height: 841.89 };
    }

    if (size === "Letter") {
      return { width: 612, height: 792 };
    }

    return null;
  }

  function getCellOffset(values: number[], index: number, gap: number) {
    return values.slice(0, index).reduce((sum, value) => sum + value, 0) + gap * index;
  }

  function resolvePageGeometry(pageImages: PdfImageData[]) {
    const { columns, rows } = getLayoutShape();
    const gap = PDF_GAP;
    const marginSize = getMarginValue();
    const baseBox = getPageBox(pageSize.value);

    if (baseBox) {
      const width = orientation.value === "portrait" ? baseBox.width : baseBox.height;
      const height = orientation.value === "portrait" ? baseBox.height : baseBox.width;
      const innerWidth = Math.max(width - marginSize * 2 - gap * (columns - 1), 1);
      const innerHeight = Math.max(height - marginSize * 2 - gap * (rows - 1), 1);
      const cellWidths = Array.from({ length: columns }, () => innerWidth / columns);
      const cellHeights = Array.from({ length: rows }, () => innerHeight / rows);

      return {
        width,
        height,
        columns,
        rows,
        gap,
        marginSize,
        cellWidths,
        cellHeights,
      };
    }

    const cellWidths = Array.from({ length: columns }, () => 0);
    const cellHeights = Array.from({ length: rows }, () => 0);

    for (const [index, image] of pageImages.entries()) {
      const row = Math.floor(index / columns);
      const col = index % columns;

      cellWidths[col] = Math.max(cellWidths[col], image.width * PT_PER_PIXEL);
      cellHeights[row] = Math.max(cellHeights[row], image.height * PT_PER_PIXEL);
    }

    const fallbackCellWidth = Math.max(...cellWidths, ...(pageImages.length ? [240] : [320]));
    const fallbackCellHeight = Math.max(...cellHeights, ...(pageImages.length ? [240] : [320]));

    for (let index = 0; index < columns; index += 1) {
      if (cellWidths[index] <= 0) {
        cellWidths[index] = fallbackCellWidth;
      }
    }

    for (let index = 0; index < rows; index += 1) {
      if (cellHeights[index] <= 0) {
        cellHeights[index] = fallbackCellHeight;
      }
    }

    return {
      width:
        cellWidths.reduce((sum, value) => sum + value, 0) + gap * (columns - 1) + marginSize * 2,
      height:
        cellHeights.reduce((sum, value) => sum + value, 0) +
        gap * (rows - 1) +
        marginSize * 2,
      columns,
      rows,
      gap,
      marginSize,
      cellWidths,
      cellHeights,
    };
  }

  function handlePageDragEnd() {
    isSorting.value = false;
    regroupPages();
  }

  async function convertToPdf() {
    if (!imageCount.value || isGenerating.value) {
      return;
    }

    isGenerating.value = true;
    error.value = "";

    try {
      const { jsPDF } = await import("jspdf");
      const exportPages = pages.value.map((page) => page.images);
      let doc: InstanceType<typeof jsPDF> | null = null;

      for (const pageImages of exportPages) {
        const renderedImages = await Promise.all(
          pageImages.map(async (imageItem) => ({
            ...imageItem,
            ...(await fileToJpegDataUrl(imageItem.file)),
          })),
        );
        const geometry = resolvePageGeometry(renderedImages);
        const orientationValue = geometry.width >= geometry.height ? "landscape" : "portrait";

        if (!doc) {
          doc = new jsPDF({
            unit: "pt",
            format: [geometry.width, geometry.height],
            orientation: orientationValue,
          });
        } else {
          doc.addPage([geometry.width, geometry.height], orientationValue);
        }

        for (const [index, image] of renderedImages.entries()) {
          const row = Math.floor(index / geometry.columns);
          const col = index % geometry.columns;
          const cellWidth = geometry.cellWidths[col];
          const cellHeight = geometry.cellHeights[row];
          const scale = Math.min(cellWidth / image.width, cellHeight / image.height);
          const renderWidth = image.width * scale;
          const renderHeight = image.height * scale;
          const cellX = geometry.marginSize + getCellOffset(geometry.cellWidths, col, geometry.gap);
          const cellY = geometry.marginSize + getCellOffset(geometry.cellHeights, row, geometry.gap);
          const x = cellX + (cellWidth - renderWidth) / 2;
          const y = cellY + (cellHeight - renderHeight) / 2;

          doc.addImage(image.dataUrl, "JPEG", x, y, renderWidth, renderHeight);
        }
      }

      doc?.save(buildOutputFileName());
    } catch (caught: any) {
      error.value = caught?.message ?? "Unable to generate the PDF. Please try again.";
    } finally {
      isGenerating.value = false;
    }
  }

  return {
    pages,
    pageSize,
    orientation,
    margin,
    imagesPerPage,
    uploadKey,
    isPreparingFiles,
    isSorting,
    isGenerating,
    error,
    imageCount,
    pageCount,
    canConvert,
    pageSizeLabel,
    orientationLabel,
    marginLabel,
    imagesPerPageLabel,
    pageGridClass,
    pageAspectStyle,
    dragGroup,
    addFiles,
    removeImage,
    moveImage,
    isFirstImage,
    isLastImage,
    emptySlotCount,
    clearAll,
    convertToPdf,
    handlePageDragEnd,
  };
}
