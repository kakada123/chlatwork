<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">
        {{ t("tools.jwtDecoder.jwtDecoder") }}
      </h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        {{ t("tools.jwtDecoder.decodeJwtHeaderAndPayloadClaimsLocallySignatureVerification") }}
      </p>
    </div>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="space-y-3">
        <label class="block text-sm font-semibold text-gray-900">
          {{ t("tools.jwtDecoder.jwtToken") }}
        </label>
        <textarea
          v-model="token"
          class="h-36 w-full resize-y rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        />

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
            @click="decode"
          >
            {{ t("tools.jwtDecoder.decode") }}
          </button>
          <button
            type="button"
            class="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            @click="clearAll"
          >
            {{ t("tools.jwtDecoder.clear") }}
          </button>
        </div>

        <div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {{ t("tools.jwtDecoder.warning") }}
        </div>

        <p v-if="decoded.error" class="text-sm text-red-600">{{ localizeToolError(decoded.error, isKhmer) }}</p>
      </div>
    </section>

    <section v-if="decoded.header || decoded.payload" class="grid gap-4 lg:grid-cols-2">
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="mb-2 flex items-center justify-between gap-3">
          <h2 class="text-sm font-semibold text-gray-900">{{ t("tools.jwtDecoder.header") }}</h2>
          <CopyButton :text="decoded.header" :label="t(&quot;tools.jwtDecoder.copy&quot;)" />
        </div>
        <pre class="max-h-96 overflow-auto rounded-lg bg-gray-50 p-3 font-mono text-sm">{{
          decoded.header
        }}</pre>
      </div>

      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="mb-2 flex items-center justify-between gap-3">
          <h2 class="text-sm font-semibold text-gray-900">{{ t("tools.jwtDecoder.payload") }}</h2>
          <CopyButton :text="decoded.payload" :label="t(&quot;tools.jwtDecoder.copy&quot;)" />
        </div>
        <pre class="max-h-96 overflow-auto rounded-lg bg-gray-50 p-3 font-mono text-sm">{{
          decoded.payload
        }}</pre>
      </div>
    </section>

    <section
      v-if="decoded.expiresAt || decoded.issuedAt || decoded.notBefore || decoded.signature"
      class="rounded-xl border bg-white p-4 shadow-sm"
    >
      <h2 class="mb-3 text-sm font-semibold text-gray-900">
        {{ t("tools.jwtDecoder.tokenDetails") }}
      </h2>
      <dl class="grid gap-3 text-sm md:grid-cols-2">
        <div v-if="decoded.expiresAt" class="rounded-lg bg-gray-50 p-3">
          <dt class="font-semibold text-gray-700">
            {{ t("tools.jwtDecoder.expires") }}
          </dt>
          <dd class="mt-1 break-words text-gray-600">{{ localizeJwtDateLabel(decoded.expiresAt, isKhmer) }}</dd>
        </div>
        <div v-if="decoded.issuedAt" class="rounded-lg bg-gray-50 p-3">
          <dt class="font-semibold text-gray-700">
            {{ t("tools.jwtDecoder.issuedAt") }}
          </dt>
          <dd class="mt-1 break-words text-gray-600">{{ localizeJwtDateLabel(decoded.issuedAt, isKhmer) }}</dd>
        </div>
        <div v-if="decoded.notBefore" class="rounded-lg bg-gray-50 p-3">
          <dt class="font-semibold text-gray-700">
            {{ t("tools.jwtDecoder.notBefore") }}
          </dt>
          <dd class="mt-1 break-words text-gray-600">{{ localizeJwtDateLabel(decoded.notBefore, isKhmer) }}</dd>
        </div>
        <div v-if="decoded.signature" class="rounded-lg bg-gray-50 p-3">
          <dt class="font-semibold text-gray-700">
            {{ t("tools.jwtDecoder.signatureSegment") }}
          </dt>
          <dd class="mt-1 break-words font-mono text-gray-600">{{ decoded.signature }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { localizeToolError, localizeJwtDateLabel } from "~/data/tool-ui-km";
import { useLanguage } from "~/composables/useLanguage";
import CopyButton from "~/components/developer-tools/CopyButton.vue";
import { decodeJwt, type JwtDecodeResult } from "~/lib/developer-tools";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();




useSeoMeta({
  title: () => t("tools.jwtDecoder.metaTitle"),
  description: () => t("tools.jwtDecoder.metaDescription"),
  ogTitle: () => t("tools.jwtDecoder.metaOgTitle"),
  ogDescription: () => t("tools.jwtDecoder.metaOgDescription"),
});

const token = ref("");
const decoded = reactive<JwtDecodeResult>(decodeJwt(""));

function decode() {
  Object.assign(decoded, decodeJwt(token.value));
}

function clearAll() {
  token.value = "";
  Object.assign(decoded, decodeJwt(""));
}
</script>
