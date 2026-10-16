import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  clearSession: vi.fn(),
  getMe: vi.fn(),
  loginApi: vi.fn(),
  logoutApi: vi.fn(async () => {}),
  onSessionExpired: vi.fn(),
  restoreSession: vi.fn(async () => true),
}));

vi.mock("./api/client", () => ({ ApiError: class extends Error {}, ...api }));

import { isPortalRole, useAuth } from "./auth";

const user = (role: string) => ({ id: "u1", email: "ops@example.com", role });

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({ session: null, ready: false });
});

describe("portal access", () => {
  it("admits only platform super admins", () => {
    expect(isPortalRole("super_admin")).toBe(true);
    for (const role of [
      "hospital_admin",
      "insurer_admin",
      "pharmacy_manager",
      "patient",
      "",
      undefined,
    ]) {
      expect(isPortalRole(role)).toBe(false);
    }
  });

  it("rejects a valid login for another role and ends that server session", async () => {
    api.loginApi.mockResolvedValueOnce(user("hospital_admin"));

    const result = await useAuth.getState().login("ops@example.com", "password1");

    expect(result.ok).toBe(false);
    expect(api.logoutApi).toHaveBeenCalledTimes(1);
    expect(useAuth.getState().session).toBeNull();
  });

  it("signs in a super admin", async () => {
    api.loginApi.mockResolvedValueOnce(user("super_admin"));

    const result = await useAuth.getState().login("ops@example.com", "password1");

    expect(result.ok).toBe(true);
    expect(useAuth.getState().session?.email).toBe("ops@example.com");
  });
});

describe("restoreSession", () => {
  it("restores a super admin from the refresh cookie", async () => {
    api.getMe.mockResolvedValueOnce(user("super_admin"));

    await useAuth.getState().restoreSession();

    expect(useAuth.getState()).toMatchObject({
      ready: true,
      session: { email: "ops@example.com" },
    });
  });

  it("drops a restored session that is not a super admin", async () => {
    api.getMe.mockResolvedValueOnce(user("insurer_admin"));

    await useAuth.getState().restoreSession();

    expect(useAuth.getState()).toMatchObject({ ready: true, session: null });
    expect(api.clearSession).toHaveBeenCalled();
  });

  it("settles as signed out when there is no cookie session", async () => {
    api.restoreSession.mockResolvedValueOnce(false);

    await useAuth.getState().restoreSession();

    expect(useAuth.getState()).toMatchObject({ ready: true, session: null });
    expect(api.getMe).not.toHaveBeenCalled();
  });

  it("runs one restore for concurrent callers", async () => {
    api.getMe.mockResolvedValueOnce(user("super_admin"));

    await Promise.all([useAuth.getState().restoreSession(), useAuth.getState().restoreSession()]);

    expect(api.restoreSession).toHaveBeenCalledTimes(1);
  });
});
