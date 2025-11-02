// tests/unit/services/adminService.unit.test.ts
const mockedPrisma = {
  user: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  appointment: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  doctorProfile: {
    findUnique: jest.fn(),
  },
  schedule: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  $queryRaw: jest.fn(),
} as unknown as any;

const mockedBcrypt = {
  hash: jest.fn(),
};

jest.mock("../../../src/db/prisma", () => ({
  __esModule: true,
  default: mockedPrisma,
}));
jest.mock("bcrypt", () => mockedBcrypt);

const AdminService =
  require("../../../src/services/adminService") as typeof import("../../../src/services/adminService");

import { BCRYPT_SALT_ROUNDS } from "../../../src/config";

describe("adminService (unit)", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe("listUsers", () => {
    it("returns users and meta", async () => {
      mockedPrisma.user.findMany.mockResolvedValue([
        { id: "1", firstName: "A", lastName: "L" },
      ]);
      mockedPrisma.user.count.mockResolvedValue(1);

      const result = await AdminService.listUsers(1, 20);

      expect(mockedPrisma.user.findMany).toHaveBeenCalled();
      expect(mockedPrisma.user.count).toHaveBeenCalled();
      expect(result.users).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe("createUser", () => {
    it("throws RUT_REQUIRED when missing", async () => {
      await expect(AdminService.createUser({} as any)).rejects.toMatchObject({
        code: "RUT_REQUIRED",
      });
    });

    it("hashes password and creates user", async () => {
      mockedBcrypt.hash.mockResolvedValue("hashed-pass");
      const created = {
        id: "1",
        firstName: "A",
        lastName: "L",
        email: "a@test.com",
        role: "PATIENT",
        rut: "11.111.111-1",
      };
      mockedPrisma.user.create.mockResolvedValue(created);

      const out = await AdminService.createUser({
        firstName: "A",
        lastName: "L",
        email: "a@test.com",
        password: "plain",
        rut: "11.111.111-1",
      });

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        "plain",
        Number(BCRYPT_SALT_ROUNDS)
      );
      expect(mockedPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "a@test.com",
            rut: "11.111.111-1",
          }),
          select: expect.any(Object),
        })
      );
      expect(out).toEqual(created);
    });

    it("rethrows P2002 as code P2002", async () => {
      mockedBcrypt.hash.mockResolvedValue("hashed-pass");
      mockedPrisma.user.create.mockRejectedValue({ code: "P2002" });

      await expect(
        AdminService.createUser({
          firstName: "A",
          lastName: "L",
          email: "a@test.com",
          password: "p",
          rut: "11.111.111-1",
        })
      ).rejects.toMatchObject({ code: "P2002" });
    });
  });

  describe("updateUser", () => {
    it("hashes new password and updates", async () => {
      mockedBcrypt.hash.mockResolvedValue("new-hash");
      const updated = { id: "1", firstName: "B" };
      mockedPrisma.user.update.mockResolvedValue(updated);

      const out = await AdminService.updateUser("1", {
        firstName: "B",
        password: "new",
      });

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        "new",
        Number(BCRYPT_SALT_ROUNDS)
      );
      expect(mockedPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "1" },
          data: expect.objectContaining({
            firstName: "B",
            password: "new-hash",
          }),
          select: expect.any(Object),
        })
      );
      expect(out).toEqual(updated);
    });

    it("rethrows P2002 as P2002", async () => {
      mockedBcrypt.hash.mockResolvedValue("h");
      mockedPrisma.user.update.mockRejectedValue({ code: "P2002" });

      await expect(
        AdminService.updateUser("1", { email: "x@test.com" })
      ).rejects.toMatchObject({ code: "P2002" });
    });

    it("rethrows P2025 as P2025", async () => {
      mockedBcrypt.hash.mockResolvedValue("h");
      const err: any = new Error("not found");
      err.code = "P2025";
      mockedPrisma.user.update.mockRejectedValue(err);

      await expect(
        AdminService.updateUser("1", { email: "x@test.com" })
      ).rejects.toMatchObject({ code: "P2025" });
    });
  });

  describe("setUserStatus", () => {
    it("updates status", async () => {
      const out = { id: "1", isActive: false };
      mockedPrisma.user.update.mockResolvedValue(out);

      const res = await AdminService.setUserStatus("1", false);

      expect(mockedPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "1" },
          data: { isActive: false },
          select: expect.any(Object),
        })
      );
      expect(res).toEqual(out);
    });

    it("rethrows error from prisma", async () => {
      mockedPrisma.user.update.mockRejectedValue(new Error("boom"));
      await expect(AdminService.setUserStatus("1", true)).rejects.toThrow(
        "boom"
      );
    });

    it("rethrows P2025 as P2025", async () => {
      const err: any = new Error("not found");
      err.code = "P2025";
      mockedPrisma.user.update.mockRejectedValue(err);
      await expect(AdminService.setUserStatus("1", true)).rejects.toMatchObject(
        { code: "P2025" }
      );
    });
  });

  describe("getAppointments", () => {
    it("returns appointments and meta", async () => {
      mockedPrisma.appointment.findMany.mockResolvedValue([]);
      mockedPrisma.appointment.count.mockResolvedValue(0);
      const res = await AdminService.getAppointments({ page: 1, limit: 10 });
      expect(res.meta.total).toBe(0);
      expect(Array.isArray(res.appointments)).toBe(true);
    });
  });

  describe("findDoctorProfile", () => {
    it("returns doctor profile", async () => {
      mockedPrisma.doctorProfile.findUnique.mockResolvedValue({
        id: "d1",
      } as any);

      const res = await AdminService.findDoctorProfile("d1");
      // asegurar que no sea null antes de acceder a propiedades
      expect(res).not.toBeNull();
      expect((res as any).id).toBe("d1");
    });

    it("returns null when not found", async () => {
      mockedPrisma.doctorProfile.findUnique.mockResolvedValue(null);
      const res = await AdminService.findDoctorProfile("nope");
      expect(res).toBeNull();
    });
  });

  describe("findExistingSchedule", () => {
    it("returns schedule if found", async () => {
      mockedPrisma.schedule.findFirst.mockResolvedValue({ id: "s1" } as any);
      const res = await AdminService.findExistingSchedule("d1", 1);
      expect(res).not.toBeNull();
      expect((res as any).id).toBe("s1");
    });

    it("returns null when not found", async () => {
      mockedPrisma.schedule.findFirst.mockResolvedValue(null);
      const res = await AdminService.findExistingSchedule("d1", 1);
      expect(res).toBeNull();
    });
  });

  describe("createSchedule", () => {
    it("creates schedule", async () => {
      mockedPrisma.schedule.create.mockResolvedValue({ id: "s1" } as any);
      const res = await AdminService.createSchedule({
        doctorProfileId: "d1",
        dayOfWeek: 1,
        startTime: "08:00",
        endTime: "12:00",
        slotDuration: 30,
      });
      expect((res as any).id).toBe("s1");
    });
  });

  describe("findConflictingAppointments", () => {
    it("returns conflict if exists", async () => {
      mockedPrisma.$queryRaw.mockResolvedValue([{ id: "a1" }]);
      const res = await AdminService.findConflictingAppointments(
        "d1",
        1,
        "08:00",
        "10:00"
      );
      expect(res).not.toBeNull();
      expect((res as any).id).toBe("a1");
    });

    it("returns null if no conflict", async () => {
      mockedPrisma.$queryRaw.mockResolvedValue([]);
      const res = await AdminService.findConflictingAppointments(
        "d1",
        1,
        "08:00",
        "10:00"
      );
      expect(res).toBeNull();
    });

    it("throws error if query fails", async () => {
      mockedPrisma.$queryRaw.mockRejectedValue(new Error("db"));
      await expect(
        AdminService.findConflictingAppointments("d1", 1, "08:00", "10:00")
      ).rejects.toThrow("Error al verificar conflictos de citas");
    });
  });
});
