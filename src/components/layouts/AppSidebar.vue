<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import logoUrl from "../../assets/img/logo.png";
import { useAppShell } from "../../composables/useAppShell";
import { appRouteSections } from "../../router/routes";
import { useAuthSession } from "../../utils/auth";

const route = useRoute();
const { authSession } = useAuthSession();
const { isSidebarCollapsed } = useAppShell();

const visibleSections = computed(() => authSession.value?.visibleSections ?? []);
const tenantName = computed(() => authSession.value?.tenantName ?? "遊戲橘子公司");
const tenantCode = computed(() => authSession.value?.tenantCode ?? "GMN-TW");

const menuGroups = computed(() =>
  appRouteSections
    .filter(
      (group) =>
        visibleSections.value.length === 0 || visibleSections.value.includes(group.label)
    )
    .map((group) => ({
      label: group.label,
      items: group.items.map((item) => ({
        title: item.title,
        to: `/${item.path}`,
        icon: item.icon,
      })),
    }))
);
</script>

<template>
  <aside
    class="relative flex h-full min-h-0 flex-col gap-6 overflow-hidden border-r border-white/10 bg-[radial-gradient(circle_at_top,rgba(111,147,255,0.24),transparent_22%),linear-gradient(180deg,#16203a_0%,#101729_100%)] py-6 text-white/70 transition-[padding] duration-300 max-[1080px]:gap-[18px] max-[1080px]:border-r-0 max-[1080px]:border-b max-[1080px]:pb-5"
    :class="isSidebarCollapsed ? 'px-3' : 'px-5 max-[1080px]:px-4'"
  >
    <div
      class="flex border-b border-white/10 pt-1.5 pb-[18px]"
      :class="isSidebarCollapsed ? 'justify-center px-0' : 'items-center gap-3.5 px-2'"
    >
      <img :src="logoUrl" alt="logo" class="h-[50px] w-auto shrink-0 rounded-2xl" />
      <div v-if="!isSidebarCollapsed" class="grid gap-0.5">
        <strong class="block text-base font-bold text-white">{{ tenantName }}</strong>
        <span class="text-[0.82rem] tracking-[0.04em] text-white/58">{{
          tenantCode
        }}</span>
      </div>
    </div>

    <nav
      class="grid min-h-0 flex-1 gap-[18px] overflow-y-auto pr-1.5 overscroll-contain max-[1080px]:grid-cols-2 max-[1080px]:items-start max-[760px]:grid-cols-1"
      aria-label="Main navigation"
    >
      <section v-for="group in menuGroups" :key="group.label" class="grid gap-1.5">
        <span
          class="text-[0.82rem] uppercase tracking-[0.04em] text-white/42"
          :class="isSidebarCollapsed ? 'px-0 text-center' : 'px-2'"
        >
          {{ group.label }}
        </span>

        <RouterLink
          v-for="item in group.items"
          :key="item.title"
          :to="item.to"
          class="flex w-full items-center rounded-2xl py-3 text-left text-sm text-inherit transition duration-200 ease-out hover:bg-white/6 hover:text-white"
          :class="[
            isSidebarCollapsed
              ? 'justify-center px-0'
              : 'gap-3 px-3.5 hover:translate-x-0.5',
            route.path === item.to
              ? 'bg-[linear-gradient(135deg,rgba(47,107,255,0.28),rgba(98,178,255,0.16))] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
              : '',
          ]"
        >
          <component :is="item.icon" class="h-[18px] w-[18px] shrink-0" />
          <span v-if="!isSidebarCollapsed">{{ item.title }}</span>
        </RouterLink>
      </section>
    </nav>
  </aside>
</template>
