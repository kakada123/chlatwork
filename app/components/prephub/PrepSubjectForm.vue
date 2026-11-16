<script setup lang="ts">
import {
  PREP_CATEGORIES,
  inputToInstant,
  instantToInput,
  type PrepSubject,
} from "~/lib/prephub";
const props = defineProps<{
  subject?: PrepSubject;
  timeZone: string;
  busy?: boolean;
  submit: (body: Record<string, unknown>) => Promise<boolean>;
}>();
const emit = defineEmits<{ cancel: [] }>();
const { t } = useAppI18n();
const form = reactive({
  title: props.subject?.title ?? "",
  description: props.subject?.description ?? "",
  goal: props.subject?.goal ?? "",
  category: props.subject?.category ?? "OTHER",
  priority: props.subject?.priority ?? "NORMAL",
  eventAt: instantToInput(props.subject?.eventAt ?? null, props.timeZone),
  deadlineAt: instantToInput(props.subject?.deadlineAt ?? null, props.timeZone),
  template: "GENERAL",
});
const error = ref("");
async function save() {
  error.value = "";
  try {
    const { template, ...body } = form;
    await props.submit({
      ...body,
      eventAt: inputToInstant(form.eventAt, props.timeZone),
      deadlineAt: inputToInstant(form.deadlineAt, props.timeZone),
      ...(props.subject ? {} : { template }),
    });
  } catch (e) {
    error.value = (e as Error).message;
  }
}
</script>
<template>
  <form class="space-y-4" @submit.prevent="save">
    <label class="prep-label"
      >{{ t("prephub.title")
      }}<input
        v-model="form.title"
        class="prep-input"
        required
        maxlength="200"
        autofocus
    /></label>
    <label class="prep-label"
      >{{ t("prephub.description")
      }}<textarea
        v-model="form.description"
        class="prep-input"
        rows="2"
        maxlength="4000"
      />
    </label>
    <label class="prep-label"
      >{{ t("prephub.goal")
      }}<textarea
        v-model="form.goal"
        class="prep-input"
        rows="2"
        maxlength="4000"
      />
    </label>
    <div class="grid grid-cols-2 gap-3">
      <label class="prep-label"
        >{{ t("prephub.category")
        }}<select v-model="form.category" class="prep-input">
          <option v-for="c in PREP_CATEGORIES" :key="c" :value="c">
            {{ t(`prephub.${c}`) }}
          </option>
        </select></label
      ><label class="prep-label"
        >{{ t("prephub.priority")
        }}<select v-model="form.priority" class="prep-input">
          <option v-for="p in ['LOW', 'NORMAL', 'HIGH']" :key="p" :value="p">
            {{ t(`prephub.${p}`) }}
          </option>
        </select></label
      >
    </div>
    <p class="text-xs text-slate-500">
      {{ t("prephub.timezone", { timeZone }) }}
    </p>
    <label class="prep-label"
      >{{ t("prephub.eventAt")
      }}<input v-model="form.eventAt" type="datetime-local" class="prep-input"
    /></label>
    <label class="prep-label"
      >{{ t("prephub.deadlineAt")
      }}<input
        v-model="form.deadlineAt"
        type="datetime-local"
        class="prep-input"
    /></label>
    <label v-if="!subject" class="prep-label"
      >{{ t("prephub.template")
      }}<select v-model="form.template" class="prep-input">
        <option
          v-for="v in ['NONE', 'GENERAL', 'RESEARCH', 'MEETING', 'VIDEO']"
          :key="v"
          :value="v"
        >
          {{ t(`prephub.${v}`) }}
        </option>
      </select></label
    >
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
    <div class="flex justify-end gap-2">
      <button
        type="button"
        class="prep-button"
        :disabled="busy"
        @click="emit('cancel')"
      >
        {{ t("prephub.cancel") }}</button
      ><button
        type="submit"
        class="prep-primary"
        :disabled="busy || !form.title.trim()"
      >
        {{ t(busy ? "prephub.saving" : "prephub.save") }}
      </button>
    </div>
  </form>
</template>
