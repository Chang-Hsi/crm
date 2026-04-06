<script setup>
import { computed, reactive, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElNotification,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTimePicker,
} from "element-plus";
import { ArrowLeft, CirclePlus, Delete, DocumentCopy } from "@element-plus/icons-vue";
import {
  actionItemStatusMap,
  accountOptions,
  activityDirectory,
  opportunityOptions,
  partnerDirectory,
  projectOptions,
  supportTicketOptions,
  userList,
  visitFormatMap,
  visitStatusMap,
  visitTemplates,
  visitTypeMap,
} from "../../data/visits";
import { useVisitsStore } from "../../composables/useVisitsStore";
import { useMeetingsStore } from "../../composables/useMeetingsStore";
import SimpleEditorBridge from "../../components/tiptap/SimpleEditorBridge.vue";

const route = useRoute();
const router = useRouter();
const { createVisit, getNextVisitNo, getVisitById, updateVisit } = useVisitsStore();
const { meetings } = useMeetingsStore();

const visitId = computed(() => String(route.params.visitId ?? ""));
const isEditMode = computed(() => route.name === "engagement-visit-edit");

const userOptions = userList
  .filter((item) => item.status === "active")
  .map((item) => ({ value: item.id, label: item.name }));

const visitTypeOptions = Object.entries(visitTypeMap).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

const statusOptions = Object.entries(visitStatusMap).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

const formatOptions = Object.entries(visitFormatMap).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

const meetingOptions = computed(() =>
  meetings.value.map((item) => ({
    value: item.id,
    label: `${item.meetingNo}｜${item.title}`,
  }))
);

function toPlainArray(input) {
  return String(input || "")
    .split(/[、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function notify(message, title = "已更新", type = "success") {
  ElNotification({
    title,
    message,
    type,
    position: "top-right",
  });
}

function createEmptyActionItem(index = 1) {
  return {
    id: `a-${Date.now()}-${index}`,
    content: "",
    ownerId: "u-001",
    dueDate: new Date().toISOString().slice(0, 10),
    status: "pending",
    note: "",
    isConvertedTask: false,
    taskNo: "",
  };
}

function createEmptyForm() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    visitNo: getNextVisitNo(),
    title: "",
    visitType: "customer_visit",
    status: "draft",
    isImportant: false,
    isFirstVisit: false,
    visitDate: today,
    startTime: "09:00",
    endTime: "10:00",
    format: "onsite",
    location: "",
    address: "",
    ownerId: "u-001",
    collaboratorIds: ["u-001"],
    visitTarget: "",
    customerParticipantsInput: "",
    partnerParticipantsInput: "",
    contactsInput: "",
    customerId: "",
    opportunityId: "",
    projectId: "",
    activityId: "",
    partnerId: "",
    supportTicketId: "",
    relatedMeetingId: "",
    objective: "",
    summary: "",
    richContent: "",
    observations: "",
    risks: "",
    conclusion: "",
    tagsInput: "",
    attachmentsInput: "",
    notes: "",
    nextVisitSuggestedAt: "",
    selectedTemplateId: "",
    actionItems: [createEmptyActionItem()],
  };
}

const form = reactive(createEmptyForm());

function hydrateForm() {
  Object.assign(form, createEmptyForm());

  if (!isEditMode.value) {
    return;
  }

  const target = getVisitById(visitId.value);
  if (!target) {
    notify("找不到拜訪紀錄，已返回列表", "提醒", "warning");
    router.replace({ name: "engagement-visits" });
    return;
  }

  Object.assign(form, {
    visitNo: target.visitNo,
    title: target.title,
    visitType: target.visitType,
    status: target.status,
    isImportant: target.isImportant,
    isFirstVisit: target.isFirstVisit,
    visitDate: target.visitDate,
    startTime: target.startTime,
    endTime: target.endTime,
    format: target.format,
    location: target.location,
    address: target.address,
    ownerId: target.ownerId,
    collaboratorIds: [...target.collaboratorIds],
    visitTarget: target.visitTarget,
    customerParticipantsInput: (target.customerParticipants || []).join("、"),
    partnerParticipantsInput: (target.partnerParticipants || []).join("、"),
    contactsInput: (target.contacts || []).join("、"),
    customerId: target.customerId,
    opportunityId: target.opportunityId,
    projectId: target.projectId,
    activityId: target.activityId,
    partnerId: target.partnerId,
    supportTicketId: target.supportTicketId,
    relatedMeetingId: target.relatedMeetingId,
    objective: target.objective,
    summary: target.summary,
    richContent: target.richContent,
    observations: target.observations,
    risks: target.risks,
    conclusion: target.conclusion,
    tagsInput: (target.tags || []).join("、"),
    attachmentsInput: (target.attachments || []).join("、"),
    notes: target.notes,
    nextVisitSuggestedAt:
      target.nextVisitSuggestedAt &&
      target.nextVisitSuggestedAt !== "待安排" &&
      target.nextVisitSuggestedAt !== "無"
        ? target.nextVisitSuggestedAt
        : "",
    selectedTemplateId: "",
    actionItems:
      target.actionItems.length > 0
        ? target.actionItems.map((item, index) => ({
            id: item.id || `a-${Date.now()}-${index + 1}`,
            content: item.content || "",
            ownerId: item.ownerId || "u-001",
            dueDate: item.dueDate || new Date().toISOString().slice(0, 10),
            status: item.status || "pending",
            note: item.note || "",
            isConvertedTask: Boolean(item.isConvertedTask || item.taskNo),
            taskNo: item.taskNo || "",
          }))
        : [createEmptyActionItem()],
  });
}

hydrateForm();

watch(
  () => [route.name, route.params.visitId],
  () => {
    hydrateForm();
  }
);

const pageTitle = computed(() => (isEditMode.value ? "編輯拜訪紀錄" : "新增拜訪紀錄"));
const pageDescription = computed(() =>
  isEditMode.value
    ? "更新拜訪內容、現場觀察與後續待辦追蹤"
    : "建立拜訪基本資訊、內容與後續待辦"
);

function goBack() {
  if (isEditMode.value) {
    router.push({
      name: "engagement-visit-detail",
      params: { visitId: visitId.value },
    });
    return;
  }

  router.push({ name: "engagement-visits" });
}

function addActionItem() {
  form.actionItems.push(createEmptyActionItem(form.actionItems.length + 1));
}

function removeActionItem(index) {
  if (form.actionItems.length === 1) {
    Object.assign(form.actionItems[0], createEmptyActionItem(1));
    return;
  }

  form.actionItems.splice(index, 1);
}

function applyTemplate() {
  const template = visitTemplates.find((item) => item.id === form.selectedTemplateId);
  if (!template) {
    return;
  }

  form.visitType = template.type;
  form.objective = template.objective;
  form.summary = template.summary;
  form.richContent = template.richContent;
  form.observations = template.observations;
  form.risks = template.risks;
  form.conclusion = template.conclusion;

  notify(`已套用模板：${template.name}`);
}

function buildPayload(nextStatus = form.status) {
  return {
    visitNo: form.visitNo,
    title: form.title.trim(),
    visitType: form.visitType,
    status: nextStatus,
    isImportant: form.isImportant,
    isFirstVisit: form.isFirstVisit,
    visitDate: form.visitDate,
    startTime: form.startTime,
    endTime: form.endTime,
    format: form.format,
    location: form.location.trim(),
    address: form.address.trim(),
    ownerId: form.ownerId,
    collaboratorIds: form.collaboratorIds,
    visitTarget: form.visitTarget.trim(),
    customerParticipants: toPlainArray(form.customerParticipantsInput),
    partnerParticipants: toPlainArray(form.partnerParticipantsInput),
    contacts: toPlainArray(form.contactsInput),
    customerId: form.customerId,
    opportunityId: form.opportunityId,
    projectId: form.projectId,
    activityId: form.activityId,
    partnerId: form.partnerId,
    supportTicketId: form.supportTicketId,
    relatedMeetingId: form.relatedMeetingId,
    objective: form.objective.trim(),
    summary: form.summary.trim(),
    richContent: form.richContent,
    observations: form.observations.trim(),
    risks: form.risks.trim(),
    conclusion: form.conclusion.trim(),
    actionItems: form.actionItems
      .map((item, index) => ({
        id: item.id || `a-${Date.now()}-${index + 1}`,
        content: String(item.content || "").trim(),
        ownerId: item.ownerId,
        dueDate: item.dueDate,
        status: item.status,
        note: String(item.note || "").trim(),
        isConvertedTask: Boolean(item.isConvertedTask || item.taskNo),
        taskNo: String(item.taskNo || "").trim(),
      }))
      .filter((item) => item.content),
    tags: toPlainArray(form.tagsInput),
    attachments: toPlainArray(form.attachmentsInput),
    notes: form.notes.trim(),
    nextVisitSuggestedAt: form.nextVisitSuggestedAt || "待安排",
  };
}

function submit(nextStatus = form.status) {
  if (!form.title.trim()) {
    notify("請輸入拜訪主題", "缺少資訊", "warning");
    return;
  }

  if (!form.ownerId) {
    notify("請選擇拜訪主責人", "缺少資訊", "warning");
    return;
  }

  const payload = buildPayload(nextStatus);

  if (isEditMode.value) {
    const updated = updateVisit(visitId.value, payload, "林美雅");
    if (!updated) {
      notify("更新失敗，找不到資料", "錯誤", "error");
      return;
    }

    notify(`${updated.title} 已更新`);
    router.push({
      name: "engagement-visit-detail",
      params: { visitId: updated.id },
    });
    return;
  }

  const created = createVisit(payload, "林美雅");
  notify(`${created.title} 已建立`);
  router.push({
    name: "engagement-visit-detail",
    params: { visitId: created.id },
  });
}
</script>

<template>
  <div class="min-h-full p-8">
    <section class="grid gap-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-3">
          <ElButton text :icon="ArrowLeft" class="!justify-start !px-0" @click="goBack">
            {{ isEditMode ? "返回拜訪詳情" : "返回拜訪列表" }}
          </ElButton>

          <div class="grid gap-1">
            <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
              {{ pageTitle }}
            </h1>
            <p class="text-sm text-slate-500">{{ pageDescription }}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton @click="submit('draft')">儲存草稿</ElButton>
          <ElButton type="primary" @click="submit('completed')">儲存並完成</ElButton>
        </div>
      </header>

      <ElForm label-position="top" class="grid gap-6">
        <ElCard shadow="never">
          <template #header>
            <span class="text-sm font-semibold text-slate-800">基本資料</span>
          </template>
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ElFormItem label="拜訪主題"><ElInput v-model="form.title" /></ElFormItem>
            <ElFormItem label="拜訪編號"><ElInput v-model="form.visitNo" /></ElFormItem>
            <ElFormItem label="拜訪類型"
              ><ElSelect v-model="form.visitType"
                ><ElOption
                  v-for="item in visitTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="拜訪狀態"
              ><ElSelect v-model="form.status"
                ><ElOption
                  v-for="item in statusOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="重要拜訪"><ElSwitch v-model="form.isImportant" /></ElFormItem>
            <ElFormItem label="是否初訪"><ElSwitch v-model="form.isFirstVisit" /></ElFormItem>
          </div>
        </ElCard>

        <ElCard shadow="never">
          <template #header>
            <span class="text-sm font-semibold text-slate-800">時間與地點</span>
          </template>
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <ElFormItem label="拜訪日期"
              ><ElDatePicker
                v-model="form.visitDate"
                type="date"
                value-format="YYYY-MM-DD"
                class="!w-full"
            /></ElFormItem>
            <ElFormItem label="開始時間"
              ><ElTimePicker
                v-model="form.startTime"
                value-format="HH:mm"
                format="HH:mm"
                class="!w-full"
            /></ElFormItem>
            <ElFormItem label="結束時間"
              ><ElTimePicker
                v-model="form.endTime"
                value-format="HH:mm"
                format="HH:mm"
                class="!w-full"
            /></ElFormItem>
            <ElFormItem label="拜訪形式"
              ><ElSelect v-model="form.format"
                ><ElOption
                  v-for="item in formatOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="拜訪地點"><ElInput v-model="form.location" /></ElFormItem>
          </div>
          <ElFormItem label="地址"><ElInput v-model="form.address" /></ElFormItem>
        </ElCard>

        <ElCard shadow="never">
          <template #header>
            <span class="text-sm font-semibold text-slate-800">參與者</span>
          </template>
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <ElFormItem label="拜訪主責人"
              ><ElSelect v-model="form.ownerId"
                ><ElOption
                  v-for="item in userOptions"
                  :key="`owner-${item.value}`"
                  :label="item.label"
                  :value="item.value" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="協同拜訪人員"
              ><ElSelect v-model="form.collaboratorIds" multiple collapse-tags
                ><ElOption
                  v-for="item in userOptions"
                  :key="`collab-${item.value}`"
                  :label="item.label"
                  :value="item.value" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="受訪對象"><ElInput v-model="form.visitTarget" /></ElFormItem>
            <ElFormItem label="客戶端參與者"
              ><ElInput
                v-model="form.customerParticipantsInput"
                placeholder="以頓號或逗號分隔"
            /></ElFormItem>
            <ElFormItem label="夥伴端參與者"
              ><ElInput
                v-model="form.partnerParticipantsInput"
                placeholder="以頓號或逗號分隔"
            /></ElFormItem>
            <ElFormItem label="關聯聯絡人"
              ><ElInput v-model="form.contactsInput" placeholder="以頓號或逗號分隔"
            /></ElFormItem>
          </div>
        </ElCard>

        <ElCard shadow="never">
          <template #header>
            <span class="text-sm font-semibold text-slate-800">關聯資料</span>
          </template>
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <ElFormItem label="客戶"
              ><ElSelect v-model="form.customerId" clearable
                ><ElOption
                  v-for="item in accountOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="商機"
              ><ElSelect v-model="form.opportunityId" clearable
                ><ElOption
                  v-for="item in opportunityOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="專案"
              ><ElSelect v-model="form.projectId" clearable
                ><ElOption
                  v-for="item in projectOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="活動"
              ><ElSelect v-model="form.activityId" clearable
                ><ElOption
                  v-for="item in activityDirectory"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="夥伴"
              ><ElSelect v-model="form.partnerId" clearable
                ><ElOption
                  v-for="item in partnerDirectory"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="支援案件"
              ><ElSelect v-model="form.supportTicketId" clearable
                ><ElOption
                  v-for="item in supportTicketOptions"
                  :key="item.id"
                  :label="item.title"
                  :value="item.id" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="關聯會議紀錄"
              ><ElSelect v-model="form.relatedMeetingId" clearable
                ><ElOption
                  v-for="item in meetingOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value" /></ElSelect
            ></ElFormItem>
          </div>
        </ElCard>

        <ElCard shadow="never">
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-sm font-semibold text-slate-800">內容區</span>
              <div class="flex items-center gap-2">
                <ElSelect
                  v-model="form.selectedTemplateId"
                  placeholder="套用拜訪模板"
                  class="!w-56"
                  clearable
                >
                  <ElOption
                    v-for="item in visitTemplates"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id"
                  />
                </ElSelect>
                <ElButton :icon="DocumentCopy" @click="applyTemplate">套用模板</ElButton>
              </div>
            </div>
          </template>

          <div class="grid gap-3">
            <ElFormItem label="拜訪目的"><ElInput v-model="form.objective" /></ElFormItem>
            <ElFormItem label="拜訪摘要"
              ><ElInput v-model="form.summary" type="textarea" :rows="3"
            /></ElFormItem>
            <ElFormItem label="討論內容">
              <SimpleEditorBridge v-model="form.richContent" />
            </ElFormItem>
            <ElFormItem label="現場觀察"
              ><ElInput v-model="form.observations" type="textarea" :rows="3"
            /></ElFormItem>
            <ElFormItem label="問題 / 風險"
              ><ElInput v-model="form.risks" type="textarea" :rows="3"
            /></ElFormItem>
            <ElFormItem label="結論 / 判斷"
              ><ElInput v-model="form.conclusion" type="textarea" :rows="3"
            /></ElFormItem>
          </div>
        </ElCard>

        <ElCard shadow="never">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-slate-800">待辦事項</span>
              <ElButton size="small" :icon="CirclePlus" @click="addActionItem"
                >新增待辦</ElButton
              >
            </div>
          </template>

          <div class="grid gap-3">
            <article
              v-for="(item, index) in form.actionItems"
              :key="item.id"
              class="rounded-xl border border-slate-200 p-3"
            >
              <div class="grid gap-3 xl:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                <ElInput v-model="item.content" placeholder="待辦內容" />
                <ElSelect v-model="item.ownerId" placeholder="負責人">
                  <ElOption
                    v-for="user in userOptions"
                    :key="`owner-${user.value}`"
                    :label="user.label"
                    :value="user.value"
                  />
                </ElSelect>
                <ElDatePicker
                  v-model="item.dueDate"
                  type="date"
                  value-format="YYYY-MM-DD"
                  class="!w-full"
                />
                <ElSelect v-model="item.status">
                  <ElOption
                    v-for="(meta, statusKey) in actionItemStatusMap"
                    :key="statusKey"
                    :label="meta.label"
                    :value="statusKey"
                  />
                </ElSelect>
                <ElButton text type="danger" :icon="Delete" @click="removeActionItem(index)"
                  >移除</ElButton
                >
              </div>

              <div class="mt-2 grid gap-2 md:grid-cols-2">
                <ElInput v-model="item.note" placeholder="備註" />
                <ElInput v-model="item.taskNo" placeholder="關聯任務編號 (選填)" />
              </div>
            </article>
          </div>
        </ElCard>

        <ElCard shadow="never">
          <template #header>
            <span class="text-sm font-semibold text-slate-800">補充資料</span>
          </template>
          <div class="grid gap-3 md:grid-cols-2">
            <ElFormItem label="下次拜訪建議日期"
              ><ElDatePicker
                v-model="form.nextVisitSuggestedAt"
                type="date"
                value-format="YYYY-MM-DD"
                class="!w-full"
            /></ElFormItem>
            <ElFormItem label="標籤"
              ><ElInput v-model="form.tagsInput" placeholder="以頓號或逗號分隔"
            /></ElFormItem>
            <ElFormItem label="附件"
              ><ElInput
                v-model="form.attachmentsInput"
                placeholder="附件名稱，使用頓號或逗號分隔"
            /></ElFormItem>
            <ElFormItem label="備註" class="md:col-span-2"
              ><ElInput v-model="form.notes" type="textarea" :rows="3"
            /></ElFormItem>
          </div>
        </ElCard>
      </ElForm>
    </section>
  </div>
</template>

<style scoped>
:deep(.el-form-item) {
  margin-bottom: 12px;
}
</style>
