const companyTenants = [
  {
    code: 'GMN-TW',
    name: '遊戲橘子公司',
    shortName: '遊戲橘子',
    region: 'Taiwan',
  },
  {
    code: 'BFN-SEA',
    name: 'beanfun! 東南亞商務中心',
    shortName: 'beanfun! SEA',
    region: 'Southeast Asia',
  },
  {
    code: 'NXG-JP',
    name: 'Next G Studio 日本合作事業部',
    shortName: 'Next G JP',
    region: 'Japan',
  },
]

const roleCatalog = {
  admin: {
    id: 'admin',
    label: 'Admin',
    defaultDashboardRouteName: 'dashboard-overview',
    visibleSections: [
      'Dashboard',
      '客戶管理',
      '商機管理',
      '夥伴管理',
      '專案與活動',
      '互動與支援',
      '財務與結算',
      '報表中心',
      '設定',
    ],
    permissions: ['*'],
  },
  bd_sales: {
    id: 'bd_sales',
    label: 'BD / Sales',
    defaultDashboardRouteName: 'dashboard-overview',
    visibleSections: [
      'Dashboard',
      '客戶管理',
      '商機管理',
      '專案與活動',
      '互動與支援',
      '報表中心',
    ],
    permissions: [
      'account:read',
      'account:write',
      'contact:read',
      'contact:write',
      'opportunity:read',
      'opportunity:write',
      'pipeline:read',
      'pipeline:write',
      'forecast:read',
      'engagement:read',
      'engagement:write',
      'project:read',
      'campaign:read',
      'report:personal',
    ],
  },
  finance: {
    id: 'finance',
    label: 'Finance',
    defaultDashboardRouteName: 'dashboard-revenue-overview',
    visibleSections: ['Dashboard', '夥伴管理', '財務與結算', '報表中心', '設定'],
    permissions: [
      'contract:read',
      'contract:write',
      'settlement:read',
      'settlement:write',
      'revenue:read',
      'revenue:write',
      'payment:read',
      'payment:write',
      'currency:read',
      'report:finance',
      'settings:finance',
    ],
  },
  manager_executive: {
    id: 'manager_executive',
    label: 'Manager / Executive',
    defaultDashboardRouteName: 'dashboard-overview',
    visibleSections: [
      'Dashboard',
      '客戶管理',
      '商機管理',
      '夥伴管理',
      '專案與活動',
      '報表中心',
    ],
    permissions: [
      'dashboard:executive',
      'report:all',
      'account:read',
      'opportunity:read',
      'partner:read',
      'project:read',
      'kpi:read',
    ],
  },
}

const employeeAccounts = [
  {
    id: 'emp-chris-chen',
    account: 'chris.chen',
    email: 'chris.chen@gamania.test',
    displayName: 'Chris Chen',
    password: 'Password123!',
    tenantMemberships: [
      {
        tenantCode: 'GMN-TW',
        primaryRoleId: 'admin',
        roleIds: ['admin', 'manager_executive'],
      },
      {
        tenantCode: 'BFN-SEA',
        primaryRoleId: 'manager_executive',
        roleIds: ['manager_executive'],
      },
    ],
  },
  {
    id: 'emp-mia-lin',
    account: 'mia.lin',
    email: 'mia.lin@gamania.test',
    displayName: 'Mia Lin',
    password: 'Password123!',
    tenantMemberships: [
      {
        tenantCode: 'GMN-TW',
        primaryRoleId: 'bd_sales',
        roleIds: ['bd_sales'],
      },
      {
        tenantCode: 'NXG-JP',
        primaryRoleId: 'bd_sales',
        roleIds: ['bd_sales', 'manager_executive'],
      },
    ],
  },
  {
    id: 'emp-eric-wu',
    account: 'eric.wu',
    email: 'eric.wu@gamania.test',
    displayName: 'Eric Wu',
    password: 'Password123!',
    tenantMemberships: [
      {
        tenantCode: 'GMN-TW',
        primaryRoleId: 'finance',
        roleIds: ['finance'],
      },
      {
        tenantCode: 'BFN-SEA',
        primaryRoleId: 'finance',
        roleIds: ['finance', 'manager_executive'],
      },
    ],
  },
]

function getTenantByCode(code) {
  return companyTenants.find((tenant) => tenant.code === code) ?? null
}

function getEmployeeByLoginId(loginId) {
  return (
    employeeAccounts.find(
      (employee) => employee.account === loginId || employee.email === loginId,
    ) ?? null
  )
}

function getTenantMembership(employeeId, tenantCode) {
  const employee = employeeAccounts.find((item) => item.id === employeeId)

  if (!employee) {
    return null
  }

  return employee.tenantMemberships.find((item) => item.tenantCode === tenantCode) ?? null
}

function buildPermissionBundle(roleIds) {
  const resolvedRoles = roleIds
    .map((roleId) => roleCatalog[roleId])
    .filter(Boolean)

  return {
    roles: resolvedRoles,
    visibleSections: [...new Set(resolvedRoles.flatMap((role) => role.visibleSections))],
    permissions: [...new Set(resolvedRoles.flatMap((role) => role.permissions))],
  }
}

function authenticateMockUser({ tenantCode, loginId, password }) {
  const employee = getEmployeeByLoginId(loginId)

  if (!employee || employee.password !== password) {
    return null
  }

  const membership = employee.tenantMemberships.find((item) => item.tenantCode === tenantCode)

  if (!membership) {
    return null
  }

  const tenant = getTenantByCode(tenantCode)
  const primaryRole = roleCatalog[membership.primaryRoleId]
  const permissionBundle = buildPermissionBundle(membership.roleIds)

  return {
    employeeId: employee.id,
    account: employee.account,
    email: employee.email,
    displayName: employee.displayName,
    tenantCode,
    tenantName: tenant?.name ?? tenantCode,
    primaryRoleId: membership.primaryRoleId,
    primaryRoleLabel: primaryRole?.label ?? membership.primaryRoleId,
    roleIds: membership.roleIds,
    defaultDashboardRouteName:
      primaryRole?.defaultDashboardRouteName ?? 'dashboard-overview',
    visibleSections: permissionBundle.visibleSections,
    permissions: permissionBundle.permissions,
  }
}

export {
  companyTenants,
  roleCatalog,
  employeeAccounts,
  getTenantByCode,
  getEmployeeByLoginId,
  getTenantMembership,
  buildPermissionBundle,
  authenticateMockUser,
}
