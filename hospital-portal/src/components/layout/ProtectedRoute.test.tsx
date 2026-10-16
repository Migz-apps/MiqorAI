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
    hasSession: vi.fn(() => false),
    getMe: vi.fn(async () => ({
      id: "u1",
      email: "doctor@example.com",
      role: "hospital_staff",
      staff_role: "doctor",
      hospital_code: "HOSP1",
      hospital_name: "Hospital",
    })),
  };
});

vi.mock("@/lib/api/client", () => ({
  ApiError: class extends Error {},
  clearSession: vi.fn(),
  getMe: api.getMe,
  hasSession: api.hasSession,
  loginApi: vi.fn(),
  logoutApi: vi.fn(),
  onSessionExpired: vi.fn(),
  restoreSession: api.restoreSession,
}));

import { ProtectedRoute } from "./ProtectedRoute";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
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
}

describe("ProtectedRoute", () => {
  it("waits for the cookie restore instead of flashing the login page", async () => {
    renderAt("/dashboard");

    expect(await screen.findByText("Restoring session…")).toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
    expect(api.restoreSession).toHaveBeenCalledTimes(1);

    api.hasSession.mockReturnValue(true);
    await act(async () => api.finishRestore(true));

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });
});
