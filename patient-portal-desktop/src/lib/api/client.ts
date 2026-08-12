const PROD_API_FALLBACK = "https://miqorai.onrender.com";
const LOCAL_API_PATTERN = /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2)(?::\d+)?$/i;

function resolveApiUrl(): string {
  const rawApiUrl = import.meta.env.VITE_API_URL?.trim() ?? "";
  if (import.meta.env.DEV) return rawApiUrl;
  return !rawApiUrl || LOCAL_API_PATTERN.test(rawApiUrl) ? PROD_API_FALLBACK : rawApiUrl;
}

const API_URL = resolveApiUrl().replace(/\/$/, "");
const TOKEN_KEY = "miqorai-patient-tokens";

export type Tokens = { access_token: string; refresh_token: string };

type SessionPayload = Tokens;

let tokens: Tokens | null = null;

export function loadTokens(): Tokens | null {
  if (tokens) return tokens;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (raw) tokens = JSON.parse(raw) as Tokens;
  } catch {
    localStorage.removeItem(TOKEN_KEY);
  }
  return tokens;
}

export function saveTokens(t: Tokens | null) {
  tokens = t;
  if (t) localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const t = loadTokens();
  if (!t?.refresh_token) return false;
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: t.refresh_token }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { access_token: string };
  saveTokens({ ...t, access_token: data.access_token });
  return true;
}

function resolveUrl(path: string): string {
  return /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`;
}

function getDownloadFilename(response: Response, fallback = "download"): string {
  const disposition = response.headers.get("content-disposition") ?? "";
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]);
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) return plainMatch[1];
  return fallback;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  loadTokens();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (tokens?.access_token) headers.Authorization = `Bearer ${tokens.access_token}`;

  let res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401 && tokens?.refresh_token) {
    const ok = await refreshAccessToken();
    if (ok) {
      headers.Authorization = `Bearer ${loadTokens()!.access_token}`;
      res = await fetch(`${API_URL}${path}`, { ...init, headers });
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      (body as { error?: { message?: string } })?.error?.message ?? res.statusText,
      body,
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function loginApi(email: string, password: string) {
  saveTokens(null);
  const data = await api<SessionPayload>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  saveTokens({ access_token: data.access_token, refresh_token: data.refresh_token });
}

export async function completePatientSignupApi(email: string, otp: string) {
  saveTokens(null);
  const data = await api<SessionPayload>("/api/auth/register/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
  saveTokens({ access_token: data.access_token, refresh_token: data.refresh_token });
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

export async function logoutApi() {
  const t = loadTokens();
  if (t?.refresh_token) {
    await api("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: t.refresh_token }),
    }).catch(() => undefined);
  }
  saveTokens(null);
}

export async function downloadFile(url: string, fallbackFilename?: string) {
  loadTokens();
  const headers: Record<string, string> = {};
  if (tokens?.access_token) headers.Authorization = `Bearer ${tokens.access_token}`;

  let res = await fetch(resolveUrl(url), { headers });
  if (res.status === 401 && tokens?.refresh_token) {
    const ok = await refreshAccessToken();
    if (ok) {
      headers.Authorization = `Bearer ${loadTokens()!.access_token}`;
      res = await fetch(resolveUrl(url), { headers });
    }
  }

  if (!res.ok) {
    const message = (await res.text().catch(() => "")) || res.statusText;
    throw new ApiError(res.status, message);
  }

  const blob = await res.blob();
  const filename = getDownloadFilename(res, fallbackFilename);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
