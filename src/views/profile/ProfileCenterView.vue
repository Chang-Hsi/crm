<script setup>
import { computed } from 'vue'
import { useAuthSession } from '../../utils/auth'

const { authSession } = useAuthSession()
const displayName = computed(() => authSession.value?.displayName ?? 'Guest')
const primaryRoleLabel = computed(() => authSession.value?.primaryRoleLabel ?? 'Guest')
const tenantName = computed(() => authSession.value?.tenantName ?? 'N/A')
const tenantCode = computed(() => authSession.value?.tenantCode ?? 'N/A')
const account = computed(() => authSession.value?.account ?? '-')
const email = computed(() => authSession.value?.email ?? '-')
const roleIds = computed(() => authSession.value?.roleIds?.join(', ') ?? '-')
const avatarInitials = computed(() =>
  displayName.value
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase(),
)
</script>

<template>
  <div class="min-h-full bg-white px-8 py-8 max-[760px]:px-5">
    <div class="mx-auto max-w-5xl">
      <div
        class="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f7fbff_100%)] shadow-sm"
      >
        <div class="border-b border-slate-200 px-8 py-6 max-[760px]:px-5">
          <p class="mb-2 text-sm font-medium uppercase tracking-[0.24em] text-slate-400">
            Profile Center
          </p>
          <h2 class="text-2xl font-semibold text-slate-900">個人中心</h2>
        </div>

        <div class="grid gap-6 px-8 py-8 md:grid-cols-[200px_minmax(0,1fr)] max-[760px]:px-5">
          <div class="flex flex-col items-center rounded-3xl bg-slate-50 p-6 text-center">
            <div
              class="mb-4 grid h-24 w-24 place-items-center rounded-full border border-slate-200 bg-[linear-gradient(135deg,#fde68a_0%,#fca5a5_100%)] text-slate-700"
            >
              <span class="text-3xl font-semibold">{{ avatarInitials }}</span>
            </div>
            <strong class="text-lg text-slate-900">{{ displayName }}</strong>
            <span class="mt-1 text-sm text-slate-500">{{ primaryRoleLabel }}</span>
          </div>

          <div class="grid gap-4">
            <div class="rounded-2xl border border-slate-200 bg-white p-5">
              <p class="text-sm text-slate-400">帳號</p>
              <p class="mt-2 text-base font-medium text-slate-900">{{ account }}</p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-5">
              <p class="text-sm text-slate-400">Email</p>
              <p class="mt-2 text-base font-medium text-slate-900">{{ email }}</p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-5">
              <p class="text-sm text-slate-400">目前租戶</p>
              <p class="mt-2 text-base font-medium text-slate-900">
                {{ tenantName }}（{{ tenantCode }}）
              </p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-5">
              <p class="text-sm text-slate-400">租戶角色</p>
              <p class="mt-2 text-base font-medium text-slate-900">{{ roleIds }}</p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-5">
              <p class="text-sm text-slate-400">說明</p>
              <p class="mt-2 text-base text-slate-600">
                系統目前依主要角色決定預設首頁，並以該租戶下全部角色的權限聯集控制功能可見性。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
