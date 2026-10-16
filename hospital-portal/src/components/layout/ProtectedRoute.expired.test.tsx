import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

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
  };
});

vi.mock("@/lib/api/client", () => ({
  ApiError: class extends Error {},
  clearSession: vi.fn(),
  getMe: vi.fn(),
  hasSession: () => false,
  loginApi: vi.fn(),
  logoutApi: vi.fn(),
  onSessionExpired: vi.fn(),
  restoreSession: api.restoreSession,
}));

import { ProtectedRoute } from "./ProtectedRoute";

describe("ProtectedRoute without a session", () => {
  it("redirects to login once the restore reports no session", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Restoring session…")).toBeInTheDocument();
    await act(async () => api.finishRestore(false));

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });
});
