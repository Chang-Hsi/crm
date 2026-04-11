<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
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
const sidebarScrollContainerRef = ref(null);
const activeNavItemRef = ref(null);
const navItemRefMap = new Map();

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

function resolveElement(target) {
  if (target instanceof HTMLElement) {
    return target;
  }

  if (target?.$el instanceof HTMLElement) {
    return target.$el;
  }

  return null;
}

function setNavItemRef(path, target) {
  const element = resolveElement(target);

  if (!element) {
    navItemRefMap.delete(path);
    return;
  }

  navItemRefMap.set(path, element);

  if (route.path === path) {
    activeNavItemRef.value = element;
  }
}

function isElementVisibleInContainer(element, container) {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  return elementRect.top >= containerRect.top && elementRect.bottom <= containerRect.bottom;
}

function scrollActiveItemIntoViewIfNeeded() {
  const container = sidebarScrollContainerRef.value;
  if (!container) {
    return;
  }

  const cachedActiveItem =
    activeNavItemRef.value instanceof HTMLElement &&
    activeNavItemRef.value.dataset.navTo === route.path
      ? activeNavItemRef.value
      : null;

  const activeItem =
    navItemRefMap.get(route.path) ??
    cachedActiveItem ??
    container.querySelector(`[data-nav-to="${route.path}"]`);

  if (!(activeItem instanceof HTMLElement)) {
    return;
  }

  activeNavItemRef.value = activeItem;

  if (isElementVisibleInContainer(activeItem, container)) {
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const activeItemRect = activeItem.getBoundingClientRect();
  const distance = Math.max(
    Math.abs(activeItemRect.top - containerRect.top),
    Math.abs(activeItemRect.bottom - containerRect.bottom)
  );

  activeItem.scrollIntoView({
    block: "nearest",
    inline: "nearest",
    behavior: distance > 300 ? "auto" : "smooth",
  });
}

onMounted(async () => {
  await nextTick();
  scrollActiveItemIntoViewIfNeeded();
});

watch(
  () => route.path,
  async () => {
    await nextTick();
    scrollActiveItemIntoViewIfNeeded();
  }
);
</script>

<template>
  <aside
    class="relative flex h-full min-h-0 flex-col gap-6 overflow-hidden border-r border-white/10 bg-[radial-gradient(circle_at_top,rgba(111,147,255,0.24),transparent_22%),linear-gradient(180deg,#16203a_0%,#101729_100%)] py-6 text-white/70 transition-[padding] duration-300"
    :class="isSidebarCollapsed ? 'px-3' : 'px-5'"
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
      ref="sidebarScrollContainerRef"
      class="grid min-h-0 flex-1 gap-[18px] overflow-y-auto pr-1.5 overscroll-contain"
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
          :ref="(el) => setNavItemRef(item.to, el)"
          :data-nav-to="item.to"
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
