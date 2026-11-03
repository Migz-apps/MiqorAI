import { createApiClient } from "@miqorai/api-client";

const PROD_API_FALLBACK = "https://miqorai.onrender.com";
const LOCAL_API_PATTERN =
  /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2)(?::\d+)?$/i;

function resolveApiUrl(): string {
  const rawApiUrl = import.meta.env.VITE_API_URL?.trim() ?? "";
  // "/" means same-origin: the host proxies /api to the backend (see vercel.json).
  if (rawApiUrl === "/") return "";
  if (import.meta.env.DEV) return rawApiUrl;
  return !rawApiUrl || LOCAL_API_PATTERN.test(rawApiUrl) ? PROD_API_FALLBACK : rawApiUrl;
}

const API_URL = resolveApiUrl().replace(/\/$/, "");

export const apiClient = createApiClient({ baseUrl: API_URL, portal: "patient" });

export const { api, downloadFile, restoreSession, hasSession, clearSession, onSessionExpired } =
  apiClient;
export { ApiError } from "@miqorai/api-client";

export async function loginApi(email: string, password: string) {
  await apiClient.login("/api/auth/login", { email, password });
}

export async function completePatientSignupApi(email: string, otp: string) {
  await apiClient.login("/api/auth/register/verify-otp", { email, otp });
}

export async function requestForgotPasswordApi(email: string) {
  return api<{ message: string }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resendForgotPasswordOtpApi(email: string) {
  return api<{ message: string }>("/api/auth/forgot-password/resend-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function verifyForgotPasswordOtpApi(email: string, otp: string) {
  return api<{ reset_token: string }>("/api/auth/forgot-password/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

export async function resetPasswordApi(token: string, newPassword: string) {
  return api<{ message: string }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

export const logoutApi = apiClient.logout;
