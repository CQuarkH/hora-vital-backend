import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import * as AppointmentService from "../../../src/services/appointmentService";
import * as NotificationService from "../../../src/services/notificationService";
import prisma from "../../../src/db/prisma";

// Mock dependencies
jest.mock("../../../src/services/notificationService");
jest.mock("../../../src/db/prisma", () => ({
  doctorProfile: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  appointment: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
}));

const mockPrisma = prisma as any;
const mockNotificationService = NotificationService as any;

describe("AppointmentService - Complex Flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Schedule Conflict Detection", () => {
    it("should detect time slot conflicts correctly", async () => {
      const existingAppointment = {
        id: "existing-1",
        doctorProfileId: "doctor-1",
        appointmentDate: new Date("2025-12-01"),
        startTime: "10:00",
        endTime: "10:30",
        status: "SCHEDULED",
      };

      mockPrisma.appointment.findFirst.mockResolvedValue(existingAppointment);

      const conflict = await AppointmentService.checkAppointmentConflict(
        "doctor-1",
        new Date("2025-12-01"),
        "10:00",
      );

      expect(conflict).toEqual(existingAppointment);
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

    it("should allow booking when previous appointment is cancelled", async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      const conflict = await AppointmentService.checkAppointmentConflict(
        "doctor-1",
        new Date("2025-12-01"),
        "10:00",
      );

      expect(conflict).toBeNull();
    });

    it("should prevent duplicate appointments for same patient and doctor on same date", async () => {
      const duplicateAppointment = {
        id: "duplicate-1",
        patientId: "patient-1",
        doctorProfileId: "doctor-1",
        appointmentDate: new Date("2025-12-01"),
        status: "SCHEDULED",
      };

      mockPrisma.appointment.findFirst.mockResolvedValue(duplicateAppointment);

      const duplicate =
        await AppointmentService.checkPatientDuplicateAppointment(
          "patient-1",
          "doctor-1",
          new Date("2025-12-01"),
        );

      expect(duplicate).toEqual(duplicateAppointment);
    });
  });

  describe("Time Slot Calculation and Validation", () => {
    it("should correctly calculate end time with 30-minute slots", async () => {
      const appointmentData = {
        patientId: "patient-1",
        doctorProfileId: "doctor-1",
        specialtyId: "specialty-1",
        appointmentDate: new Date("2025-12-01"),
        startTime: "09:30",
        notes: "Test",
      };

      const expectedAppointment = {
        ...appointmentData,
        id: "appointment-1",
        endTime: "10:00",
        status: "SCHEDULED",
        patient: {
          id: "patient-1",
          name: "Test Patient",
          email: "test@test.com",
          phone: "123",
        },
        doctorProfile: {
          id: "doctor-1",
          user: { id: "user-1", name: "Dr. Test" },
          specialty: { id: "specialty-1", name: "Cardiología" },
        },
        specialty: { id: "specialty-1", name: "Cardiología" },
      };

      mockPrisma.appointment.create.mockResolvedValue(expectedAppointment);
      mockNotificationService.createAppointmentConfirmation.mockResolvedValue(
        {},
      );

      await AppointmentService.createAppointment(appointmentData);

      expect(mockPrisma.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          startTime: "09:30",
          endTime: "10:00",
        }),
        include: expect.any(Object),
      });
    });

    it("should handle edge case of last time slot of the day", async () => {
      const appointmentData = {
        patientId: "patient-1",
        doctorProfileId: "doctor-1",
        specialtyId: "specialty-1",
        appointmentDate: new Date("2025-12-01"),
        startTime: "23:30",
        notes: "Late appointment",
      };

      const expectedAppointment = {
        ...appointmentData,
        id: "appointment-1",
        endTime: "24:00",
        status: "SCHEDULED",
        patient: {
          id: "patient-1",
          name: "Test Patient",
          email: "test@test.com",
          phone: "123",
        },
        doctorProfile: {
          id: "doctor-1",
          user: { id: "user-1", name: "Dr. Test" },
          specialty: { id: "specialty-1", name: "Cardiología" },
        },
        specialty: { id: "specialty-1", name: "Cardiología" },
      };

      mockPrisma.appointment.create.mockResolvedValue(expectedAppointment);
      mockNotificationService.createAppointmentConfirmation.mockResolvedValue(
        {},
      );

      await AppointmentService.createAppointment(appointmentData);

      expect(mockPrisma.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          startTime: "23:30",
          endTime: "00:00",
        }),
        include: expect.any(Object),
      });
    });
  });

  describe("Schedule Validation Edge Cases", () => {
    it("should validate schedule for different days of week correctly", async () => {
      const mockDoctorProfile = {
        id: "doctor-1",
        schedules: [
          {
            id: "schedule-1",
            dayOfWeek: 1, // Lunes
            startTime: "09:00",
            endTime: "17:00",
            slotDuration: 30,
            isActive: true,
          },
          {
            id: "schedule-2",
            dayOfWeek: 3, // Miercoles
            startTime: "14:00",
            endTime: "20:00",
            slotDuration: 60,
            isActive: true,
          },
        ],
      };

      mockPrisma.doctorProfile.findUnique.mockResolvedValue(mockDoctorProfile);

      const mondayDate = new Date("2025-12-02");
      const mondayResult = await AppointmentService.validateDoctorSchedule(
        "doctor-1",
        mondayDate,
        "10:00",
      );

      expect(mondayResult.isValid).toBe(true);

      const tuesdayDate = new Date("2025-12-03");
      const tuesdayResult = await AppointmentService.validateDoctorSchedule(
        "doctor-1",
        tuesdayDate,
        "10:00",
      );

      expect(tuesdayResult.isValid).toBe(false);
      expect(tuesdayResult.message).toContain("no tiene horario de atención");

      const wednesdayDate = new Date("2025-12-04");
      const wednesdayValidResult =
        await AppointmentService.validateDoctorSchedule(
          "doctor-1",
          wednesdayDate,
          "15:00",
        );

      expect(wednesdayValidResult.isValid).toBe(true);

      const wednesdayInvalidResult =
        await AppointmentService.validateDoctorSchedule(
          "doctor-1",
          wednesdayDate,
          "14:30",
        );

      expect(wednesdayInvalidResult.isValid).toBe(false);
      expect(wednesdayInvalidResult.message).toContain(
        "intervalos de 60 minutos",
      );
    });

    it("should handle boundary time validations correctly", async () => {
      const mockDoctorProfile = {
        id: "doctor-1",
        schedules: [
          {
            id: "schedule-1",
            dayOfWeek: 1,
            startTime: "09:00",
            endTime: "17:00",
            slotDuration: 30,
            isActive: true,
          },
        ],
      };

      mockPrisma.doctorProfile.findUnique.mockResolvedValue(mockDoctorProfile);

      const mondayDate = new Date("2025-12-02"); // Monday

      const startTimeResult = await AppointmentService.validateDoctorSchedule(
        "doctor-1",
        mondayDate,
        "09:00",
      );
      expect(startTimeResult.isValid).toBe(true);

      const beforeStartResult = await AppointmentService.validateDoctorSchedule(
        "doctor-1",
        mondayDate,
        "08:59",
      );
      expect(beforeStartResult.isValid).toBe(false);

      const lastSlotResult = await AppointmentService.validateDoctorSchedule(
        "doctor-1",
        mondayDate,
        "16:30",
      );
      expect(lastSlotResult.isValid).toBe(true);

      const endTimeResult = await AppointmentService.validateDoctorSchedule(
        "doctor-1",
        mondayDate,
        "17:00",
      );
      expect(endTimeResult.isValid).toBe(false);
    });
  });

  describe("Available Time Slots Generation", () => {
    it("should generate correct available slots excluding booked appointments", async () => {
      const mockDoctorProfiles = [
        {
          id: "doctor-1",
          user: { id: "user-1", name: "Dr. Test" },
          specialty: { id: "specialty-1", name: "Cardiología" },
          schedules: [
            {
              id: "schedule-1",
              dayOfWeek: 1,
              startTime: "09:00",
              endTime: "12:00",
              slotDuration: 30,
              isActive: true,
            },
          ],
        },
      ];

      const bookedAppointments = [
        { startTime: "09:30" },
        { startTime: "10:30" },
      ];

      mockPrisma.doctorProfile.findMany.mockResolvedValue(mockDoctorProfiles);
      mockPrisma.appointment.findMany.mockResolvedValue(bookedAppointments);

      const mondayDate = new Date("2025-12-02"); // Monday
      const availableSlots = await AppointmentService.getAvailableTimeSlots({
        date: mondayDate,
        doctorProfileId: "doctor-1",
      });

      expect(availableSlots).toHaveLength(4);

      const slotTimes = availableSlots.map((slot: any) => slot.startTime);
      expect(slotTimes).toContain("09:00");
      expect(slotTimes).toContain("10:00");
      expect(slotTimes).toContain("11:00");
      expect(slotTimes).toContain("11:30");

      expect(slotTimes).not.toContain("09:30");
      expect(slotTimes).not.toContain("10:30");
    });

    it("should handle empty schedules gracefully", async () => {
      const mockDoctorProfiles = [
        {
          id: "doctor-1",
          user: { id: "user-1", name: "Dr. Test" },
          specialty: { id: "specialty-1", name: "Cardiología" },
          schedules: [],
        },
      ];

      mockPrisma.doctorProfile.findMany.mockResolvedValue(mockDoctorProfiles);

      const mondayDate = new Date("2025-12-01"); // Monday
      const availableSlots = await AppointmentService.getAvailableTimeSlots({
        date: mondayDate,
        doctorProfileId: "doctor-1",
      });

      expect(availableSlots).toHaveLength(0);
    });

    it("should filter by specialty correctly", async () => {
      const mockDoctorProfiles = [
        {
          id: "doctor-1",
          specialtyId: "cardiology",
          user: { id: "user-1", name: "Dr. Cardio" },
          specialty: { id: "cardiology", name: "Cardiología" },
          schedules: [
            {
              dayOfWeek: 1,
              startTime: "09:00",
              endTime: "10:00",
              slotDuration: 30,
              isActive: true,
            },
          ],
        },
        {
          id: "doctor-2",
          specialtyId: "neurology",
          user: { id: "user-2", name: "Dr. Neuro" },
          specialty: { id: "neurology", name: "Neurología" },
          schedules: [
            {
              dayOfWeek: 1,
              startTime: "14:00",
              endTime: "15:00",
              slotDuration: 30,
              isActive: true,
            },
          ],
        },
      ];

      mockPrisma.doctorProfile.findMany.mockResolvedValue(mockDoctorProfiles);
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      await AppointmentService.getAvailableTimeSlots({
        specialtyId: "cardiology",
      });

      expect(mockPrisma.doctorProfile.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          specialtyId: "cardiology",
        },
        include: expect.any(Object),
      });
    });
  });

  describe("Appointment Cancellation Flows", () => {
    it("should handle cancellation with notification errors gracefully", async () => {
      const mockCancelledAppointment = {
        id: "appointment-1",
        patientId: "patient-1",
        status: "CANCELLED",
        cancellationReason: "Emergency",
        appointmentDate: new Date("2025-12-01"),
        startTime: "10:00",
        patient: {
          id: "patient-1",
          name: "Patient Test",
          email: "patient@test.com",
          phone: "123456789",
        },
        doctorProfile: {
          id: "doctor-1",
          user: { id: "user-1", name: "Dr. Test" },
          specialty: { id: "specialty-1", name: "Cardiología" },
        },
        specialty: { id: "specialty-1", name: "Cardiología" },
      };

      mockPrisma.appointment.update.mockResolvedValue(mockCancelledAppointment);

      mockNotificationService.createAppointmentCancellation.mockRejectedValue(
        new Error("Notification service unavailable"),
      );

      // Should not throw - appointment cancellation should succeed even if notification fails
      const result = await AppointmentService.cancelAppointment(
        "appointment-1",
        "Emergency",
      );

      // Verify the appointment was cancelled successfully
      expect(result).toEqual(mockCancelledAppointment);
      expect(result.status).toBe("CANCELLED");
      expect(result.cancellationReason).toBe("Emergency");

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
        where: { id: "appointment-1" },
        data: {
          status: "CANCELLED",
          cancellationReason: "Emergency",
        },
        include: expect.any(Object),
      });
    });

    it("should format cancellation date correctly for notifications", async () => {
      const mockCancelledAppointment = {
        id: "appointment-1",
        patientId: "patient-1",
        status: "CANCELLED",
        cancellationReason: "Personal",
        appointmentDate: new Date("2025-12-15T10:00:00Z"),
        startTime: "14:30",
        patient: {
          id: "patient-1",
          name: "Patient Test",
          email: "patient@test.com",
          phone: "123456789",
        },
        doctorProfile: {
          id: "doctor-1",
          user: { id: "user-1", name: "Dr. Smith" },
          specialty: { id: "specialty-1", name: "Dermatología" },
        },
        specialty: { id: "specialty-1", name: "Dermatología" },
      };

      mockPrisma.appointment.update.mockResolvedValue(mockCancelledAppointment);
      mockNotificationService.createAppointmentCancellation.mockResolvedValue(
        {},
      );

      await AppointmentService.cancelAppointment("appointment-1", "Personal");

      expect(
        mockNotificationService.createAppointmentCancellation,
      ).toHaveBeenCalledWith("patient-1", {
        appointmentDate: "2025-12-15",
        startTime: "14:30",
        doctorName: "Dr. Smith",
        specialty: "Dermatología",
        reason: "Personal",
      });
    });
  });
});
