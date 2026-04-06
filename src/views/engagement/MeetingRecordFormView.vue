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
  accountOptions,
  actionItemStatusMap,
  activityDirectory,
  meetingFormatMap,
  meetingStatusMap,
  meetingTemplates,
  meetingTypeMap,
  opportunityOptions,
  partnerDirectory,
  projectOptions,
  supportTicketOptions,
  userList,
} from "../../data/meetings";
import { useMeetingsStore } from "../../composables/useMeetingsStore";
import SimpleEditorBridge from "../../components/tiptap/SimpleEditorBridge.vue";

const route = useRoute();
const router = useRouter();
const {
  createMeeting,
  getMeetingById,
  getNextMeetingNo,
  updateMeeting,
} = useMeetingsStore();

const meetingId = computed(() => String(route.params.meetingId ?? ""));
const isEditMode = computed(() => route.name === "engagement-meeting-edit");

const userOptions = userList
  .filter((item) => item.status === "active")
  .map((item) => ({ value: item.id, label: item.name }));

const meetingTypeOptions = Object.entries(meetingTypeMap).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

const statusOptions = Object.entries(meetingStatusMap).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

const formatOptions = Object.entries(meetingFormatMap).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

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

function createEmptyDecision(index = 1) {
  return {
    id: `d-${Date.now()}-${index}`,
    title: "",
    description: "",
  };
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
    meetingNo: getNextMeetingNo(),
    title: "",
    meetingType: "internal_sync",
    status: "draft",
    isImportant: false,
    isRecurring: false,
    meetingDate: today,
    startTime: "09:00",
    endTime: "10:00",
    format: "online",
    location: "",
    meetingLink: "",
    hostId: "u-001",
    recorderId: "u-001",
    internalParticipants: ["u-001"],
    externalParticipantsInput: "",
    contactsInput: "",
    customerId: "",
    opportunityId: "",
    projectId: "",
    activityId: "",
    partnerId: "",
    supportTicketId: "",
    objective: "",
    agendaSummary: "",
    richContent: "",
    risks: "",
    tagsInput: "",
    attachmentsInput: "",
    notes: "",
    decisions: [createEmptyDecision()],
    actionItems: [createEmptyActionItem()],
    selectedTemplateId: "",
  };
}

const form = reactive(createEmptyForm());

function hydrateForm() {
  Object.assign(form, createEmptyForm());

  if (!isEditMode.value) {
    return;
  }

  const target = getMeetingById(meetingId.value);
  if (!target) {
    notify("找不到會議紀錄，已返回列表", "提醒", "warning");
    router.replace({ name: "engagement-meetings" });
    return;
  }

  Object.assign(form, {
    meetingNo: target.meetingNo,
    title: target.title,
    meetingType: target.meetingType,
    status: target.status,
    isImportant: target.isImportant,
    isRecurring: target.isRecurring,
    meetingDate: target.meetingDate,
    startTime: target.startTime,
    endTime: target.endTime,
    format: target.format,
    location: target.location,
    meetingLink: target.meetingLink,
    hostId: target.hostId,
    recorderId: target.recorderId,
    internalParticipants: [...target.internalParticipants],
    externalParticipantsInput: (target.externalParticipants || []).join("、"),
    contactsInput: (target.contacts || []).join("、"),
    customerId: target.customerId,
    opportunityId: target.opportunityId,
    projectId: target.projectId,
    activityId: target.activityId,
    partnerId: target.partnerId,
    supportTicketId: target.supportTicketId,
    objective: target.objective,
    agendaSummary: target.agendaSummary,
    richContent: target.richContent,
    risks: target.risks,
    tagsInput: (target.tags || []).join("、"),
    attachmentsInput: (target.attachments || []).join("、"),
    notes: target.notes,
    decisions:
      target.decisions.length > 0
        ? target.decisions.map((item, index) => ({
            id: item.id || `d-${Date.now()}-${index + 1}`,
            title: item.title || "",
            description: item.description || "",
          }))
        : [createEmptyDecision()],
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
    selectedTemplateId: "",
  });
}

hydrateForm();

watch(
  () => [route.name, route.params.meetingId],
  () => {
    hydrateForm();
  }
);

const pageTitle = computed(() => (isEditMode.value ? "編輯會議紀錄" : "新增會議紀錄"));
const pageDescription = computed(() =>
  isEditMode.value
    ? "更新會議內容、決議事項與待辦追蹤"
    : "建立會議基本資訊、內容與後續待辦"
);

function goBack() {
  if (isEditMode.value) {
    router.push({
      name: "engagement-meeting-detail",
      params: { meetingId: meetingId.value },
    });
    return;
  }

  router.push({ name: "engagement-meetings" });
}

function addDecision() {
  form.decisions.push(createEmptyDecision(form.decisions.length + 1));
}

function removeDecision(index) {
  if (form.decisions.length === 1) {
    form.decisions[0].title = "";
    form.decisions[0].description = "";
    return;
  }

  form.decisions.splice(index, 1);
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
  const template = meetingTemplates.find((item) => item.id === form.selectedTemplateId);
  if (!template) {
    return;
  }

  form.meetingType = template.type;
  form.objective = template.objective;
  form.agendaSummary = template.agendaSummary;
  form.richContent = template.richContent;

  notify(`已套用模板：${template.name}`);
}

function buildPayload(nextStatus = form.status) {
  return {
    meetingNo: form.meetingNo,
    title: form.title.trim(),
    meetingType: form.meetingType,
    status: nextStatus,
    isImportant: form.isImportant,
    isRecurring: form.isRecurring,
    meetingDate: form.meetingDate,
    startTime: form.startTime,
    endTime: form.endTime,
    format: form.format,
    location: form.location.trim(),
    meetingLink: form.meetingLink.trim(),
    hostId: form.hostId,
    recorderId: form.recorderId,
    internalParticipants: form.internalParticipants,
    externalParticipants: toPlainArray(form.externalParticipantsInput),
    contacts: toPlainArray(form.contactsInput),
    customerId: form.customerId,
    opportunityId: form.opportunityId,
    projectId: form.projectId,
    activityId: form.activityId,
    partnerId: form.partnerId,
    supportTicketId: form.supportTicketId,
    objective: form.objective.trim(),
    agendaSummary: form.agendaSummary.trim(),
    richContent: form.richContent,
    risks: form.risks.trim(),
    decisions: form.decisions
      .map((item, index) => ({
        id: item.id || `d-${Date.now()}-${index + 1}`,
        title: String(item.title || "").trim(),
        description: String(item.description || "").trim(),
      }))
      .filter((item) => item.title || item.description),
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
  };
}

function submit(nextStatus = form.status) {
  if (!form.title.trim()) {
    notify("請輸入會議主題", "缺少資訊", "warning");
    return;
  }

  if (!form.hostId || !form.recorderId) {
    notify("請選擇主持人與記錄人", "缺少資訊", "warning");
    return;
  }

  const payload = buildPayload(nextStatus);

  if (isEditMode.value) {
    const updated = updateMeeting(meetingId.value, payload, "林美雅");
    if (!updated) {
      notify("更新失敗，找不到資料", "錯誤", "error");
      return;
    }

    notify(`${updated.title} 已更新`);
    router.push({
      name: "engagement-meeting-detail",
      params: { meetingId: updated.id },
    });
    return;
  }

  const created = createMeeting(payload, "林美雅");
  notify(`${created.title} 已建立`);
  router.push({
    name: "engagement-meeting-detail",
    params: { meetingId: created.id },
  });
}
</script>

<template>
  <div class="min-h-full p-8">
    <section class="grid gap-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-3">
          <ElButton text :icon="ArrowLeft" class="!justify-start !px-0" @click="goBack">
            {{ isEditMode ? "返回會議詳情" : "返回會議列表" }}
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
            <ElFormItem label="會議主題"><ElInput v-model="form.title" /></ElFormItem>
            <ElFormItem label="會議編號"><ElInput v-model="form.meetingNo" /></ElFormItem>
            <ElFormItem label="會議類型"
              ><ElSelect v-model="form.meetingType"
                ><ElOption
                  v-for="item in meetingTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="會議狀態"
              ><ElSelect v-model="form.status"
                ><ElOption
                  v-for="item in statusOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="重要會議"
              ><ElSwitch v-model="form.isImportant"
            /></ElFormItem>
            <ElFormItem label="週期性會議"
              ><ElSwitch v-model="form.isRecurring"
            /></ElFormItem>
          </div>
        </ElCard>

        <ElCard shadow="never">
          <template #header>
            <span class="text-sm font-semibold text-slate-800">時間與形式</span>
          </template>
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <ElFormItem label="會議日期"
              ><ElDatePicker
                v-model="form.meetingDate"
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
            <ElFormItem label="會議形式"
              ><ElSelect v-model="form.format"
                ><ElOption
                  v-for="item in formatOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="地點 / 連結"
              ><ElInput v-model="form.location" placeholder="實體地點"
            /></ElFormItem>
          </div>
          <ElFormItem label="線上會議連結">
            <ElInput v-model="form.meetingLink" placeholder="https://" />
          </ElFormItem>
        </ElCard>

        <ElCard shadow="never">
          <template #header>
            <span class="text-sm font-semibold text-slate-800">參與者</span>
          </template>
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ElFormItem label="主持人"
              ><ElSelect v-model="form.hostId"
                ><ElOption
                  v-for="item in userOptions"
                  :key="`host-${item.value}`"
                  :label="item.label"
                  :value="item.value" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="記錄人"
              ><ElSelect v-model="form.recorderId"
                ><ElOption
                  v-for="item in userOptions"
                  :key="`recorder-${item.value}`"
                  :label="item.label"
                  :value="item.value" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="內部與會者"
              ><ElSelect v-model="form.internalParticipants" multiple collapse-tags
                ><ElOption
                  v-for="item in userOptions"
                  :key="`internal-${item.value}`"
                  :label="item.label"
                  :value="item.value" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="外部與會者"
              ><ElInput
                v-model="form.externalParticipantsInput"
                placeholder="以頓號或逗號分隔"
            /></ElFormItem>
          </div>
          <ElFormItem label="關聯聯絡人"
            ><ElInput v-model="form.contactsInput" placeholder="以頓號或逗號分隔"
          /></ElFormItem>
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
          </div>
        </ElCard>

        <ElCard shadow="never">
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-sm font-semibold text-slate-800">內容區</span>
              <div class="flex items-center gap-2">
                <ElSelect
                  v-model="form.selectedTemplateId"
                  placeholder="套用會議模板"
                  class="!w-56"
                  clearable
                >
                  <ElOption
                    v-for="item in meetingTemplates"
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
            <ElFormItem label="會議目的"><ElInput v-model="form.objective" /></ElFormItem>
            <ElFormItem label="議程摘要"
              ><ElInput v-model="form.agendaSummary" type="textarea" :rows="3"
            /></ElFormItem>
            <ElFormItem label="會議內容">
              <SimpleEditorBridge v-model="form.richContent" />
            </ElFormItem>
            <ElFormItem label="風險 / 問題點"
              ><ElInput v-model="form.risks" type="textarea" :rows="3"
            /></ElFormItem>
          </div>
        </ElCard>

        <ElCard shadow="never">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-slate-800">決議事項</span>
              <ElButton size="small" :icon="CirclePlus" @click="addDecision"
                >新增決議</ElButton
              >
            </div>
          </template>

          <div class="grid gap-3">
            <article
              v-for="(item, index) in form.decisions"
              :key="item.id"
              class="border-b border-slate-200 p-3"
            >
              <div class="grid gap-2 md:grid-cols-[1fr_auto]">
                <ElInput v-model="item.title" placeholder="決議標題" />
                <ElButton text type="danger" :icon="Delete" @click="removeDecision(index)"
                  >移除</ElButton
                >
              </div>
              <ElInput
                v-model="item.description"
                type="textarea"
                :rows="2"
                placeholder="決議說明"
                class="mt-2"
              />
            </article>
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
              class="border-b border-slate-200 p-3"
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
                <ElButton
                  text
                  type="danger"
                  :icon="Delete"
                  @click="removeActionItem(index)"
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
          <div class="grid gap-3">
            <ElFormItem label="標籤"
              ><ElInput v-model="form.tagsInput" placeholder="以頓號或逗號分隔"
            /></ElFormItem>
            <ElFormItem label="附件"
              ><ElInput
                v-model="form.attachmentsInput"
                placeholder="附件名稱，使用頓號或逗號分隔"
            /></ElFormItem>
            <ElFormItem label="備註"
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
