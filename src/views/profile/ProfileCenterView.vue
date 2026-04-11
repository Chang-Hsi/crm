<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import { ElNotification } from "element-plus";
import { useProfileStore } from "../../stores/useProfileStore";
import { useAuthSession } from "../../utils/auth";

const { authSession } = useAuthSession();
const profileStore = useProfileStore();

watch(
  authSession,
  (session) => {
    profileStore.hydrateFromSession(session);
  },
  { immediate: true }
);

const profileForm = reactive({
  firstName: "",
  lastName: "",
  email: "",
});

const passwordForm = reactive({
  currentPassword: "",
  nextPassword: "",
  confirmPassword: "",
});

const profileErrors = reactive({
  firstName: "",
  lastName: "",
  email: "",
});

const passwordErrors = reactive({
  currentPassword: "",
  nextPassword: "",
  confirmPassword: "",
});

watch(
  () => [profileStore.firstName, profileStore.lastName, profileStore.email],
  ([firstName, lastName, email]) => {
    profileForm.firstName = firstName || "";
    profileForm.lastName = lastName || "";
    profileForm.email = email || "";
  },
  { immediate: true }
);

const fileInput = ref(null);
const avatarPreviewUrl = ref("");

const displayName = computed(() => profileStore.displayName || "訪客");
const account = computed(() => profileStore.account || "-");
const primaryRoleLabel = computed(() => profileStore.primaryRoleLabel || "訪客");
const tenantName = computed(() => profileStore.tenantName || "N/A");
const avatarUrl = computed(() => avatarPreviewUrl.value || profileStore.avatarUrl || "");
const avatarInitials = computed(() => profileStore.avatarInitials || "G");

function triggerFileSelect() {
  fileInput.value?.click();
}

function handleAvatarChange(event) {
  const file = event?.target?.files?.[0];
  if (!file) {
    return;
  }

  if (avatarPreviewUrl.value) {
    URL.revokeObjectURL(avatarPreviewUrl.value);
  }

  avatarPreviewUrl.value = URL.createObjectURL(file);

  ElNotification({
    title: "已更新",
    message: `已選擇新頭像：${file.name}`,
    type: "success",
    position: "top-right",
  });
}

function resetProfileErrors() {
  profileErrors.firstName = "";
  profileErrors.lastName = "";
  profileErrors.email = "";
}

function resetPasswordErrors() {
  passwordErrors.currentPassword = "";
  passwordErrors.nextPassword = "";
  passwordErrors.confirmPassword = "";
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function validateProfileForm() {
  resetProfileErrors();

  if (!profileForm.firstName.trim()) {
    profileErrors.firstName = "名字為必填";
  }

  if (!profileForm.lastName.trim()) {
    profileErrors.lastName = "姓氏為必填";
  }

  if (!profileForm.email.trim()) {
    profileErrors.email = "Email 為必填";
  } else if (!validateEmail(profileForm.email)) {
    profileErrors.email = "Email 格式不正確";
  }

  return !profileErrors.firstName && !profileErrors.lastName && !profileErrors.email;
}

function validatePasswordForm() {
  resetPasswordErrors();

  if (!passwordForm.currentPassword) {
    passwordErrors.currentPassword = "請輸入舊密碼";
  }

  if (!passwordForm.nextPassword) {
    passwordErrors.nextPassword = "請輸入新密碼";
  } else if (passwordForm.nextPassword.length < 8) {
    passwordErrors.nextPassword = "新密碼至少需要 8 個字元";
  }

  if (!passwordForm.confirmPassword) {
    passwordErrors.confirmPassword = "請再次確認新密碼";
  } else if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
    passwordErrors.confirmPassword = "確認密碼與新密碼不一致";
  }

  return (
    !passwordErrors.currentPassword &&
    !passwordErrors.nextPassword &&
    !passwordErrors.confirmPassword
  );
}

function saveProfile() {
  if (!validateProfileForm()) {
    return;
  }

  profileStore.saveProfile({
    firstName: profileForm.firstName,
    lastName: profileForm.lastName,
    email: profileForm.email,
    avatarUrl: avatarPreviewUrl.value || profileStore.avatarUrl,
  });

  ElNotification({
    title: "已儲存",
    message: "個人資料已更新，頁首資訊已同步",
    type: "success",
    position: "top-right",
  });
}

function savePassword() {
  if (!validatePasswordForm()) {
    return;
  }

  passwordForm.currentPassword = "";
  passwordForm.nextPassword = "";
  passwordForm.confirmPassword = "";

  ElNotification({
    title: "已儲存",
    message: "密碼更新請求已送出，目前先以前端狀態模擬",
    type: "success",
    position: "top-right",
  });
}

onBeforeUnmount(() => {
  if (avatarPreviewUrl.value) {
    URL.revokeObjectURL(avatarPreviewUrl.value);
  }
});
</script>

<template>
  <div class="min-h-full bg-white px-6 py-8">
    <div class="mx-auto max-w-3xl">
      <section class="grid gap-8">
        <header class="grid gap-1">
          <p class="text-sm text-slate-400">個人中心</p>
          <h1 class="text-xl font-semibold text-slate-900">帳號資料</h1>
          <p class="text-sm text-slate-500">
            {{ account }} / {{ primaryRoleLabel }} / {{ tenantName }}
          </p>
        </header>

        <section class="grid gap-8">
          <article class="grid gap-4">
            <h2 class="text-lg font-semibold text-slate-900">更換頭像</h2>

            <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
              <button
                type="button"
                class="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center"
                @click="triggerFileSelect"
              >
                <div class="grid gap-2">
                  <p class="text-base font-medium text-slate-700">
                    將圖片拖曳到此處，或
                    <span class="text-violet-600">瀏覽檔案</span>
                  </p>
                  <p class="text-sm text-slate-400">支援格式：PNG、JPEG、JPG、WEBP</p>
                </div>
              </button>

              <div
                class="overflow-hidden rounded-2xl border border-slate-200 bg-violet-50"
              >
                <div
                  v-if="avatarUrl"
                  class="h-full min-h-[160px] w-full bg-cover bg-center"
                  :style="{ backgroundImage: `url(${avatarUrl})` }"
                />
                <div
                  v-else
                  class="grid min-h-[160px] place-items-center bg-gradient-to-br from-violet-100 to-slate-100"
                >
                  <div
                    class="grid h-20 w-20 place-items-center rounded-full bg-white text-xl font-semibold text-slate-700 shadow-sm"
                  >
                    {{ avatarInitials }}
                  </div>
                </div>
              </div>
            </div>

            <input
              ref="fileInput"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              class="hidden"
              @change="handleAvatarChange"
            />

            <div class="grid gap-4">
              <label class="grid gap-2">
                <span class="text-sm font-medium text-slate-700">名字</span>
                <input
                  v-model="profileForm.firstName"
                  type="text"
                  class="h-12 rounded-2xl border px-4 text-base text-slate-900 outline-none transition focus:ring-2"
                  :class="
                    profileErrors.firstName
                      ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100'
                  "
                />
                <p
                  class="overflow-hidden text-sm text-rose-500 transition-all duration-100"
                  :class="
                    profileErrors.firstName ? 'max-h-6 opacity-100' : 'max-h-0 opacity-0'
                  "
                >
                  {{ profileErrors.firstName }}
                </p>
              </label>

              <label class="grid gap-2">
                <span class="text-sm font-medium text-slate-700">姓氏</span>
                <input
                  v-model="profileForm.lastName"
                  type="text"
                  class="h-12 rounded-2xl border px-4 text-base text-slate-900 outline-none transition focus:ring-2"
                  :class="
                    profileErrors.lastName
                      ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100'
                  "
                />
                <p
                  class="overflow-hidden text-sm text-rose-500 transition-all duration-100"
                  :class="
                    profileErrors.lastName ? 'max-h-6 opacity-100' : 'max-h-0 opacity-0'
                  "
                >
                  {{ profileErrors.lastName }}
                </p>
              </label>

              <label class="grid gap-2">
                <span class="text-sm font-medium text-slate-700">Email</span>
                <input
                  v-model="profileForm.email"
                  type="email"
                  class="h-12 rounded-2xl border px-4 text-base text-slate-900 outline-none transition focus:ring-2"
                  :class="
                    profileErrors.email
                      ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100'
                  "
                />
                <p
                  class="overflow-hidden text-sm text-rose-500 transition-all duration-100"
                  :class="
                    profileErrors.email ? 'max-h-6 opacity-100' : 'max-h-0 opacity-0'
                  "
                >
                  {{ profileErrors.email }}
                </p>
              </label>

              <div>
                <button
                  type="button"
                  class="inline-flex h-11 items-center justify-center rounded-xl bg-violet-600 px-6 text-sm font-medium text-white transition hover:bg-violet-700"
                  @click="saveProfile"
                >
                  儲存變更
                </button>
              </div>
            </div>
          </article>

          <article class="grid gap-4">
            <h2 class="text-lg font-semibold text-slate-900">變更密碼</h2>

            <div class="grid gap-4">
              <label class="grid gap-2">
                <span class="text-sm font-medium text-slate-700">舊密碼</span>
                <input
                  v-model="passwordForm.currentPassword"
                  type="password"
                  placeholder="請輸入舊密碼"
                  class="h-12 rounded-2xl border px-4 text-base text-slate-900 outline-none transition focus:ring-2"
                  :class="
                    passwordErrors.currentPassword
                      ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100'
                  "
                />
                <p
                  class="overflow-hidden text-sm text-rose-500 transition-all duration-100"
                  :class="
                    passwordErrors.currentPassword
                      ? 'max-h-6 opacity-100'
                      : 'max-h-0 opacity-0'
                  "
                >
                  {{ passwordErrors.currentPassword }}
                </p>
              </label>

              <label class="grid gap-2">
                <span class="text-sm font-medium text-slate-700">新密碼</span>
                <input
                  v-model="passwordForm.nextPassword"
                  type="password"
                  placeholder="請輸入新的密碼"
                  class="h-12 rounded-2xl border px-4 text-base text-slate-900 outline-none transition focus:ring-2"
                  :class="
                    passwordErrors.nextPassword
                      ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100'
                  "
                />
                <p
                  class="overflow-hidden text-sm text-rose-500 transition-all duration-100"
                  :class="
                    passwordErrors.nextPassword
                      ? 'max-h-6 opacity-100'
                      : 'max-h-0 opacity-0'
                  "
                >
                  {{ passwordErrors.nextPassword }}
                </p>
              </label>

              <label class="grid gap-2">
                <span class="text-sm font-medium text-slate-700">確認新密碼</span>
                <input
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  placeholder="請再次輸入新密碼"
                  class="h-12 rounded-2xl border px-4 text-base text-slate-900 outline-none transition focus:ring-2"
                  :class="
                    passwordErrors.confirmPassword
                      ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100'
                  "
                />
                <p
                  class="overflow-hidden text-sm text-rose-500 transition-all duration-100"
                  :class="
                    passwordErrors.confirmPassword
                      ? 'max-h-6 opacity-100'
                      : 'max-h-0 opacity-0'
                  "
                >
                  {{ passwordErrors.confirmPassword }}
                </p>
              </label>

              <div>
                <button
                  type="button"
                  class="inline-flex h-11 items-center justify-center rounded-xl bg-violet-600 px-6 text-sm font-medium text-white transition hover:bg-violet-700"
                  @click="savePassword"
                >
                  儲存變更
                </button>
              </div>
            </div>
          </article>
        </section>
      </section>
    </div>
  </div>
</template>
