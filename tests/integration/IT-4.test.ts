import request from "supertest";
import {
  getPrismaClient,
  cleanDatabase,
  TestFactory,
  generateTestToken,
} from "../test-helpers";
import { PrismaClient } from "@prisma/client";
import * as NotificationService from "../../src/services/notificationService";

// ✅ Mock COMPLETO del módulo emailService
jest.mock("../../src/services/emailService", () => ({
  sendAppointmentConfirmation: jest.fn().mockResolvedValue(undefined),
  sendAppointmentCancellation: jest.fn().mockResolvedValue(undefined),
  __esModule: true,
}));
import * as EmailService from "../../src/services/emailService";

/**
 * IT-4: Notificaciones Internas (Avance 2)
 *
 * Integración: Servicio de Notificaciones ↔ Base de Datos
 *
 * Objetivo: Verificar que el sistema de notificaciones internas funciona
 * correctamente sin dependencia del envío de emails para el Avance 2.
 * Justificación: Se priorizan las notificaciones en BD para validar el
 * flujo de negocio antes de implementar la integración SMTP.
 */
describe("IT-4: Notificaciones Internas (Avance 2)", () => {
  let prisma: PrismaClient;
  let app: any;
  let patientId: string;
  let patientToken: string;
  let patientEmail: string;
  let doctorProfileId: string;
  let specialtyId: string;

  beforeAll(async () => {
    prisma = getPrismaClient();
    const appModule = await import("../../src/app");
    app = appModule.default || (appModule as any).app;
  });

  afterAll(async () => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    await cleanDatabase();
    prisma = getPrismaClient();

    // Limpiar mocks de email
    jest.clearAllMocks();
    (EmailService.sendAppointmentConfirmation as jest.Mock).mockResolvedValue(
      undefined,
    );

    // Crear datos de prueba
    const specialty = await prisma.specialty.create({
      data: TestFactory.createSpecialty(),
    });
    specialtyId = specialty.id;

    const patient = await prisma.user.create({
      data: TestFactory.createPatient(),
    });
    patientId = patient.id;
    patientEmail = patient.email;
    patientToken = generateTestToken(patientId);

    const doctor = await prisma.user.create({
      data: TestFactory.createDoctor(),
    });

    const doctorProfile = await prisma.doctorProfile.create({
      data: TestFactory.createDoctorProfile(doctor.id, specialtyId),
    });
    doctorProfileId = doctorProfile.id;

    const daysOfWeek = [1, 2, 3, 4, 5];
    for (const day of daysOfWeek) {
      await prisma.schedule.create({
        data: TestFactory.createSchedule(doctorProfileId, {
          dayOfWeek: day,
        }),
      });
    }
  });

  it("debe crear notificación en BD cuando se agenda una cita (modo test)", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    tomorrow.setHours(0, 0, 0, 0);

    const appointmentPayload = {
      patientId,
      doctorProfileId,
      specialtyId,
      appointmentDate: tomorrow.toISOString(),
      startTime: "10:00",
      endTime: "10:30",
      notes: "Consulta médica",
    };

    // Act: Crear cita
    const response = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${patientToken}`)
      .send(appointmentPayload);

    // Assert: La cita se crea exitosamente
    expect(response.status).toBe(201);
    expect(response.body.appointment).toBeDefined();

    // Verificar que la cita existe en BD
    const savedAppointment = await prisma.appointment.findUnique({
      where: { id: response.body.appointment.id },
    });
    expect(savedAppointment).not.toBeNull();

    // Verificar que la notificación se creó en BD
    const notification = await prisma.notification.findFirst({
      where: {
        userId: patientId,
        type: "APPOINTMENT_CONFIRMATION",
      },
    });
    expect(notification).not.toBeNull();
    expect(notification?.title).toBe("Cita Confirmada");

    // En modo test, no se llama al servicio de email
    expect(EmailService.sendAppointmentConfirmation).not.toHaveBeenCalled();

    console.log(
      "✅ Avance 2 - Notificaciones internas funcionando sin dependencia de SMTP",
    );
  });

  it("debe permitir crear múltiples notificaciones independientemente del email", async () => {
    const patient2 = await prisma.user.create({
      data: TestFactory.createPatient(),
    });
    const patient2Token = generateTestToken(patient2.id);

    const day1 = new Date();
    day1.setDate(day1.getDate() + 1);
    while (day1.getDay() === 0 || day1.getDay() === 6) {
      day1.setDate(day1.getDate() + 1);
    }
    day1.setHours(0, 0, 0, 0);

    const day2 = new Date(day1);
    day2.setDate(day2.getDate() + 1);
    while (day2.getDay() === 0 || day2.getDay() === 6) {
      day2.setDate(day2.getDate() + 1);
    }

    // Act: Crear dos citas
    const response1 = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        patientId,
        doctorProfileId,
        specialtyId,
        appointmentDate: day1.toISOString(),
        startTime: "10:00",
        endTime: "10:30",
      });

    const response2 = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${patient2Token}`)
      .send({
        patientId: patient2.id,
        doctorProfileId,
        specialtyId,
        appointmentDate: day2.toISOString(),
        startTime: "10:00",
        endTime: "10:30",
      });

    // Assert: Ambas citas se crean exitosamente
    expect(response1.status).toBe(201);
    expect(response2.status).toBe(201);

    // Verificar notificaciones en BD
    const notifications = await prisma.notification.findMany({
      where: {
        type: "APPOINTMENT_CONFIRMATION",
        userId: { in: [patientId, patient2.id] },
      },
    });

    expect(notifications.length).toBe(2);
    expect(EmailService.sendAppointmentConfirmation).not.toHaveBeenCalled();
  });

  it("debe crear notificación usando el servicio directamente", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }

    const appointmentData = {
      appointmentDate: tomorrow.toISOString().split("T")[0],
      startTime: "15:00",
      doctorName: "Dra. María González",
      specialty: "Medicina General",
    };

    // Act: Crear notificación directamente
    const notification =
      await NotificationService.createAppointmentConfirmation(
        patientId,
        appointmentData,
      );

    // Assert: La notificación se crea exitosamente
    expect(notification).toBeDefined();
    expect(notification.type).toBe("APPOINTMENT_CONFIRMATION");

    // En modo test, no se llama al servicio de email
    expect(EmailService.sendAppointmentConfirmation).not.toHaveBeenCalled();

    // Verificar que la notificación está en BD
    const savedNotification = await prisma.notification.findUnique({
      where: { id: notification.id },
    });
    expect(savedNotification).not.toBeNull();

    console.log(
      "📋 Justificación: Se priorizan notificaciones en BD para validar flujo de negocio",
    );
    console.log(
      "🔮 Futuro: Integración con SMTP se implementará en avances posteriores",
    );
  });

  it("debe mantener consistencia de datos con múltiples citas", async () => {
    // Crear citas en diferentes días para evitar conflictos
    const appointments: any[] = [];

    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 1);

    for (let i = 0; i < 3; i++) {
      // Buscar el siguiente día laborable
      while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const appointmentDate = new Date(currentDate);
      appointmentDate.setHours(0, 0, 0, 0);

      appointments.push({
        patientId,
        doctorProfileId,
        specialtyId,
        appointmentDate: appointmentDate.toISOString(),
        startTime: "10:00",
        endTime: "10:30",
      });

      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(
      `📅 Creando citas para las fechas: ${appointments.map((a) => a.appointmentDate).join(", ")}`,
    );

    // Intentar crear 3 citas en días diferentes
    const promises = appointments.map((appointment) =>
      request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send(appointment),
    );

    const responses = await Promise.allSettled(promises);

    // Contar cuántas tuvieron éxito
    const successfulResponses = responses.filter(
      (r) => r.status === "fulfilled" && (r.value as any).status === 201,
    );

    // Log para debugging
    const failedResponses = responses.filter(
      (r) => r.status === "fulfilled" && (r.value as any).status !== 201,
    );

    if (failedResponses.length > 0) {
      console.log(
        `❌ ${failedResponses.length} citas fallaron:`,
        failedResponses.map((r) => (r as any).value?.body),
      );
    }

    console.log(`✓ ${successfulResponses.length}/3 citas creadas en modo test`);

    // Todas deberían funcionar en modo test
    expect(successfulResponses.length).toBe(3);
    expect(responses.length).toBe(3);

    // Verificar notificaciones
    const notifications = await prisma.notification.findMany({
      where: {
        userId: patientId,
        type: "APPOINTMENT_CONFIRMATION",
      },
    });

    expect(notifications.length).toBe(3);
  });
});
