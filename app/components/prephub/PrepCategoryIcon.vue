<script setup lang="ts">
import {
  FlaskConical,
  Users,
  Layers,
  CalendarDays,
  Video,
  Plane,
  UserRound,
  MoreHorizontal,
} from "lucide-vue-next";
const props = defineProps<{ category: string }>();
const icons: Record<string, unknown> = {
  RESEARCH: FlaskConical,
  MEETING: Users,
  PROJECT: Layers,
  EVENT: CalendarDays,
  VIDEO: Video,
  TRAVEL: Plane,
  PERSONAL: UserRound,
  OTHER: MoreHorizontal,
};
</script>
<template>
  <component :is="icons[props.category] || Layers" aria-hidden="true" />
</template>
