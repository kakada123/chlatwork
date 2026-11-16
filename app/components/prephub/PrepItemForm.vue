<script setup lang="ts">
import {
  inputToInstant,
  instantToInput,
  type PrepItem,
  type PrepType,
} from "~/lib/prephub";
const props = defineProps<{
  type: PrepType;
  simple?: boolean;
  item?: PrepItem;
  timeZone: string;
  busy?: boolean;
  submit: (body: Record<string, unknown>) => Promise<boolean>;
}>();
const emit = defineEmits<{ cancel: [] }>();
const { t } = useAppI18n();
const form = reactive({
  title: props.item?.title ?? "",
  content: props.item?.content ?? "",
  objective: props.item?.objective ?? "",
  findings: props.item?.findings ?? "",
  sources: props.item?.sources ?? "",
  conclusion: props.item?.conclusion ?? "",
  url: props.item?.url ?? "",
  label: props.item?.label ?? "",
  status: props.item?.status ?? "TO_RESEARCH",
  isRequired: props.item?.isRequired ?? true,
  isCompleted: props.item?.isCompleted ?? false,
  dueAt: instantToInput(props.item?.dueAt ?? null, props.timeZone),
});
const error = ref("");
async function save() {
  error.value = "";
  try {
    await props.submit({
      ...form,
      dueAt: inputToInstant(form.dueAt, props.timeZone),
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
        maxlength="300"
        autofocus
    /></label>
    <template v-if="type === 'RESEARCH'">
      <details>
        <summary
          class="min-h-11 cursor-pointer content-center text-sm font-semibold"
        >
          {{ t("prephub.notebook.researchDetails") }}
        </summary>
        <div class="space-y-4 pb-3">
          <label class="prep-label"
            >{{ t("prephub.objective")
            }}<textarea
              v-model="form.objective"
              class="prep-input"
              maxlength="4000"
              rows="2"
            />
          </label>
          <label class="prep-label"
            >{{ t("prephub.status")
            }}<ModernSelect v-model="form.status" class="mt-1 w-full">
              <option
                v-for="v in [
                  'TO_RESEARCH',
                  'RESEARCHING',
                  'ANSWERED',
                  'NEEDS_VERIFICATION',
                ]"
                :key="v"
                :value="v"
              >
                {{ t(`prephub.${v}`) }}
              </option>
            </ModernSelect></label
          >
        </div>
      </details>
      <label class="prep-label"
        >{{ t("prephub.findings")
        }}<textarea
          v-model="form.findings"
          class="prep-input"
          maxlength="20000"
          rows="5"
        />
      </label>
      <label class="prep-label"
        >{{ t("prephub.sources")
        }}<textarea
          v-model="form.sources"
          class="prep-input"
          maxlength="8000"
          rows="3"
        />
      </label>
      <label class="prep-label"
        >{{ t("prephub.conclusion")
        }}<textarea
          v-model="form.conclusion"
          class="prep-input"
          maxlength="8000"
          rows="3"
        />
      </label>
    </template>
    <template v-if="type === 'LINKS'"
      ><label class="prep-label"
        >{{ t("prephub.url")
        }}<input
          v-model="form.url"
          type="url"
          class="prep-input"
          required
          maxlength="2048" /></label
      ><label class="prep-label"
        >{{ t("prephub.label")
        }}<input
          v-model="form.label"
          class="prep-input"
          maxlength="80" /></label
    ></template>
    <label class="prep-label"
      >{{ t(type === "QUESTIONS" ? "prephub.answer" : "prephub.description")
      }}<textarea
        v-model="form.content"
        class="prep-input"
        rows="5"
        maxlength="20000"
      />
    </label>
    <p class="text-xs text-slate-500">{{ t("prephub.formatting") }}</p>
    <details v-if="['CHECKLIST', 'DELIVERABLES'].includes(type)">
      <summary
        class="min-h-11 cursor-pointer content-center text-sm font-semibold"
      >
        {{ t("prephub.notebook.taskOptions") }}
      </summary>
      <div class="space-y-3 pb-3">
        <label class="prep-label"
          >{{ t("prephub.dueAt")
          }}<ModernDateInput
            v-model="form.dueAt"
            type="datetime-local"
            class="mt-1 w-full"
          /><span class="text-xs text-slate-500">{{ timeZone }}</span></label
        ><label class="flex min-h-11 items-center gap-2 text-sm"
          ><input v-model="form.isRequired" type="checkbox" class="size-5" />{{
            t("prephub.required")
          }}</label
        >
      </div>
    </details>
    <label
      v-if="['CHECKLIST', 'DELIVERABLES', 'QUESTIONS'].includes(type)"
      class="flex min-h-11 items-center gap-2 text-sm"
      ><input v-model="form.isCompleted" type="checkbox" class="size-5" />{{
        t(type === "QUESTIONS" ? "prephub.ANSWERED" : "prephub.complete")
      }}</label
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
