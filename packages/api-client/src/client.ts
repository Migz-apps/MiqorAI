import { toApiError } from "./errors";

export type PortalName = "admin" | "hospital" | "insurer" | "pharmacy" | "patient";

/**
 * Keys under which earlier releases kept { access_token, refresh_token } in
 * localStorage. They are read once to move the session into the httpOnly
 * cookie, then deleted.
 */
export const LEGACY_TOKEN_KEYS: Record<PortalName, readonly string[]> = {
  admin: ["miqorai-admin-tokens"],
  hospital: ["miqorai-hospital-tokens-v2", "miqorai-hospital-tokens"],
  insurer: ["miqorai-insurer-tokens"],
  pharmacy: ["miqorai-pharmacy-tokens"],
  patient: ["miqorai-patient-tokens"],
};

type LegacyStorage = Pick<Storage, "getItem" | "removeItem">;

export type ApiClientOptions = {
  /** API origin, e.g. "https://api.example.com". Empty means same origin (dev proxy). */
  baseUrl: string;
  portal: PortalName;
  /** Called when the refresh cookie can no longer renew the session. */
  onSessionExpired?: () => void;
  /** Injected for tests; defaults to the global fetch. */
  fetch?: typeof fetch;
  /** Injected for tests; defaults to window.localStorage when available. */
  legacyStorage?: LegacyStorage | null;
};

export type TokenResponse = { access_token: string; refresh_token?: string };

const REFRESH_PATH = "/api/auth/refresh";
const LOGOUT_PATH = "/api/auth/logout";

function defaultLegacyStorage(): LegacyStorage | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    // Storage access can throw (privacy mode, sandboxed iframes).
    return null;
  }
}

function getDownloadFilename(response: Response, fallback = "download"): string {
  const disposition = response.headers.get("content-disposition") ?? "";
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]);
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) return plainMatch[1];
  return fallback;
}

/**
 * Creates the browser API client for one portal.
 *
 * The access token lives only in memory. The refresh token lives in the
 * server's httpOnly `miqorai_refresh` cookie, so every request to the API
 * origin is sent with credentials and the session is rebuilt on page load
 * through restoreSession().
 */
export function createApiClient(options: ApiClientOptions) {
  const baseUrl = options.baseUrl.trim().replace(/\/$/, "");
  const legacyKeys = LEGACY_TOKEN_KEYS[options.portal];
  const expiredListeners = new Set<() => void>();
  if (options.onSessionExpired) expiredListeners.add(options.onSessionExpired);

  let accessToken: string | null = null;
  let refreshInFlight: Promise<boolean> | null = null;
  let restoreInFlight: Promise<boolean> | null = null;

  const doFetch = (input: string, init: RequestInit) => (options.fetch ?? globalThis.fetch)(input, init);
  const legacyStorage = () =>
    options.legacyStorage === undefined ? defaultLegacyStorage() : options.legacyStorage;

  function resolveUrl(path: string): string {
    return /^https?:\/\//i.test(path) ? path : `${baseUrl}${path}`;
  }

  /** True only for URLs on the API origin; credentials never go anywhere else. */
  function isApiUrl(target: string): boolean {
    if (/^\/(?!\/)/.test(target)) return true;
    try {
      const targetOrigin = new URL(target).origin;
      if (baseUrl) return targetOrigin === new URL(baseUrl).origin;
      return typeof window !== "undefined" && targetOrigin === window.location.origin;
    } catch {
      return false;
    }
  }

  function clearSession() {
    accessToken = null;
  }

  function setAccessToken(token: string | null) {
    accessToken = token;
  }

  function acceptTokens(data: Partial<TokenResponse> | null | undefined) {
    if (data?.access_token) accessToken = data.access_token;
  }

  function expireSession() {
    clearSession();
    expiredListeners.forEach((listener) => listener());
  }

  function clearLegacyTokens() {
    const storage = legacyStorage();
    if (!storage) return;
    legacyKeys.forEach((key) => {
      try {
        storage.removeItem(key);
      } catch {
        /* storage unavailable */
      }
    });
  }

  function readLegacyRefreshToken(): string | null {
    const storage = legacyStorage();
    if (!storage) return null;
    for (const key of legacyKeys) {
      try {
        const raw = storage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as { refresh_token?: unknown };
        if (typeof parsed?.refresh_token === "string" && parsed.refresh_token) return parsed.refresh_token;
      } catch {
        /* corrupt entry: removed below */
      }
    }
    return null;
  }

  /** One POST to /api/auth/refresh. Throws only on network failure. */
  async function requestRefresh(legacyRefreshToken?: string): Promise<boolean> {
    const init: RequestInit = { method: "POST", credentials: "include" };
    if (legacyRefreshToken) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify({ refresh_token: legacyRefreshToken });
    }
    const res = await doFetch(`${baseUrl}${REFRESH_PATH}`, init);
    if (!res.ok) return false;
    const data = (await res.json().catch(() => null)) as Partial<TokenResponse> | null;
    if (!data?.access_token) return false;
    accessToken = data.access_token;
    return true;
  }

  /** Single-flight: concurrent 401s share one refresh request. */
  function refreshAccessToken(): Promise<boolean> {
    if (!refreshInFlight) {
      refreshInFlight = requestRefresh()
        .then((ok) => {
          // The session is unrecoverable: drop it so route guards redirect to login.
          if (!ok) expireSession();
          return ok;
        })
        .finally(() => {
          refreshInFlight = null;
        });
    }
    return refreshInFlight;
  }

  /**
   * Rebuilds the in-memory session from the refresh cookie (call once on page
   * load). A refresh token left in localStorage by an earlier release is
   * exchanged once so the server sets the cookie, then every legacy key is removed.
   */
  function restoreSession(): Promise<boolean> {
    if (accessToken) return Promise.resolve(true);
    if (!restoreInFlight) {
      restoreInFlight = (async () => {
        const legacyRefreshToken = readLegacyRefreshToken();
        if (legacyRefreshToken) {
          try {
            if (await requestRefresh(legacyRefreshToken)) return true;
          } catch {
            /* fall through to the cookie */
          } finally {
            clearLegacyTokens();
          }
        } else {
          clearLegacyTokens();
        }
        try {
          return await requestRefresh();
        } catch {
          return false;
        }
      })().finally(() => {
        restoreInFlight = null;
      });
    }
    return restoreInFlight;
  }

  function buildHeaders(initHeaders: HeadersInit | undefined, body: unknown, withToken: boolean): Headers {
    const headers = new Headers(initHeaders);
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    if (!isFormData && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (withToken && accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    return headers;
  }

  async function parseBody<T>(res: Response): Promise<T> {
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  /** Requests issued while the page-load restore runs wait for it, so they go out with the token. */
  async function settleRestore() {
    if (!restoreInFlight) return;
    try {
      await restoreInFlight;
    } catch {
      /* restoreSession never rejects; guard anyway */
    }
  }

  /**
   * Sends once and, on a 401 for a request that carried a token, renews the
   * session and retries once. A request that raced a refresh another call
   * already completed just retries with the new token.
   */
  async function sendWithRenewal(toApi: boolean, send: () => Promise<Response>): Promise<Response> {
    if (toApi) await settleRestore();
    const tokenUsed = accessToken;
    const res = await send();
    if (res.status !== 401 || !toApi || !tokenUsed) return res;
    if (accessToken && accessToken !== tokenUsed) return send();
    return (await refreshAccessToken()) ? send() : res;
  }

  async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = resolveUrl(path);
    const toApi = isApiUrl(url);
    const send = () =>
      doFetch(url, {
        ...init,
        credentials: toApi ? "include" : init.credentials,
        headers: buildHeaders(init.headers, init.body, toApi),
      });

    const res = await sendWithRenewal(toApi, send);

    if (!res.ok) throw await toApiError(res);
    return parseBody<T>(res);
  }

  /** Exchanges credentials for a session; the server sets the refresh cookie. */
  async function login<T extends TokenResponse>(path: string, body: unknown): Promise<T> {
    clearSession();
    const data = await api<T>(path, { method: "POST", body: JSON.stringify(body) });
    acceptTokens(data);
    clearLegacyTokens();
    return data;
  }

  async function logout(): Promise<void> {
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    try {
      await doFetch(`${baseUrl}${LOGOUT_PATH}`, { method: "POST", credentials: "include", headers });
    } catch {
      /* the local session is cleared regardless */
    }
    clearSession();
    clearLegacyTokens();
  }

  async function downloadFile(url: string, fallbackFilename?: string) {
    const target = resolveUrl(url);
    // Never leak the token or cookies to a foreign host: attach them only for our API origin.
    const toApi = isApiUrl(target);
    const send = () => {
      const headers: Record<string, string> = {};
      if (toApi && accessToken) headers.Authorization = `Bearer ${accessToken}`;
      return doFetch(target, toApi ? { headers, credentials: "include" } : { headers });
    };

    const res = await sendWithRenewal(toApi, send);
    if (!res.ok) throw await toApiError(res);

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

  function onSessionExpired(listener: () => void): () => void {
    expiredListeners.add(listener);
    return () => {
      expiredListeners.delete(listener);
    };
  }

  return {
    baseUrl,
    api,
    login,
    logout,
    downloadFile,
    restoreSession,
    refreshAccessToken,
    acceptTokens,
    setAccessToken,
    clearSession,
    hasSession: () => Boolean(accessToken),
    onSessionExpired,
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
