// tests/unit/services/appointmentService.unit.test.ts
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import * as AppointmentService from "../../../src/services/appointmentService";
import * as NotificationService from "../../../src/services/notificationService";
import prisma from "../../../src/db/prisma";

jest.mock("../../../src/services/notificationService");
jest.mock("../../../src/db/prisma", () => ({
  doctorProfile: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  specialty: {
    findUnique: jest.fn(),
  },
  appointment: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  schedule: {
    findFirst: jest.fn(),
  },
  $queryRaw: jest.fn(),
}));

const mockPrisma = prisma as any;
const mockNotificationService = NotificationService as any;

describe("AppointmentService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findDoctorProfile", () => {
    it("should return doctor profile when found", async () => {
      const mockDoctorProfile = {
        id: "doctor-1",
        userId: "user-1",
        specialtyId: "specialty-1",
        licenseNumber: "12345",
        specialty: { id: "specialty-1", name: "Cardiología" },
        user: { id: "user-1", firstName: "Dr.", lastName: "Test" },
        schedules: [],
      };

      mockPrisma.doctorProfile.findUnique.mockResolvedValue(mockDoctorProfile);

      const result = await AppointmentService.findDoctorProfile("doctor-1");

      expect(result).toEqual(mockDoctorProfile);
      expect(mockPrisma.doctorProfile.findUnique).toHaveBeenCalledWith({
        where: { id: "doctor-1" },
        include: {
          specialty: true,
          user: true,
          schedules: true,
        },
      });
    });

    it("should return null when doctor profile not found", async () => {
      mockPrisma.doctorProfile.findUnique.mockResolvedValue(null);

      const result = await AppointmentService.findDoctorProfile("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("findSpecialty", () => {
    it("should return specialty when found", async () => {
      const mockSpecialty = {
        id: "specialty-1",
        name: "Cardiología",
        description: "Especialidad del corazón",
      };

      mockPrisma.specialty.findUnique.mockResolvedValue(mockSpecialty);

      const result = await AppointmentService.findSpecialty("specialty-1");

      expect(result).toEqual(mockSpecialty);
      expect(mockPrisma.specialty.findUnique).toHaveBeenCalledWith({
        where: { id: "specialty-1" },
      });
    });

    it("should return null when specialty not found", async () => {
      mockPrisma.specialty.findUnique.mockResolvedValue(null);

      const result = await AppointmentService.findSpecialty("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("checkAppointmentConflict", () => {
    it("should return existing appointment when there is a conflict", async () => {
      const mockAppointment = {
        id: "appointment-1",
        doctorProfileId: "doctor-1",
        appointmentDate: new Date("2025-12-01"),
        startTime: "10:00",
        status: "SCHEDULED",
      };

      mockPrisma.appointment.findFirst.mockResolvedValue(mockAppointment);

      const result = await AppointmentService.checkAppointmentConflict(
        "doctor-1",
        new Date("2025-12-01"),
        "10:00"
      );

      expect(result).toEqual(mockAppointment);
      expect(mockPrisma.appointment.findFirst).toHaveBeenCalledWith({
        where: {
          doctorProfileId: "doctor-1",
          appointmentDate: new Date("2025-12-01"),
          startTime: "10:00",
          status: {
            not: "CANCELLED",
          },
        },
      });
    });

    it("should return null when no conflict exists", async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      const result = await AppointmentService.checkAppointmentConflict(
        "doctor-1",
        new Date("2025-12-01"),
        "10:00"
      );

      expect(result).toBeNull();
    });
  });

  describe("checkPatientDuplicateAppointment", () => {
    it("should return existing appointment when patient has duplicate", async () => {
      const mockAppointment = {
        id: "appointment-1",
        patientId: "patient-1",
        doctorProfileId: "doctor-1",
        appointmentDate: new Date("2025-12-01"),
        status: "SCHEDULED",
      };

      mockPrisma.appointment.findFirst.mockResolvedValue(mockAppointment);

      const result = await AppointmentService.checkPatientDuplicateAppointment(
        "patient-1",
        "doctor-1",
        new Date("2025-12-01")
      );

      expect(result).toEqual(mockAppointment);
    });

    it("should return null when no duplicate exists", async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      const result = await AppointmentService.checkPatientDuplicateAppointment(
        "patient-1",
        "doctor-1",
        new Date("2025-12-01")
      );

      expect(result).toBeNull();
    });
  });

  describe("createAppointment", () => {
    it("should create appointment and send notification", async () => {
      const appointmentData = {
        patientId: "patient-1",
        doctorProfileId: "doctor-1",
        specialtyId: "specialty-1",
        appointmentDate: new Date("2025-12-01"),
        startTime: "10:00",
        notes: "Test appointment",
      };

      const mockCreatedAppointment = {
        id: "appointment-1",
        ...appointmentData,
        endTime: "10:30",
        status: "SCHEDULED",
        patient: {
          id: "patient-1",
          firstName: "Patient",
          lastName: "Test",
          email: "patient@test.com",
          phone: "123456789",
        },
        doctorProfile: {
          id: "doctor-1",
          user: {
            id: "user-1",
            firstName: "Dr.",
            lastName: "Test",
          },
          specialty: {
            id: "specialty-1",
            name: "Cardiología",
          },
        },
        specialty: {
          id: "specialty-1",
          name: "Cardiología",
        },
      };

      mockPrisma.appointment.create.mockResolvedValue(mockCreatedAppointment);
      mockNotificationService.createAppointmentConfirmation.mockResolvedValue(
        {}
      );

      const result =
        await AppointmentService.createAppointment(appointmentData);

      expect(result).toEqual(mockCreatedAppointment);
      expect(mockPrisma.appointment.create).toHaveBeenCalledWith({
        data: {
          patientId: "patient-1",
          doctorProfileId: "doctor-1",
          specialtyId: "specialty-1",
          appointmentDate: new Date("2025-12-01"),
          startTime: "10:00",
          endTime: "10:30",
          notes: "Test appointment",
        },
        include: expect.any(Object),
      });
      expect(
        mockNotificationService.createAppointmentConfirmation
      ).toHaveBeenCalledWith("patient-1", {
        appointmentDate: "2025-12-01",
        startTime: "10:00",
        doctorName: "Dr. Test",
        specialty: "Cardiología",
      });
    });

    it("should calculate correct end time for appointment", async () => {
      const appointmentData = {
        patientId: "patient-1",
        doctorProfileId: "doctor-1",
        specialtyId: "specialty-1",
        appointmentDate: new Date("2025-12-01"),
        startTime: "14:30",
        notes: "Test appointment",
      };

      const mockCreatedAppointment = {
        id: "appointment-1",
        ...appointmentData,
        endTime: "15:00",
        status: "SCHEDULED",
        patient: {
          id: "patient-1",
          firstName: "Patient",
          lastName: "Test",
          email: "patient@test.com",
          phone: "123456789",
        },
        doctorProfile: {
          id: "doctor-1",
          user: { id: "user-1", firstName: "Dr.", lastName: "Test" },
          specialty: { id: "specialty-1", name: "Cardiología" },
        },
        specialty: { id: "specialty-1", name: "Cardiología" },
      };

      mockPrisma.appointment.create.mockResolvedValue(mockCreatedAppointment);
      mockNotificationService.createAppointmentConfirmation.mockResolvedValue(
        {}
      );

      await AppointmentService.createAppointment(appointmentData);

      expect(mockPrisma.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          startTime: "14:30",
          endTime: "15:00",
        }),
        include: expect.any(Object),
      });
    });
  });

  describe("validateDoctorSchedule", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return invalid when doctor not found", async () => {
      mockPrisma.doctorProfile.findUnique.mockResolvedValue(null);

      const result = await AppointmentService.validateDoctorSchedule(
        "nonexistent",
        new Date("2025-12-01"),
        "10:00"
      );

      expect(result).toEqual({
        isValid: false,
        message: "Médico no encontrado",
      });
    });

    it("should return invalid when doctor has no schedule for the day", async () => {
      const mockDoctorProfile = {
        id: "doctor-1",
        schedules: [],
      };

      mockPrisma.doctorProfile.findUnique.mockResolvedValue(mockDoctorProfile);

      const mondayDate = new Date("2025-12-01");

      const result = await AppointmentService.validateDoctorSchedule(
        "doctor-1",
        mondayDate,
        "10:00"
      );

      expect(result).toEqual({
        isValid: false,
        message: "El médico no tiene horario de atención para este día",
      });
    });

    it("should return invalid when appointment time is outside schedule hours", async () => {
      const mockDoctorProfile = {
        id: "doctor-1",
        schedules: [
          {
            id: "schedule-1",
            dayOfWeek: 2, // choose a day
            startTime: "09:00",
            endTime: "17:00",
            slotDuration: 30,
            isActive: true,
          },
        ],
      };

      mockPrisma.doctorProfile.findUnique.mockResolvedValue(mockDoctorProfile);

      const date = new Date("2025-12-03"); // day 3
      const result = await AppointmentService.validateDoctorSchedule(
        "doctor-1",
        date,
        "18:00"
      );

      expect(result).toEqual({
        isValid: false,
        message: "El médico atiende de 09:00 a 17:00 este día",
      });
    });

    it("should return invalid when appointment time does not align with slot duration", async () => {
      const mockDoctorProfile = {
        id: "doctor-1",
        schedules: [
          {
            id: "schedule-1",
            dayOfWeek: 2,
            startTime: "09:00",
            endTime: "17:00",
            slotDuration: 30,
            isActive: true,
          },
        ],
      };

      mockPrisma.doctorProfile.findUnique.mockResolvedValue(mockDoctorProfile);

      const date = new Date("2025-12-03");
      const result = await AppointmentService.validateDoctorSchedule(
        "doctor-1",
        date,
        "09:15"
      );

      expect(result).toEqual({
        isValid: false,
        message: "Las citas deben ser programadas en intervalos de 30 minutos",
      });
    });

    it("should return valid when appointment time is within schedule and properly aligned", async () => {
      const mockDoctorProfile = {
        id: "doctor-1",
        schedules: [
          {
            id: "schedule-1",
            dayOfWeek: 2,
            startTime: "09:00",
            endTime: "17:00",
            slotDuration: 30,
            isActive: true,
          },
        ],
      };

      mockPrisma.doctorProfile.findUnique.mockResolvedValue(mockDoctorProfile);

      const date = new Date("2025-12-03");
      const result = await AppointmentService.validateDoctorSchedule(
        "doctor-1",
        date,
        "10:30"
      );

      expect(result).toEqual({
        isValid: true,
        message: "Horario válido",
      });
    });
  });

  describe("cancelAppointment", () => {
    it("should cancel appointment and send notification", async () => {
      const mockCancelledAppointment = {
        id: "appointment-1",
        patientId: "patient-1",
        status: "CANCELLED",
        cancellationReason: "Personal reasons",
        appointmentDate: new Date("2025-12-01"),
        startTime: "10:00",
        patient: {
          id: "patient-1",
          firstName: "Patient",
          lastName: "Test",
          email: "patient@test.com",
          phone: "123456789",
        },
        doctorProfile: {
          id: "doctor-1",
          user: { id: "user-1", firstName: "Dr.", lastName: "Test" },
          specialty: { id: "specialty-1", name: "Cardiología" },
        },
        specialty: { id: "specialty-1", name: "Cardiología" },
      };

      mockPrisma.appointment.update.mockResolvedValue(mockCancelledAppointment);
      mockNotificationService.createAppointmentCancellation.mockResolvedValue(
        {}
      );

      const result = await AppointmentService.cancelAppointment(
        "appointment-1",
        "Personal reasons"
      );

      expect(result).toEqual(mockCancelledAppointment);
      expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
        where: { id: "appointment-1" },
        data: {
          status: "CANCELLED",
          cancellationReason: "Personal reasons",
        },
        include: expect.any(Object),
      });
      expect(
        mockNotificationService.createAppointmentCancellation
      ).toHaveBeenCalledWith("patient-1", {
        appointmentDate: "2025-12-01",
        startTime: "10:00",
        doctorName: "Dr. Test",
        specialty: "Cardiología",
        reason: "Personal reasons",
      });
    });
  });

  describe("findPatientAppointments", () => {
    it("should return patient appointments with filters", async () => {
      const mockAppointments = [
        {
          id: "appointment-1",
          patientId: "patient-1",
          appointmentDate: new Date("2025-12-01"),
          startTime: "10:00",
          status: "SCHEDULED",
          doctorProfile: {
            id: "doctor-1",
            user: { id: "user-1", firstName: "Dr.", lastName: "Test" },
            specialty: { id: "specialty-1", name: "Cardiología" },
          },
          specialty: { id: "specialty-1", name: "Cardiología" },
        },
      ];

      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);

      const filters = {
        status: "SCHEDULED" as any,
        dateFrom: new Date("2025-12-01"),
        dateTo: new Date("2025-12-31"),
      };

      const result = await AppointmentService.findPatientAppointments(
        "patient-1",
        filters
      );

      expect(result).toEqual(mockAppointments);
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          patientId: "patient-1",
          status: "SCHEDULED",
          appointmentDate: {
            gte: new Date("2025-12-01"),
            lte: new Date("2025-12-31"),
          },
        },
        include: expect.any(Object),
        orderBy: [{ appointmentDate: "asc" }, { startTime: "asc" }],
      });
    });

    it("should return appointments without filters when none provided", async () => {
      const mockAppointments: any[] = [];
      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);

      await AppointmentService.findPatientAppointments("patient-1");

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          patientId: "patient-1",
        },
        include: expect.any(Object),
        orderBy: [{ appointmentDate: "asc" }, { startTime: "asc" }],
      });
    });
  });
});

describe("updateAppointment", () => {
  it("should update appointment notes without reschedule", async () => {
    const currentAppointment = {
      id: "appointment-1",
      patientId: "patient-1",
      doctorProfileId: "doctor-1",
      specialtyId: "specialty-1",
      appointmentDate: new Date("2025-12-01"),
      startTime: "10:00",
      endTime: "10:30",
      status: "SCHEDULED",
      notes: "Original notes",
    };

    const updatedAppointment = {
      ...currentAppointment,
      notes: "Updated notes",
      patient: {
        id: "patient-1",
        firstName: "Patient",
        lastName: "Test",
        email: "patient@test.com",
        phone: "123456789",
      },
      doctorProfile: {
        id: "doctor-1",
        user: { id: "user-1", firstName: "Dr.", lastName: "Test" },
        specialty: { id: "specialty-1", name: "Cardiología" },
      },
      specialty: { id: "specialty-1", name: "Cardiología" },
    };

    mockPrisma.appointment.findUnique.mockResolvedValue(currentAppointment);
    mockPrisma.appointment.update.mockResolvedValue(updatedAppointment);
    mockNotificationService.createAppointmentUpdate.mockResolvedValue({});

    const result = await AppointmentService.updateAppointment("appointment-1", {
      notes: "Updated notes",
    });

    expect(result).toEqual(updatedAppointment);
    expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
      where: { id: "appointment-1" },
      data: { notes: "Updated notes" },
      include: expect.any(Object),
    });
    expect(mockNotificationService.createAppointmentUpdate).toHaveBeenCalled();
  });

  it("should reschedule appointment to new time slot", async () => {
    const currentAppointment = {
      id: "appointment-1",
      patientId: "patient-1",
      doctorProfileId: "doctor-1",
      specialtyId: "specialty-1",
      appointmentDate: new Date("2025-12-01T12:00:00Z"),
      startTime: "10:00",
      status: "SCHEDULED",
    };

    const mockDoctorProfile = {
      id: "doctor-1",
      specialtyId: "specialty-1",
      schedules: [
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
          slotDuration: 30,
          isActive: true,
        },
      ],
    };

    mockPrisma.appointment.findUnique.mockResolvedValue(currentAppointment);
    mockPrisma.doctorProfile.findUnique.mockResolvedValue(mockDoctorProfile);
    mockPrisma.appointment.findFirst.mockResolvedValue(null); // No conflict
    mockPrisma.appointment.update.mockResolvedValue({
      ...currentAppointment,
      startTime: "14:00",
      endTime: "14:30",
      patient: {},
      doctorProfile: { user: {}, specialty: {} },
      specialty: {},
    });
    mockNotificationService.createAppointmentUpdate.mockResolvedValue({});

    await AppointmentService.updateAppointment("appointment-1", {
      startTime: "14:00",
    });

    expect(mockPrisma.doctorProfile.findUnique).toHaveBeenCalled();
    expect(mockPrisma.appointment.findFirst).toHaveBeenCalled();
    expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          startTime: "14:00",
          endTime: "14:30",
        }),
      })
    );
  });

  it("should validate new slot availability when rescheduling", async () => {
    const currentAppointment = {
      id: "appointment-1",
      patientId: "patient-1",
      doctorProfileId: "doctor-1",
      appointmentDate: new Date("2025-12-01T12:00:00Z"),
      startTime: "10:00",
    };

    const mockDoctorProfile = {
      id: "doctor-1",
      schedules: [
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
          slotDuration: 30,
          isActive: true,
        },
      ],
    };

    mockPrisma.appointment.findUnique.mockResolvedValue(currentAppointment);
    mockPrisma.doctorProfile.findUnique.mockResolvedValue(mockDoctorProfile);
    mockPrisma.appointment.findFirst.mockResolvedValue({
      id: "other-appointment",
      startTime: "14:00",
    }); // Conflict exists

    await expect(
      AppointmentService.updateAppointment("appointment-1", {
        startTime: "14:00",
      })
    ).rejects.toThrow("The time slot is already reserved");
  });

  it("should send notification on update", async () => {
    const currentAppointment = {
      id: "appointment-1",
      patientId: "patient-1",
      doctorProfileId: "doctor-1",
      appointmentDate: new Date("2025-12-01"),
      startTime: "10:00",
    };

    mockPrisma.appointment.findUnique.mockResolvedValue(currentAppointment);
    mockPrisma.appointment.update.mockResolvedValue({
      ...currentAppointment,
      notes: "Updated",
      patient: { id: "patient-1" },
      doctorProfile: {
        user: { firstName: "Dr.", lastName: "Test" },
        specialty: { name: "Cardiología" },
      },
      specialty: { name: "Cardiología" },
    });
    mockNotificationService.createAppointmentUpdate.mockResolvedValue({});

    await AppointmentService.updateAppointment("appointment-1", {
      notes: "Updated",
    });

    expect(mockNotificationService.createAppointmentUpdate).toHaveBeenCalledWith(
      "patient-1",
      expect.objectContaining({
        appointmentDate: "2025-12-01",
        startTime: "10:00",
        doctorName: "Dr. Test",
        specialty: "Cardiología",
      })
    );
  });

  it("should validate specialty change matches doctor", async () => {
    const currentAppointment = {
      id: "appointment-1",
      doctorProfileId: "doctor-1",
      specialtyId: "specialty-1",
      appointmentDate: new Date("2025-12-01"),
      startTime: "10:00",
    };

    const mockDoctorProfile = {
      id: "doctor-2",
      specialtyId: "specialty-2", // Different specialty
    };

    mockPrisma.appointment.findUnique.mockResolvedValue(currentAppointment);
    mockPrisma.doctorProfile.findUnique.mockResolvedValue(mockDoctorProfile);

    await expect(
      AppointmentService.updateAppointment("appointment-1", {
        doctorProfileId: "doctor-2",
        specialtyId: "specialty-1",
      })
    ).rejects.toThrow("Doctor does not belong to the selected specialty");
  });
});
