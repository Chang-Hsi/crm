<script setup>
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElDescriptions,
  ElDescriptionsItem,
  ElDrawer,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElNotification,
  ElOption,
  ElSelect,
  ElTabPane,
  ElTabs,
  ElTag,
  ElTimeline,
  ElTimelineItem,
  ElSwitch,
} from "element-plus";
import {
  Bell,
  ChatLineSquare,
  CirclePlus,
  Filter,
  FirstAidKit,
  Location,
  Opportunity,
  Refresh,
  Search,
  Setting,
  Tickets,
  Warning,
} from "@element-plus/icons-vue";
import { interactionStatusMap, interactionTypeMap } from "../../data/communications";
import { meetingStatusMap, meetingTypeMap } from "../../data/meetings";
import {
  issuePriorityMap,
  issueSeverityMap,
  issueStatusMap,
  issueTypeMap,
} from "../../data/issues";
import { opportunityStageOptions } from "../../data/opportunities";
import { visitStatusMap, visitTypeMap } from "../../data/visits";
import { useAccountsStore } from "../../composables/useAccountsStore";
import { useCommunicationLogsStore } from "../../composables/useCommunicationLogsStore";
import { useIssuesStore } from "../../composables/useIssuesStore";
import { useMeetingsStore } from "../../composables/useMeetingsStore";
import { useOpportunitiesStore } from "../../composables/useOpportunitiesStore";
import { useVisitsStore } from "../../composables/useVisitsStore";

const router = useRouter();
const { records: communicationRecords } = useCommunicationLogsStore();
const { meetings } = useMeetingsStore();
const { visits } = useVisitsStore();
const { issues } = useIssuesStore();
const { opportunities } = useOpportunitiesStore();
const { accounts } = useAccountsStore();

const filterPanelOpen = ref(false);
const activeScope = ref("all");
const detailDrawerOpen = ref(false);
const quickNoteDrawerOpen = ref(false);
const activeEvent = ref(null);
const expandedEventIds = ref([]);
const manualEvents = ref([]);

const filters = reactive({
  keyword: "",
  timeRange: "7d",
  customRange: [],
  owner: "all",
  eventType: "all",
  relatedTarget: "all",
  onlyPending: "all",
  onlyExternal: "all",
});

const quickNoteForm = reactive({
  title: "",
  content: "",
  scope: "system",
  relatedTarget: "customer",
  followUpRequired: false,
  followUpAt: "",
  isExternal: false,
});

const scopeMetaMap = {
  interaction: { label: "互動", type: "primary" },
  support: { label: "支援", type: "danger" },
  business: { label: "商務", type: "warning" },
  system: { label: "系統", type: "info" },
};

const yesNoOptions = [
  { value: "all", label: "全部" },
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];

const timeRangeOptions = [
  { value: "today", label: "今天" },
  { value: "7d", label: "近 7 天" },
  { value: "30d", label: "近 30 天" },
  { value: "custom", label: "自訂區間" },
];

const relatedTargetOptions = [
  { value: "all", label: "全部關聯" },
  { value: "customer", label: "客戶" },
  { value: "contact", label: "聯絡人" },
  { value: "opportunity", label: "商機" },
  { value: "issue", label: "Issue" },
];

const quickNoteScopeOptions = [
  { value: "interaction", label: "互動" },
  { value: "support", label: "支援" },
  { value: "business", label: "商務" },
  { value: "system", label: "系統" },
];

const eventIconMap = {
  email: Bell,
  call: Bell,
  meeting: ChatLineSquare,
  visit: Location,
  issue: FirstAidKit,
  issue_timeline: Warning,
  issue_response: FirstAidKit,
  opportunity_stage: Opportunity,
  account_timeline: Setting,
  quick_note: Tickets,
};

const stageLabelMap = Object.fromEntries(
  opportunityStageOptions.map((item) => [item.value, item.label])
);

function nowTimestamp() {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function normalizeDateInput(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return `${text} 00:00`;
  }

  return text;
}

function toTimestamp(value) {
  const normalized = normalizeDateInput(value);
  if (!normalized) {
    return 0;
  }

  const date = new Date(normalized.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatDate(value) {
  const ts = typeof value === "number" ? value : toTimestamp(value);
  if (!ts) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts));
}

function formatDateTime(value) {
  const ts = typeof value === "number" ? value : toTimestamp(value);
  if (!ts) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

function formatTime(value) {
  const ts = typeof value === "number" ? value : toTimestamp(value);
  if (!ts) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ts));
}

function toDateKey(ts) {
  if (!ts) {
    return "";
  }

  const date = new Date(ts);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateGroupLabel(dateKey) {
  const ts = toTimestamp(dateKey);
  if (!ts) {
    return dateKey;
  }

  const weekday = new Intl.DateTimeFormat("zh-TW", { weekday: "short" }).format(
    new Date(ts)
  );
  return `${formatDate(ts)}（${weekday}）`;
}

function notify(message, title = "已更新", type = "success") {
  ElNotification({ title, message, type, position: "top-right" });
}

function buildTimelineEvent(payload) {
  const ts = toTimestamp(payload.occurredAt);
  if (!ts) {
    return null;
  }

  return {
    id: payload.id,
    scope: payload.scope,
    eventType: payload.eventType,
    eventTypeLabel: payload.eventTypeLabel,
    title: payload.title,
    summary: payload.summary || "-",
    relatedSummary: payload.relatedSummary || "-",
    actorName: payload.actorName || "-",
    statusLabel: payload.statusLabel || "",
    tags: payload.tags || [],
    isPending: Boolean(payload.isPending),
    isExternal: Boolean(payload.isExternal),
    isImportant: Boolean(payload.isImportant),
    followUpAt: payload.followUpAt || "",
    detailLines: payload.detailLines || [],
    routeName: payload.routeName || "",
    routeParams: payload.routeParams || {},
    routeQuery: payload.routeQuery || {},
    relatedTypes: payload.relatedTypes || [],
    source: payload.source || "",
    sourceId: payload.sourceId || "",
    icon: payload.icon || eventIconMap[payload.eventType] || Setting,
    occurredAt: payload.occurredAt,
    ts,
    timeLabel: formatTime(ts),
    dateKey: toDateKey(ts),
  };
}

const timelineEvents = computed(() => {
  const events = [];

  manualEvents.value.forEach((item) => {
    const event = buildTimelineEvent(item);
    if (event) {
      events.push(event);
    }
  });

  communicationRecords.value.forEach((item) => {
    const event = buildTimelineEvent({
      id: `com-${item.id}`,
      scope: "interaction",
      eventType: item.interactionType,
      eventTypeLabel: interactionTypeMap[item.interactionType]?.label || "互動",
      title: item.title,
      summary: item.summary || item.result || "-",
      relatedSummary: item.relatedSummary,
      actorName: item.ownerName,
      statusLabel: interactionStatusMap[item.status]?.label || item.status,
      tags: item.tags || [],
      isPending:
        item.followUpRequired && !["completed", "archived"].includes(item.status),
      isExternal: true,
      isImportant: item.isImportant,
      followUpAt: item.followUpAt,
      detailLines: [
        `互動類型：${
          interactionTypeMap[item.interactionType]?.label || item.interactionType
        }`,
        `互動狀態：${interactionStatusMap[item.status]?.label || item.status}`,
        `對象：${item.contactName || "-"} / ${item.companyName || "-"}`,
        `結果：${item.result || "-"}`,
      ],
      routeName: "engagement-communications",
      routeQuery: { recordId: item.id },
      relatedTypes: ["customer", "contact", "opportunity"],
      source: "communication",
      sourceId: item.id,
      occurredAt: item.interactedAt,
    });

    if (event) {
      events.push(event);
    }
  });

  meetings.value.forEach((item) => {
    const earliestOpenAction =
      (item.actionItems || [])
        .filter((action) => action.isOpen && action.dueDate)
        .map((action) => action.dueDate)
        .sort()[0] || "";

    const event = buildTimelineEvent({
      id: `mtr-${item.id}`,
      scope: "interaction",
      eventType: "meeting",
      eventTypeLabel: "會議紀錄",
      title: item.title,
      summary: item.agendaSummary || item.objective || "-",
      relatedSummary: item.relatedSummary,
      actorName: item.hostName,
      statusLabel: meetingStatusMap[item.status]?.label || item.status,
      tags: [meetingTypeMap[item.meetingType]?.label || item.meetingType],
      isPending: item.openActionItemCount > 0,
      isExternal: (item.externalParticipants || []).length > 0,
      isImportant: item.isImportant,
      followUpAt: earliestOpenAction,
      detailLines: [
        `會議類型：${meetingTypeMap[item.meetingType]?.label || item.meetingType}`,
        `待辦數：${item.openActionItemCount}/${item.actionItemCount}`,
        `決議摘要：${item.decisionSummary || "-"}`,
      ],
      routeName: "engagement-meetings",
      routeQuery: { meetingId: item.id },
      relatedTypes: ["customer", "contact", "opportunity", "issue"],
      source: "meeting",
      sourceId: item.id,
      occurredAt: `${item.meetingDate} ${item.startTime || "09:00"}`,
    });

    if (event) {
      events.push(event);
    }
  });

  visits.value.forEach((item) => {
    const event = buildTimelineEvent({
      id: `vst-${item.id}`,
      scope: "interaction",
      eventType: "visit",
      eventTypeLabel: "拜訪紀錄",
      title: item.title,
      summary: item.summary || item.objective || "-",
      relatedSummary: item.relatedSummary,
      actorName: item.ownerName,
      statusLabel: visitStatusMap[item.status]?.label || item.status,
      tags: [visitTypeMap[item.visitType]?.label || item.visitType],
      isPending: item.openActionItemCount > 0,
      isExternal: Boolean(item.customerId || item.partnerId || item.visitTarget),
      isImportant: item.isImportant,
      followUpAt: item.nextVisitSuggestedAt || "",
      detailLines: [
        `拜訪類型：${visitTypeMap[item.visitType]?.label || item.visitType}`,
        `待辦數：${item.openActionItemCount}/${item.actionItemCount}`,
        `拜訪目標：${item.visitTarget || "-"}`,
      ],
      routeName: "engagement-visits",
      routeQuery: { visitId: item.id },
      relatedTypes: ["customer", "contact", "opportunity", "issue"],
      source: "visit",
      sourceId: item.id,
      occurredAt: `${item.visitDate} ${item.startTime || "09:00"}`,
    });

    if (event) {
      events.push(event);
    }
  });

  issues.value.forEach((item) => {
    const issueEvent = buildTimelineEvent({
      id: `issue-main-${item.id}`,
      scope: "support",
      eventType: "issue",
      eventTypeLabel: "Issue 更新",
      title: item.title,
      summary: item.summary || item.description || "-",
      relatedSummary: item.relatedSummary,
      actorName: item.updatedBy || item.ownerName,
      statusLabel: issueStatusMap[item.status]?.label || item.status,
      tags: [
        issueTypeMap[item.issueType]?.label || item.issueType,
        `優先級：${issuePriorityMap[item.priority]?.label || item.priority}`,
        `嚴重度：${issueSeverityMap[item.severity]?.label || item.severity}`,
      ],
      isPending: [
        "open",
        "in_progress",
        "pending_reply",
        "pending_confirmation",
      ].includes(item.status),
      isExternal: ["pending_reply", "pending_confirmation"].includes(item.status),
      isImportant: item.isImportant,
      followUpAt: item.expectedReplyAt || item.dueAt,
      detailLines: [
        `Issue 編號：${item.issueNo}`,
        `狀態：${issueStatusMap[item.status]?.label || item.status}`,
        `處理說明：${item.resolutionNote || "-"}`,
      ],
      routeName: "engagement-issues",
      routeQuery: { issueId: item.id },
      relatedTypes: ["customer", "issue", "opportunity"],
      source: "issue",
      sourceId: item.id,
      occurredAt: item.updatedAt || item.createdAt,
    });

    if (issueEvent) {
      events.push(issueEvent);
    }

    (item.timeline || []).forEach((line) => {
      const timelineEvent = buildTimelineEvent({
        id: `issue-line-${item.id}-${line.id}`,
        scope: "support",
        eventType: "issue_timeline",
        eventTypeLabel: "Issue 歷程",
        title: `${item.issueNo}｜${line.title}`,
        summary: line.description || "-",
        relatedSummary: `Issue：${item.title}`,
        actorName: line.actorName,
        statusLabel: issueStatusMap[item.status]?.label || item.status,
        tags: [issueTypeMap[item.issueType]?.label || item.issueType],
        isPending: [
          "open",
          "in_progress",
          "pending_reply",
          "pending_confirmation",
        ].includes(item.status),
        isExternal: false,
        isImportant: item.isImportant,
        followUpAt: item.expectedReplyAt || item.dueAt,
        detailLines: [`Issue 編號：${item.issueNo}`],
        routeName: "engagement-issues",
        routeQuery: { issueId: item.id },
        relatedTypes: ["issue", "customer"],
        source: "issue_timeline",
        sourceId: line.id,
        occurredAt: line.occurredAt,
      });

      if (timelineEvent) {
        events.push(timelineEvent);
      }
    });

    (item.responses || []).forEach((reply) => {
      const replyEvent = buildTimelineEvent({
        id: `issue-reply-${item.id}-${reply.id}`,
        scope: "support",
        eventType: "issue_response",
        eventTypeLabel: reply.type === "external_reply" ? "對外回應" : "內部備註",
        title: `${item.issueNo}｜${
          reply.type === "external_reply" ? "對外回應" : "內部備註"
        }`,
        summary: reply.content || "-",
        relatedSummary: `Issue：${item.title}`,
        actorName: reply.actorName,
        statusLabel: issueStatusMap[item.status]?.label || item.status,
        tags: [reply.type === "external_reply" ? "客戶回應" : "內部紀錄"],
        isPending: Boolean(reply.followUpRequired),
        isExternal: reply.type === "external_reply",
        isImportant: item.isImportant,
        followUpAt: reply.followUpRequired ? reply.followUpAt : "",
        detailLines: [`Issue 編號：${item.issueNo}`],
        routeName: "engagement-issues",
        routeQuery: { issueId: item.id },
        relatedTypes: ["issue", "customer"],
        source: "issue_response",
        sourceId: reply.id,
        occurredAt: reply.createdAt,
      });

      if (replyEvent) {
        events.push(replyEvent);
      }
    });
  });

  opportunities.value.forEach((item) => {
    (item.stageHistory || []).forEach((history) => {
      const event = buildTimelineEvent({
        id: `opp-stage-${item.id}-${history.id}`,
        scope: "business",
        eventType: "opportunity_stage",
        eventTypeLabel: "商機階段更新",
        title: item.name,
        summary: history.description || "-",
        relatedSummary: `客戶：${item.accountName || "-"}`,
        actorName: history.changedByName || "系統",
        statusLabel: `階段：${stageLabelMap[history.stage] || history.stage}`,
        tags: [stageLabelMap[history.stage] || history.stage],
        isPending: !["won", "lost"].includes(item.stage),
        isExternal: false,
        isImportant: ["negotiation", "won", "lost"].includes(item.stage),
        followUpAt: item.expectedCloseDate,
        detailLines: [
          `商機編號：${item.opportunityCode}`,
          history.note ? `說明：${history.note}` : "說明：-",
          history.lostReason ? `失敗原因：${history.lostReason}` : "",
        ].filter(Boolean),
        routeName: "opportunity-detail",
        routeParams: { opportunityId: item.id },
        relatedTypes: ["opportunity", "customer"],
        source: "opportunity",
        sourceId: item.id,
        occurredAt: history.timestamp,
      });

      if (event) {
        events.push(event);
      }
    });
  });

  accounts.value.forEach((account) => {
    (account.timeline || []).forEach((line) => {
      let scope = "system";

      if (line.type === "opportunity") {
        scope = "business";
      } else if (line.type === "activity") {
        scope = "interaction";
      }

      const event = buildTimelineEvent({
        id: `acc-line-${account.id}-${line.id}`,
        scope,
        eventType: "account_timeline",
        eventTypeLabel: "系統異動",
        title: `${account.companyName}｜${line.title}`,
        summary: line.description || "-",
        relatedSummary: `客戶：${account.companyName}`,
        actorName: account.ownerName || "系統",
        statusLabel: "",
        tags: [line.type || "update"],
        isPending: false,
        isExternal: false,
        isImportant: false,
        followUpAt: "",
        detailLines: [`客戶編號：${account.accountCode}`],
        routeName: "account-detail",
        routeParams: { accountId: account.id },
        relatedTypes:
          line.type === "opportunity" ? ["customer", "opportunity"] : ["customer"],
        source: "account",
        sourceId: account.id,
        occurredAt: line.timestamp,
      });

      if (event) {
        events.push(event);
      }
    });
  });

  return events;
});

const scopeTabs = computed(() => {
  const total = timelineEvents.value.length;
  const interaction = timelineEvents.value.filter((item) => item.scope === "interaction")
    .length;
  const support = timelineEvents.value.filter((item) => item.scope === "support").length;
  const business = timelineEvents.value.filter((item) => item.scope === "business")
    .length;
  const system = timelineEvents.value.filter((item) => item.scope === "system").length;

  return [
    { value: "all", label: `全部 (${total})` },
    { value: "interaction", label: `互動 (${interaction})` },
    { value: "support", label: `支援 (${support})` },
    { value: "business", label: `商務 (${business})` },
    { value: "system", label: `系統 (${system})` },
  ];
});

const ownerOptions = computed(() => {
  const names = [
    ...new Set(timelineEvents.value.map((item) => item.actorName).filter(Boolean)),
  ];
  return [
    { value: "all", label: "全部負責人" },
    ...names.map((name) => ({ value: name, label: name })),
  ];
});

const eventTypeOptions = computed(() => {
  const typeMap = new Map();

  timelineEvents.value.forEach((item) => {
    if (!typeMap.has(item.eventType)) {
      typeMap.set(item.eventType, item.eventTypeLabel || item.eventType);
    }
  });

  return [
    { value: "all", label: "全部事件類型" },
    ...[...typeMap.entries()].map(([value, label]) => ({ value, label })),
  ];
});

function matchesTimeRange(event) {
  if (filters.timeRange === "custom") {
    const [start, end] = filters.customRange || [];
    if (!start || !end) {
      return true;
    }

    const startTs = toTimestamp(start);
    const endTs = toTimestamp(end) + 24 * 60 * 60 * 1000 - 1;
    return event.ts >= startTs && event.ts <= endTs;
  }

  const now = Date.now();
  const todayKey = toDateKey(now);

  if (filters.timeRange === "today") {
    return event.dateKey === todayKey;
  }

  if (filters.timeRange === "7d") {
    return event.ts >= now - 7 * 24 * 60 * 60 * 1000;
  }

  if (filters.timeRange === "30d") {
    return event.ts >= now - 30 * 24 * 60 * 60 * 1000;
  }

  return true;
}

const filteredEvents = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();

  return timelineEvents.value.filter((event) => {
    const matchesKeyword =
      keyword.length === 0 ||
      event.title.toLowerCase().includes(keyword) ||
      event.summary.toLowerCase().includes(keyword) ||
      event.relatedSummary.toLowerCase().includes(keyword) ||
      event.actorName.toLowerCase().includes(keyword);

    const matchesScope = activeScope.value === "all" || event.scope === activeScope.value;
    const matchesOwner = filters.owner === "all" || event.actorName === filters.owner;
    const matchesEventType =
      filters.eventType === "all" || event.eventType === filters.eventType;
    const matchesRelated =
      filters.relatedTarget === "all" ||
      event.relatedTypes.includes(filters.relatedTarget);

    const matchesPending =
      filters.onlyPending === "all" ||
      (filters.onlyPending === "yes" ? event.isPending : !event.isPending);

    const matchesExternal =
      filters.onlyExternal === "all" ||
      (filters.onlyExternal === "yes" ? event.isExternal : !event.isExternal);

    return (
      matchesKeyword &&
      matchesScope &&
      matchesOwner &&
      matchesEventType &&
      matchesRelated &&
      matchesPending &&
      matchesExternal &&
      matchesTimeRange(event)
    );
  });
});

const sortedEvents = computed(() =>
  [...filteredEvents.value].sort((a, b) => b.ts - a.ts)
);

const groupedEvents = computed(() => {
  const groups = new Map();

  sortedEvents.value.forEach((event) => {
    if (!groups.has(event.dateKey)) {
      groups.set(event.dateKey, {
        key: event.dateKey,
        label: formatDateGroupLabel(event.dateKey),
        items: [],
      });
    }

    groups.get(event.dateKey).items.push(event);
  });

  return [...groups.values()].sort((a, b) => toTimestamp(b.key) - toTimestamp(a.key));
});

const kpiCards = computed(() => {
  const now = Date.now();

  const interactionCount7d = timelineEvents.value.filter(
    (item) => item.scope === "interaction" && item.ts >= now - 7 * 24 * 60 * 60 * 1000
  ).length;

  const openIssueCount = issues.value.filter(
    (item) => !["resolved", "cancelled"].includes(item.status)
  ).length;

  const lastExternal = [...timelineEvents.value]
    .filter((item) => item.isExternal)
    .sort((a, b) => b.ts - a.ts)[0];

  const nextFollowUp = [...timelineEvents.value]
    .filter((item) => item.followUpAt)
    .map((item) => ({ ...item, followUpTs: toTimestamp(item.followUpAt) }))
    .filter((item) => item.followUpTs >= toTimestamp(toDateKey(now)))
    .sort((a, b) => a.followUpTs - b.followUpTs)[0];

  const pendingCount = timelineEvents.value.filter((item) => item.isPending).length;

  return [
    { label: "近 7 天互動次數", value: interactionCount7d },
    { label: "開啟中的支援 Issue", value: openIssueCount },
    {
      label: "最後一次客戶回應",
      value: lastExternal ? formatDateTime(lastExternal.ts) : "-",
    },
    {
      label: "下一次預計跟進",
      value: nextFollowUp ? formatDate(nextFollowUp.followUpAt) : "-",
    },
    { label: "待處理事件數", value: pendingCount },
  ];
});

function isExpanded(eventId) {
  return expandedEventIds.value.includes(eventId);
}

function toggleExpand(eventId) {
  if (isExpanded(eventId)) {
    expandedEventIds.value = expandedEventIds.value.filter((item) => item !== eventId);
    return;
  }

  expandedEventIds.value = [...expandedEventIds.value, eventId];
}

function openEventDetail(event) {
  activeEvent.value = event;
  detailDrawerOpen.value = true;
}

function goToRelated(event) {
  if (!event.routeName) {
    return;
  }

  router.push({
    name: event.routeName,
    ...(Object.keys(event.routeParams || {}).length > 0
      ? { params: event.routeParams }
      : {}),
    ...(Object.keys(event.routeQuery || {}).length > 0
      ? { query: event.routeQuery }
      : {}),
  });
}

function resetFilters() {
  filters.keyword = "";
  filters.timeRange = "7d";
  filters.customRange = [];
  filters.owner = "all";
  filters.eventType = "all";
  filters.relatedTarget = "all";
  filters.onlyPending = "all";
  filters.onlyExternal = "all";
  activeScope.value = "all";
}

function openQuickNoteDrawer() {
  quickNoteForm.title = "";
  quickNoteForm.content = "";
  quickNoteForm.scope = "system";
  quickNoteForm.relatedTarget = "customer";
  quickNoteForm.followUpRequired = false;
  quickNoteForm.followUpAt = "";
  quickNoteForm.isExternal = false;
  quickNoteDrawerOpen.value = true;
}

function submitQuickNote() {
  if (!quickNoteForm.content.trim()) {
    notify("請輸入備註內容", "缺少資訊", "warning");
    return;
  }

  if (quickNoteForm.followUpRequired && !quickNoteForm.followUpAt) {
    notify("請選擇 follow-up 日期", "缺少資訊", "warning");
    return;
  }

  const relatedLabel =
    relatedTargetOptions.find((item) => item.value === quickNoteForm.relatedTarget)
      ?.label || "全部關聯";

  manualEvents.value.unshift({
    id: `manual-${Date.now()}`,
    scope: quickNoteForm.scope,
    eventType: "quick_note",
    eventTypeLabel: "快速備註",
    title: quickNoteForm.title.trim() || "快速備註",
    summary: quickNoteForm.content.trim(),
    relatedSummary: relatedLabel === "全部關聯" ? "-" : `關聯：${relatedLabel}`,
    actorName: "林美雅",
    statusLabel: "手動新增",
    tags: ["備註"],
    isPending: quickNoteForm.followUpRequired,
    isExternal: quickNoteForm.isExternal,
    isImportant: false,
    followUpAt: quickNoteForm.followUpRequired ? quickNoteForm.followUpAt : "",
    detailLines: [
      `範圍：${scopeMetaMap[quickNoteForm.scope]?.label || quickNoteForm.scope}`,
      quickNoteForm.followUpRequired
        ? `Follow-up：${quickNoteForm.followUpAt}`
        : "Follow-up：無",
    ],
    routeName: "",
    routeParams: {},
    routeQuery: {},
    relatedTypes:
      quickNoteForm.relatedTarget === "all" ? [] : [quickNoteForm.relatedTarget],
    source: "manual",
    sourceId: "",
    occurredAt: nowTimestamp(),
  });

  quickNoteDrawerOpen.value = false;
  notify("已新增快速備註");
}
</script>

<template>
  <div class="min-h-full p-8">
    <section class="grid gap-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-2">
          <h1 class="text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">
            Timeline
          </h1>
          <p class="text-sm text-slate-500">
            集中呈現客戶互動、支援處理、商務進展與系統異動的事件流
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton :icon="Refresh" @click="resetFilters">重設</ElButton>
          <ElButton type="primary" :icon="CirclePlus" @click="openQuickNoteDrawer"
            >快速新增備註</ElButton
          >
        </div>
      </header>

      <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <article
          v-for="card in kpiCards"
          :key="card.label"
          class="rounded-2xl border border-slate-200 bg-white px-4 py-4"
        >
          <p class="text-xs text-slate-500">{{ card.label }}</p>
          <p class="mt-2 text-lg font-semibold text-slate-900">{{ card.value }}</p>
        </article>
      </section>

      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div class="flex flex-wrap items-center gap-2">
            <ElInput
              v-model="filters.keyword"
              placeholder="搜尋事件標題 / 摘要 / 關聯對象"
              clearable
              class="!w-[320px]"
            >
              <template #prefix><Search class="h-4 w-4 text-slate-400" /></template>
            </ElInput>
            <ElButton
              :icon="Filter"
              :type="filterPanelOpen ? 'primary' : 'default'"
              @click="filterPanelOpen = !filterPanelOpen"
            >
              Filter
            </ElButton>
          </div>
          <ElTag round effect="plain">目前 {{ sortedEvents.length }} 筆事件</ElTag>
        </div>

        <transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="-translate-y-2 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="-translate-y-2 opacity-0"
        >
          <ElForm
            v-if="filterPanelOpen"
            class="grid gap-3 border-t border-slate-200 bg-white px-6 py-4 md:grid-cols-2 xl:grid-cols-4"
            label-position="top"
          >
            <ElFormItem>
              <ElSelect v-model="filters.timeRange">
                <ElOption
                  v-for="item in timeRangeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.relatedTarget">
                <ElOption
                  v-for="item in relatedTargetOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.owner">
                <ElOption
                  v-for="item in ownerOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.eventType">
                <ElOption
                  v-for="item in eventTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.onlyPending">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`pending-${item.value}`"
                  :label="`只看待跟進：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem>
              <ElSelect v-model="filters.onlyExternal">
                <ElOption
                  v-for="item in yesNoOptions"
                  :key="`external-${item.value}`"
                  :label="`只看外部互動：${item.label}`"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem
              v-if="filters.timeRange === 'custom'"
              class="md:col-span-2 xl:col-span-2"
            >
              <ElDatePicker
                v-model="filters.customRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                start-placeholder="開始日期"
                end-placeholder="結束日期"
                class="!w-full"
              />
            </ElFormItem>
          </ElForm>
        </transition>

        <div class="border-t border-slate-200 px-6 pt-3">
          <ElTabs v-model="activeScope">
            <ElTabPane
              v-for="tab in scopeTabs"
              :key="tab.value"
              :name="tab.value"
              :label="tab.label"
            />
          </ElTabs>
        </div>

        <ElEmpty
          v-if="sortedEvents.length === 0"
          description="目前沒有符合條件的事件"
          class="py-20"
        >
          <p class="mb-3 text-sm text-slate-500">可調整篩選條件，或新增一筆快速備註。</p>
          <ElButton type="primary" @click="openQuickNoteDrawer">快速新增備註</ElButton>
        </ElEmpty>

        <div v-else class="grid gap-6 px-6 py-5">
          <section v-for="group in groupedEvents" :key="group.key" class="grid gap-3">
            <header class="flex items-center gap-2">
              <h3 class="text-sm font-semibold text-slate-700">{{ group.label }}</h3>
              <span class="text-xs text-slate-400">{{ group.items.length }} 筆</span>
            </header>

            <ElTimeline>
              <ElTimelineItem
                v-for="event in group.items"
                :key="event.id"
                :timestamp="event.timeLabel"
                placement="top"
              >
                <ElCard shadow="never" class="!border-slate-200">
                  <div class="grid gap-3">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div class="flex min-w-0 items-start gap-3">
                        <div
                          class="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"
                        >
                          <component :is="event.icon" class="h-4 w-4" />
                        </div>
                        <div class="grid min-w-0 gap-1">
                          <p class="truncate text-sm font-semibold text-slate-900">
                            {{ event.title }}
                          </p>
                          <p class="text-sm text-slate-600 whitespace-pre-line">
                            {{ event.summary }}
                          </p>
                        </div>
                      </div>

                      <div class="flex flex-wrap items-center gap-1">
                        <ElTag
                          size="small"
                          effect="light"
                          :type="scopeMetaMap[event.scope]?.type"
                        >
                          {{ scopeMetaMap[event.scope]?.label || event.scope }}
                        </ElTag>
                        <ElTag size="small" effect="plain">{{
                          event.eventTypeLabel
                        }}</ElTag>
                        <ElTag v-if="event.statusLabel" size="small" effect="plain">{{
                          event.statusLabel
                        }}</ElTag>
                        <ElTag
                          v-if="event.isPending"
                          size="small"
                          type="warning"
                          effect="light"
                          >待跟進</ElTag
                        >
                        <ElTag
                          v-if="event.isImportant"
                          size="small"
                          type="danger"
                          effect="light"
                          >重要</ElTag
                        >
                      </div>
                    </div>

                    <div class="grid gap-1 text-xs text-slate-500">
                      <p>關聯：{{ event.relatedSummary }}</p>
                      <p>操作者：{{ event.actorName }}</p>
                      <p v-if="event.followUpAt">
                        下一步：{{ formatDate(event.followUpAt) }}
                      </p>
                    </div>

                    <div class="flex flex-wrap items-center justify-end gap-2">
                      <ElButton text @click="toggleExpand(event.id)">
                        {{ isExpanded(event.id) ? "收合" : "展開" }}
                      </ElButton>
                      <ElButton text type="primary" @click="openEventDetail(event)"
                        >查看詳情</ElButton
                      >
                      <ElButton v-if="event.routeName" text @click="goToRelated(event)"
                        >前往關聯頁</ElButton
                      >
                    </div>

                    <div
                      v-if="isExpanded(event.id)"
                      class="grid gap-1 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-sm text-slate-600"
                    >
                      <p
                        v-for="(line, index) in event.detailLines"
                        :key="`${event.id}-line-${index}`"
                      >
                        {{ line }}
                      </p>
                    </div>
                  </div>
                </ElCard>
              </ElTimelineItem>
            </ElTimeline>
          </section>
        </div>
      </section>
    </section>

    <ElDrawer
      v-model="detailDrawerOpen"
      size="46%"
      title="事件詳情"
      :destroy-on-close="false"
    >
      <template v-if="activeEvent">
        <section class="grid gap-4">
          <header class="grid gap-2">
            <h2 class="text-xl font-semibold text-slate-900">{{ activeEvent.title }}</h2>
            <div class="flex flex-wrap items-center gap-2">
              <ElTag
                size="small"
                effect="light"
                :type="scopeMetaMap[activeEvent.scope]?.type"
              >
                {{ scopeMetaMap[activeEvent.scope]?.label || activeEvent.scope }}
              </ElTag>
              <ElTag size="small" effect="plain">{{ activeEvent.eventTypeLabel }}</ElTag>
              <ElTag v-if="activeEvent.statusLabel" size="small" effect="plain">
                {{ activeEvent.statusLabel }}
              </ElTag>
            </div>
          </header>

          <ElDescriptions :column="2" border>
            <ElDescriptionsItem label="發生時間">{{
              formatDateTime(activeEvent.ts)
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="操作者">{{
              activeEvent.actorName
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="關聯對象" :span="2">{{
              activeEvent.relatedSummary
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="是否待跟進">{{
              activeEvent.isPending ? "是" : "否"
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="下一次跟進">{{
              activeEvent.followUpAt ? formatDate(activeEvent.followUpAt) : "-"
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="來源模組">{{
              activeEvent.source || "-"
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="來源識別">{{
              activeEvent.sourceId || "-"
            }}</ElDescriptionsItem>
          </ElDescriptions>

          <ElCard shadow="never">
            <template #header
              ><span class="text-sm font-semibold text-slate-800">摘要</span></template
            >
            <p class="text-sm text-slate-700 whitespace-pre-line">
              {{ activeEvent.summary }}
            </p>
          </ElCard>

          <ElCard shadow="never" v-if="activeEvent.detailLines.length > 0">
            <template #header
              ><span class="text-sm font-semibold text-slate-800"
                >詳細資訊</span
              ></template
            >
            <div class="grid gap-2 text-sm text-slate-700">
              <p
                v-for="(line, index) in activeEvent.detailLines"
                :key="`${activeEvent.id}-detail-${index}`"
              >
                {{ line }}
              </p>
            </div>
          </ElCard>

          <div class="flex justify-end">
            <ElButton
              v-if="activeEvent.routeName"
              type="primary"
              @click="goToRelated(activeEvent)"
            >
              前往關聯頁繼續處理
            </ElButton>
          </div>
        </section>
      </template>
    </ElDrawer>

    <ElDrawer
      v-model="quickNoteDrawerOpen"
      size="40%"
      title="快速新增備註"
      :destroy-on-close="false"
    >
      <ElForm label-position="top" class="grid gap-3">
        <div class="grid gap-3 md:grid-cols-2">
          <ElFormItem label="標題">
            <ElInput
              v-model="quickNoteForm.title"
              placeholder="可留空，系統會使用「快速備註」"
            />
          </ElFormItem>
          <ElFormItem label="事件範圍">
            <ElSelect v-model="quickNoteForm.scope">
              <ElOption
                v-for="item in quickNoteScopeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="關聯對象">
            <ElSelect v-model="quickNoteForm.relatedTarget">
              <ElOption
                v-for="item in relatedTargetOptions"
                :key="`quick-${item.value}`"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="外部互動">
            <ElSwitch v-model="quickNoteForm.isExternal" />
          </ElFormItem>
          <ElFormItem label="需要 follow-up">
            <ElSwitch v-model="quickNoteForm.followUpRequired" />
          </ElFormItem>
          <ElFormItem v-if="quickNoteForm.followUpRequired" label="follow-up 日期">
            <ElDatePicker
              v-model="quickNoteForm.followUpAt"
              type="date"
              value-format="YYYY-MM-DD"
              class="!w-full"
            />
          </ElFormItem>
        </div>

        <ElFormItem label="內容">
          <ElInput
            v-model="quickNoteForm.content"
            type="textarea"
            :rows="4"
            placeholder="輸入本次補充備註或待辦事項"
          />
        </ElFormItem>

        <div class="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <ElButton @click="quickNoteDrawerOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitQuickNote">新增</ElButton>
        </div>
      </ElForm>
    </ElDrawer>
  </div>
</template>

<style scoped>
:deep(.el-form-item) {
  margin-bottom: 12px;
}

:deep(.el-timeline-item__timestamp) {
  color: rgb(100 116 139);
  font-size: 12px;
}

:deep(.el-card__body) {
  padding: 14px;
}
</style>
