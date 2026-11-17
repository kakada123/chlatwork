# Compact PrepHub overview

The user selected: “Compact overview, actions at the top, full-width details.”

Keep Add and the existing status action above the overview, retaining their sticky behavior. Use a single-column overview with the existing title, badge, three-line description preview, and a visible date summary. Expanded descriptions use the full card width. Dates and goals open together below it at every screen size, with the complete goal visible after one expansion.

## Approaches

- Selected: compact overview and full-width details. Long goals no longer create a tall sidebar and empty adjacent space.
- Alternative: keep the sidebar and move only the actions. This preserves the current arrangement but leaves long text narrow.

## Constraints

Preserve stored text, formatting, dates, time zones, translations, status mutations, and shared-page read-only behavior. Keep controls keyboard accessible and avoid new dependencies or backend changes.

Implementation choices: reuse the current details toggle and description expansion. Lay dates out horizontally on larger screens and vertically on small screens. Remove the redundant goal expansion inside the already collapsible details.
