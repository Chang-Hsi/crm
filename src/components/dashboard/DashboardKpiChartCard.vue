<script setup>
import { computed } from "vue";
import VChart from "vue-echarts";
import { ensureDashboardCharts } from "./echartsSetup";

ensureDashboardCharts();

const props = defineProps({
  title: { type: String, required: true },
  value: { type: String, required: true },
  deltaText: { type: String, default: "" },
  deltaTone: { type: String, default: "text-slate-500" },
  helper: { type: String, default: "" },
  trendData: { type: Array, default: () => [] },
  trendColor: { type: String, default: "#0f766e" },
});

const emit = defineEmits(["click"]);

const chartOption = computed(() => ({
  animationDuration: 350,
  grid: { top: 4, right: 2, bottom: 2, left: 2 },
  xAxis: {
    type: "category",
    data: props.trendData.map((_, index) => index + 1),
    boundaryGap: false,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false },
  },
  yAxis: {
    type: "value",
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { show: false },
  },
  tooltip: {
    trigger: "axis",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 0,
    textStyle: { color: "#fff", fontSize: 11 },
  },
  series: [
    {
      type: "line",
      data: props.trendData,
      smooth: true,
      symbol: "none",
      lineStyle: { width: 2, color: props.trendColor },
      areaStyle: {
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: `${props.trendColor}88` },
            { offset: 1, color: `${props.trendColor}08` },
          ],
        },
      },
    },
  ],
}));
</script>

<template>
  <button
    type="button"
    class="kpi-card group rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm shadow-slate-200/60 transition hover:border-slate-300"
    @click="emit('click')"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="grid gap-1">
        <p class="text-xs font-medium tracking-[0.08em] text-slate-500">
          {{ title }}
        </p>
        <p class="text-2xl font-semibold tracking-[-0.03em] text-slate-900">
          {{ value }}
        </p>
      </div>
      <span
        class="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500 transition group-hover:bg-slate-900 group-hover:text-white"
      >
        前往
      </span>
    </div>

    <div class="mt-3 h-[56px] w-full">
      <VChart :option="chartOption" autoresize class="h-full w-full" />
    </div>

    <div class="mt-2 flex items-center justify-between gap-3">
      <p :class="['text-xs font-medium', deltaTone]">{{ deltaText }}</p>
      <p class="text-xs text-slate-400">{{ helper }}</p>
    </div>
  </button>
</template>

<style scoped>
.kpi-card {
  min-height: 180px;
}
</style>
