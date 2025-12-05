import * as SecretaryService from "../../../src/services/secretaryService";
import * as SecretaryController from "../../../src/controllers/secretaryController";
import { createMockResponse } from "../helpers/mockResponse";

jest.mock("../../../src/services/secretaryService");
const mockedSecretaryService = SecretaryService as unknown as jest.Mocked<
  typeof SecretaryService
>;

describe("secretaryController (unit)", () => {
  afterEach(() => jest.clearAllMocks());

  describe("registerPatient", () => {
    it("returns 201 and created patient on success", async () => {
      const req: any = {
        body: {
          firstName: "María",
          lastName: "González",
          email: "maria@test.com",
          password: "SecureP@ss123",
          rut: "18.234.567-8",
          phone: "+56987654321",
          gender: "F",
          birthDate: "1995-03-15",
          address: "Av. Providencia 1234",
        },
      };
      const res = createMockResponse();

      const createdPatient = {
        id: "patient-uuid",
        firstName: "María",
        lastName: "González",
        email: "maria@test.com",
        role: "PATIENT",
        rut: "18.234.567-8",
        phone: "+56987654321",
        gender: "F",
        birthDate: new Date("1995-03-15"),
        address: "Av. Providencia 1234",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedSecretaryService.registerPatient.mockResolvedValue(
        createdPatient as any,
      );

      await SecretaryController.registerPatient(req, res);

      expect(mockedSecretaryService.registerPatient).toHaveBeenCalledWith(
        req.body,
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(createdPatient);
    });

    it("returns 409 for duplicate email (P2002)", async () => {
      const req: any = {
        body: {
          firstName: "María",
          lastName: "González",
          email: "duplicate@test.com",
          password: "SecureP@ss123",
          rut: "18.234.567-8",
        },
      };
      const res = createMockResponse();

      const err: any = new Error("Email or RUT already exists");
      err.code = "P2002";
      mockedSecretaryService.registerPatient.mockRejectedValue(err);

      await SecretaryController.registerPatient(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: "Email o RUT ya registrado",
      });
    });

    it("returns 409 for duplicate RUT (P2002)", async () => {
      const req: any = {
        body: {
          firstName: "María",
          lastName: "González",
          email: "maria@test.com",
          password: "SecureP@ss123",
          rut: "18.234.567-8",
        },
      };
      const res = createMockResponse();

      const err: any = new Error("Email or RUT already exists");
      err.code = "P2002";
      mockedSecretaryService.registerPatient.mockRejectedValue(err);

      await SecretaryController.registerPatient(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: "Email o RUT ya registrado",
      });
    });

    it("returns 400 when RUT is missing (RUT_REQUIRED)", async () => {
      const req: any = {
        body: {
          firstName: "María",
          lastName: "González",
          email: "maria@test.com",
          password: "SecureP@ss123",
        },
      };
      const res = createMockResponse();

      const err: any = new Error("RUT requerido");
      err.code = "RUT_REQUIRED";
      mockedSecretaryService.registerPatient.mockRejectedValue(err);

      await SecretaryController.registerPatient(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "RUT requerido" });
    });

    it("returns 500 for system errors", async () => {
      const req: any = {
        body: {
          firstName: "María",
          lastName: "González",
          email: "maria@test.com",
          password: "SecureP@ss123",
          rut: "18.234.567-8",
        },
      };
      const res = createMockResponse();

      const err = new Error("Database connection failed");
      mockedSecretaryService.registerPatient.mockRejectedValue(err);

      await SecretaryController.registerPatient(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
    });

    it("returns 500 for unknown errors", async () => {
      const req: any = {
        body: {
          firstName: "María",
          lastName: "González",
          email: "maria@test.com",
          password: "SecureP@ss123",
          rut: "18.234.567-8",
        },
      };
      const res = createMockResponse();

      mockedSecretaryService.registerPatient.mockRejectedValue(
        new Error("Unknown error"),
      );

      await SecretaryController.registerPatient(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
    });
  });

  describe("getDoctorAgenda", () => {
    it("returns 200 and doctor agenda on success", async () => {
      const req: any = {
        params: { doctorId: "doctor-uuid" },
        query: { date: "2024-12-20" },
      };
      const res = createMockResponse();

      const mockAgenda = {
        doctor: {
          id: "doctor-uuid",
          name: "Dr. Smith",
          specialty: "Cardiology",
        },
        date: new Date("2024-12-20"),
        schedules: [],
        appointments: [],
        blockedPeriods: [],
      };

      mockedSecretaryService.getDoctorAgenda.mockResolvedValue(mockAgenda);

      await SecretaryController.getDoctorAgenda(req, res);

      expect(mockedSecretaryService.getDoctorAgenda).toHaveBeenCalledWith(
        "doctor-uuid",
        "2024-12-20",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockAgenda);
    });

    it("returns 404 when doctor not found", async () => {
      const req: any = {
        params: { doctorId: "invalid-uuid" },
        query: { date: "2024-12-20" },
      };
      const res = createMockResponse();

      const err: any = new Error("Doctor not found");
      err.code = "DOCTOR_NOT_FOUND";
      mockedSecretaryService.getDoctorAgenda.mockRejectedValue(err);

      await SecretaryController.getDoctorAgenda(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Doctor no encontrado",
      });
    });

    it("returns 500 for server errors", async () => {
      const req: any = {
        params: { doctorId: "doctor-uuid" },
        query: { date: "2024-12-20" },
      };
      const res = createMockResponse();

      mockedSecretaryService.getDoctorAgenda.mockRejectedValue(
        new Error("Database error"),
      );

      await SecretaryController.getDoctorAgenda(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
    });
  });

  describe("updateSchedule", () => {
    it("returns 200 and updated schedule on success", async () => {
      const req: any = {
        params: { id: "schedule-uuid" },
        body: {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
          slotDuration: 30,
          isActive: true,
        },
      };
      const res = createMockResponse();

      const mockSchedule = { id: "schedule-uuid", ...req.body };
      mockedSecretaryService.updateSchedule.mockResolvedValue(mockSchedule);

      await SecretaryController.updateSchedule(req, res);

      expect(mockedSecretaryService.updateSchedule).toHaveBeenCalledWith(
        "schedule-uuid",
        req.body,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSchedule);
    });

    it("returns 404 when schedule not found", async () => {
      const req: any = {
        params: { id: "invalid-uuid" },
        body: { dayOfWeek: 1 },
      };
      const res = createMockResponse();

      const err: any = new Error("Schedule not found");
      err.code = "SCHEDULE_NOT_FOUND";
      mockedSecretaryService.updateSchedule.mockRejectedValue(err);

      await SecretaryController.updateSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Horario no encontrado",
      });
    });

    it("returns 409 for conflicts with appointments", async () => {
      const req: any = {
        params: { id: "schedule-uuid" },
        body: { dayOfWeek: 1 },
      };
      const res = createMockResponse();

      const err: any = new Error("Conflict with appointments");
      err.code = "CONFLICT_WITH_APPOINTMENTS";
      mockedSecretaryService.updateSchedule.mockRejectedValue(err);

      await SecretaryController.updateSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: "No se puede modificar, hay citas programadas en este horario",
      });
    });

    it("returns 500 for server errors", async () => {
      const req: any = {
        params: { id: "schedule-uuid" },
        body: { dayOfWeek: 1 },
      };
      const res = createMockResponse();

      mockedSecretaryService.updateSchedule.mockRejectedValue(
        new Error("Database error"),
      );

      await SecretaryController.updateSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
    });
  });

  describe("blockPeriod", () => {
    it("returns 201 and blocked period on success", async () => {
      const req: any = {
        body: {
          doctorProfileId: "doctor-profile-uuid",
          startDateTime: "2024-12-20T09:00:00Z",
          endDateTime: "2024-12-20T10:00:00Z",
          reason: "Medical conference",
        },
        user: { id: "secretary-uuid" },
      };
      const res = createMockResponse();

      const mockBlockedPeriod = { id: "blocked-period-uuid", ...req.body };
      mockedSecretaryService.blockPeriod.mockResolvedValue(mockBlockedPeriod);

      await SecretaryController.blockPeriod(req, res);

      expect(mockedSecretaryService.blockPeriod).toHaveBeenCalledWith(
        req.body,
        "secretary-uuid",
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockBlockedPeriod);
    });

    it("returns 404 when doctor not found", async () => {
      const req: any = {
        body: { doctorProfileId: "invalid-uuid" },
        user: { id: "secretary-uuid" },
      };
      const res = createMockResponse();

      const err: any = new Error("Doctor not found");
      err.code = "DOCTOR_NOT_FOUND";
      mockedSecretaryService.blockPeriod.mockRejectedValue(err);

      await SecretaryController.blockPeriod(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Doctor no encontrado",
      });
    });

    it("returns 409 for conflicts with appointments", async () => {
      const req: any = {
        body: { doctorProfileId: "doctor-profile-uuid" },
        user: { id: "secretary-uuid" },
      };
      const res = createMockResponse();

      const err: any = new Error("Conflict with appointments");
      err.code = "CONFLICT_WITH_APPOINTMENTS";
      mockedSecretaryService.blockPeriod.mockRejectedValue(err);

      await SecretaryController.blockPeriod(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: "Hay citas programadas en este período",
      });
    });

    it("returns 500 for server errors", async () => {
      const req: any = {
        body: { doctorProfileId: "doctor-profile-uuid" },
        user: { id: "secretary-uuid" },
      };
      const res = createMockResponse();

      mockedSecretaryService.blockPeriod.mockRejectedValue(
        new Error("Database error"),
      );

      await SecretaryController.blockPeriod(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
    });
  });

  describe("unblockPeriod", () => {
    it("returns 200 and success message on unblock", async () => {
      const req: any = { params: { id: "blocked-period-uuid" } };
      const res = createMockResponse();

      mockedSecretaryService.unblockPeriod.mockResolvedValue({} as any);

      await SecretaryController.unblockPeriod(req, res);

      expect(mockedSecretaryService.unblockPeriod).toHaveBeenCalledWith(
        "blocked-period-uuid",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Período desbloqueado exitosamente",
      });
    });

    it("returns 404 when blocked period not found", async () => {
      const req: any = { params: { id: "invalid-uuid" } };
      const res = createMockResponse();

      const err: any = new Error("Blocked period not found");
      err.code = "BLOCKED_PERIOD_NOT_FOUND";
      mockedSecretaryService.unblockPeriod.mockRejectedValue(err);

      await SecretaryController.unblockPeriod(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Período bloqueado no encontrado",
      });
    });

    it("returns 500 for server errors", async () => {
      const req: any = { params: { id: "blocked-period-uuid" } };
      const res = createMockResponse();

      mockedSecretaryService.unblockPeriod.mockRejectedValue(
        new Error("Database error"),
      );

      await SecretaryController.unblockPeriod(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
    });
  });

  describe("blockPeriodWithOverride", () => {
    it("returns 201 and result with cancelled appointments", async () => {
      const req: any = {
        body: {
          doctorProfileId: "doctor-profile-uuid",
          startDateTime: "2024-12-20T09:00:00Z",
          endDateTime: "2024-12-20T10:00:00Z",
          reason: "Emergency block",
        },
        user: { id: "secretary-uuid" },
      };
      const res = createMockResponse();

      const mockResult = {
        blockedPeriod: {
          id: "blocked-period-uuid",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          doctorProfileId: "doctor-profile-uuid",
          startDateTime: new Date("2024-12-20T09:00:00Z"),
          endDateTime: new Date("2024-12-20T10:00:00Z"),
          reason: "Emergency block",
          createdBy: "secretary-uuid",
        },
        cancelledAppointments: 3,
      };
      mockedSecretaryService.blockPeriodWithOverride.mockResolvedValue(
        mockResult,
      );

      await SecretaryController.blockPeriodWithOverride(req, res);

      expect(
        mockedSecretaryService.blockPeriodWithOverride,
      ).toHaveBeenCalledWith(req.body, "secretary-uuid");
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("returns 404 when doctor not found", async () => {
      const req: any = {
        body: { doctorProfileId: "invalid-uuid" },
        user: { id: "secretary-uuid" },
      };
      const res = createMockResponse();

      const err: any = new Error("Doctor not found");
      err.code = "DOCTOR_NOT_FOUND";
      mockedSecretaryService.blockPeriodWithOverride.mockRejectedValue(err);

      await SecretaryController.blockPeriodWithOverride(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Doctor no encontrado",
      });
    });

    it("returns 500 for server errors", async () => {
      const req: any = {
        body: { doctorProfileId: "doctor-profile-uuid" },
        user: { id: "secretary-uuid" },
      };
      const res = createMockResponse();

      mockedSecretaryService.blockPeriodWithOverride.mockRejectedValue(
        new Error("Database error"),
      );

      await SecretaryController.blockPeriodWithOverride(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
    });
  });
});
