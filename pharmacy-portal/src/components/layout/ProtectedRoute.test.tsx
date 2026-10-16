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
    getMe: vi.fn(async () => ({ id: "u1", email: "rx@example.com", role: "pharmacy_staff", staff_role: "pharmacist", pharmacy_code: "PH1", pharmacy_name: "Pharmacy" })),
  };
});

vi.mock("@/lib/api/client", () => ({
  ApiError: class extends Error {},
  clearSession: vi.fn(),
  getMe: api.getMe,
  loginApi: vi.fn(),
  logoutApi: vi.fn(),
  onSessionExpired: vi.fn(),
  restoreSession: api.restoreSession,
}));

import { useAuth } from "@/store/auth";
import { ProtectedRoute } from "./ProtectedRoute";

function renderDashboard() {
  return render(
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
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    useAuth.setState({ session: null, ready: false });
    api.restoreSession.mockClear();
  });

  it("waits for the cookie restore instead of flashing the login page", async () => {
    renderDashboard();

    expect(await screen.findByText("Restoring session…")).toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
    expect(api.restoreSession).toHaveBeenCalledTimes(1);

    await act(async () => api.finishRestore(true));

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
  });

  it("redirects to login once the restore reports no session", async () => {
    renderDashboard();

    expect(await screen.findByText("Restoring session…")).toBeInTheDocument();
    await act(async () => api.finishRestore(false));

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });
});
