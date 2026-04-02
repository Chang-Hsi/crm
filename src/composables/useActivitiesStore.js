import { computed, reactive } from 'vue'
import { accountList, ownerOptions } from '../data/accounts'
import { activityList, activityTypeOptions, activityStatusOptions } from '../data/activities'
import { contactList } from '../data/contacts'

function cloneRecords(records) {
  if (typeof structuredClone === 'function') {
    return structuredClone(records)
  }

  return JSON.parse(JSON.stringify(records))
}

function getCurrentTimestamp() {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

function resolveAccountMeta(accountId) {
  const account = accountList.find((item) => item.id === accountId)

  return {
    accountName: account?.companyName ?? '-',
    accountCode: account?.accountCode ?? '-',
  }
}

function resolveContactMeta(contactId) {
  const contact = contactList.find((item) => item.id === contactId)

  return {
    contactName: contact?.name ?? '-',
  }
}

function normalizeActivityStatus(payload) {
  const hasNextAction = Boolean(payload.nextAction?.trim() || payload.nextActionAt)

  if (!hasNextAction) {
    return 'done'
  }

  if (payload.status === 'done') {
    return 'done'
  }

  if (payload.nextActionAt && new Date(payload.nextActionAt).getTime() < Date.now()) {
    return 'overdue'
  }

  return payload.status ?? 'pending'
}

const state = reactive({
  records: cloneRecords(activityList).map((record) => ({
    ...record,
    ...resolveAccountMeta(record.accountId),
    ...resolveContactMeta(record.contactId),
  })),
})

function listActivities() {
  return state.records
}

function getActivityById(activityId) {
  return state.records.find((record) => record.id === activityId) ?? null
}

function enrichActivity(record) {
  Object.assign(record, resolveAccountMeta(record.accountId), resolveContactMeta(record.contactId))
  return record
}

function createActivity(payload) {
  const nextRecord = enrichActivity({
    id: `act-${Date.now()}`,
    accountId: payload.accountId,
    contactId: payload.contactId || '',
    type: payload.type,
    title: payload.title.trim(),
    owner: payload.owner,
    occurredAt: payload.occurredAt,
    summary: payload.summary?.trim() ?? '',
    nextAction: payload.nextAction?.trim() ?? '',
    nextActionAt: payload.nextActionAt ?? '',
    status: normalizeActivityStatus(payload),
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  })

  state.records.unshift(nextRecord)
  return nextRecord
}

function updateActivity(activityId, payload) {
  const targetRecord = getActivityById(activityId)

  if (!targetRecord) {
    return null
  }

  Object.assign(targetRecord, {
    contactId: payload.contactId || '',
    type: payload.type ?? targetRecord.type,
    title: payload.title?.trim() ?? targetRecord.title,
    owner: payload.owner ?? targetRecord.owner,
    occurredAt: payload.occurredAt ?? targetRecord.occurredAt,
    summary: payload.summary?.trim() ?? '',
    nextAction: payload.nextAction?.trim() ?? '',
    nextActionAt: payload.nextActionAt ?? '',
    status: normalizeActivityStatus({
      status: payload.status ?? targetRecord.status,
      nextAction: payload.nextAction ?? targetRecord.nextAction,
      nextActionAt: payload.nextActionAt ?? targetRecord.nextActionAt,
    }),
    updatedAt: getCurrentTimestamp(),
  })

  enrichActivity(targetRecord)
  return targetRecord
}

function markActivityDone(activityId) {
  const targetRecord = getActivityById(activityId)

  if (!targetRecord) {
    return null
  }

  targetRecord.status = 'done'
  targetRecord.updatedAt = getCurrentTimestamp()
  return targetRecord
}

function useActivitiesStore() {
  return {
    activities: computed(() => listActivities()),
    activityTypeOptions,
    activityStatusOptions,
    ownerOptions,
    getActivityById,
    createActivity,
    updateActivity,
    markActivityDone,
  }
}

export { useActivitiesStore }
