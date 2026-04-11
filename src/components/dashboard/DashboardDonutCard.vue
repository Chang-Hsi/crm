<script setup>
import VChart from "vue-echarts";
import { ensureDashboardCharts } from "./echartsSetup";

ensureDashboardCharts();

defineProps({
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  option: { type: Object, required: true },
  legends: { type: Array, default: () => [] },
  actionText: { type: String, default: "" },
});

const emit = defineEmits(["action"]);
</script>

<template>
  <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
    <div class="flex items-start justify-between gap-3">
      <div class="grid gap-1">
        <h3 class="text-base font-semibold text-slate-900">{{ title }}</h3>
        <p class="text-xs text-slate-500">{{ subtitle }}</p>
      </div>
      <button
        v-if="actionText"
        type="button"
        class="text-xs font-medium text-[#409eff] transition hover:opacity-80"
        @click="emit('action')"
      >
        {{ actionText }}
      </button>
    </div>

    <div class="mt-3 grid grid-cols-[120px_1fr] gap-3">
      <div class="h-[120px]">
        <VChart :option="option" autoresize class="h-full w-full" />
      </div>
      <div class="grid content-start gap-2">
        <div
          v-for="item in legends"
          :key="item.label"
          class="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-2 py-1.5"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="h-2 w-2 shrink-0 rounded-full" :style="{ background: item.color }"></span>
            <p class="truncate text-xs text-slate-600">{{ item.label }}</p>
          </div>
          <p class="shrink-0 text-xs font-medium text-slate-900">{{ item.value }}</p>
        </div>
      </div>
    </div>

    <div class="mt-3">
      <slot />
    </div>
  </article>
</template>
