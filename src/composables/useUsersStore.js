import { computed } from "vue";
import { userList } from "../data/users";

function getUsers() {
  return userList;
}

function getUserById(userId) {
  return userList.find((user) => user.id === userId) ?? null;
}

function getUserName(userId) {
  return getUserById(userId)?.name ?? "未指派";
}

function getAssignableOwners(moduleName) {
  const activeUsers = userList.filter((user) => user.status === "active");

  if (moduleName === "finance") {
    return activeUsers.filter((user) => ["finance", "manager"].includes(user.role));
  }

  return activeUsers.filter((user) => ["bd", "manager"].includes(user.role));
}

function useUsersStore() {
  return {
    users: computed(() => getUsers()),
    getUsers,
    getUserById,
    getUserName,
    getAssignableOwners,
  };
}

export { useUsersStore };
