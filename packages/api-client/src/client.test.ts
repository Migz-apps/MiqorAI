import { createApiClient, LEGACY_TOKEN_KEYS, type ApiClientOptions } from "./client";
import { ApiError } from "./errors";

const BASE = "https://api.example.com";

type Call = { url: string; init: RequestInit };

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authHeader(init: RequestInit): string | null {
  return new Headers(init.headers).get("Authorization");
}

/**
 * Fake API: /login issues "t1", each successful /refresh issues the next token,
 * and /api/data only accepts the most recently issued token.
 */
function fakeServer(opts: { refreshOk?: boolean; refreshDelayMs?: number } = {}) {
  const calls: Call[] = [];
  let issued = 0;
  let current: string | null = null;
  const fetch = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    const path = url.replace(BASE, "");
    if (path === "/api/auth/login") {
      current = `t${++issued}`;
      return json(200, { access_token: current });
    }
    if (path === "/api/auth/refresh") {
      if (opts.refreshDelayMs) await new Promise((r) => setTimeout(r, opts.refreshDelayMs));
      if (opts.refreshOk === false) return json(401, { error: { code: "UNAUTHORIZED", message: "Invalid refresh token" } });
      current = `t${++issued}`;
      return json(200, { access_token: current });
    }
    if (path === "/api/auth/logout") return new Response(null, { status: 204 });
    if (path === "/api/data") {
      return authHeader(init) === `Bearer ${current}`
        ? json(200, { ok: true })
        : json(401, { error: { code: "UNAUTHORIZED", message: "Token expired" } });
    }
    return json(404, { error: { code: "NOT_FOUND", message: "Not found" } });
  });
  return {
    fetch: fetch as unknown as typeof globalThis.fetch,
    calls,
    count: (path: string) => calls.filter((c) => c.url === `${BASE}${path}`).length,
    /** Simulates the access token expiring server-side. */
    expireAccessToken: () => {
      current = "server-rotated";
    },
  };
}

function client(server: ReturnType<typeof fakeServer>, extra: Partial<ApiClientOptions> = {}) {
  return createApiClient({ baseUrl: BASE, portal: "hospital", fetch: server.fetch, ...extra });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("refresh", () => {
  it("runs exactly one refresh for N concurrent 401s and retries every request", async () => {
    const server = fakeServer({ refreshDelayMs: 20 });
    const c = client(server);
    await c.login("/api/auth/login", { email: "a@b.c", password: "x" });
    server.expireAccessToken();

    const results = await Promise.all(Array.from({ length: 5 }, () => c.api<{ ok: boolean }>("/api/data")));

    expect(results).toEqual(Array.from({ length: 5 }, () => ({ ok: true })));
    expect(server.count("/api/auth/refresh")).toBe(1);
  });

  it("sends the refresh with the cookie only: credentials included and no body", async () => {
    const server = fakeServer();
    const c = client(server);
    await c.login("/api/auth/login", {});
    server.expireAccessToken();
    await c.api("/api/data");

    const refresh = server.calls.find((call) => call.url.endsWith("/api/auth/refresh"))!;
    expect(refresh.init.method).toBe("POST");
    expect(refresh.init.credentials).toBe("include");
    expect(refresh.init.body).toBeUndefined();
  });

  it("fires onSessionExpired and clears the session when the refresh fails", async () => {
    const server = fakeServer({ refreshOk: false });
    const onSessionExpired = vi.fn();
    const c = client(server, { onSessionExpired });
    await c.login("/api/auth/login", {});
    expect(c.hasSession()).toBe(true);
    server.expireAccessToken();

    const error = await c.api("/api/data").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(c.hasSession()).toBe(false);
  });

  it("does not try to refresh for a 401 on a request that carried no token", async () => {
    const server = fakeServer();
    const c = client(server);

    await expect(c.api("/api/data")).rejects.toMatchObject({ status: 401 });
    expect(server.count("/api/auth/refresh")).toBe(0);
  });
});

describe("token storage", () => {
  it("never writes tokens to localStorage or sessionStorage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const server = fakeServer();
    const c = client(server);

    await c.login("/api/auth/login", {});
    server.expireAccessToken();
    await c.api("/api/data");
    await c.restoreSession();
    await c.logout();

    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("sends credentials with every request to the API origin", async () => {
    const server = fakeServer();
    const c = client(server);
    await c.login("/api/auth/login", {});
    await c.api("/api/data");

    expect(server.calls.every((call) => call.init.credentials === "include")).toBe(true);
  });
});

describe("legacy token migration", () => {
  it("posts the stored refresh token once, then deletes every legacy key", async () => {
    const [primary, older] = LEGACY_TOKEN_KEYS.hospital;
    localStorage.setItem(primary, JSON.stringify({ access_token: "old-a", refresh_token: "legacy-r" }));
    localStorage.setItem(older, JSON.stringify({ access_token: "older-a", refresh_token: "older-r" }));
    const server = fakeServer();

    expect(await client(server).restoreSession()).toBe(true);

    const refreshes = server.calls.filter((call) => call.url.endsWith("/api/auth/refresh"));
    expect(refreshes).toHaveLength(1);
    expect(JSON.parse(String(refreshes[0].init.body))).toEqual({ refresh_token: "legacy-r" });
    expect(refreshes[0].init.credentials).toBe("include");
    expect(localStorage.getItem(primary)).toBeNull();
    expect(localStorage.getItem(older)).toBeNull();

    // Next page load: only the cookie is used.
    await client(server).restoreSession();
    const later = server.calls.filter((call) => call.url.endsWith("/api/auth/refresh")).slice(1);
    expect(later).toHaveLength(1);
    expect(later[0].init.body).toBeUndefined();
  });

  it("falls back to the cookie and still deletes the keys when the legacy token is rejected", async () => {
    const [primary] = LEGACY_TOKEN_KEYS.hospital;
    localStorage.setItem(primary, JSON.stringify({ refresh_token: "revoked" }));
    let refreshCalls = 0;
    const fetch = vi.fn(async (_input: string | URL | Request, init: RequestInit = {}) => {
      refreshCalls += 1;
      return init.body ? json(401, { error: { code: "UNAUTHORIZED", message: "Revoked" } }) : json(200, { access_token: "cookie-t" });
    }) as unknown as typeof globalThis.fetch;

    const c = createApiClient({ baseUrl: BASE, portal: "hospital", fetch });

    expect(await c.restoreSession()).toBe(true);
    expect(refreshCalls).toBe(2);
    expect(localStorage.getItem(primary)).toBeNull();
  });

  it("removes corrupt legacy entries without sending them", async () => {
    const [primary] = LEGACY_TOKEN_KEYS.hospital;
    localStorage.setItem(primary, "{not json");
    const server = fakeServer({ refreshOk: false });

    expect(await client(server).restoreSession()).toBe(false);
    expect(server.calls.every((call) => call.init.body === undefined)).toBe(true);
    expect(localStorage.getItem(primary)).toBeNull();
  });
});

describe("restoreSession", () => {
  it("returns true and holds the access token when the cookie is valid", async () => {
    const server = fakeServer();
    const c = client(server);

    expect(await c.restoreSession()).toBe(true);
    expect(c.hasSession()).toBe(true);
    await expect(c.api("/api/data")).resolves.toEqual({ ok: true });
  });

  it("returns false without firing onSessionExpired when there is no cookie session", async () => {
    const onSessionExpired = vi.fn();
    const c = client(fakeServer({ refreshOk: false }), { onSessionExpired });

    expect(await c.restoreSession()).toBe(false);
    expect(c.hasSession()).toBe(false);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("returns false when the network is down", async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof globalThis.fetch;

    expect(await createApiClient({ baseUrl: BASE, portal: "admin", fetch }).restoreSession()).toBe(false);
  });

  it("shares one refresh between concurrent callers", async () => {
    const server = fakeServer({ refreshDelayMs: 10 });
    const c = client(server);

    const results = await Promise.all([c.restoreSession(), c.restoreSession(), c.restoreSession()]);

    expect(results).toEqual([true, true, true]);
    expect(server.count("/api/auth/refresh")).toBe(1);
  });

  it("holds API requests issued during the restore until it settles", async () => {
    const server = fakeServer({ refreshDelayMs: 10 });
    const c = client(server);

    const restoring = c.restoreSession();
    const data = c.api("/api/data");

    await expect(data).resolves.toEqual({ ok: true });
    await restoring;
    const dataCall = server.calls.find((call) => call.url.endsWith("/api/data"))!;
    expect(authHeader(dataCall.init)).toBe("Bearer t1");
  });
});

describe("logout", () => {
  it("posts to /api/auth/logout with credentials and clears the session", async () => {
    const server = fakeServer();
    const c = client(server);
    await c.login("/api/auth/login", {});

    await c.logout();

    const call = server.calls.find((entry) => entry.url.endsWith("/api/auth/logout"))!;
    expect(call.init.method).toBe("POST");
    expect(call.init.credentials).toBe("include");
    expect(c.hasSession()).toBe(false);
  });

  it("clears the local session even when the network fails", async () => {
    const server = fakeServer();
    const c = client(server);
    await c.login("/api/auth/login", {});
    vi.mocked(server.fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await c.logout();

    expect(c.hasSession()).toBe(false);
  });
});

describe("downloadFile", () => {
  beforeEach(() => {
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  function fileServer() {
    const calls: Call[] = [];
    const fetch = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.endsWith("/api/auth/login")) return json(200, { access_token: "secret" });
      return new Response("file", { status: 200, headers: { "Content-Disposition": 'attachment; filename="report.csv"' } });
    }) as unknown as typeof globalThis.fetch;
    return { fetch, calls };
  }

  it("does not attach the Authorization header or cookies to a foreign origin", async () => {
    const server = fileServer();
    const c = createApiClient({ baseUrl: BASE, portal: "insurer", fetch: server.fetch });
    await c.login("/api/auth/login", {});

    await c.downloadFile("https://files.elsewhere.example/report.csv");

    const call = server.calls.at(-1)!;
    expect(call.url).toBe("https://files.elsewhere.example/report.csv");
    expect(authHeader(call.init)).toBeNull();
    expect(call.init.credentials).toBeUndefined();
  });

  it("attaches the token and cookies for the API origin", async () => {
    const server = fileServer();
    const c = createApiClient({ baseUrl: BASE, portal: "insurer", fetch: server.fetch });
    await c.login("/api/auth/login", {});

    await c.downloadFile("/api/reports/1/export");

    const call = server.calls.at(-1)!;
    expect(call.url).toBe(`${BASE}/api/reports/1/export`);
    expect(authHeader(call.init)).toBe("Bearer secret");
    expect(call.init.credentials).toBe("include");
  });
});

describe("ApiError normalization", () => {
  it("reads code and message from the server error envelope", async () => {
    const fetch = vi.fn(async () =>
      json(403, { error: { code: "FORBIDDEN", message: "Staff role 'cashier' is not permitted" } }),
    ) as unknown as typeof globalThis.fetch;
    const c = createApiClient({ baseUrl: BASE, portal: "pharmacy", fetch });

    const error = (await c.api("/api/pharmacy/dispense").catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
    expect(error.message).toBe("Staff role 'cashier' is not permitted");
  });

  it("falls back to the status text for HTML error pages", async () => {
    const fetch = vi.fn(
      async () => new Response("<html>Bad gateway</html>", { status: 502, statusText: "Bad Gateway" }),
    ) as unknown as typeof globalThis.fetch;
    const c = createApiClient({ baseUrl: BASE, portal: "pharmacy", fetch });

    const error = (await c.api("/api/x").catch((e: unknown) => e)) as ApiError;

    expect(error.status).toBe(502);
    expect(error.message).toBe("Bad Gateway");
    expect(error.code).toBeUndefined();
  });
});
