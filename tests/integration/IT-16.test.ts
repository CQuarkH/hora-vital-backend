import request from "supertest";
import {
  getPrismaClient,
  cleanDatabase,
  TestFactory,
  generateTestToken,
} from "../test-helpers";
import { PrismaClient } from "@prisma/client";
import * as EmailService from "../../src/services/emailService";

jest.mock("../../src/services/emailService");

describe("IT-16: Flujo completo de notificaciones por email", () => {
  let prisma: PrismaClient;
  let app: any;
  let doctorId: string;
  let patientId: string;
  let specialtyId: string;
  let doctorProfileId: string;
  let patientToken: string;

  const emailServiceMock = EmailService as jest.Mocked<typeof EmailService>;

  beforeAll(async () => {
    prisma = getPrismaClient();
    const appModule = await import("../../src/app");
    app = appModule.default || (appModule as any).app;
  });

  beforeEach(async () => {
    await cleanDatabase();
    prisma = getPrismaClient();

    jest.clearAllMocks();

    emailServiceMock.sendAppointmentConfirmation.mockResolvedValue(undefined);
    emailServiceMock.sendAppointmentCancellation.mockResolvedValue(undefined);
    emailServiceMock.sendAppointmentReminder.mockResolvedValue(undefined);

    const specialty = await prisma.specialty.create({
      data: {
        name: "Cardiología",
        description: "Especialidad en cardiología",
      },
    });
    specialtyId = specialty.id;

    const doctor = await prisma.user.create({
      data: {
        ...TestFactory.createPatient({
          role: "DOCTOR",
          email: "doctor@test.com",
          firstName: "Dr. Juan",
          lastName: "Pérez",
        }),
      },
    });
    doctorId = doctor.id;

    const doctorProfile = await prisma.doctorProfile.create({
      data: {
        userId: doctorId,
        specialtyId: specialtyId,
        licenseNumber: "DOC123",
        bio: "Cardiólogo especializado",
      },
    });
    doctorProfileId = doctorProfile.id;

    // Crear horarios para todos los días laborables (lunes a viernes)
    for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
      await prisma.schedule.create({
        data: {
          doctorProfileId: doctorProfileId,
          dayOfWeek: dayOfWeek,
          startTime: "08:00",
          endTime: "18:00",
          isActive: true,
        },
      });
    }

    const patient = await prisma.user.create({
      data: TestFactory.createPatient({
        email: "patient@test.com",
        firstName: "María",
        lastName: "González",
      }),
    });
    patientId = patient.id;
    patientToken = generateTestToken(patientId);
  });

  describe("Confirmación de cita", () => {
    it("debe enviar email de confirmación al crear una cita", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
        futureDate.setDate(futureDate.getDate() + 1);
      }

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: futureDate.toISOString(),
          startTime: "10:00",
          notes: "Cita de prueba",
        });

      expect(response.status).toBe(201);

      const notifications = await prisma.notification.findMany({
        where: {
          userId: patientId,
          type: "APPOINTMENT_CONFIRMATION",
        },
      });

      expect(notifications.length).toBe(1);
      expect(notifications[0].title).toBe("Cita Confirmada");
    });

    it("debe crear notificación sin enviar email en modo test", async () => {
      process.env.NODE_ENV = "test";

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
        futureDate.setDate(futureDate.getDate() + 1);
      }

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: futureDate.toISOString(),
          startTime: "14:00",
          notes: "Cita test",
        });

      expect(response.status).toBe(201);
      expect(
        emailServiceMock.sendAppointmentConfirmation,
      ).not.toHaveBeenCalled();

      const notifications = await prisma.notification.findMany({
        where: { userId: patientId },
      });

      expect(notifications.length).toBe(1);
    });
  });

  describe("Cancelación de cita", () => {
    let appointmentId: string;

    beforeEach(async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
        futureDate.setDate(futureDate.getDate() + 1);
      }

      const appointment = await prisma.appointment.create({
        data: {
          patientId,
          doctorProfileId,
          specialtyId,
          appointmentDate: futureDate,
          startTime: "09:00",
          endTime: "09:30",
          status: "SCHEDULED",
          notes: "Cita a cancelar",
        },
      });
      appointmentId = appointment.id;
    });

    it("debe enviar notificación de cancelación", async () => {
      const response = await request(app)
        .patch(`/api/appointments/${appointmentId}/cancel`)
        .set("Authorization", `Bearer ${patientToken}`)
        .send({ cancellationReason: "No puedo asistir" });

      expect(response.status).toBe(200);

      const notifications = await prisma.notification.findMany({
        where: {
          userId: patientId,
          type: "APPOINTMENT_CANCELLATION",
        },
      });

      expect(notifications.length).toBe(1);
      expect(notifications[0].title).toBe("Cita Cancelada");
    });
  });

  describe("Validación de estructura de emails", () => {
    it("debe manejar errores en envío de email sin fallar la operación", async () => {
      process.env.NODE_ENV = "production";
      process.env.FORCE_EMAIL_IN_TESTS = "true";

      emailServiceMock.sendAppointmentConfirmation.mockRejectedValue(
        new Error("Email server error"),
      );

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 8);
      while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
        futureDate.setDate(futureDate.getDate() + 1);
      }

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: futureDate.toISOString(),
          startTime: "11:00",
          notes: "Cita con error email",
        });

      expect(response.status).toBe(201);

      const notifications = await prisma.notification.findMany({
        where: { userId: patientId },
      });

      expect(notifications.length).toBe(1);

      process.env.NODE_ENV = "test";
      delete process.env.FORCE_EMAIL_IN_TESTS;
    });
  });

  describe("Recordatorios de cita", () => {
    it("debe crear notificación de recordatorio", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const appointmentData = {
        appointmentDate: futureDate.toISOString().split("T")[0],
        startTime: "15:00",
        doctorName: "Dr. Juan Pérez",
        specialty: "Cardiología",
      };

      const NotificationService = require("../../src/services/notificationService");
      const notification = await NotificationService.createAppointmentReminder(
        patientId,
        appointmentData,
      );

      expect(notification).toBeDefined();
      expect(notification.type).toBe("APPOINTMENT_REMINDER");
      expect(notification.title).toBe("Recordatorio de Cita");

      const savedNotification = await prisma.notification.findUnique({
        where: { id: notification.id },
      });

      expect(savedNotification).not.toBeNull();
    });
  });

  describe("Flujo completo de notificaciones", () => {
    it("debe manejar ciclo completo: creación → actualización → cancelación", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
        futureDate.setDate(futureDate.getDate() + 1);
      }

      const createResponse = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: futureDate.toISOString(),
          startTime: "16:00",
          notes: "Cita ciclo completo",
        });

      expect(createResponse.status).toBe(201);
      const appointmentId = createResponse.body.appointment.id;

      const updateResponse = await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          startTime: "17:00",
          notes: "Cita actualizada",
        });

      expect(updateResponse.status).toBe(200);

      const cancelResponse = await request(app)
        .patch(`/api/appointments/${appointmentId}/cancel`)
        .set("Authorization", `Bearer ${patientToken}`)
        .send({ cancellationReason: "Cambio de planes" });

      expect(cancelResponse.status).toBe(200);

      const allNotifications = await prisma.notification.findMany({
        where: { userId: patientId },
        orderBy: { createdAt: "asc" },
      });

      expect(allNotifications.length).toBeGreaterThanOrEqual(2);

      const confirmationNotifications = allNotifications.filter(
        (n) => n.type === "APPOINTMENT_CONFIRMATION",
      );
      const cancellationNotifications = allNotifications.filter(
        (n) => n.type === "APPOINTMENT_CANCELLATION",
      );

      expect(confirmationNotifications.length).toBe(1);
      expect(cancellationNotifications.length).toBe(1);
    });
  });

  describe("Gestión de notificaciones", () => {
    it("debe permitir marcar notificaciones como leídas", async () => {
      const notification = await prisma.notification.create({
        data: {
          userId: patientId,
          type: "APPOINTMENT_CONFIRMATION",
          title: "Test Notification",
          message: "Test message",
          isRead: false,
        },
      });

      const response = await request(app)
        .patch(`/api/notifications/${notification.id}/read`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(200);

      const updatedNotification = await prisma.notification.findUnique({
        where: { id: notification.id },
      });

      expect(updatedNotification?.isRead).toBe(true);
    });

    it("debe obtener notificaciones paginadas del usuario", async () => {
      for (let i = 0; i < 5; i++) {
        await prisma.notification.create({
          data: {
            userId: patientId,
            type: "APPOINTMENT_CONFIRMATION",
            title: `Notification ${i}`,
            message: `Message ${i}`,
          },
        });
      }

      const response = await request(app)
        .get("/api/notifications")
        .set("Authorization", `Bearer ${patientToken}`)
        .query({ page: 1, limit: 3 });

      expect(response.status).toBe(200);
      expect(response.body.notifications.length).toBe(3);
      expect(response.body.meta.total).toBe(5);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(3);
    });
  });
});
