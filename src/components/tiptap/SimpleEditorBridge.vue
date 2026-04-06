<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import React from "react";
import { createRoot } from "react-dom/client";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue"]);

const hostRef = ref(null);
let root = null;

function handleChange(html) {
  emit("update:modelValue", html);
}

function renderReactEditor() {
  if (!root) {
    return;
  }

  root.render(
    React.createElement(SimpleEditor, {
      value: props.modelValue || "",
      onChange: handleChange,
    })
  );
}

onMounted(() => {
  if (!hostRef.value) {
    return;
  }

  root = createRoot(hostRef.value);
  renderReactEditor();
});

watch(
  () => props.modelValue,
  () => {
    renderReactEditor();
  }
);

onBeforeUnmount(() => {
  if (root) {
    root.unmount();
    root = null;
  }
});
</script>

<template>
  <div ref="hostRef" class="simple-editor-bridge" />
</template>

<style scoped>
.simple-editor-bridge {
  width: 100%;
}
</style>
