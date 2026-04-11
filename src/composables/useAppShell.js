import { computed, reactive } from 'vue'
import { defaultAppTag } from '../router/routes'
import { AUTH_SESSION_KEY, getAuthSession } from '../utils/auth'

const APP_SHELL_STORAGE_PREFIX = 'crm-app-shell'
const SIDEBAR_AUTO_COLLAPSE_BREAKPOINT = 1080

function readStoredAuthSession() {
  const liveSession = getAuthSession()

  if (liveSession) {
    return liveSession
  }

  const rawValue = localStorage.getItem(AUTH_SESSION_KEY)

  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue)
  } catch {
    return null
  }
}

function getShellStorageKey() {
  const session = readStoredAuthSession()

  if (!session?.tenantCode) {
    return null
  }

  return `${APP_SHELL_STORAGE_PREFIX}:${session.employeeId}:${session.tenantCode}`
}

function normalizeStoredTags(tags) {
  if (!Array.isArray(tags)) {
    return [{ ...defaultAppTag }]
  }

  const resolvedTags = tags
    .filter((tag) => tag?.fullPath && tag?.title)
    .map((tag) => ({
      name: tag.name,
      title: tag.title,
      path: tag.path ?? tag.fullPath,
      fullPath: tag.fullPath,
      affix: Boolean(tag.affix),
    }))

  return resolvedTags.length > 0 ? resolvedTags : [{ ...defaultAppTag }]
}

function readPersistedShellState() {
  const storageKey = getShellStorageKey()

  if (!storageKey) {
    return {
      isSidebarCollapsed: false,
      visitedTags: [{ ...defaultAppTag }],
    }
  }

  const rawValue = localStorage.getItem(storageKey)

  if (!rawValue) {
    return {
      isSidebarCollapsed: false,
      visitedTags: [{ ...defaultAppTag }],
    }
  }

  try {
    const parsedValue = JSON.parse(rawValue)

    return {
      isSidebarCollapsed: Boolean(parsedValue?.isSidebarCollapsed),
      visitedTags: normalizeStoredTags(parsedValue?.visitedTags),
    }
  } catch {
    localStorage.removeItem(storageKey)
    return {
      isSidebarCollapsed: false,
      visitedTags: [{ ...defaultAppTag }],
    }
  }
}

function persistShellState() {
  const storageKey = getShellStorageKey()

  if (!storageKey) {
    return
  }

  localStorage.setItem(
    storageKey,
    JSON.stringify({
      isSidebarCollapsed: state.isSidebarCollapsed,
      visitedTags: state.visitedTags,
    }),
  )
}

const persistedShellState = readPersistedShellState()
const state = reactive({
  isSidebarCollapsed: persistedShellState.isSidebarCollapsed,
  isViewportCompact: false,
  visitedTags: persistedShellState.visitedTags,
})

let hasBoundViewportListener = false

function syncViewportCompactState() {
  if (typeof window === 'undefined') {
    state.isViewportCompact = false
    return
  }

  state.isViewportCompact = window.innerWidth <= SIDEBAR_AUTO_COLLAPSE_BREAKPOINT
}

function ensureResponsiveShell() {
  if (typeof window === 'undefined' || hasBoundViewportListener) {
    return
  }

  syncViewportCompactState()
  window.addEventListener('resize', syncViewportCompactState, { passive: true })
  hasBoundViewportListener = true
}

function normalizeTag(route) {
  if (!route?.name || route.name === 'login') {
    return null
  }

  return {
    name: route.name,
    title: route.meta?.title ?? String(route.name),
    path: route.path,
    fullPath: route.fullPath,
    affix: Boolean(route.meta?.affix),
  }
}

function ensureDefaultTag() {
  const hasDefaultTag = state.visitedTags.some((tag) => tag.fullPath === defaultAppTag.fullPath)

  if (!hasDefaultTag) {
    state.visitedTags.unshift({ ...defaultAppTag })
    persistShellState()
  }
}

function addVisitedTag(route) {
  const nextTag = normalizeTag(route)

  if (!nextTag) {
    return
  }

  ensureDefaultTag()

  const existingTag = state.visitedTags.find((tag) => tag.fullPath === nextTag.fullPath)

  if (existingTag) {
    existingTag.title = nextTag.title
    existingTag.path = nextTag.path
    existingTag.affix = nextTag.affix
    persistShellState()
    return
  }

  state.visitedTags.push(nextTag)
  persistShellState()
}

function removeVisitedTag(fullPath) {
  state.visitedTags = state.visitedTags.filter((tag) => tag.affix || tag.fullPath !== fullPath)
  ensureDefaultTag()
  persistShellState()
}

function updateVisitedTag(fullPath, updates) {
  const targetTag = state.visitedTags.find((tag) => tag.fullPath === fullPath)

  if (!targetTag) {
    return
  }

  Object.assign(targetTag, updates)
  persistShellState()
}

function toggleSidebar() {
  state.isSidebarCollapsed = !state.isSidebarCollapsed
  persistShellState()
}

function resetShell() {
  state.isSidebarCollapsed = false
  state.visitedTags = [{ ...defaultAppTag }]
  persistShellState()
}

function useAppShell() {
  ensureResponsiveShell()

  return {
    isSidebarCollapsed: computed(() => state.isSidebarCollapsed || state.isViewportCompact),
    isViewportCompact: computed(() => state.isViewportCompact),
    visitedTags: computed(() => state.visitedTags),
    addVisitedTag,
    removeVisitedTag,
    updateVisitedTag,
    resetShell,
    toggleSidebar,
  }
}

export { useAppShell }
