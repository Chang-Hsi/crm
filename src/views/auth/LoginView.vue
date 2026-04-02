<script setup>
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ElButton,
  ElCheckbox,
  ElForm,
  ElFormItem,
  ElInput,
  ElNotification,
  ElOption,
  ElSelect,
  ElTag,
} from "element-plus";
import { ArrowLeft, Lock, OfficeBuilding, User } from "@element-plus/icons-vue";
import { authenticateMockUser, companyTenants, employeeAccounts } from "../../data/auth";
import { useAppShell } from "../../composables/useAppShell";
import { login } from "../../utils/auth";

const router = useRouter();
const { resetShell } = useAppShell();

const currentStep = ref(0);
const selectedTenantCode = ref(companyTenants[0]?.code ?? "");
const rememberMe = ref(true);
const loginSubmitting = ref(false);

const loginForm = reactive({
  loginId: "",
  password: "",
});

const selectedTenant = computed(
  () => companyTenants.find((tenant) => tenant.code === selectedTenantCode.value) ?? null
);

const tenantDemoAccounts = computed(() =>
  employeeAccounts
    .filter((employee) =>
      employee.tenantMemberships.some(
        (membership) => membership.tenantCode === selectedTenantCode.value
      )
    )
    .map((employee) => {
      const membership = employee.tenantMemberships.find(
        (item) => item.tenantCode === selectedTenantCode.value
      );

      return {
        displayName: employee.displayName,
        loginId: employee.account,
        password: employee.password,
        primaryRoleId: membership?.primaryRoleId ?? "",
      };
    })
);

function goToCredentialStep() {
  if (!selectedTenantCode.value) {
    ElNotification({
      title: "尚未選擇企業",
      message: "請先選擇要登入的企業租戶。",
      type: "warning",
      position: "top-right",
    });
    return;
  }

  currentStep.value = 1;
}

function goBackToTenantStep() {
  currentStep.value = 0;
}

function fillDemoAccount(account) {
  loginForm.loginId = account.loginId;
  loginForm.password = account.password;
}

async function handleLogin() {
  if (!selectedTenantCode.value || !loginForm.loginId || !loginForm.password) {
    ElNotification({
      title: "資料未完成",
      message: "請先選擇企業並輸入帳號密碼。",
      type: "warning",
      position: "top-right",
    });
    return;
  }

  loginSubmitting.value = true;

  try {
    const session = authenticateMockUser({
      tenantCode: selectedTenantCode.value,
      loginId: loginForm.loginId.trim(),
      password: loginForm.password,
    });

    if (!session) {
      ElNotification({
        title: "登入失敗",
        message: "帳號、密碼或企業租戶不正確。",
        type: "error",
        position: "top-right",
      });
      return;
    }

    login({
      ...session,
      rememberMe: rememberMe.value,
    });
    resetShell();
    await router.replace({ name: session.defaultDashboardRouteName });
  } finally {
    loginSubmitting.value = false;
  }
}
</script>

<template>
  <div
    class="grid min-h-screen overflow-hidden bg-white lg:grid-cols-[920px_minmax(0,1fr)]"
  >
    <section
      class="flex min-h-full flex-col justify-between bg-white px-8 pt-10 pb-4 max-[760px]:px-5"
    >
      <div class="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center">
        <div
          class="mx-auto mb-10 grid h-12 w-12 place-items-center rounded-2xl shadow-[0_12px_24px_rgba(255,126,54,0.28)]"
        >
          <img src="/src/assets/img/logo.png" alt="logo" class="h-12 w-12 rounded-2xl" />
        </div>

        <div class="text-center">
          <h1 class="text-[2rem] font-semibold tracking-[-0.03em] text-slate-900">
            {{
              currentStep === 0
                ? "Welcome Back to CRM"
                : `Sign in to ${selectedTenant?.shortName}`
            }}
          </h1>
          <p class="mt-3 text-sm leading-6 text-slate-400">
            {{
              currentStep === 0
                ? "Choose your enterprise tenant to continue."
                : "Enter your username and password to continue."
            }}
          </p>
        </div>

        <div class="mt-10">
          <ElForm label-position="top" class="grid gap-1" @submit.prevent="handleLogin">
            <template v-if="currentStep === 0">
              <ElFormItem label="Enterprise">
                <ElSelect
                  v-model="selectedTenantCode"
                  size="large"
                  placeholder="Select your enterprise"
                  class="w-full"
                >
                  <ElOption
                    v-for="tenant in companyTenants"
                    :key="tenant.code"
                    :label="`${tenant.shortName} (${tenant.code})`"
                    :value="tenant.code"
                  />
                </ElSelect>
              </ElFormItem>

              <div
                v-if="selectedTenant"
                class="mt-1 rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-slate-900">
                      {{ selectedTenant.name }}
                    </p>
                    <p class="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                      {{ selectedTenant.region }}
                    </p>
                  </div>
                  <ElTag type="info" effect="plain" round>{{
                    selectedTenant.code
                  }}</ElTag>
                </div>
              </div>

              <ElButton
                type="primary"
                size="large"
                class="mt-7 !h-12 !w-full !rounded-xl !border-black !bg-slate-900 !text-sm !font-medium hover:!border-slate-800 hover:!bg-slate-800"
                @click="goToCredentialStep"
              >
                Continue
              </ElButton>
            </template>

            <template v-else>
              <div
                class="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p class="text-sm font-semibold text-slate-900">
                    {{ selectedTenant?.shortName }}
                  </p>
                  <p class="mt-1 text-xs text-slate-400">{{ selectedTenant?.code }}</p>
                </div>
                <ElButton text :icon="ArrowLeft" @click="goBackToTenantStep"
                  >Change</ElButton
                >
              </div>

              <ElFormItem label="Email">
                <ElInput
                  v-model="loginForm.loginId"
                  size="large"
                  placeholder="Enter your email address"
                  :prefix-icon="User"
                  clearable
                />
              </ElFormItem>

              <ElFormItem label="Password">
                <ElInput
                  v-model="loginForm.password"
                  size="large"
                  type="password"
                  show-password
                  placeholder="Enter your password"
                  :prefix-icon="Lock"
                  @keyup.enter="handleLogin"
                />
              </ElFormItem>

              <div class="mt-1 flex items-center justify-between gap-3">
                <ElCheckbox v-model="rememberMe" label="Remember me" />
              </div>

              <div class="mt-5 grid gap-3">
                <button
                  v-for="account in tenantDemoAccounts"
                  :key="`${selectedTenantCode}-${account.loginId}`"
                  type="button"
                  class="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/10 px-4 py-1 text-left transition hover:border-[#409eff] hover:bg-[#ecf5ff]"
                  @click="fillDemoAccount(account)"
                >
                  <div>
                    <p class="text-xs font-semibold text-slate-900">
                      {{ account.displayName }}
                    </p>
                    <p class="mt-1 text-xs text-slate-500">{{ account.loginId }}</p>
                  </div>
                  <ElTag size="small" effect="plain">{{ account.primaryRoleId }}</ElTag>
                </button>
              </div>

              <ElButton
                type="primary"
                size="large"
                class="mt-7 !h-12 !w-full !rounded-xl !border-black !bg-slate-900 !text-sm !font-medium hover:!border-slate-800 hover:!bg-slate-800"
                :loading="loginSubmitting"
                @click="handleLogin"
              >
                Sign In
              </ElButton>
            </template>
          </ElForm>
        </div>
      </div>

      <div
        class="mx-auto flex w-full items-end justify-between gap-4 text-xs text-slate-400"
      >
        <span>© 2026 CRM Inc. All rights reserved.</span>
        <div class="flex items-end gap-3">
          <span>Privacy Policy</span>
          <span>Term &amp; Condition</span>
        </div>
      </div>
    </section>

    <section class="relative hidden overflow-hidden bg-gray-500 lg:block">
      <div
        class="h-full"
        style="
          background-image: url(https://img.technews.tw/wp-content/uploads/2019/07/01150755/gamania-world-of-dragonnest-agency-768x430.jpg);
          background-repeat: no-repeat;
          background-size: cover;
          background-position: center;
        "
      />
    </section>
  </div>
</template>
