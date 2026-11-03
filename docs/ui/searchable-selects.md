# Searchable selects

Use `ModernSelect` for dropdown fields. Nuxt registers the root component automatically.

```vue
<label for="currency">Currency</label>
<ModernSelect id="currency" v-model="currency" name="currency" class="w-full">
  <option value="USD">USD</option>
  <option value="KHR">KHR</option>
</ModernSelect>
```

The option slot supports dynamic lists, fragments, disabled options, and optgroups. Numeric `:value` bindings retain their type; `v-model.number` and `v-model.trim` are supported. Existing `:value` plus `@change` bindings work, and change handlers receive the underlying native `HTMLSelectElement` as their event target.

`disabled`, `required`, `name`, and `form` remain native form attributes. IDs and labels identify the visible trigger. Provide an explicit `aria-label` when a field has no visible label. The component also derives a name from wrapping labels after mounting.

The wrapper accepts layout classes for width, height, margins, and flex/grid placement. The shared component owns borders, padding, typography, focus states, and light/dark colors. Use `placeholder` and `search-placeholder` to customize empty/search copy.

The search input supports Arrow Up/Down, Enter, Escape, and normal Tab navigation. Active rows scroll into view. Popovers remain in the control's DOM subtree for dialog focus traps, while the browser top layer avoids clipping by scroll containers. Older browsers without the Popover API use a fixed-position fallback.

The migration covers 58 native selects across 32 Vue files: admin controls, Account Link, bot navigation, food discovery, PDF/image settings, scanners, calculators, expense summaries, date-picker month/year controls, and other tools. The underlying native select in `ModernSelect.vue` is intentional; it maintains typed selection, validation, and submission semantics.

Add Expense retains its approved category layout and now exposes category search on mobile as well.

Tests: `tests/modern-select-options.test.ts`, `tests/modern-select.test.ts`, and the existing food, JekLuy, expense-summary, and privacy rendering tests.
