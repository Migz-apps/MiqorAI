import { createApiClient, createAuthApi } from "@miqorai/api-client";

const PROD_API_FALLBACK = "https://miqorai.onrender.com";
const LOCAL_API_PATTERN = /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2)(?::\d+)?$/i;

function resolveApiUrl(): string {
  const rawApiUrl = import.meta.env.VITE_API_URL?.trim() ?? "";
  if (import.meta.env.DEV) return rawApiUrl;
  return !rawApiUrl || LOCAL_API_PATTERN.test(rawApiUrl) ? PROD_API_FALLBACK : rawApiUrl;
}

const API_URL = resolveApiUrl().replace(/\/$/, "");

export const apiClient = createApiClient({ baseUrl: API_URL, portal: "insurer" });

export const { api, downloadFile, restoreSession, hasSession, clearSession, onSessionExpired } = apiClient;
export const { invitationApi, submitOnboardingRequest, changePasswordApi } = createAuthApi(apiClient);
export { ApiError, type InvitationInfo, type OnboardingRequestBody } from "@miqorai/api-client";

export type MeResponse = {
  id: string;
  email: string;
  display_name?: string;
  staff_role?: string;
  role: string;
  insurer_name?: string;
  insurer_code?: string;
};

export async function loginApi(email: string, password: string, organization_code: string) {
  await apiClient.login("/api/auth/login", { email, password, organization_code });
  return getMe();
}

export const logoutApi = apiClient.logout;

export async function getMe() {
  return api<MeResponse>("/api/auth/me");
}
