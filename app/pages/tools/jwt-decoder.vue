<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">JWT Decoder</h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        Decode JWT header and payload claims locally. Signature verification is not performed.
      </p>
    </div>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="space-y-3">
        <label class="block text-sm font-semibold text-gray-900">JWT token</label>
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
            Decode
          </button>
          <button
            type="button"
            class="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            @click="clearAll"
          >
            Clear
          </button>
        </div>

        <div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {{ decoded.warning }}
        </div>

        <p v-if="decoded.error" class="text-sm text-red-600">{{ decoded.error }}</p>
      </div>
    </section>

    <section v-if="decoded.header || decoded.payload" class="grid gap-4 lg:grid-cols-2">
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="mb-2 flex items-center justify-between gap-3">
          <h2 class="text-sm font-semibold text-gray-900">Header</h2>
          <CopyButton :text="decoded.header" label="Copy" />
        </div>
        <pre class="max-h-96 overflow-auto rounded-lg bg-gray-50 p-3 font-mono text-sm">{{
          decoded.header
        }}</pre>
      </div>

      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="mb-2 flex items-center justify-between gap-3">
          <h2 class="text-sm font-semibold text-gray-900">Payload</h2>
          <CopyButton :text="decoded.payload" label="Copy" />
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
      <h2 class="mb-3 text-sm font-semibold text-gray-900">Token details</h2>
      <dl class="grid gap-3 text-sm md:grid-cols-2">
        <div v-if="decoded.expiresAt" class="rounded-lg bg-gray-50 p-3">
          <dt class="font-semibold text-gray-700">Expires</dt>
          <dd class="mt-1 break-words text-gray-600">{{ decoded.expiresAt }}</dd>
        </div>
        <div v-if="decoded.issuedAt" class="rounded-lg bg-gray-50 p-3">
          <dt class="font-semibold text-gray-700">Issued at</dt>
          <dd class="mt-1 break-words text-gray-600">{{ decoded.issuedAt }}</dd>
        </div>
        <div v-if="decoded.notBefore" class="rounded-lg bg-gray-50 p-3">
          <dt class="font-semibold text-gray-700">Not before</dt>
          <dd class="mt-1 break-words text-gray-600">{{ decoded.notBefore }}</dd>
        </div>
        <div v-if="decoded.signature" class="rounded-lg bg-gray-50 p-3">
          <dt class="font-semibold text-gray-700">Signature segment</dt>
          <dd class="mt-1 break-words font-mono text-gray-600">{{ decoded.signature }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<script setup lang="ts">
import CopyButton from "~/components/developer-tools/CopyButton.vue";
import { decodeJwt, type JwtDecodeResult } from "~/lib/developer-tools";

useSeoMeta({
  title: "JWT Decoder - ChlatWork",
  description:
    "Decode JWT header and payload claims locally with expiry, issued-at, and not-before details.",
  ogTitle: "JWT Decoder - ChlatWork",
  ogDescription: "Decode JWTs locally. Signature verification is not performed.",
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
