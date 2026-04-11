<script setup>
import VChart from "vue-echarts";
import { ensureDashboardCharts } from "./echartsSetup";

ensureDashboardCharts();

defineProps({
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  option: { type: Object, required: true },
  stats: { type: Array, default: () => [] },
  actionText: { type: String, default: "" },
  height: { type: Number, default: 260 },
});

const emit = defineEmits(["action"]);
</script>

<template>
  <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
    <div class="flex items-start justify-between gap-3">
      <div class="grid gap-1">
        <h3 class="text-lg font-semibold text-slate-900">{{ title }}</h3>
        <p class="text-sm text-slate-500">{{ subtitle }}</p>
      </div>
      <button
        v-if="actionText"
        type="button"
        class="text-sm font-medium text-[#409eff] transition hover:opacity-80"
        @click="emit('action')"
      >
        {{ actionText }}
      </button>
    </div>

    <div v-if="stats.length > 0" class="mt-4 grid gap-3 md:grid-cols-3">
      <article
        v-for="item in stats"
        :key="item.label"
        class="rounded-2xl bg-slate-50 px-3 py-3"
      >
        <p class="text-xs text-slate-500">{{ item.label }}</p>
        <p class="mt-1 text-lg font-semibold text-slate-900">{{ item.value }}</p>
        <p v-if="item.helper" class="mt-1 text-xs text-slate-500">{{ item.helper }}</p>
      </article>
    </div>

    <div class="mt-4" :style="{ height: `${height}px` }">
      <VChart :option="option" autoresize class="h-full w-full" />
    </div>

    <div class="mt-4">
      <slot />
    </div>
  </article>
</template>
