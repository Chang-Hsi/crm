<script setup>
import { computed, reactive, ref, watch } from "vue";
import {
  ElButton,
  ElDrawer,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElSelect,
} from "element-plus";
import {
  accountTierOptions,
  accountTypeOptions,
  industryOptions,
  lifecycleOptions,
  regionOptions,
  statusOptions,
} from "../../data/accounts";
import { useUsersStore } from "../../composables/useUsersStore";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    default: "create",
  },
  account: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue", "submit"]);
const { getAssignableOwners } = useUsersStore();

const formRef = ref();
const assignableOwnerOptions = computed(() =>
  getAssignableOwners("account").map((user) => ({
    label: user.name,
    value: user.id,
  }))
);
const defaultOwnerUserId = computed(() => assignableOwnerOptions.value[0]?.value ?? "");

const drawerTitle = computed(() => (props.mode === "edit" ? "編輯客戶" : "新增客戶"));

const drawerSubtitle = computed(() =>
  props.mode === "edit"
    ? `${props.account?.companyName ?? ""} / ${props.account?.accountCode ?? ""}`
    : "建立新的企業客戶 / 合作夥伴 / 代理商 / 通路商資料"
);

const codePreview = computed(() => props.account?.accountCode ?? "系統建立後自動產生");

const form = reactive({
  companyName: "",
  companyType: "enterprise",
  tier: "normal",
  lifecycleStage: "lead",
  region: "台灣",
  ownerUserId: "",
  status: "active",
  industry: "",
  tagsText: "",
  website: "",
  address: "",
  description: "",
});

const rules = {
  companyName: [{ required: true, message: "請輸入客戶名稱", trigger: "blur" }],
  companyType: [{ required: true, message: "請選擇客戶類型", trigger: "change" }],
  tier: [{ required: true, message: "請選擇分級", trigger: "change" }],
  region: [{ required: true, message: "請選擇地區", trigger: "change" }],
  ownerUserId: [{ required: true, message: "請選擇負責業務", trigger: "change" }],
  website: [
    {
      validator: (_rule, value, callback) => {
        if (!value) {
          callback();
          return;
        }

        try {
          new URL(value);
          callback();
        } catch {
          callback(new Error("請輸入合法的網址"));
        }
      },
      trigger: "blur",
    },
  ],
  description: [
    {
      validator: (_rule, value, callback) => {
        if ((value ?? "").length > 500) {
          callback(new Error("說明請控制在 500 字以內"));
          return;
        }

        callback();
      },
      trigger: "blur",
    },
  ],
};

function syncForm() {
  form.companyName = props.account?.companyName ?? "";
  form.companyType = props.account?.companyType ?? "enterprise";
  form.tier = props.account?.tier ?? "normal";
  form.lifecycleStage = props.account?.lifecycleStage ?? "lead";
  form.region = props.account?.region ?? "台灣";
  form.ownerUserId = props.account?.ownerUserId ?? defaultOwnerUserId.value;
  form.status = props.account?.status ?? "active";
  form.industry = props.account?.industry ?? "";
  form.tagsText = (props.account?.tags ?? []).join("、");
  form.website = props.account?.website ?? "";
  form.address = props.account?.address ?? "";
  form.description = props.account?.description ?? "";
}

watch(
  () => [props.modelValue, props.account, props.mode],
  () => {
    if (!props.modelValue) {
      return;
    }

    syncForm();
    formRef.value?.clearValidate();
  },
  { immediate: true }
);

function closeDrawer() {
  emit("update:modelValue", false);
}

function normalizeTags() {
  return form.tagsText
    .split(/[、,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function submitForm(action = "save") {
  formRef.value?.validate((valid) => {
    if (!valid) {
      return;
    }

    emit("submit", {
      action,
      payload: {
        companyName: form.companyName.trim(),
        companyType: form.companyType,
        tier: form.tier,
        lifecycleStage: form.lifecycleStage,
        region: form.region,
        ownerUserId: form.ownerUserId,
        status: form.status,
        industry: form.industry,
        tags: normalizeTags(),
        website: form.website.trim(),
        address: form.address.trim(),
        description: form.description.trim(),
      },
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

    <ElForm
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="grid gap-6 pb-6"
    >
      <section class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
        <div class="mb-4">
          <h4 class="text-base font-semibold text-slate-900">基本資料</h4>
          <p class="mt-1 text-sm text-slate-500">建立或調整客戶的核心識別資訊。</p>
        </div>

        <div class="grid gap-4">
          <ElFormItem label="公司名稱" prop="companyName" required>
            <ElInput v-model="form.companyName" placeholder="請輸入客戶名稱" />
          </ElFormItem>

          <ElFormItem label="客戶代碼">
            <ElInput :model-value="codePreview" disabled />
          </ElFormItem>

          <div class="grid gap-4 md:grid-cols-2">
            <ElFormItem label="客戶類型" prop="companyType">
              <ElSelect v-model="form.companyType" class="!w-full">
                <ElOption
                  v-for="item in accountTypeOptions.filter(
                    (item) => item.value !== 'all'
                  )"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="分級" prop="tier">
              <ElSelect v-model="form.tier" class="!w-full">
                <ElOption
                  v-for="item in accountTierOptions.filter(
                    (item) => item.value !== 'all'
                  )"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="生命週期">
              <ElSelect v-model="form.lifecycleStage" class="!w-full">
                <ElOption
                  v-for="item in lifecycleOptions.filter((item) => item.value !== 'all')"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="狀態">
              <ElSelect v-model="form.status" class="!w-full">
                <ElOption
                  v-for="item in statusOptions"
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
          <h4 class="text-base font-semibold text-slate-900">營運資訊</h4>
          <p class="mt-1 text-sm text-slate-500">
            地區、負責人與產業屬性會影響名單分類與後續追蹤。
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <ElFormItem label="地區" prop="region">
            <ElSelect v-model="form.region" class="!w-full">
              <ElOption
                v-for="item in regionOptions.filter((item) => item.value !== 'all')"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>

          <ElFormItem label="負責業務" prop="ownerUserId">
            <ElSelect v-model="form.ownerUserId" class="!w-full">
              <ElOption
                v-for="item in assignableOwnerOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>

          <ElFormItem label="產業">
            <ElSelect
              v-model="form.industry"
              class="!w-full"
              clearable
              placeholder="請選擇產業別"
            >
              <ElOption
                v-for="item in industryOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>

          <ElFormItem label="標籤">
            <ElInput
              v-model="form.tagsText"
              placeholder="請輸入標籤，使用頓號或逗號分隔"
            />
          </ElFormItem>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
        <div class="mb-4">
          <h4 class="text-base font-semibold text-slate-900">聯絡 / 補充資訊</h4>
          <p class="mt-1 text-sm text-slate-500">
            保留額外說明，避免打斷使用者目前工作上下文。
          </p>
        </div>

        <div class="grid gap-4">
          <ElFormItem label="Website" prop="website">
            <ElInput v-model="form.website" placeholder="https://example.com" />
          </ElFormItem>

          <ElFormItem label="地址">
            <ElInput v-model="form.address" placeholder="請輸入公司地址" />
          </ElFormItem>

          <ElFormItem label="說明 / 備註" prop="description">
            <ElInput
              v-model="form.description"
              type="textarea"
              :rows="5"
              placeholder="請輸入客戶背景、合作重點或補充說明"
            />
          </ElFormItem>
        </div>
      </section>
    </ElForm>

    <template #footer>
      <div
        class="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4"
      >
        <ElButton @click="closeDrawer">取消</ElButton>
        <ElButton
          v-if="mode === 'create'"
          :loading="loading"
          @click="submitForm('save_and_view')"
        >
          建立並查看詳情
        </ElButton>
        <ElButton type="primary" :loading="loading" @click="submitForm('save')">
          {{ mode === "edit" ? "儲存變更" : "建立" }}
        </ElButton>
      </div>
    </template>
  </ElDrawer>
</template>
