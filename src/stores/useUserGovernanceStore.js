import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { companyTenants } from "../data/auth";
import { usePermissionRoleStore } from "./usePermissionRoleStore";
import { useProfileStore } from "./useProfileStore";
import { getAuthSession, login } from "../utils/auth";

const STORAGE_KEY = "crm-user-governance";

function readStoredState() {
  if (typeof localStorage === "undefined") {
    return {
      customUsers: [],
      userOverridesById: {},
    };
  }

  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return {
      customUsers: [],
      userOverridesById: {},
    };
  }
}

function persistState(payload) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function uniqueList(items = []) {
  return [...new Set((items || []).filter(Boolean))];
}

function buildPermissionBundleFromRoleMap(roleIds, roleMap) {
  const resolvedRoles = (roleIds || []).map((roleId) => roleMap[roleId]).filter(Boolean);

  return {
    visibleSections: uniqueList(resolvedRoles.flatMap((role) => role.visibleSections || [])),
    permissions: uniqueList(resolvedRoles.flatMap((role) => role.permissions || [])),
  };
}

export const useUserGovernanceStore = defineStore("user-governance", () => {
  const storedState = readStoredState();
  const customUsers = ref(storedState.customUsers || []);
  const userOverridesById = ref(storedState.userOverridesById || {});

  const snapshot = computed(() => ({
    customUsers: customUsers.value,
    userOverridesById: userOverridesById.value,
  }));

  function syncStorage() {
    persistState(snapshot.value);
  }

  function syncCurrentSessionForUser(user) {
    const session = getAuthSession();
    if (!session || session.employeeId !== user.id) {
      return;
    }

    const membership = (user.tenantMemberships || []).find(
      (item) => item.tenantCode === session.tenantCode
    );

    if (!membership) {
      return;
    }

    const permissionRoleStore = usePermissionRoleStore();
    const roleMap = permissionRoleStore.getEffectiveRoleMap(session.tenantCode);
    const primaryRole = roleMap[membership.primaryRoleId];
    const permissionBundle = buildPermissionBundleFromRoleMap(membership.roleIds, roleMap);
    const tenant = companyTenants.find((item) => item.code === session.tenantCode);

    login({
      ...session,
      account: user.account,
      email: user.email,
      displayName: user.displayName,
      tenantCode: session.tenantCode,
      tenantName: tenant?.name ?? session.tenantCode,
      primaryRoleId: membership.primaryRoleId,
      primaryRoleLabel: primaryRole?.label ?? membership.primaryRoleId,
      roleIds: membership.roleIds,
      defaultDashboardRouteName:
        membership.defaultDashboardRouteName ||
        primaryRole?.defaultDashboardRouteName ||
        session.defaultDashboardRouteName,
      visibleSections: permissionBundle.visibleSections,
      permissions: permissionBundle.permissions,
    });

    useProfileStore().hydrateFromSession(getAuthSession());
  }

  function saveUser(payload, options = {}) {
    if (options.mode === "create") {
      customUsers.value = [payload, ...customUsers.value];
    } else if (options.source === "system") {
      userOverridesById.value = {
        ...userOverridesById.value,
        [payload.id]: {
          ...(userOverridesById.value[payload.id] || {}),
          ...payload,
        },
      };
    } else {
      customUsers.value = customUsers.value.map((item) =>
        item.id === payload.id ? { ...item, ...payload } : item
      );
    }

    syncStorage();
    syncCurrentSessionForUser(payload);
  }

  function updateUserStatus(user, nextStatus, updatedAt) {
    if (user.source === "system") {
      userOverridesById.value = {
        ...userOverridesById.value,
        [user.id]: {
          ...(userOverridesById.value[user.id] || {}),
          status: nextStatus,
          updatedAt,
        },
      };
    } else {
      customUsers.value = customUsers.value.map((item) =>
        item.id === user.id
          ? {
              ...item,
              status: nextStatus,
              updatedAt,
            }
          : item
      );
    }

    syncStorage();
    syncCurrentSessionForUser({
      ...user,
      status: nextStatus,
      updatedAt,
    });
  }

  return {
    customUsers,
    saveUser,
    updateUserStatus,
    userOverridesById,
  };
});
