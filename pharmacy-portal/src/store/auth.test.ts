import { can, mapRole, PERMISSIONS } from "@/store/auth";
import { mapStaffMember, mapStaffRole } from "@/lib/api/mappers";
import type { MeResponse } from "@/lib/api/client";

const me = (patch: Partial<MeResponse>): MeResponse => ({ id: "u1", email: "staff@example.com", role: "pharmacy_staff", ...patch });

describe("role mapping", () => {
  it("maps pharmacy managers to manager", () => {
    expect(mapRole(me({ role: "pharmacy_manager" }))).toBe("manager");
    expect(mapRole(me({ staff_role: "manager" }))).toBe("manager");
  });

  it("keeps known staff roles", () => {
    expect(mapRole(me({ staff_role: "pharmacist" }))).toBe("pharmacist");
    expect(mapRole(me({ staff_role: "technician" }))).toBe("technician");
  });

  it("falls back to cashier for unknown or missing roles", () => {
    expect(mapRole(me({ staff_role: "owner" }))).toBe("cashier");
    expect(mapRole(me({}))).toBe("cashier");
    expect(mapStaffRole(null)).toBe("cashier");
  });

  it("applies the fallback to staff list rows", () => {
    const row = mapStaffMember({ user_id: "u2", email: "temp@example.com", role: "intern", active: true, last_login: null });
    expect(row.role).toBe("cashier");
  });
});

describe("permission matrix", () => {
  it("lets pharmacists dispense but not cashiers or technicians", () => {
    expect(can("pharmacist", "dispense")).toBe(true);
    expect(can("manager", "dispense")).toBe(true);
    expect(can("cashier", "dispense")).toBe(false);
    expect(can("technician", "dispense")).toBe(false);
  });

  it("keeps verification and overrides with pharmacists", () => {
    expect(can("cashier", "verify")).toBe(false);
    expect(can("technician", "verify")).toBe(false);
    expect(can("pharmacist", "verify")).toBe(true);
    expect(can("cashier", "override")).toBe(false);
  });

  it("lets only managers manage staff and settings", () => {
    expect(can("pharmacist", "manageStaff")).toBe(false);
    expect(can("manager", "manageStaff")).toBe(true);
    expect(can("pharmacist", "manageSettings")).toBe(false);
    expect(can("manager", "manageSettings")).toBe(true);
  });

  it("defines every permission for every role", () => {
    const keys = Object.keys(PERMISSIONS.manager).sort();
    for (const perms of Object.values(PERMISSIONS)) expect(Object.keys(perms).sort()).toEqual(keys);
  });
});
