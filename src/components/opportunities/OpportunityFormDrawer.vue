<script setup>
import { computed, reactive, ref, watch } from "vue";
import {
  ElButton,
  ElDatePicker,
  ElDrawer,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElOption,
  ElSelect,
} from "element-plus";
import {
  opportunitySourceOptions,
  opportunityStageOptions,
  opportunityTypeOptions,
  stageProbabilityMap,
} from "../../data/opportunities";
import { useAccountsStore } from "../../composables/useAccountsStore";
import { useContactsStore } from "../../composables/useContactsStore";
import { useUsersStore } from "../../composables/useUsersStore";
import { opportunityStageMap } from "../../constants/accountMaps";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    default: "create",
  },
  opportunity: {
    type: Object,
    default: null,
  },
  accountId: {
    type: String,
    default: null,
  },
  accountName: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(["update:modelValue", "submit"]);

const { accounts } = useAccountsStore();
const { contacts, getContactsByAccountId } = useContactsStore();
const { getAssignableOwners } = useUsersStore();

const formRef = ref();

const drawerTitle = computed(() =>
  props.mode === "edit" ? "編輯商機" : "新增商機"
);

const drawerSubtitle = computed(() => {
  if (props.mode === "edit") {
    return `${props.opportunity?.name ?? ""} / ${
      props.opportunity?.opportunityCode ?? ""
    }`;
  }

  if (props.accountName) {
    return `為 ${props.accountName} 建立新的商機資料`;
  }

  return "建立一筆可進入 pipeline 管理的新商機";
});

const accountLocked = computed(() => props.mode === "edit" || Boolean(props.accountId));

const accountOptions = computed(() =>
  accounts.value.map((account) => ({
    label: account.companyName,
    value: account.id,
  }))
);

const ownerOptions = computed(() =>
  getAssignableOwners("opportunity").map((user) => ({
    label: user.name,
    value: user.id,
  }))
);

const selectedAccount = computed(
  () =>
    accounts.value.find((account) => account.id === form.accountId) ??
    accounts.value.find((account) => account.id === props.accountId) ??
    null
);

const contactOptions = computed(() =>
  contacts.value
    .filter((contact) => contact.accountId === form.accountId && contact.status === "active")
    .map((contact) => ({
      label: `${contact.name}${contact.isPrimary ? " / 主要聯絡人" : ""}`,
      value: contact.id,
    }))
);

const defaultOwnerUserId = computed(
  () => ownerOptions.value[0]?.value ?? ""
);

const form = reactive({
  accountId: "",
  primaryContactId: "",
  name: "",
  opportunityType: "channel",
  source: "existing_account",
  stage: "potential",
  probability: 20,
  expectedRevenue: 0,
  expectedCloseDate: "",
  ownerUserId: "",
  lostReason: "",
  description: "",
});

const rules = {
  accountId: [
    {
      validator: (_rule, value, callback) => {
        if (!accountLocked.value && !value) {
          callback(new Error("請選擇所屬客戶"));
          return;
        }

        callback();
      },
      trigger: "change",
    },
  ],
  name: [{ required: true, message: "請輸入商機名稱", trigger: "blur" }],
  opportunityType: [{ required: true, message: "請選擇商機類型", trigger: "change" }],
  stage: [{ required: true, message: "請選擇商機階段", trigger: "change" }],
  expectedRevenue: [
    { required: true, message: "請輸入預估金額", trigger: "blur" },
    {
      validator: (_rule, value, callback) => {
        if (Number(value) < 0) {
          callback(new Error("預估金額不可小於 0"));
          return;
        }

        callback();
      },
      trigger: "blur",
    },
  ],
  expectedCloseDate: [
    { required: true, message: "請選擇預計成交日", trigger: "change" },
  ],
  ownerUserId: [{ required: true, message: "請選擇負責人", trigger: "change" }],
  lostReason: [
    {
      validator: (_rule, value, callback) => {
        if (form.stage === "lost" && !String(value ?? "").trim()) {
          callback(new Error("請填寫失敗原因"));
          return;
        }

        callback();
      },
      trigger: "blur",
    },
  ],
};

function syncForm() {
  form.accountId = props.opportunity?.accountId ?? props.accountId ?? "";
  form.primaryContactId = props.opportunity?.primaryContactId ?? "";
  form.name = props.opportunity?.name ?? "";
  form.opportunityType = props.opportunity?.opportunityType ?? "channel";
  form.source = props.opportunity?.source ?? "existing_account";
  form.stage = props.opportunity?.stage ?? "potential";
  form.probability =
    props.opportunity?.probability ?? stageProbabilityMap[props.opportunity?.stage ?? "potential"] ?? 20;
  form.expectedRevenue = props.opportunity?.expectedRevenue ?? 0;
  form.expectedCloseDate = props.opportunity?.expectedCloseDate ?? "";
  form.ownerUserId =
    props.opportunity?.ownerUserId ??
    selectedAccount.value?.ownerUserId ??
    defaultOwnerUserId.value;
  form.lostReason = props.opportunity?.lostReason ?? "";
  form.description = props.opportunity?.description ?? "";
}

watch(
  () => [props.modelValue, props.mode, props.opportunity, props.accountId],
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
      form.primaryContactId = "";
      return;
    }

    if (props.mode === "edit") {
      return;
    }

    if (nextAccountId !== previousAccountId) {
      const primaryContact = getContactsByAccountId(nextAccountId).find(
        (contact) => contact.isPrimary && contact.status === "active"
      );

      form.primaryContactId = primaryContact?.id ?? "";
      form.ownerUserId =
        accounts.value.find((account) => account.id === nextAccountId)?.ownerUserId ??
        defaultOwnerUserId.value;
    }
  }
);

watch(
  () => form.stage,
  (nextStage, previousStage) => {
    if (!nextStage) {
      return;
    }

    if (nextStage !== previousStage) {
      form.probability = stageProbabilityMap[nextStage] ?? form.probability;
    }

    if (nextStage !== "lost") {
      form.lostReason = "";
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
      primaryContactId: form.primaryContactId || "",
      name: form.name.trim(),
      opportunityType: form.opportunityType,
      source: form.source,
      stage: form.stage,
      probability: Number(form.probability ?? stageProbabilityMap[form.stage] ?? 0),
      expectedRevenue: Number(form.expectedRevenue ?? 0),
      expectedCloseDate: form.expectedCloseDate,
      ownerUserId: form.ownerUserId,
      lostReason: form.stage === "lost" ? form.lostReason.trim() : "",
      description: form.description.trim(),
    });
  });
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
</script>

<template>
  <ElDrawer
    :model-value="modelValue"
    :title="drawerTitle"
    direction="rtl"
    size="640px"
    destroy-on-close
    @close="closeDrawer"
  >
    <template #header>
      <div class="grid gap-1">
        <h3 class="text-lg font-semibold text-slate-900">{{ drawerTitle }}</h3>
        <p class="text-sm text-slate-500">{{ drawerSubtitle }}</p>
      </div>
    </template>

    <ElForm
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="grid gap-6 pb-6"
    >
      <section class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
        <div class="mb-4">
          <h4 class="text-base font-semibold text-slate-900">歸屬資訊</h4>
          <p class="mt-1 text-sm text-slate-500">商機必須歸屬於單一客戶，可帶入主要聯絡人與地區。</p>
        </div>

        <div class="grid gap-4">
          <ElFormItem label="所屬客戶" prop="accountId" required>
            <ElSelect
              v-model="form.accountId"
              class="!w-full"
              filterable
              :disabled="accountLocked"
            >
              <ElOption
                v-for="item in accountOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>

          <div v-if="selectedAccount" class="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
            <p>客戶代碼：{{ selectedAccount.accountCode }}</p>
            <p>地區：{{ selectedAccount.region }}</p>
          </div>

          <ElFormItem label="主要聯絡人">
            <ElSelect
              v-model="form.primaryContactId"
              class="!w-full"
              clearable
              filterable
              placeholder="可選，僅顯示此客戶下的聯絡人"
            >
              <ElOption
                v-for="item in contactOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
        <div class="mb-4">
          <h4 class="text-base font-semibold text-slate-900">商機基本資料</h4>
        </div>

        <div class="grid gap-4">
          <ElFormItem label="商機名稱" prop="name" required>
            <ElInput v-model="form.name" placeholder="請輸入具體案名" />
          </ElFormItem>

          <div class="grid gap-4 md:grid-cols-2">
            <ElFormItem label="商機類型" prop="opportunityType" required>
              <ElSelect v-model="form.opportunityType" class="!w-full">
                <ElOption
                  v-for="item in opportunityTypeOptions.filter((item) => item.value !== 'all')"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="來源">
              <ElSelect v-model="form.source" class="!w-full">
                <ElOption
                  v-for="item in opportunitySourceOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
        <div class="mb-4">
          <h4 class="text-base font-semibold text-slate-900">Pipeline 與金額</h4>
        </div>

        <div class="grid gap-4">
          <div class="grid gap-4 md:grid-cols-2">
            <ElFormItem label="階段" prop="stage" required>
              <ElSelect v-model="form.stage" class="!w-full">
                <ElOption
                  v-for="item in opportunityStageOptions.filter((item) => item.value !== 'all')"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="機率">
              <ElInputNumber
                v-model="form.probability"
                class="!w-full"
                :min="0"
                :max="100"
                :step="5"
              />
            </ElFormItem>

            <ElFormItem label="預估金額" prop="expectedRevenue" required>
              <ElInputNumber
                v-model="form.expectedRevenue"
                class="!w-full"
                :min="0"
                :step="10000"
                :precision="0"
              />
            </ElFormItem>

            <ElFormItem label="預計成交日" prop="expectedCloseDate" required>
              <ElDatePicker
                v-model="form.expectedCloseDate"
                class="!w-full"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="請選擇日期"
              />
            </ElFormItem>
          </div>

          <ElFormItem label="負責人" prop="ownerUserId" required>
            <ElSelect v-model="form.ownerUserId" class="!w-full">
              <ElOption
                v-for="item in ownerOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
        <div class="mb-4">
          <h4 class="text-base font-semibold text-slate-900">補充資訊</h4>
        </div>

        <div class="grid gap-4">
          <div
            class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
          >
            <p>
              目前狀態：{{ form.stage === "won" ? "已成交" : form.stage === "lost" ? "已失敗" : "進行中" }}
            </p>
            <p class="mt-1">
              階段顯示：{{ opportunityStageMap[form.stage]?.label ?? form.stage }}
            </p>
          </div>

          <ElFormItem v-if="form.stage === 'lost'" label="失敗原因" prop="lostReason" required>
            <ElInput
              v-model="form.lostReason"
              type="textarea"
              :rows="3"
              placeholder="請輸入失敗原因"
            />
          </ElFormItem>

          <ElFormItem label="描述">
            <ElInput
              v-model="form.description"
              type="textarea"
              :rows="4"
              placeholder="請輸入商機背景、需求或合作方向"
            />
          </ElFormItem>
        </div>
      </section>

      <section
        v-if="mode === 'edit'"
        class="rounded-3xl border border-slate-200 bg-white p-5"
      >
        <div class="grid gap-2 text-sm text-slate-600">
          <p>商機代碼：{{ opportunity?.opportunityCode ?? "-" }}</p>
          <p>建立時間：{{ formatDate(opportunity?.createdAt) }}</p>
          <p>最近更新：{{ formatDate(opportunity?.updatedAt) }}</p>
          <p>
            目前狀態：{{ opportunity?.status === "won" ? "已成交" : opportunity?.status === "lost" ? "已失敗" : "進行中" }}
          </p>
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
