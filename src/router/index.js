import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import AuthLayout from '../layouts/AuthLayout.vue'
import {
  appChildRoutes,
  appUtilityRoutes,
  authRoutes,
} from './routes'
import {
  canAccessRoute,
  getDefaultRouteLocation,
  isAuthenticated,
} from '../utils/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      redirect: () => getDefaultRouteLocation(),
      children: [...appChildRoutes, ...appUtilityRoutes],
    },
    {
      path: '/',
      component: AuthLayout,
      children: authRoutes,
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: () => getDefaultRouteLocation(),
    },
  ],
})

router.beforeEach((to) => {
  const authenticated = isAuthenticated()

  if (to.name === 'login' && authenticated) {
    return getDefaultRouteLocation()
  }

  if (to.name !== 'login' && !authenticated) {
    return { name: 'login' }
  }

  if (authenticated && !canAccessRoute(to)) {
    return getDefaultRouteLocation()
  }

  return true
})

export default router
