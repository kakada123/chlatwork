# Interface localization

Interface messages live in matching files under `app/locales/en/` and `app/locales/km/`. Components reference semantic keys through Vue I18n instead of embedding translation pairs.

```vue
<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";

const { t } = useAppI18n();
</script>

<template>
  <button>{{ t('tools.qr.generate') }}</button>
</template>
```

Add each new key to both locale files. Keep keys descriptive and stable. Put variables in named placeholders and provide them as parameters, for example `t('catalog.common.title', { name: toolName })`.

The catalog modules group shared screens, products, tools, developer commands, native utilities, and editorial/tool content. `app/lib/i18n.ts` delegates translation to Vue I18n using fixed-locale composers. Message functions preserve literal `@`, pipes, braces, and technical examples without evaluating message text as code. Vue templates escape translated text normally; do not use `v-html` for user-provided parameters.

`useAppI18n()` follows the existing `app-locale` preference. A public receiver with an explicit language can pass a reactive override, such as `useAppI18n(computed(() => props.locale))`. Pure utilities call `translateMessage(locale, key, parameters)` directly. They must never mutate a shared locale for an individual request.

Dynamic-label adapters map known canonical values or provider error messages to semantic keys. Preserve API values, executable commands, favorite IDs, URLs, authored messages, and custom category labels. Expense summaries include optional preset-category provenance so a custom category named “Food” stays authored text.

The Moment editor and manager follow the main language switch. Public Moment and invitation links retain their explicit `lang` choice. Existing names, messages, and other saved content are not rewritten by switching the interface language.

The ChlatWork apps section remains inside the shared content container. Cards stretch to fill each row. Mobile starts collapsed and exposes a button with `aria-expanded`; desktop keeps the list visible through responsive CSS.

Run the source and catalog checks after changing messages:

```sh
npm run audit:i18n
npm run audit:khmer
npm test
```

`audit:i18n` checks both-language key coverage and statically knowable named parameters in application source. `audit:khmer` reports raw static-copy candidates for review; brands, code examples, format identifiers, and authored personal content may intentionally remain original. Neither command reads environment or credential files.
