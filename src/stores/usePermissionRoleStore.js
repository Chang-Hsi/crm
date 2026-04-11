import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { buildPermissionBundle, roleCatalog as baseRoleCatalog } from "../data/auth";
import { getAuthSession, login } from "../utils/auth";

const STORAGE_KEY = "crm-role-governance";

function readStoredState() {
  if (typeof localStorage === "undefined") {
    return {
      customRolesByTenant: {},
      roleOverridesByTenant: {},
    };
  }

  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return {
      customRolesByTenant: {},
      roleOverridesByTenant: {},
    };
  }
}

function uniqueList(list = []) {
  return [...new Set((list || []).filter(Boolean))];
}

function persistState(payload) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function buildPermissionBundleFromCatalog(roleIds, catalogMap) {
  const resolvedRoles = roleIds
    .map((roleId) => catalogMap[roleId])
    .filter(Boolean);

  if (resolvedRoles.length === 0) {
    return buildPermissionBundle([]);
  }

  return {
    roles: resolvedRoles,
    visibleSections: uniqueList(
      resolvedRoles.flatMap((role) => role.visibleSections || [])
    ),
    permissions: uniqueList(
      resolvedRoles.flatMap((role) => role.permissions || [])
    ),
  };
}

export const usePermissionRoleStore = defineStore("permission-role", () => {
  const storedState = readStoredState();
  const customRolesByTenant = ref(storedState.customRolesByTenant || {});
  const roleOverridesByTenant = ref(storedState.roleOverridesByTenant || {});

  const snapshot = computed(() => ({
    customRolesByTenant: customRolesByTenant.value,
    roleOverridesByTenant: roleOverridesByTenant.value,
  }));

  function syncStorage() {
    persistState(snapshot.value);
  }

  function getCustomRoles(tenantCode) {
    return customRolesByTenant.value[tenantCode] || [];
  }

  function getRoleOverrides(tenantCode) {
    return roleOverridesByTenant.value[tenantCode] || {};
  }

  function getEffectiveRoleMap(tenantCode) {
    const overrides = getRoleOverrides(tenantCode);
    const customRoles = getCustomRoles(tenantCode);

    const baseMap = Object.fromEntries(
      Object.values(baseRoleCatalog).map((role) => [
        role.id,
        {
          ...role,
          ...(overrides[role.id] || {}),
          visibleSections: uniqueList(
            overrides[role.id]?.visibleSections || role.visibleSections || []
          ),
          permissions: uniqueList(
            overrides[role.id]?.permissions || role.permissions || []
          ),
        },
      ])
    );

    customRoles.forEach((role) => {
      baseMap[role.id] = {
        ...role,
        visibleSections: uniqueList(role.visibleSections || []),
        permissions: uniqueList(role.permissions || []),
      };
    });

    return baseMap;
  }

  function syncCurrentSession(tenantCode) {
    const session = getAuthSession();
    if (!session || session.tenantCode !== tenantCode) {
      return;
    }

    const roleMap = getEffectiveRoleMap(tenantCode);
    const permissionBundle = buildPermissionBundleFromCatalog(session.roleIds, roleMap);
    const primaryRole = roleMap[session.primaryRoleId];

    login({
      ...session,
      primaryRoleLabel: primaryRole?.label ?? session.primaryRoleId,
      defaultDashboardRouteName:
        primaryRole?.defaultDashboardRouteName ?? session.defaultDashboardRouteName,
      visibleSections: permissionBundle.visibleSections,
      permissions: permissionBundle.permissions,
    });
  }

  function saveRole(tenantCode, payload, options = {}) {
    const nextPayload = {
      ...payload,
      visibleSections: uniqueList(payload.visibleSections || []),
      permissions: uniqueList(payload.permissions || []),
    };

    if (options.isSystemDefault) {
      const currentOverrides = {
        ...(roleOverridesByTenant.value[tenantCode] || {}),
      };
      currentOverrides[nextPayload.id] = {
        ...(currentOverrides[nextPayload.id] || {}),
        ...nextPayload,
      };
      roleOverridesByTenant.value = {
        ...roleOverridesByTenant.value,
        [tenantCode]: currentOverrides,
      };
    } else if (options.mode === "edit" && options.originalId) {
      const currentCustomRoles = [...getCustomRoles(tenantCode)];
      const targetIndex = currentCustomRoles.findIndex((role) => role.id === options.originalId);

      if (targetIndex >= 0) {
        currentCustomRoles[targetIndex] = {
          ...currentCustomRoles[targetIndex],
          ...nextPayload,
        };
      } else {
        currentCustomRoles.unshift(nextPayload);
      }

      customRolesByTenant.value = {
        ...customRolesByTenant.value,
        [tenantCode]: currentCustomRoles,
      };
    } else {
      customRolesByTenant.value = {
        ...customRolesByTenant.value,
        [tenantCode]: [nextPayload, ...getCustomRoles(tenantCode)],
      };
    }

    syncStorage();
    syncCurrentSession(tenantCode);
  }

  function updateRoleStatus(tenantCode, role, nextStatus, updatedAt) {
    if (role.isSystemDefault) {
      const currentOverrides = {
        ...(roleOverridesByTenant.value[tenantCode] || {}),
      };
      currentOverrides[role.id] = {
        ...(currentOverrides[role.id] || {}),
        status: nextStatus,
        updatedAt,
      };
      roleOverridesByTenant.value = {
        ...roleOverridesByTenant.value,
        [tenantCode]: currentOverrides,
      };
    } else {
      const currentCustomRoles = getCustomRoles(tenantCode).map((item) =>
        item.id === role.id
          ? {
              ...item,
              status: nextStatus,
              updatedAt,
            }
          : item
      );

      customRolesByTenant.value = {
        ...customRolesByTenant.value,
        [tenantCode]: currentCustomRoles,
      };
    }

    syncStorage();
    syncCurrentSession(tenantCode);
  }

  return {
    customRolesByTenant,
    getCustomRoles,
    getEffectiveRoleMap,
    getRoleOverrides,
    roleOverridesByTenant,
    saveRole,
    syncCurrentSession,
    updateRoleStatus,
  };
});
