<script setup>
import { computed, reactive, ref, watch } from "vue";
import {
  ElButton,
  ElDatePicker,
  ElDrawer,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElSelect,
} from "element-plus";
import { accountList, ownerOptions } from "../../data/accounts";
import { contactList } from "../../data/contacts";
import { activityStatusOptions, activityTypeOptions } from "../../data/activities";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    default: "create",
  },
  activity: {
    type: Object,
    default: null,
  },
  accountId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(["update:modelValue", "submit"]);

const formRef = ref();

const accountLocked = computed(() => props.mode === "edit" || Boolean(props.accountId));

const accountOptions = computed(() =>
  accountList.map((account) => ({
    label: account.companyName,
    value: account.id,
  }))
);

const selectedAccount = computed(
  () => accountList.find((account) => account.id === form.accountId) ?? null
);

const contactOptions = computed(() =>
  contactList
    .filter((contact) => !form.accountId || contact.accountId === form.accountId)
    .map((contact) => ({
      label: contact.name,
      value: contact.id,
    }))
);

const drawerTitle = computed(() =>
  props.mode === "edit" ? "編輯互動紀錄" : "新增互動紀錄"
);

const drawerSubtitle = computed(() => {
  if (props.mode === "edit") {
    return `${props.activity?.accountName ?? ""} / ${props.activity?.title ?? ""}`;
  }

  if (selectedAccount.value) {
    return `為 ${selectedAccount.value.companyName} 建立新的互動紀錄`;
  }

  return "請先選擇所屬客戶，再建立互動與跟進資料";
});

const form = reactive({
  accountId: "",
  contactId: "",
  type: "",
  title: "",
  occurredAt: "",
  summary: "",
  nextAction: "",
  nextActionAt: "",
  owner: "",
  status: "done",
});

const rules = {
  accountId: [{ required: true, message: "請選擇所屬客戶", trigger: "change" }],
  type: [{ required: true, message: "請選擇互動類型", trigger: "change" }],
  title: [{ required: true, message: "請輸入互動主題", trigger: "blur" }],
  occurredAt: [{ required: true, message: "請選擇發生時間", trigger: "change" }],
  owner: [{ required: true, message: "請選擇負責人", trigger: "change" }],
};

function syncForm() {
  form.accountId = props.activity?.accountId ?? props.accountId ?? "";
  form.contactId = props.activity?.contactId ?? "";
  form.type = props.activity?.type ?? "";
  form.title = props.activity?.title ?? "";
  form.occurredAt = props.activity?.occurredAt ?? "";
  form.summary = props.activity?.summary ?? "";
  form.nextAction = props.activity?.nextAction ?? "";
  form.nextActionAt = props.activity?.nextActionAt ?? "";
  form.owner = props.activity?.owner ?? selectedAccount.value?.owner ?? "";
  form.status = props.activity?.status ?? "done";
}

watch(
  () => [props.modelValue, props.activity, props.accountId, props.mode],
  () => {
    if (!props.modelValue) {
      return;
    }

    syncForm();
    formRef.value?.clearValidate();
  },
  { immediate: true }
);

watch(
  () => form.accountId,
  (nextAccountId, previousAccountId) => {
    if (!nextAccountId) {
      form.contactId = "";
      return;
    }

    if (nextAccountId !== previousAccountId && props.mode !== "edit") {
      form.contactId = "";
      form.owner =
        accountList.find((account) => account.id === nextAccountId)?.owner ?? form.owner;
    }
  }
);

watch(
  () => [form.nextAction, form.nextActionAt, props.mode],
  ([nextAction, nextActionAt, mode]) => {
    if (mode !== "create") {
      return;
    }

    const hasNextAction = Boolean(nextAction?.trim() || nextActionAt);

    if (hasNextAction && form.status === "done") {
      form.status = "pending";
    }

    if (!hasNextAction && form.status !== "overdue") {
      form.status = "done";
    }
  }
);

function closeDrawer() {
  emit("update:modelValue", false);
}

function submitForm() {
  formRef.value?.validate((valid) => {
    if (!valid) {
      return;
    }

    emit("submit", {
      accountId: form.accountId,
      contactId: form.contactId,
      type: form.type,
      title: form.title.trim(),
      occurredAt: form.occurredAt,
      summary: form.summary.trim(),
      nextAction: form.nextAction.trim(),
      nextActionAt: form.nextActionAt,
      owner: form.owner,
      status: form.status,
    });
  });
}
</script>

<template>
  <ElDrawer
    :model-value="modelValue"
    :title="drawerTitle"
    direction="rtl"
    size="620px"
    destroy-on-close
    @close="closeDrawer"
  >
    <template #header>
      <div class="grid gap-1">
        <h3 class="text-lg font-semibold text-slate-900">{{ drawerTitle }}</h3>
        <p class="text-sm text-slate-500">{{ drawerSubtitle }}</p>
      </div>
    </template>

    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top" class="grid gap-6 pb-6">
      <section class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
        <div class="mb-4">
          <h4 class="text-base font-semibold text-slate-900">歸屬與主題</h4>
          <p class="mt-1 text-sm text-slate-500">互動紀錄必須歸屬於單一客戶。</p>
        </div>

        <div class="grid gap-4">
          <ElFormItem label="所屬客戶" prop="accountId" required>
            <ElSelect v-model="form.accountId" class="!w-full" filterable :disabled="accountLocked">
              <ElOption
                v-for="item in accountOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>

          <ElFormItem label="聯絡人">
            <ElSelect
              v-model="form.contactId"
              class="!w-full"
              filterable
              clearable
              placeholder="可選，若此互動無特定聯絡人可留空"
            >
              <ElOption
                v-for="item in contactOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>

          <ElFormItem label="互動類型" prop="type" required>
            <ElSelect v-model="form.type" class="!w-full">
              <ElOption
                v-for="item in activityTypeOptions.filter((item) => item.value !== 'all')"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>

          <ElFormItem label="主題" prop="title" required>
            <ElInput v-model="form.title" placeholder="請輸入互動主題" />
          </ElFormItem>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
        <div class="mb-4">
          <h4 class="text-base font-semibold text-slate-900">互動資訊</h4>
        </div>

        <div class="grid gap-4">
          <ElFormItem label="發生時間" prop="occurredAt" required>
            <ElDatePicker
              v-model="form.occurredAt"
              class="!w-full"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ssZ"
              placeholder="請選擇互動發生時間"
            />
          </ElFormItem>

          <ElFormItem label="摘要">
            <ElInput
              v-model="form.summary"
              type="textarea"
              :rows="4"
              placeholder="請輸入本次互動摘要"
            />
          </ElFormItem>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
        <div class="mb-4">
          <h4 class="text-base font-semibold text-slate-900">Next Action</h4>
        </div>

        <div class="grid gap-4">
          <ElFormItem label="下次行動">
            <ElInput v-model="form.nextAction" placeholder="請輸入下一步待跟進事項" />
          </ElFormItem>

          <ElFormItem label="下次行動時間">
            <ElDatePicker
              v-model="form.nextActionAt"
              class="!w-full"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ssZ"
              placeholder="可選，若尚未排定可留空"
            />
          </ElFormItem>

          <div class="grid gap-4 md:grid-cols-2">
            <ElFormItem label="負責人" prop="owner" required>
              <ElSelect v-model="form.owner" class="!w-full">
                <ElOption
                  v-for="item in ownerOptions.filter((item) => item.value !== 'all')"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="狀態">
              <ElSelect v-model="form.status" class="!w-full">
                <ElOption
                  v-for="item in activityStatusOptions.filter((item) => item.value !== 'all')"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </div>
        </div>
      </section>
    </ElForm>

    <template #footer>
      <div class="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
        <ElButton @click="closeDrawer">取消</ElButton>
        <ElButton type="primary" @click="submitForm">
          {{ mode === "edit" ? "儲存變更" : "建立" }}
        </ElButton>
      </div>
    </template>
  </ElDrawer>
</template>
