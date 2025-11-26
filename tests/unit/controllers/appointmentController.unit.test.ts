// tests/unit/controllers/appointmentController.unit.test.ts
import * as AppointmentService from "../../../src/services/appointmentService";
import * as AppointmentController from "../../../src/controllers/appointmentController";
import { createMockResponse } from "../helpers/mockResponse";

jest.mock("../../../src/services/appointmentService");

const mockedAppointmentService = AppointmentService as unknown as jest.Mocked<
  typeof AppointmentService
>;

const fakeAppointment = {
  id: "a1",
  specialtyId: "s1",
  createdAt: new Date(),
  updatedAt: new Date(),
  patientId: "p1",
  doctorProfileId: "d1",
  appointmentDate: new Date("2025-11-02T10:00:00Z"),
  startTime: "10:00",
  endTime: "10:30",
  status: "SCHEDULED" as const,
  notes: "Test notes",
  cancellationReason: null,
  doctorProfile: {
    id: "d1",
    user: {
      id: "d1",
      firstName: "Doc",
      lastName: "Tor",
      email: "doc@test.com",
    },
    specialty: {
      id: "s1",
      name: "Cardio",
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    specialtyId: "s1",
    userId: "d1",
    licenseNumber: "12345",
    bio: null,
  },
  patient: {
    id: "p1",
    firstName: "Pac",
    lastName: "Iente",
    email: "p@test.com",
    phone: "12345678",
    rut: "11.111.111-1",
  },
  specialty: {
    id: "s1",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    name: "Cardio",
    description: null,
  },
};

describe("appointmentController (unit)", () => {
  afterEach(() => jest.clearAllMocks());

  describe("createAppointment", () => {
    const baseReq: any = {
      user: { id: "p1" },
      body: {
        doctorProfileId: "d1",
        specialtyId: "s1",
        appointmentDate: "2025-11-02T10:00:00Z",
        startTime: "10:00",
        notes: "Test notes",
      },
    };

    it("returns 401 if user not authenticated", async () => {
      const req: any = { ...baseReq, user: undefined };
      const res = createMockResponse();

      await AppointmentController.createAppointment(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Usuario no autenticado",
      });
    });

    it("returns 404 if doctor not found", async () => {
      const req: any = { ...baseReq };
      const res = createMockResponse();

      mockedAppointmentService.findDoctorProfile.mockResolvedValue(null);

      await AppointmentController.createAppointment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Médico no encontrado",
      });
    });

    it("returns 404 if specialty not found", async () => {
      const req: any = { ...baseReq };
      const res = createMockResponse();

      mockedAppointmentService.findDoctorProfile.mockResolvedValue({
        specialtyId: "s1",
      } as any);
      mockedAppointmentService.findSpecialty.mockResolvedValue(null);

      await AppointmentController.createAppointment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Especialidad no encontrada",
      });
    });

    it("returns 400 if doctor specialty mismatch", async () => {
      const req: any = { ...baseReq };
      const res = createMockResponse();

      mockedAppointmentService.findDoctorProfile.mockResolvedValue({
        specialtyId: "s2",
      } as any);
      mockedAppointmentService.findSpecialty.mockResolvedValue({
        id: "s1",
      } as any);

      await AppointmentController.createAppointment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "El médico no pertenece a la especialidad seleccionada",
      });
    });

    it("returns 400 if schedule invalid", async () => {
      const req: any = { ...baseReq };
      const res = createMockResponse();

      mockedAppointmentService.findDoctorProfile.mockResolvedValue({
        specialtyId: "s1",
      } as any);
      mockedAppointmentService.findSpecialty.mockResolvedValue({
        id: "s1",
      } as any);
      mockedAppointmentService.validateDoctorSchedule.mockResolvedValue({
        isValid: false,
        message: "Horario inválido",
      });

      await AppointmentController.createAppointment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Horario inválido" });
    });

    it("returns 409 if existing appointment", async () => {
      const req: any = { ...baseReq };
      const res = createMockResponse();

      mockedAppointmentService.findDoctorProfile.mockResolvedValue({
        specialtyId: "s1",
      } as any);
      mockedAppointmentService.findSpecialty.mockResolvedValue({
        id: "s1",
      } as any);
      mockedAppointmentService.validateDoctorSchedule.mockResolvedValue({
        isValid: true,
        message: "",
      });
      mockedAppointmentService.checkAppointmentConflict.mockResolvedValue(
        fakeAppointment
      );

      await AppointmentController.createAppointment(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: "El horario ya está reservado",
      });
    });

    it("returns 409 if duplicate patient appointment", async () => {
      const req: any = { ...baseReq };
      const res = createMockResponse();

      mockedAppointmentService.findDoctorProfile.mockResolvedValue({
        specialtyId: "s1",
      } as any);
      mockedAppointmentService.findSpecialty.mockResolvedValue({
        id: "s1",
      } as any);
      mockedAppointmentService.validateDoctorSchedule.mockResolvedValue({
        isValid: true,
        message: "",
      });
      mockedAppointmentService.checkAppointmentConflict.mockResolvedValue(null);
      mockedAppointmentService.checkPatientDuplicateAppointment.mockResolvedValue(
        fakeAppointment
      );

      await AppointmentController.createAppointment(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: "Ya tienes una cita con este médico en la misma fecha",
      });
    });

    it("creates appointment successfully", async () => {
      const req: any = { ...baseReq };
      const res = createMockResponse();

      mockedAppointmentService.findDoctorProfile.mockResolvedValue({
        specialtyId: "s1",
      } as any);
      mockedAppointmentService.findSpecialty.mockResolvedValue({
        id: "s1",
      } as any);
      mockedAppointmentService.validateDoctorSchedule.mockResolvedValue({
        isValid: true,
        message: "",
      });
      mockedAppointmentService.checkAppointmentConflict.mockResolvedValue(null);
      mockedAppointmentService.checkPatientDuplicateAppointment.mockResolvedValue(
        null
      );
      mockedAppointmentService.createAppointment.mockResolvedValue(
        fakeAppointment
      );

      await AppointmentController.createAppointment(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Cita creada exitosamente",
        appointment: fakeAppointment,
      });
    });
  });

  describe("cancelAppointment", () => {
    const baseReq: any = {
      user: { id: "p1" },
      params: { id: "a1" },
      body: { cancellationReason: "No puedo asistir" },
    };

    it("returns 401 if user not authenticated", async () => {
      const req: any = { ...baseReq, user: undefined };
      const res = createMockResponse();

      await AppointmentController.cancelAppointment(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Usuario no autenticado",
      });
    });

    it("returns 404 if appointment not found", async () => {
      const res = createMockResponse();
      mockedAppointmentService.findAppointmentById.mockResolvedValue(null);

      await AppointmentController.cancelAppointment(baseReq, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Cita no encontrada" });
    });

    it("returns 403 if user is not owner", async () => {
      const res = createMockResponse();
      mockedAppointmentService.findAppointmentById.mockResolvedValue({
        ...fakeAppointment,
        patientId: "other",
      });

      await AppointmentController.cancelAppointment(baseReq, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "No tienes permisos para cancelar esta cita",
      });
    });

    it("returns 400 if already cancelled", async () => {
      const res = createMockResponse();
      mockedAppointmentService.findAppointmentById.mockResolvedValue({
        ...fakeAppointment,
        status: "CANCELLED",
      });

      await AppointmentController.cancelAppointment(baseReq, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "La cita ya está cancelada",
      });
    });

    it("returns 400 if completed", async () => {
      const res = createMockResponse();
      mockedAppointmentService.findAppointmentById.mockResolvedValue({
        ...fakeAppointment,
        status: "COMPLETED",
      });

      await AppointmentController.cancelAppointment(baseReq, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "No se puede cancelar una cita completada",
      });
    });

    it("cancels appointment successfully", async () => {
      const res = createMockResponse();
      mockedAppointmentService.findAppointmentById.mockResolvedValue(
        fakeAppointment
      );
      mockedAppointmentService.cancelAppointment.mockResolvedValue(
        fakeAppointment
      );

      await AppointmentController.cancelAppointment(baseReq, res);

      expect(res.json).toHaveBeenCalledWith({
        message: "Cita cancelada exitosamente",
        appointment: fakeAppointment,
      });
    });
  });

  describe("getMyAppointments", () => {
    it("returns 401 if user not authenticated", async () => {
      const req: any = { user: undefined, query: {} };
      const res = createMockResponse();

      await AppointmentController.getMyAppointments(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns appointments", async () => {
      const req: any = { user: { id: "p1" }, query: {} };
      const res = createMockResponse();
      mockedAppointmentService.findPatientAppointments.mockResolvedValue([
        fakeAppointment,
      ]);

      await AppointmentController.getMyAppointments(req, res);

      expect(res.json).toHaveBeenCalledWith({
        appointments: [fakeAppointment],
      });
    });
  });

  describe("getAvailability", () => {
    it("returns available slots", async () => {
      const req: any = { query: { date: "2025-11-02", specialtyId: "s1" } };
      const res = createMockResponse();
      mockedAppointmentService.getAvailableTimeSlots.mockResolvedValue([
        "08:00",
        "09:00",
      ]);

      await AppointmentController.getAvailability(req, res);

      expect(res.json).toHaveBeenCalledWith({
        availableSlots: ["08:00", "09:00"],
      });
    });
  });

  describe("updateAppointment", () => {
    const baseReq: any = {
      user: { id: "p1", role: "PATIENT" },
      params: { id: "a1" },
      body: {
        startTime: "14:00",
        notes: "Updated notes",
      },
    };

    it("should update appointment successfully", async () => {
      const res = createMockResponse();
      mockedAppointmentService.findAppointmentById.mockResolvedValue(
        fakeAppointment
      );
      mockedAppointmentService.updateAppointment.mockResolvedValue({
        ...fakeAppointment,
        notes: "Updated notes",
      });

      await AppointmentController.updateAppointment(baseReq, res);

      expect(res.json).toHaveBeenCalledWith({
        message: "Cita actualizada exitosamente",
        appointment: expect.objectContaining({
          notes: "Updated notes",
        }),
      });
    });

    it("returns 404 if appointment not found", async () => {
      const res = createMockResponse();
      mockedAppointmentService.findAppointmentById.mockResolvedValue(null);

      await AppointmentController.updateAppointment(baseReq, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Cita no encontrada" });
    });

    it("returns 403 if user doesn't own appointment", async () => {
      const req: any = {
        ...baseReq,
        user: { id: "other-user", role: "PATIENT" },
      };
      const res = createMockResponse();
      mockedAppointmentService.findAppointmentById.mockResolvedValue(
        fakeAppointment
      );

      await AppointmentController.updateAppointment(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "No tienes permisos para editar esta cita",
      });
    });

    it("returns 400 if appointment already cancelled/completed", async () => {
      const res = createMockResponse();
      mockedAppointmentService.findAppointmentById.mockResolvedValue({
        ...fakeAppointment,
        status: "CANCELLED",
      });

      await AppointmentController.updateAppointment(baseReq, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "No se puede editar una cita cancelada",
      });
    });

    it("returns 409 when new time slot not available", async () => {
      const res = createMockResponse();
      mockedAppointmentService.findAppointmentById.mockResolvedValue(
        fakeAppointment
      );
      mockedAppointmentService.updateAppointment.mockRejectedValue(
        new Error("The time slot is already reserved")
      );

      await AppointmentController.updateAppointment(baseReq, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: "El horario ya está reservado",
      });
    });
  });
});
