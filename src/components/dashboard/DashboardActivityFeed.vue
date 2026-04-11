<script setup>
import VChart from "vue-echarts";
import { ElTag } from "element-plus";
import { ensureDashboardCharts } from "./echartsSetup";

ensureDashboardCharts();

defineProps({
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  option: { type: Object, required: true },
  items: { type: Array, default: () => [] },
});

const emit = defineEmits(["action", "item-click"]);
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
        查看完整 Timeline
      </button>
    </div>

    <div class="mt-4 h-[210px]">
      <VChart :option="option" autoresize class="h-full w-full" />
    </div>

    <div class="mt-4 grid gap-3">
      <article
        v-for="item in items"
        :key="item.id"
        class="rounded-2xl border border-slate-200 px-4 py-3"
      >
        <button
          type="button"
          class="grid w-full gap-1 text-left"
          @click="emit('item-click', item)"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <ElTag size="small" effect="light">{{ item.kind }}</ElTag>
              <p class="font-medium text-slate-900">{{ item.title }}</p>
            </div>
            <span class="text-xs text-slate-400">{{ item.occurredText }}</span>
          </div>
          <p class="text-sm text-slate-600">{{ item.summary }}</p>
        </button>
      </article>
    </div>
  </article>
</template>
