import { mapStaffRole } from "@/lib/mappers";

describe("mapStaffRole", () => {
  it("normalizes server role names", () => {
    expect(mapStaffRole("hospital_admin")).toBe("admin");
    expect(mapStaffRole("DEPT-HEAD")).toBe("dept_head");
    expect(mapStaffRole("nurse")).toBe("nurse");
  });

  it("falls back to receptionist for unknown roles", () => {
    expect(mapStaffRole("janitor")).toBe("receptionist");
    expect(mapStaffRole("")).toBe("receptionist");
  });
});
