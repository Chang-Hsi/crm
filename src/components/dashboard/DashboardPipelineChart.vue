<script setup>
import VChart from "vue-echarts";
import { ensureDashboardCharts } from "./echartsSetup";

ensureDashboardCharts();

defineProps({
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  stats: { type: Array, default: () => [] },
  option: { type: Object, required: true },
});

const emit = defineEmits(["action"]);
</script>

<template>
  <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="grid gap-1">
        <h2 class="text-lg font-semibold text-slate-900">{{ title }}</h2>
        <p class="text-sm text-slate-500">{{ subtitle }}</p>
      </div>
      <button
        type="button"
        class="text-sm font-medium text-[#409eff] transition hover:opacity-80"
        @click="emit('action')"
      >
        查看完整 Pipeline
      </button>
    </div>

    <div class="mt-4 grid gap-3 md:grid-cols-4">
      <article
        v-for="item in stats"
        :key="item.label"
        class="rounded-2xl bg-slate-50 px-4 py-3"
      >
        <p class="text-xs text-slate-500">{{ item.label }}</p>
        <p class="mt-2 text-xl font-semibold text-slate-900">{{ item.value }}</p>
        <p class="mt-1 text-xs text-slate-500">{{ item.helper }}</p>
      </article>
    </div>

    <div class="mt-5 h-[320px]">
      <VChart :option="option" autoresize class="h-full w-full" />
    </div>
  </article>
</template>
