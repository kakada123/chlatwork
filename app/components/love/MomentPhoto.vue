<script setup lang="ts">
const props = defineProps<{
  src: string;
  alt: string;
}>();

const displaySrc = ref(props.src);
const isConverting = ref(false);
const hasFailed = ref(false);
let objectUrl: string | null = null;

const convertHeic = async () => {
  if (isConverting.value || hasFailed.value || !props.src.toLowerCase().endsWith(".heic")) {
    hasFailed.value = true;
    return;
  }

  isConverting.value = true;

  try {
    const [heicModule, response] = await Promise.all([
      import("heic2any"),
      fetch(props.src),
    ]);

    if (!response.ok) throw new Error("Could not load moment photo");

    const heic2any = heicModule.default as typeof heicModule.default;
    const converted = await heic2any({
      blob: await response.blob(),
      toType: "image/jpeg",
      quality: 0.82,
    });
    const jpeg = Array.isArray(converted) ? converted[0] : converted;
    if (!jpeg) throw new Error("HEIC conversion returned no image");
    objectUrl = URL.createObjectURL(jpeg);
    displaySrc.value = objectUrl;
  } catch {
    hasFailed.value = true;
  } finally {
    isConverting.value = false;
  }
};

onBeforeUnmount(() => {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
});
</script>

<template>
  <div class="moment-photo">
    <img
      v-if="!hasFailed"
      :src="displaySrc"
      :alt="alt"
      loading="lazy"
      @error="convertHeic"
    />
    <span v-else role="img" :aria-label="alt">Photo memory ♥</span>
    <span v-if="isConverting" class="moment-photo-loading">Preparing photo…</span>
  </div>
</template>
