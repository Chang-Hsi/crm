import { computed, reactive } from 'vue'
import { defaultAppTag } from '../router/routes'

const AUTH_SESSION_KEY = 'crm-auth-session'

function readStoredSession() {
  const rawValue = localStorage.getItem(AUTH_SESSION_KEY)

  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue)
  } catch {
    localStorage.removeItem(AUTH_SESSION_KEY)
    return null
  }
}

const authState = reactive({
  session: readStoredSession(),
})

function getAuthSession() {
  return authState.session
}

function isAuthenticated() {
  return Boolean(authState.session)
}

function login(session) {
  authState.session = session
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

function logout() {
  authState.session = null
  localStorage.removeItem(AUTH_SESSION_KEY)
}

function getDefaultRouteLocation() {
  const session = getAuthSession()

  if (!session) {
    return { name: 'login' }
  }

  if (!session?.defaultDashboardRouteName) {
    return { path: defaultAppTag.fullPath }
  }

  return { name: session.defaultDashboardRouteName }
}

function canAccessRoute(route) {
  const session = getAuthSession()

  if (!session) {
    return false
  }

  const section = route.meta?.section

  if (!section || section === 'Auth' || section === '帳號中心') {
    return true
  }

  return session.visibleSections.includes(section)
}

function useAuthSession() {
  return {
    authSession: computed(() => authState.session),
    isAuthenticated: computed(() => Boolean(authState.session)),
  }
}

export {
  AUTH_SESSION_KEY,
  getAuthSession,
  isAuthenticated,
  login,
  logout,
  getDefaultRouteLocation,
  canAccessRoute,
  useAuthSession,
}
