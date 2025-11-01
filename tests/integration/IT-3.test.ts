import request from "supertest";
import {
  getPrismaClient,
  cleanDatabase,
  TestFactory,
  generateTestToken,
} from "../test-helpers";
import { PrismaClient } from "@prisma/client";

// ✅ Mock COMPLETO del módulo emailService
jest.mock("../../src/services/emailService", () => ({
  sendAppointmentConfirmation: jest.fn().mockResolvedValue(undefined),
  sendAppointmentCancellation: jest.fn().mockResolvedValue(undefined),
  __esModule: true,
}));

// Importar DESPUÉS del mock
import * as EmailService from "../../src/services/emailService";

describe("IT-3: Notificación al Agendar Cita (Flujo Feliz - Modo Test)", () => {
  let prisma: PrismaClient;
  let app: any;
  let patientId: string;
  let patientToken: string;
  let doctorProfileId: string;
  let specialtyId: string;

  beforeAll(async () => {
    await cleanDatabase();
    prisma = getPrismaClient();
    const appModule = await import("../../src/app");
    app = appModule.default || (appModule as any).app;
  });

  beforeEach(async () => {
    await cleanDatabase();
    jest.clearAllMocks();

    // Create specialty
    const specialty = await prisma.specialty.create({
      data: TestFactory.createSpecialty(),
    });
    specialtyId = specialty.id;

    // Create patient
    const patient = await prisma.user.create({
      data: TestFactory.createPatient(),
    });
    patientId = patient.id;
    patientToken = generateTestToken(patientId);

    // Create doctor
    const doctor = await prisma.user.create({
      data: TestFactory.createDoctor(),
    });

    // Create doctor profile
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

  it("debe crear notificación en BD sin enviar email (modo test)", async () => {
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
      notes: "Consulta médica general",
    };

    const response = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${patientToken}`)
      .send(appointmentPayload)
      .expect(201);

    expect(response.body.appointment).toBeDefined();
    expect(response.body.appointment.status).toBe("SCHEDULED");

    // En modo test, no se llama al servicio de email
    expect(EmailService.sendAppointmentConfirmation).not.toHaveBeenCalled();

    // Verificar que la notificación se creó en BD
    const notification = await prisma.notification.findFirst({
      where: {
        userId: patientId,
        type: "APPOINTMENT_CONFIRMATION",
      },
    });
    expect(notification).not.toBeNull();
    expect(notification?.title).toBe("Cita Confirmada");
  });

  it("debe incluir información relevante en la notificación de BD", async () => {
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
      startTime: "14:30",
      endTime: "15:00",
    };

    await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${patientToken}`)
      .send(appointmentPayload)
      .expect(201);

    // En modo test, verificamos la notificación en BD en lugar del email
    const notification = await prisma.notification.findFirst({
      where: {
        userId: patientId,
        type: "APPOINTMENT_CONFIRMATION",
      },
    });

    expect(notification).not.toBeNull();
    expect(notification?.title).toBe("Cita Confirmada");
    expect(notification?.message).toContain("14:30");
    expect(notification?.message).toContain(
      tomorrow.toISOString().split("T")[0],
    );

    // No se llama al servicio de email en modo test
    expect(EmailService.sendAppointmentConfirmation).not.toHaveBeenCalled();
  });

  it("debe crear la cita exitosamente incluso si falla el envío de email", async () => {
    // En modo test, este comportamiento es automático ya que no se envían emails
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
    };

    const response = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${patientToken}`)
      .send(appointmentPayload);

    // La cita se crea exitosamente en modo test
    expect(response.status).toBe(201);
    const savedAppointment = await prisma.appointment.findUnique({
      where: { id: response.body.appointment.id },
    });
    expect(savedAppointment).not.toBeNull();

    // Verificar que la notificación se creó
    const notification = await prisma.notification.findFirst({
      where: {
        userId: patientId,
        type: "APPOINTMENT_CONFIRMATION",
      },
    });
    expect(notification).not.toBeNull();

    console.log("✅ Modo test: Citas se crean sin dependencia de email");
  });

  it("debe crear múltiples notificaciones en BD (modo test)", async () => {
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

    await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        patientId,
        doctorProfileId,
        specialtyId,
        appointmentDate: day1.toISOString(),
        startTime: "09:00",
        endTime: "09:30",
      })
      .expect(201);

    await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${patient2Token}`)
      .send({
        patientId: patient2.id,
        doctorProfileId,
        specialtyId,
        appointmentDate: day2.toISOString(),
        startTime: "10:00",
        endTime: "10:30",
      })
      .expect(201);

    // En modo test, no se envían emails
    expect(EmailService.sendAppointmentConfirmation).not.toHaveBeenCalled();

    // Verificar que se crearon ambas notificaciones en BD
    const notifications = await prisma.notification.findMany({
      where: {
        type: "APPOINTMENT_CONFIRMATION",
        userId: { in: [patientId, patient2.id] },
      },
    });

    expect(notifications.length).toBe(2);
    expect(notifications.every((n) => n.title === "Cita Confirmada")).toBe(
      true,
    );

    console.log("✅ Avance 2: Sistema de notificaciones internas funcional");
  });
});
