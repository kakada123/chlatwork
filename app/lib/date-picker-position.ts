type Anchor = { left: number; top: number; bottom: number };
type Size = { width: number; height: number };

/** Keep the floating calendar visible even inside a scrollable dialog. */
export function getDatePickerPosition(
  anchor: Anchor,
  popup: Size,
  viewport: Size,
  placement: "top" | "bottom",
  mobile = false,
) {
  const margin = 12;
  const gap = 8;
  const maxHeight = Math.max(0, viewport.height - margin * 2);
  const height = Math.min(popup.height, maxHeight);
  const above = anchor.top - gap - height;
  const below = anchor.bottom + gap;
  const fitsAbove = above >= margin;
  const fitsBelow = below + height <= viewport.height - margin;
  const preferAbove = placement === "top"
    ? fitsAbove || !fitsBelow
    : !fitsBelow && fitsAbove;
  const top = mobile ? viewport.height - margin - height : preferAbove ? above : below;

  return {
    top: Math.max(margin, Math.min(top, viewport.height - margin - height)),
    left: mobile ? margin : Math.max(margin, Math.min(anchor.left, viewport.width - margin - popup.width)),
    maxHeight,
  };
}
