<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ElBreadcrumb,
  ElBreadcrumbItem,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElNotification,
} from "element-plus";
import {
  ArrowDown,
  ArrowLeftBold,
  ArrowRightBold,
  Close,
  Expand,
  Fold,
  FullScreen,
  RefreshRight,
} from "@element-plus/icons-vue";
import { useAppShell } from "../../composables/useAppShell";
import { defaultAppPath } from "../../router/routes";
import { logout, useAuthSession } from "../../utils/auth";

const route = useRoute();
const router = useRouter();
const isFullscreen = ref(false);
const { authSession } = useAuthSession();
const {
  isSidebarCollapsed,
  removeVisitedTag,
  resetShell,
  toggleSidebar,
  visitedTags,
} = useAppShell();

const displayName = computed(() => authSession.value?.displayName ?? "Guest");
const primaryRoleLabel = computed(() => authSession.value?.primaryRoleLabel ?? "Guest");
const avatarInitials = computed(() =>
  displayName.value
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase()
);

const breadcrumbItems = computed(() => {
  const items = ["組件"];

  if (route.meta.section) {
    items.push(route.meta.section);
  }

  if (route.meta.title && route.meta.title !== route.meta.section) {
    items.push(route.meta.title);
  }

  return items;
});

function syncFullscreenState() {
  isFullscreen.value = Boolean(document.fullscreenElement);
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } finally {
    syncFullscreenState();
  }
}

function goBack() {
  router.back();
}

function goForward() {
  router.forward();
}

function refreshPage() {
  router.go(0);
}

function openTag(tag) {
  router.push(tag.fullPath);
}

function resolveFallbackTag(fullPath) {
  const currentTags = visitedTags.value;
  const currentIndex = currentTags.findIndex((tag) => tag.fullPath === fullPath);

  return currentTags[currentIndex + 1] ?? currentTags[currentIndex - 1] ?? currentTags[0];
}

async function closeTag(tag) {
  if (tag.affix) {
    return;
  }

  const shouldNavigate = route.fullPath === tag.fullPath;
  const fallbackTag = shouldNavigate ? resolveFallbackTag(tag.fullPath) : null;

  removeVisitedTag(tag.fullPath);

  if (shouldNavigate) {
    await router.push(fallbackTag?.fullPath ?? defaultAppPath);
  }
}

async function handleUserCommand(command) {
  if (command === "profile-center") {
    await router.push({ name: "profile-center" });
    return;
  }

  if (command === "logout") {
    logout();
    resetShell();
    await router.replace({ name: "login" });
    ElNotification({
      title: "已登出",
      message: "您已成功登出系統。",
      type: "success",
      position: "top-right",
    });
  }
}

onMounted(() => {
  syncFullscreenState();
  document.addEventListener("fullscreenchange", syncFullscreenState);
});

onBeforeUnmount(() => {
  document.removeEventListener("fullscreenchange", syncFullscreenState);
});
</script>

<template>
  <header
    class="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-md"
  >
    <div
      class="flex min-h-14 items-center justify-between gap-4 px-5 max-[760px]:flex-col max-[760px]:items-stretch max-[760px]:py-3"
    >
      <div class="flex min-w-0 items-center gap-3">
        <button
          type="button"
          :aria-label="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          class="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900"
          @click="toggleSidebar"
        >
          <component :is="isSidebarCollapsed ? Expand : Fold" class="h-4 w-4" />
        </button>

        <ElBreadcrumb separator="/" class="min-w-0">
          <ElBreadcrumbItem
            v-for="item in breadcrumbItems"
            :key="item"
            class="truncate text-sm text-slate-500"
          >
            <span class="truncate text-sm text-slate-500">{{ item }}</span>
          </ElBreadcrumbItem>
        </ElBreadcrumb>
      </div>

      <div class="flex items-center gap-2 self-end max-[760px]:self-auto">
        <button
          type="button"
          aria-label="Toggle fullscreen"
          class="grid h-9 w-9 place-items-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900"
          @click="toggleFullscreen"
        >
          <FullScreen class="h-4 w-4" :class="{ 'text-slate-900': isFullscreen }" />
        </button>

        <ElDropdown trigger="click" @command="handleUserCommand">
          <button
            type="button"
            class="flex items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-2 text-slate-700 transition hover:border-slate-200 hover:bg-slate-50"
          >
            <span
              class="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-[linear-gradient(135deg,#fde68a_0%,#fca5a5_100%)] text-xs font-semibold text-slate-700"
            >
              {{ avatarInitials }}
            </span>
            <span class="text-sm font-medium">{{ displayName }}</span>
            <ArrowDown class="h-4 w-4 text-slate-400" />
          </button>

          <template #dropdown>
            <ElDropdownMenu>
              <ElDropdownItem command="profile-center">個人中心</ElDropdownItem>
              <ElDropdownItem command="logout">登出系統</ElDropdownItem>
            </ElDropdownMenu>
          </template>
        </ElDropdown>
      </div>
    </div>

    <div
      class="flex min-h-12 items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/70 px-3 max-[760px]:flex-wrap"
    >
      <div class="flex min-w-0 flex-1 items-center gap-1">
        <button
          type="button"
          aria-label="Go back"
          class="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition hover:bg-white hover:text-slate-700"
          @click="goBack"
        >
          <ArrowLeftBold class="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          aria-label="Go forward"
          class="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition hover:bg-white hover:text-slate-700"
          @click="goForward"
        >
          <ArrowRightBold class="h-3.5 w-3.5" />
        </button>

        <div class="ml-1 min-w-0 flex-1 overflow-x-auto">
          <div class="flex min-w-max items-center gap-1 pb-1">
            <button
              v-for="tag in visitedTags"
              :key="tag.fullPath"
              type="button"
              class="group flex h-8 items-center gap-2 rounded-md border px-3 text-sm transition"
              :class="
                route.fullPath === tag.fullPath
                  ? 'border-[#409eff] bg-[#409eff] text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
              "
              @click="openTag(tag)"
            >
              <span class="max-w-[160px] truncate">{{ tag.title }}</span>

              <span
                v-if="!tag.affix"
                class="grid h-3 w-3 place-items-center rounded-full transition group-hover:bg-black/10"
                @click.stop="closeTag(tag)"
              >
                <Close class="h-3 w-3 transition group-hover:opacity-100" />
              </span>
            </button>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span class="hidden text-xs font-medium text-slate-400 md:inline">
          {{ primaryRoleLabel }}
        </span>
        <button
          type="button"
          aria-label="Refresh current page"
          class="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition hover:bg-white hover:text-slate-700"
          @click="refreshPage"
        >
          <RefreshRight class="h-4 w-4" />
        </button>
      </div>
    </div>
  </header>
</template>
