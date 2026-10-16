import { can, mapRole, PERMISSIONS } from "@/store/auth";
import type { MeResponse } from "@/lib/api/client";
import type { Role } from "@/lib/types";

const me = (patch: Partial<MeResponse>): MeResponse => ({ id: "u1", email: "staff@example.com", role: "hospital_staff", ...patch });

describe("mapRole", () => {
  it("maps hospital admins to admin", () => {
    expect(mapRole(me({ role: "hospital_admin" }))).toBe("admin");
    expect(mapRole(me({ staff_role: "admin" }))).toBe("admin");
  });

  it("keeps known staff roles", () => {
    expect(mapRole(me({ staff_role: "doctor" }))).toBe("doctor");
    expect(mapRole(me({ staff_role: "dept_head" }))).toBe("dept_head");
  });

  it("falls back to receptionist for unknown or missing roles", () => {
    expect(mapRole(me({ staff_role: "surgeon_general" }))).toBe("receptionist");
    expect(mapRole(me({ staff_role: undefined }))).toBe("receptionist");
  });
});

describe("permission matrix", () => {
  it("lets doctors prescribe but not receptionists", () => {
    expect(can("doctor", "prescribe")).toBe(true);
    expect(can("receptionist", "prescribe")).toBe(false);
    expect(can("nurse", "prescribe")).toBe(false);
  });

  it("lets department heads manage staff, not doctors", () => {
    expect(can("dept_head", "manageStaff")).toBe(true);
    expect(can("doctor", "manageStaff")).toBe(false);
    expect(can("receptionist", "manageStaff")).toBe(false);
  });

  it("keeps billing, audit and hospital settings admin-only", () => {
    const others: Role[] = ["receptionist", "nurse", "doctor", "dept_head"];
    for (const role of others) {
      expect(can(role, "viewBilling")).toBe(false);
      expect(can(role, "viewAudit")).toBe(false);
      expect(can(role, "manageHospital")).toBe(false);
    }
    expect(can("admin", "manageHospital")).toBe(true);
  });

  it("only lets clinical roles record diagnoses", () => {
    expect(can("doctor", "addDiagnosis")).toBe(true);
    expect(can("receptionist", "addDiagnosis")).toBe(false);
    expect(can("admin", "addDiagnosis")).toBe(false);
  });

  it("defines every permission for every role", () => {
    const keys = Object.keys(PERMISSIONS.admin).sort();
    for (const perms of Object.values(PERMISSIONS)) expect(Object.keys(perms).sort()).toEqual(keys);
  });
});
