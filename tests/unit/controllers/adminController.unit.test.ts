import * as AdminService from "../../../src/services/adminService";
import * as AdminController from "../../../src/controllers/adminController";
import { createMockResponse } from "../helpers/mockResponse";

jest.mock("../../../src/services/adminService");
const mockedAdminService = AdminService as unknown as jest.Mocked<
  typeof AdminService
>;

describe("adminController (unit)", () => {
  afterEach(() => jest.clearAllMocks());

  describe("listUsers", () => {
    it("returns service result", async () => {
      const req: any = { query: { page: "2", limit: "5" } };
      const res = createMockResponse();

      const fake = {
        users: [],
        meta: { total: 0, page: 2, limit: 5, pages: 0 },
      };
      mockedAdminService.listUsers.mockResolvedValue(fake as any);

      await AdminController.listUsers(req, res);

      expect(mockedAdminService.listUsers).toHaveBeenCalledWith(2, 5);
      expect(res.json).toHaveBeenCalledWith(fake);
    });

    it("handles errors with 500 status", async () => {
      const req: any = { query: {} };
      const res = createMockResponse();

      mockedAdminService.listUsers.mockRejectedValue(new Error("boom"));

      await AdminController.listUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
    });
  });

  describe("createUser", () => {
    it("returns 201 and created user", async () => {
      const req: any = {
        body: {
          firstName: "A",
          lastName: "B",
          email: "a@test.com",
          password: "p",
          rut: "11.111.111-1",
        },
      };
      const res = createMockResponse();
      const created = { id: "1", firstName: "A", email: "a@test.com" };

      mockedAdminService.createUser.mockResolvedValue(created as any);

      await AdminController.createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(created);
    });

    it("returns 400 when rut missing (RUT_REQUIRED)", async () => {
      const req: any = { body: {} };
      const res = createMockResponse();

      const err: any = new Error("missing rut");
      err.code = "RUT_REQUIRED";
      mockedAdminService.createUser.mockRejectedValue(err);

      await AdminController.createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "RUT requerido" });
    });

    it("returns 409 for P2002 unique error", async () => {
      const req: any = { body: {} };
      const res = createMockResponse();

      const err: any = new Error("unique");
      err.code = "P2002";
      mockedAdminService.createUser.mockRejectedValue(err);

      await AdminController.createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: "Email ya registrado" });
    });

    it("returns 500 for other errors", async () => {
      const req: any = { body: {} };
      const res = createMockResponse();

      mockedAdminService.createUser.mockRejectedValue(new Error("err"));

      await AdminController.createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
    });
  });

  describe("updateUser", () => {
    it("returns updated user on success", async () => {
      const req: any = { params: { id: "1" }, body: { firstName: "B" } };
      const res = createMockResponse();
      const updated = { id: "1", firstName: "B" };

      mockedAdminService.updateUser.mockResolvedValue(updated as any);

      await AdminController.updateUser(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it("returns 404 when P2025", async () => {
      const req: any = { params: { id: "1" }, body: {} };
      const res = createMockResponse();

      const err: any = new Error("nf");
      err.code = "P2025";
      mockedAdminService.updateUser.mockRejectedValue(err);

      await AdminController.updateUser(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 409 when P2002", async () => {
      const req: any = { params: { id: "1" }, body: {} };
      const res = createMockResponse();

      const err: any = new Error("dup");
      err.code = "P2002";
      mockedAdminService.updateUser.mockRejectedValue(err);

      await AdminController.updateUser(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 500 for other errors", async () => {
      const req: any = { params: { id: "1" }, body: {} };
      const res = createMockResponse();

      mockedAdminService.updateUser.mockRejectedValue(new Error("err"));
      await AdminController.updateUser(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("patchStatus", () => {
    it("returns user on success", async () => {
      const req: any = { params: { id: "1" }, body: { isActive: false } };
      const res = createMockResponse();
      const out = { id: "1", isActive: false };

      mockedAdminService.setUserStatus.mockResolvedValue(out as any);
      await AdminController.patchStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(out);
    });

    it("returns 404 for P2025", async () => {
      const req: any = { params: { id: "1" }, body: { isActive: true } };
      const res = createMockResponse();

      const err: any = new Error("nf");
      err.code = "P2025";
      mockedAdminService.setUserStatus.mockRejectedValue(err);

      await AdminController.patchStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 500 for unknown error", async () => {
      const req: any = { params: { id: "1" }, body: { isActive: true } };
      const res = createMockResponse();

      mockedAdminService.setUserStatus.mockRejectedValue(new Error("err"));
      await AdminController.patchStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getAppointments", () => {
    it("returns appointments from service", async () => {
      const req: any = {
        query: { page: "1", limit: "10", date: "2025-01-01" },
      };
      const res = createMockResponse();

      const fake = { appointments: [], meta: { total: 0 } };
      mockedAdminService.getAppointments.mockResolvedValue(fake as any);

      await AdminController.getAppointments(req, res);
      expect(res.json).toHaveBeenCalledWith(fake);
    });

    it("handles errors with 500", async () => {
      const req: any = { query: {} };
      const res = createMockResponse();

      mockedAdminService.getAppointments.mockRejectedValue(new Error("boom"));
      await AdminController.getAppointments(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("createSchedule", () => {
    const reqBase: any = {
      body: {
        doctorProfileId: "d1",
        dayOfWeek: 1,
        startTime: "08:00",
        endTime: "12:00",
        slotDuration: 30,
      },
    };

    it("returns 404 when doctorProfile not found", async () => {
      const res = createMockResponse();
      mockedAdminService.findDoctorProfile.mockResolvedValue(null as any);

      await AdminController.createSchedule(reqBase, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 409 when schedule exists", async () => {
      const res = createMockResponse();
      mockedAdminService.findDoctorProfile.mockResolvedValue({
        id: "d1",
      } as any);
      mockedAdminService.findExistingSchedule.mockResolvedValue({
        id: "s1",
      } as any);

      await AdminController.createSchedule(reqBase, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 409 when conflicting appointment", async () => {
      const res = createMockResponse();
      mockedAdminService.findDoctorProfile.mockResolvedValue({
        id: "d1",
      } as any);
      mockedAdminService.findExistingSchedule.mockResolvedValue(null);
      mockedAdminService.findConflictingAppointments.mockResolvedValue({
        id: "a1",
      } as any);

      await AdminController.createSchedule(reqBase, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 201 when schedule created", async () => {
      const res = createMockResponse();
      const fake = { id: "sched1" };

      mockedAdminService.findDoctorProfile.mockResolvedValue({
        id: "d1",
      } as any);
      mockedAdminService.findExistingSchedule.mockResolvedValue(null);
      mockedAdminService.findConflictingAppointments.mockResolvedValue(null);
      mockedAdminService.createSchedule.mockResolvedValue(fake as any);

      await AdminController.createSchedule(reqBase, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(fake);
    });

    it("returns 409 when P2002", async () => {
      const res = createMockResponse();
      const err: any = new Error("dup");
      err.code = "P2002";

      mockedAdminService.findDoctorProfile.mockResolvedValue({
        id: "d1",
      } as any);
      mockedAdminService.findExistingSchedule.mockResolvedValue(null);
      mockedAdminService.findConflictingAppointments.mockResolvedValue(null);
      mockedAdminService.createSchedule.mockRejectedValue(err);

      await AdminController.createSchedule(reqBase, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 500 on unknown error", async () => {
      const res = createMockResponse();

      mockedAdminService.findDoctorProfile.mockResolvedValue({
        id: "d1",
      } as any);
      mockedAdminService.findExistingSchedule.mockResolvedValue(null);
      mockedAdminService.findConflictingAppointments.mockResolvedValue(null);
      mockedAdminService.createSchedule.mockRejectedValue(new Error("err"));

      await AdminController.createSchedule(reqBase, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
