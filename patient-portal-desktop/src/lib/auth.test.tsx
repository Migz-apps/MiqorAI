import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => {
  let resolveRestore: (ok: boolean) => void = () => {};
  return {
    restoreSession: vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveRestore = resolve;
        }),
    ),
    finishRestore: (ok: boolean) => resolveRestore(ok),
    profile: vi.fn(async () => ({
      id: "p1",
      user_id: "u1",
      first_name: "Amina",
      last_name: "Uwase",
      date_of_birth: "1990-01-01",
      email: "amina@example.com",
    })),
  };
});

vi.mock("./api/client", () => ({
  ApiError: class extends Error {},
  clearSession: vi.fn(),
  completePatientSignupApi: vi.fn(),
  loginApi: vi.fn(),
  logoutApi: vi.fn(),
  onSessionExpired: vi.fn(() => () => {}),
  requestForgotPasswordApi: vi.fn(),
  resendForgotPasswordOtpApi: vi.fn(),
  resetPasswordApi: vi.fn(),
  restoreSession: api.restoreSession,
  verifyForgotPasswordOtpApi: vi.fn(),
}));

vi.mock("./api/patient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api/patient")>();
  return { ...actual, patientApi: { profile: api.profile } };
});

import { AuthProvider, useAuth } from "./auth";

function Probe() {
  const { authReady, isLoggedIn, user } = useAuth();
  if (!authReady) return <p>loading</p>;
  return <p>{isLoggedIn ? `signed in as ${user?.name}` : "signed out"}</p>;
}

afterEach(() => {
  cleanup();
  api.restoreSession.mockClear();
});

describe("AuthProvider", () => {
  it("stays not-ready until the cookie restore settles, then loads the profile", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByText("loading")).toBeTruthy();
    expect(api.restoreSession).toHaveBeenCalled();

    await act(async () => api.finishRestore(true));

    expect(await screen.findByText("signed in as Amina Uwase")).toBeTruthy();
  });

  it("settles signed out when there is no session", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await act(async () => api.finishRestore(false));

    expect(await screen.findByText("signed out")).toBeTruthy();
    expect(api.profile).toHaveBeenCalledTimes(1);
  });
});
