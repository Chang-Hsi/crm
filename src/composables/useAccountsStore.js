import { computed, reactive } from 'vue'
import { accountList } from '../data/accounts'
import { tierMap } from '../constants/accountMaps'

function cloneRecords(records) {
  if (typeof structuredClone === 'function') {
    return structuredClone(records)
  }

  return JSON.parse(JSON.stringify(records))
}

function createEmptyCollections() {
  return {
    contacts: [],
    opportunities: [],
    contracts: [],
    projects: [],
    activities: [],
    files: [],
    timeline: [],
    tags: [],
  }
}

const state = reactive({
  records: cloneRecords(accountList),
})

function listAccounts() {
  return state.records
}

function getAccountById(accountId) {
  return state.records.find((record) => record.id === accountId) ?? null
}

function getNextAccountCode() {
  const maxNumber = state.records.reduce((currentMax, record) => {
    const numberValue = Number(record.accountCode.replace('ACC-', ''))
    return Number.isNaN(numberValue) ? currentMax : Math.max(currentMax, numberValue)
  }, 0)

  return `ACC-${String(maxNumber + 1).padStart(3, '0')}`
}

function buildTimelineEntry(title, description) {
  return {
    id: `t-${Date.now()}`,
    type: 'update',
    title,
    description,
    timestamp: new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .format(new Date())
      .replace(' ', ' '),
  }
}

function resolveTierLabel(tierValue) {
  return tierMap[tierValue]?.label ?? tierValue
}

function normalizeTags(tags = []) {
  const tagMap = new Map()

  tags.forEach((tag) => {
    const normalizedTag = String(tag ?? '').trim()

    if (!normalizedTag) {
      return
    }

    const key = normalizedTag.toLocaleLowerCase()

    if (!tagMap.has(key)) {
      tagMap.set(key, normalizedTag)
    }
  })

  return [...tagMap.values()]
}

function createAccount(payload) {
  const now = new Date().toISOString()
  const nextRecord = {
    id: `acc-${Date.now()}`,
    accountCode: getNextAccountCode(),
    updatedAt: now,
    opportunityCount: 0,
    contactCount: 0,
    contractCount: 0,
    projectCount: 0,
    ...createEmptyCollections(),
    ...payload,
  }

  nextRecord.timeline = [
    buildTimelineEntry('建立客戶資料', `由 ${nextRecord.owner} 新增客戶 ${nextRecord.companyName}`),
  ]

  state.records.unshift(nextRecord)
  return nextRecord
}

function updateAccount(accountId, payload) {
  const targetRecord = getAccountById(accountId)

  if (!targetRecord) {
    return null
  }

  Object.assign(targetRecord, payload, {
    updatedAt: new Date().toISOString(),
  })

  targetRecord.timeline = [
    buildTimelineEntry('更新客戶資料', `已更新 ${targetRecord.companyName} 的基本資料`),
    ...(targetRecord.timeline ?? []),
  ]

  return targetRecord
}

function updateAccountTier(accountId, nextTier, reason = '') {
  const targetRecord = getAccountById(accountId)

  if (!targetRecord) {
    return null
  }

  const previousTier = targetRecord.tier
  targetRecord.tier = nextTier
  targetRecord.updatedAt = new Date().toISOString()

  const changeSummary =
    previousTier === nextTier
      ? `${targetRecord.companyName} 維持 ${resolveTierLabel(nextTier)}`
      : `${targetRecord.companyName} 由 ${resolveTierLabel(
          previousTier,
        )} 調整為 ${resolveTierLabel(nextTier)}`

  targetRecord.timeline = [
    buildTimelineEntry(
      '更新客戶分級',
      reason ? `${changeSummary}，原因：${reason}` : changeSummary,
    ),
    ...(targetRecord.timeline ?? []),
  ]

  return targetRecord
}

function updateAccountTiers(accountIds, nextTier, reason = '') {
  return accountIds
    .map((accountId) => updateAccountTier(accountId, nextTier, reason))
    .filter(Boolean)
}

function updateAccountTags(accountId, nextTags, reason = '') {
  const targetRecord = getAccountById(accountId)

  if (!targetRecord) {
    return null
  }

  const normalizedTags = normalizeTags(nextTags)
  targetRecord.tags = normalizedTags
  targetRecord.updatedAt = new Date().toISOString()

  targetRecord.timeline = [
    buildTimelineEntry(
      '更新客戶標籤',
      reason
        ? `${targetRecord.companyName} 的標籤已更新，原因：${reason}`
        : `${targetRecord.companyName} 的標籤已更新`,
    ),
    ...(targetRecord.timeline ?? []),
  ]

  return targetRecord
}

function updateAccountsTags(accountIds, { addTags = [], removeTags = [], reason = '' }) {
  const normalizedAddTags = normalizeTags(addTags)
  const normalizedRemoveTags = normalizeTags(removeTags)
  const removeTagSet = new Set(
    normalizedRemoveTags.map((tag) => tag.toLocaleLowerCase()),
  )

  return accountIds
    .map((accountId) => {
      const targetRecord = getAccountById(accountId)

      if (!targetRecord) {
        return null
      }

      const currentTags = normalizeTags(targetRecord.tags)
      const preservedTags = currentTags.filter(
        (tag) => !removeTagSet.has(tag.toLocaleLowerCase()),
      )
      const nextTags = normalizeTags([...preservedTags, ...normalizedAddTags])

      return updateAccountTags(accountId, nextTags, reason)
    })
    .filter(Boolean)
}

function useAccountsStore() {
  return {
    accounts: computed(() => listAccounts()),
    getAccountById,
    createAccount,
    updateAccount,
    updateAccountTier,
    updateAccountTiers,
    updateAccountTags,
    updateAccountsTags,
  }
}

export { useAccountsStore }
