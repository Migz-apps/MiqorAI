import { can, mapRole, PERMISSIONS } from "@/store/auth";
import { mapStaffRole, toBackendStaffRole } from "@/lib/api/insurer";
import type { MeResponse } from "@/lib/api/client";
import type { Role } from "@/lib/types";

const me = (patch: Partial<MeResponse>): MeResponse => ({ id: "u1", email: "staff@example.com", role: "insurer_staff", ...patch });

describe("role mapping", () => {
  it("maps insurer admins to admin", () => {
    expect(mapRole(me({ role: "insurer_admin" }))).toBe("admin");
    expect(mapRole(me({ staff_role: "admin" }))).toBe("admin");
  });

  it("translates server staff roles", () => {
    expect(mapRole(me({ staff_role: "fraud_investigator" }))).toBe("fraud");
    expect(mapRole(me({ staff_role: "contracts_manager" }))).toBe("contracts");
    expect(toBackendStaffRole("fraud")).toBe("fraud_investigator");
  });

  it("falls back to analyst for unknown or missing roles", () => {
    expect(mapStaffRole("actuary")).toBe("analyst");
    expect(mapRole(me({ staff_role: "actuary" }))).toBe("analyst");
    expect(mapRole(me({}))).toBe("analyst");
  });
});

describe("permission matrix", () => {
  it("keeps settings and API keys admin-only", () => {
    const others: Role[] = ["analyst", "fraud", "contracts", "executive"];
    for (const role of others) expect(can(role, "manageSettings")).toBe(false);
    expect(can("admin", "manageSettings")).toBe(true);
  });

  it("does not let analysts see fraud cases or contracts", () => {
    expect(can("analyst", "viewFraud")).toBe(false);
    expect(can("analyst", "viewContract")).toBe(false);
    expect(can("analyst", "manageStaff")).toBe(false);
    expect(can("fraud", "viewFraud")).toBe(true);
    expect(can("contracts", "viewContract")).toBe(true);
  });

  it("lets only admins manage staff", () => {
    expect(can("executive", "manageStaff")).toBe(false);
    expect(can("admin", "manageStaff")).toBe(true);
  });

  it("defines every permission for every role", () => {
    const keys = Object.keys(PERMISSIONS.admin).sort();
    for (const perms of Object.values(PERMISSIONS)) expect(Object.keys(perms).sort()).toEqual(keys);
  });
});
