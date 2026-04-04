import { computed, reactive } from "vue";
import {
  partnerSettlementList,
  settlementStatusMap,
} from "../data/partnerSettlements";

function cloneRecords(records) {
  if (typeof structuredClone === "function") {
    return structuredClone(records);
  }

  return JSON.parse(JSON.stringify(records));
}

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

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeRecord(record) {
  const next = {
    attachments: [],
    activities: [],
    taxAmount: 0,
    adjustmentAmount: 0,
    settledAmount: 0,
    ...record,
  };

  const commissionValue = Number(next.commissionValue ?? 0);
  const settledAmount = Number(next.settledAmount ?? 0);
  const taxAmount = Number(next.taxAmount ?? 0);
  const adjustmentAmount = Number(next.adjustmentAmount ?? 0);

  next.unpaidAmount = Math.max(commissionValue - settledAmount, 0);

  if (typeof next.actualPayableAmount !== "number") {
    next.actualPayableAmount = Math.max(commissionValue - taxAmount + adjustmentAmount, 0);
  }

  return next;
}

function createActivity(title, description = "", actorName = "系統管理員") {
  return {
    id: `sah-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    occurredAt: nowTimestamp(),
    title,
    description,
    actorName,
  };
}

function appendActivity(record, payload) {
  record.activities = [
    createActivity(payload.title, payload.description, payload.actorName),
    ...(record.activities ?? []),
  ];
}

function touchRecord(record, actorName = "系統管理員") {
  record.updatedAt = nowTimestamp();
  record.updatedBy = actorName;
}

const state = reactive({
  records: cloneRecords(partnerSettlementList).map((item) => normalizeRecord(item)),
});

function listSettlements() {
  return state.records;
}

function getSettlementById(settlementId) {
  return state.records.find((item) => item.id === settlementId) ?? null;
}

function setSettlementStatus(settlementId, nextStatus, options = {}) {
  const target = getSettlementById(settlementId);

  if (!target || !settlementStatusMap[nextStatus]) {
    return null;
  }

  const actorName = options.actorName || "系統管理員";
  const reason = (options.reason || "").trim();

  target.status = nextStatus;

  if (nextStatus === "pending_reconciliation") {
    target.reconciliationStatus = "pending";
    target.isException = false;
    target.exceptionReason = "";
  }

  if (nextStatus === "pending_invoice") {
    target.reconciliationStatus = "completed";
    if (target.invoiceStatus === "rejected") {
      target.invoiceStatus = "not_submitted";
    }
    target.isException = false;
    target.exceptionReason = "";
  }

  if (nextStatus === "pending_settlement") {
    target.reconciliationStatus = "completed";

    if (["not_submitted", "rejected"].includes(target.invoiceStatus)) {
      target.invoiceStatus = "submitted";
    }

    target.isException = false;
    target.exceptionReason = "";
  }

  if (nextStatus === "settled") {
    target.reconciliationStatus = "completed";
    target.invoiceStatus = "paid";
    target.settledAmount = Number(target.commissionValue ?? 0);
    target.unpaidAmount = 0;
    target.settledAt = todayDate();
    target.isException = false;
    target.exceptionReason = "";
  }

  if (nextStatus === "cancelled") {
    target.isException = false;
    target.exceptionReason = reason || target.exceptionReason || "手動取消";
  }

  if (nextStatus === "exception") {
    target.isException = true;
    target.exceptionReason = reason || target.exceptionReason || "待人工確認";

    if (target.reconciliationStatus === "completed" && target.invoiceStatus === "paid") {
      target.invoiceStatus = "approved";
    }
  }

  if (nextStatus !== "settled") {
    const commissionValue = Number(target.commissionValue ?? 0);
    target.unpaidAmount = Math.max(commissionValue - Number(target.settledAmount ?? 0), 0);

    if (nextStatus === "cancelled") {
      target.settledAt = "";
    }
  }

  touchRecord(target, actorName);

  const statusLabel = settlementStatusMap[nextStatus]?.label || nextStatus;
  appendActivity(target, {
    title: `狀態更新：${statusLabel}`,
    description: reason ? `原因：${reason}` : "",
    actorName,
  });

  return target;
}

function markReconciliationDone(settlementId, actorName = "系統管理員") {
  return setSettlementStatus(settlementId, "pending_invoice", {
    actorName,
    reason: "已完成對帳",
  });
}

function markInvoiceDone(settlementId, actorName = "系統管理員") {
  return setSettlementStatus(settlementId, "pending_settlement", {
    actorName,
    reason: "請款資料已完成",
  });
}

function markAsSettled(settlementId, actorName = "系統管理員") {
  return setSettlementStatus(settlementId, "settled", {
    actorName,
    reason: "結算完成",
  });
}

function cancelSettlement(settlementId, reason = "", actorName = "系統管理員") {
  return setSettlementStatus(settlementId, "cancelled", {
    actorName,
    reason,
  });
}

function markAsException(settlementId, reason = "", actorName = "系統管理員") {
  return setSettlementStatus(settlementId, "exception", {
    actorName,
    reason,
  });
}

function batchSetSettlementStatus(settlementIds, status, options = {}) {
  return settlementIds
    .map((settlementId) => setSettlementStatus(settlementId, status, options))
    .filter(Boolean);
}

function usePartnerSettlementStore() {
  return {
    settlements: computed(() => listSettlements()),
    getSettlementById,
    setSettlementStatus,
    markReconciliationDone,
    markInvoiceDone,
    markAsSettled,
    cancelSettlement,
    markAsException,
    batchSetSettlementStatus,
  };
}

export { usePartnerSettlementStore };
