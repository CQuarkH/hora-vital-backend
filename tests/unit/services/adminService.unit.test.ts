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

  describe("listPatients", () => {
    it("should query only PATIENT role users", async () => {
      const mockPatients = [{ id: "p1", role: "PATIENT" }];
      mockedPrisma.user.findMany.mockResolvedValue(mockPatients);
      mockedPrisma.user.count.mockResolvedValue(1);

      await AdminService.listPatients({ page: 1, limit: 20 });

      expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: "PATIENT" }),
        })
      );
    });

    it("should apply name filter (case-insensitive)", async () => {
      mockedPrisma.user.findMany.mockResolvedValue([]);
      mockedPrisma.user.count.mockResolvedValue(0);

      await AdminService.listPatients({ page: 1, limit: 20, name: "juan" });

      expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { firstName: { contains: "juan", mode: "insensitive" } },
              { lastName: { contains: "juan", mode: "insensitive" } },
            ],
          }),
        })
      );
    });

    it("should apply RUT filter", async () => {
      mockedPrisma.user.findMany.mockResolvedValue([]);
      mockedPrisma.user.count.mockResolvedValue(0);

      await AdminService.listPatients({ page: 1, limit: 20, rut: "12.345" });

      expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            rut: { contains: "12.345", mode: "insensitive" },
          }),
        })
      );
    });

    it("should return correct pagination metadata", async () => {
      mockedPrisma.user.findMany.mockResolvedValue([]);
      mockedPrisma.user.count.mockResolvedValue(45);

      const result = await AdminService.listPatients({ page: 2, limit: 20 });

      expect(result.meta).toEqual({
        total: 45,
        page: 2,
        limit: 20,
        pages: 3,
      });
    });
  });

  describe("getCalendarAvailability", () => {
    beforeEach(() => {
      mockedPrisma.doctorProfile = { findMany: jest.fn() };
      mockedPrisma.appointment.findMany = jest.fn();
    });

    it("should generate slots for given date range", async () => {
      const mockDoctors = [
        {
          id: "d1",
          user: { firstName: "Dr.", lastName: "Test" },
          specialty: { name: "Cardio" },
          schedules: [
            {
              dayOfWeek: 1,
              startTime: "09:00",
              endTime: "10:00",
              slotDuration: 30,
            },
          ],
        },
      ];
      mockedPrisma.doctorProfile.findMany.mockResolvedValue(mockDoctors);
      mockedPrisma.appointment.findMany.mockResolvedValue([]);

      const monday = new Date("2025-12-01"); // Monday
      const result = await AdminService.getCalendarAvailability({
        startDate: monday,
        endDate: monday,
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("date");
      expect(result[0]).toHaveProperty("doctor");
      expect(result[0]).toHaveProperty("slots");
    });

    it("should respect doctor schedules for specific days", async () => {
      const mockDoctors = [
        {
          id: "d1",
          user: { firstName: "Dr.", lastName: "Test" },
          specialty: { name: "Cardio" },
          schedules: [], // No schedule
        },
      ];
      mockedPrisma.doctorProfile.findMany.mockResolvedValue(mockDoctors);

      const result = await AdminService.getCalendarAvailability({
        startDate: new Date("2025-12-01"),
        endDate: new Date("2025-12-01"),
      });

      expect(result).toEqual([]);
    });

    it("should mark booked slots as unavailable", async () => {
      const mockDoctors = [
        {
          id: "d1",
          user: { firstName: "Dr.", lastName: "Test" },
          specialty: { name: "Cardio" },
          schedules: [
            {
              dayOfWeek: 1,
              startTime: "09:00",
              endTime: "10:00",
              slotDuration: 30,
            },
          ],
        },
      ];
      const mockAppointments = [
        {
          id: "apt1",
          startTime: "09:00",
          patient: { firstName: "Patient", lastName: "Test" },
        },
      ];

      mockedPrisma.doctorProfile.findMany.mockResolvedValue(mockDoctors);
      mockedPrisma.appointment.findMany.mockResolvedValue(mockAppointments);

      const monday = new Date("2025-12-01");
      const result = await AdminService.getCalendarAvailability({
        startDate: monday,
        endDate: monday,
      });

      const slot = result[0]?.slots?.find((s: any) => s.startTime === "09:00");
      expect(slot?.isAvailable).toBe(false);
    });
  });
});
