import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { getAuthSession, login } from "../utils/auth";

function splitName(name) {
  const plain = String(name || "").trim();
  if (!plain) {
    return { firstName: "", lastName: "" };
  }

  const parts = plain.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: plain, lastName: "" };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) || "",
  };
}

export const useProfileStore = defineStore("profile", () => {
  const account = ref("-");
  const displayName = ref("Guest");
  const firstName = ref("");
  const lastName = ref("");
  const email = ref("");
  const primaryRoleLabel = ref("Guest");
  const tenantName = ref("N/A");
  const tenantCode = ref("N/A");
  const avatarUrl = ref("");
  const hydratedAccount = ref("");

  const avatarInitials = computed(() =>
    String(displayName.value || "G")
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase()
  );

  function hydrateFromSession(session = getAuthSession()) {
    if (!session) {
      return;
    }

    if (hydratedAccount.value === session.account && displayName.value !== "Guest") {
      return;
    }

    const parsedName = splitName(session.displayName);
    account.value = session.account ?? "-";
    displayName.value = session.displayName ?? "Guest";
    firstName.value = parsedName.firstName;
    lastName.value = parsedName.lastName;
    email.value = session.email ?? "";
    primaryRoleLabel.value = session.primaryRoleLabel ?? "Guest";
    tenantName.value = session.tenantName ?? "N/A";
    tenantCode.value = session.tenantCode ?? "N/A";
    avatarUrl.value = session.avatarUrl ?? "";
    hydratedAccount.value = session.account ?? "";
  }

  function saveProfile(payload) {
    firstName.value = payload.firstName.trim();
    lastName.value = payload.lastName.trim();
    email.value = payload.email.trim();
    avatarUrl.value = payload.avatarUrl ?? avatarUrl.value;

    const nextDisplayName = [firstName.value, lastName.value].filter(Boolean).join(" ");
    displayName.value = nextDisplayName || firstName.value || lastName.value || displayName.value;

    const currentSession = getAuthSession();
    if (currentSession) {
      login({
        ...currentSession,
        displayName: displayName.value,
        email: email.value,
        avatarUrl: avatarUrl.value,
      });
      hydratedAccount.value = currentSession.account ?? "";
    }
  }

  return {
    account,
    avatarInitials,
    avatarUrl,
    displayName,
    email,
    firstName,
    hydrateFromSession,
    lastName,
    primaryRoleLabel,
    saveProfile,
    tenantCode,
    tenantName,
  };
});
