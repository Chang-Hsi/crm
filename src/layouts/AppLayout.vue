<script setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '../components/layouts/AppHeader.vue'
import AppSidebar from '../components/layouts/AppSidebar.vue'
import { useAppShell } from '../composables/useAppShell'

const route = useRoute()
const { addVisitedTag, isSidebarCollapsed } = useAppShell()

watch(
  () => route.fullPath,
  () => {
    addVisitedTag(route)
  },
  { immediate: true },
)
</script>

<template>
  <div
    class="grid h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.10),transparent_24%),linear-gradient(180deg,#f7faff_0%,#eef3f9_100%)] transition-[grid-template-columns] duration-300"
    :class="
      isSidebarCollapsed
        ? 'grid-cols-[88px_minmax(0,1fr)]'
        : 'grid-cols-[280px_minmax(0,1fr)]'
    "
  >
    <AppSidebar />

    <div class="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      <AppHeader />

      <main class="min-h-0 overflow-y-auto px-8 py-7 max-[760px]:px-5">
        <section
          class="min-h-full overflow-hidden rounded-[28px] border border-slate-200/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,251,255,0.98))] shadow-[0_20px_60px_rgba(15,23,42,0.12)]"
        >
          <RouterView v-slot="{ Component, route: currentRoute }">
            <KeepAlive>
              <component :is="Component" :key="currentRoute.fullPath" />
            </KeepAlive>
          </RouterView>
        </section>
      </main>
    </div>
  </div>
</template>
