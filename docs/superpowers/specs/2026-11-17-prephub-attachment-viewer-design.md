# PrepHub attachments

The user requested multiple-image uploads and an attractive image/PDF viewer inside a dialog, with previous/next navigation and selectable thumbnails instead of new tabs.

Use a shared multiple-file picker in capture and section uploads. Validate the complete selection before sending it. Queue uploads through the existing single-file authenticated endpoint, remove successful files from the pending queue, and retain failed/unattempted files for retry. Preserve the existing 5 MiB file and 20 attachments per subject limits, allowed formats, ownership checks, and server validation.

Use one large accessible native dialog for the selected attachment. Show fit-to-view images, canvas-rendered PDF pages using the existing PDF.js dependency, file previous/next controls, PDF page controls, download, and a bottom thumbnail strip. Browse attachments across the subject's attachment sections. Unsupported document formats remain downloadable and show a clear preview-unavailable state.

Use the current private or public capability resource URL without persistent blob URL caching. Preserve read-only sharing, abort stale fetches/renders, destroy PDF workers, and clear content when closing or changing subject/account. Keep public pages free of upload/edit controls. No backend, database, dependency, or deployment changes are needed.

Native PDF embedding was considered; canvas rendering gives consistent in-dialog page controls without depending on a browser PDF plugin or weakening response security headers.
