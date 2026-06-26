const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "" : "http://localhost:3000");
const TOKEN_KEY = "miqorai-hospital-tokens-v2";
const LEGACY_TOKEN_KEYS = ["miqorai-hospital-tokens"];

export type Tokens = { access_token: string; refresh_token: string };

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
  else {
    localStorage.removeItem(TOKEN_KEY);
    LEGACY_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
  }
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
    throw new ApiError(res.status, (body as { error?: { message?: string } })?.error?.message ?? res.statusText, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function loginApi(email: string, password: string, organization_code: string) {
  saveTokens(null);
  const data = await api<{ access_token: string; refresh_token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, organization_code }),
  });
  saveTokens({ access_token: data.access_token, refresh_token: data.refresh_token });
  return api<MeResponse>("/api/auth/me");
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

export type MeResponse = {
  id: string;
  email: string;
  display_name?: string;
  staff_role?: string;
  role: string;
  hospital_name?: string;
  hospital_code?: string;
  department?: string;
};

export async function getMe() {
  return api<MeResponse>("/api/auth/me");
}
