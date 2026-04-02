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
  ElSwitch,
} from "element-plus";
import { accountList } from "../../data/accounts";
import { contactRoleOptions, contactStatusOptions } from "../../data/contacts";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    default: "create",
  },
  contact: {
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

const formRef = ref();

const accountOptions = computed(() =>
  accountList.map((account) => ({
    label: account.companyName,
    value: account.id,
  }))
);

const selectedAccount = computed(
  () =>
    accountList.find((account) => account.id === form.accountId) ??
    accountList.find((account) => account.id === props.accountId) ??
    null
);

const drawerTitle = computed(() =>
  props.mode === "edit" ? "編輯聯絡人" : "新增聯絡人"
);

const drawerSubtitle = computed(() => {
  if (props.mode === "edit") {
    return `${props.contact?.name ?? ""} / ${
      props.contact?.accountName ?? props.accountName ?? ""
    }`;
  }

  if (props.accountName) {
    return `為 ${props.accountName} 建立新的聯絡人資料`;
  }

  return "請先選擇所屬客戶，再建立聯絡人資料";
});

const accountLocked = computed(() => props.mode === "edit" || Boolean(props.accountId));

const form = reactive({
  accountId: "",
  name: "",
  role: "",
  title: "",
  department: "",
  email: "",
  phone: "",
  mobile: "",
  isPrimary: false,
  status: "active",
  notes: "",
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
  name: [{ required: true, message: "請輸入姓名", trigger: "blur" }],
  role: [{ required: true, message: "請選擇角色類型", trigger: "change" }],
  email: [
    { required: true, message: "請輸入 Email", trigger: "blur" },
    { type: "email", message: "請輸入合法的 Email 格式", trigger: "blur" },
  ],
};

function syncForm() {
  form.accountId = props.contact?.accountId ?? props.accountId ?? "";
  form.name = props.contact?.name ?? "";
  form.role = props.contact?.role ?? "";
  form.title = props.contact?.title ?? "";
  form.department = props.contact?.department ?? "";
  form.email = props.contact?.email ?? "";
  form.phone = props.contact?.phone ?? "";
  form.mobile = props.contact?.mobile ?? "";
  form.isPrimary = props.contact?.isPrimary ?? false;
  form.status = props.contact?.status ?? "active";
  form.notes = props.contact?.notes ?? "";
}

watch(
  () => [props.modelValue, props.contact, props.accountId, props.mode],
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

function submitForm() {
  formRef.value?.validate((valid) => {
    if (!valid) {
      return;
    }

    emit("submit", {
      accountId: form.accountId,
      name: form.name.trim(),
      role: form.role,
      title: form.title.trim(),
      department: form.department.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      mobile: form.mobile.trim(),
      isPrimary: form.isPrimary,
      status: form.status,
      notes: form.notes.trim(),
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
          <h4 class="text-base font-semibold text-slate-900">歸屬資訊</h4>
          <p class="mt-1 text-sm text-slate-500">聯絡人必須歸屬於單一客戶。</p>
        </div>

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

        <div v-if="selectedAccount" class="grid gap-2 text-sm text-slate-600">
          <p>負責業務：{{ selectedAccount.owner }}</p>
          <p>地區：{{ selectedAccount.region }}</p>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
        <div class="mb-4">
          <h4 class="text-base font-semibold text-slate-900">聯絡人基本資料</h4>
        </div>

        <div class="grid gap-4">
          <ElFormItem label="姓名" prop="name" required>
            <ElInput v-model="form.name" placeholder="請輸入聯絡人姓名" />
          </ElFormItem>

          <ElFormItem label="角色類型" prop="role" required>
            <ElSelect v-model="form.role" class="!w-full">
              <ElOption
                v-for="item in contactRoleOptions.filter((item) => item.value !== 'all')"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>

          <ElFormItem label="職稱">
            <ElInput v-model="form.title" placeholder="請輸入職稱" />
          </ElFormItem>

          <ElFormItem label="部門">
            <ElInput v-model="form.department" placeholder="請輸入部門名稱" />
          </ElFormItem>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
        <div class="mb-4">
          <h4 class="text-base font-semibold text-slate-900">聯絡方式</h4>
        </div>

        <div class="grid gap-4">
          <ElFormItem label="Email" prop="email" required>
            <ElInput v-model="form.email" placeholder="請輸入 Email" />
          </ElFormItem>

          <div class="grid gap-4 md:grid-cols-2">
            <ElFormItem label="電話">
              <ElInput v-model="form.phone" placeholder="請輸入電話" />
            </ElFormItem>

            <ElFormItem label="手機">
              <ElInput v-model="form.mobile" placeholder="請輸入手機" />
            </ElFormItem>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
        <div class="mb-4">
          <h4 class="text-base font-semibold text-slate-900">權責與狀態</h4>
        </div>

        <div class="grid gap-4">
          <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-sm font-medium text-slate-900">是否主要聯絡人</p>
                <p class="mt-1 text-xs text-slate-500">同一客戶下只能有一位主要聯絡人</p>
              </div>
              <ElSwitch v-model="form.isPrimary" />
            </div>
          </div>

          <ElFormItem label="狀態">
            <ElSelect v-model="form.status" class="!w-full">
              <ElOption
                v-for="item in contactStatusOptions.filter((item) => item.value !== 'all')"
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

        <ElFormItem label="備註">
          <ElInput
            v-model="form.notes"
            type="textarea"
            :rows="5"
            placeholder="請輸入補充備註"
          />
        </ElFormItem>

        <div v-if="mode === 'edit' && contact" class="grid gap-2 pt-2 text-xs text-slate-500">
          <p>建立時間：{{ contact.createdAt || "-" }}</p>
          <p>最近更新：{{ contact.updatedAt || "-" }}</p>
          <p>最近聯繫：{{ contact.lastContactAt || "-" }}</p>
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
