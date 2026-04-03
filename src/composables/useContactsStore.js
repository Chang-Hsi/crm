import { computed, reactive } from 'vue'
import { contactList, contactRoleOptions } from '../data/contacts'
import { useAccountsStore } from './useAccountsStore'
import { useUsersStore } from './useUsersStore'

const { getUserName } = useUsersStore()
const { getAccountById } = useAccountsStore()

function cloneRecords(records) {
  if (typeof structuredClone === 'function') {
    return structuredClone(records)
  }

  return JSON.parse(JSON.stringify(records))
}

function resolveAccountMeta(accountId) {
  const account = getAccountById(accountId)

  return {
    accountName: account?.companyName ?? '-',
    accountCode: account?.accountCode ?? '-',
    accountStatus: account?.status ?? 'active',
    ownerUserId: account?.ownerUserId ?? '',
    region: account?.region ?? '',
  }
}

function resolveRoleLabel(roleValue) {
  return (
    contactRoleOptions.find((item) => item.value === roleValue)?.label ?? ''
  )
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

const state = reactive({
  records: cloneRecords(contactList).map((record) => ({
    ...record,
    ...resolveAccountMeta(record.accountId),
    ownerName: getUserName(record.ownerUserId),
  })),
})

function listContacts() {
  return state.records
}

function enrichContact(record) {
  Object.assign(record, resolveAccountMeta(record.accountId), {
    ownerName: getUserName(record.ownerUserId),
  })

  return record
}

function getContactById(contactId) {
  return state.records.find((record) => record.id === contactId) ?? null
}

function getContactsByAccountId(accountId) {
  return state.records.filter((record) => record.accountId === accountId)
}

function updateTimestamp(record) {
  record.updatedAt = getCurrentTimestamp()
}

function setPrimaryContact(contactId) {
  const targetRecord = getContactById(contactId)

  if (!targetRecord) {
    return null
  }

  const siblingContacts = getContactsByAccountId(targetRecord.accountId)

  siblingContacts.forEach((record) => {
    record.isPrimary = record.id === contactId

    if (record.id === contactId && record.status !== 'active') {
      record.status = 'active'
    }

    updateTimestamp(record)
  })

  return targetRecord
}

function toggleContactStatus(contactId) {
  const targetRecord = getContactById(contactId)

  if (!targetRecord) {
    return null
  }

  targetRecord.status = targetRecord.status === 'active' ? 'inactive' : 'active'
  updateTimestamp(targetRecord)

  if (targetRecord.status === 'inactive' && targetRecord.isPrimary) {
    targetRecord.isPrimary = false

    const fallbackPrimary = getContactsByAccountId(targetRecord.accountId).find(
      (record) => record.id !== targetRecord.id && record.status === 'active',
    )

    if (fallbackPrimary) {
      fallbackPrimary.isPrimary = true
      updateTimestamp(fallbackPrimary)
    }
  }

  return targetRecord
}

function createContact(payload) {
  const timestamp = getCurrentTimestamp()
  const accountMeta = resolveAccountMeta(payload.accountId)

  const nextRecord = enrichContact({
    id: `c-${Date.now()}`,
    accountId: payload.accountId,
    accountName: accountMeta.accountName,
    accountCode: accountMeta.accountCode,
    accountStatus: accountMeta.accountStatus,
    name: payload.name.trim(),
    role: payload.role,
    roleLabel: resolveRoleLabel(payload.role),
    title: payload.title?.trim() ?? '',
    department: payload.department?.trim() ?? '',
    email: payload.email.trim(),
    phone: payload.phone?.trim() ?? '',
    mobile: payload.mobile?.trim() ?? '',
    isPrimary: Boolean(payload.isPrimary),
    status: payload.status ?? 'active',
    ownerUserId: accountMeta.ownerUserId,
    region: accountMeta.region,
    notes: payload.notes?.trim() ?? '',
    lastContactAt: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  })

  if (nextRecord.isPrimary) {
    getContactsByAccountId(nextRecord.accountId).forEach((record) => {
      record.isPrimary = false
      updateTimestamp(record)
    })
    nextRecord.status = 'active'
  } else {
    const hasPrimaryContact = getContactsByAccountId(nextRecord.accountId).some(
      (record) => record.isPrimary,
    )

    if (!hasPrimaryContact && nextRecord.status === 'active') {
      nextRecord.isPrimary = true
    }
  }

  state.records.unshift(nextRecord)
  return nextRecord
}

function updateContact(contactId, payload) {
  const targetRecord = getContactById(contactId)

  if (!targetRecord) {
    return null
  }

  Object.assign(targetRecord, {
    name: payload.name?.trim() ?? targetRecord.name,
    role: payload.role ?? targetRecord.role,
    roleLabel: resolveRoleLabel(payload.role ?? targetRecord.role),
    title: payload.title?.trim() ?? '',
    department: payload.department?.trim() ?? '',
    email: payload.email?.trim() ?? targetRecord.email,
    phone: payload.phone?.trim() ?? '',
    mobile: payload.mobile?.trim() ?? '',
    status: payload.status ?? targetRecord.status,
    notes: payload.notes?.trim() ?? '',
  })

  if (payload.isPrimary) {
    getContactsByAccountId(targetRecord.accountId).forEach((record) => {
      record.isPrimary = record.id === targetRecord.id
      updateTimestamp(record)
    })
    targetRecord.status = 'active'
  } else {
    targetRecord.isPrimary = false

    const hasPrimaryContact = getContactsByAccountId(targetRecord.accountId).some(
      (record) => record.id !== targetRecord.id && record.isPrimary,
    )

    if (!hasPrimaryContact && targetRecord.status === 'active') {
      targetRecord.isPrimary = true
    }
  }

  if (targetRecord.status === 'inactive' && targetRecord.isPrimary) {
    targetRecord.isPrimary = false

    const fallbackPrimary = getContactsByAccountId(targetRecord.accountId).find(
      (record) => record.id !== targetRecord.id && record.status === 'active',
    )

    if (fallbackPrimary) {
      fallbackPrimary.isPrimary = true
      updateTimestamp(fallbackPrimary)
    }
  }

  updateTimestamp(targetRecord)
  enrichContact(targetRecord)
  return targetRecord
}

function useContactsStore() {
  return {
    contacts: computed(() => listContacts()),
    getContactById,
    getContactsByAccountId,
    createContact,
    setPrimaryContact,
    toggleContactStatus,
    updateContact,
  }
}

export { useContactsStore }
