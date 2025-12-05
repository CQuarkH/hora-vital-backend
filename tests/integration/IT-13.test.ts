import request from "supertest";
import {
  getPrismaClient,
  cleanDatabase,
  TestFactory,
  generateTestToken,
} from "../test-helpers";
import { PrismaClient } from "@prisma/client";

// Mock email service
jest.mock("../../src/services/emailService", () => ({
  sendAppointmentConfirmation: jest.fn().mockResolvedValue(undefined),
  sendAppointmentCancellation: jest.fn().mockResolvedValue(undefined),
  __esModule: true,
}));

/**
 * IT-13: Editar Cita Médica (CU-06)
 *
 * Integración: API ↔ Servicio de Citas ↔ Base de Datos
 *
 * Objetivo: Verificar que las citas médicas pueden ser actualizadas/reprogramadas
 * correctamente, incluyendo validaciones de disponibilidad y autorización.
 */
describe("IT-13: Editar Cita Médica", () => {
  let prisma: PrismaClient;
  let app: any;
  let patientId: string;
  let patientToken: string;
  let patient2Id: string;
  let patient2Token: string;
  let doctorProfileId: string;
  let specialtyId: string;
  let appointmentId: string;

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
    jest.clearAllMocks();

    // Create specialty
    const specialty = await prisma.specialty.create({
      data: TestFactory.createSpecialty(),
    });
    specialtyId = specialty.id;

    // Create patients
    const patient = await prisma.user.create({
      data: TestFactory.createPatient(),
    });
    patientId = patient.id;
    patientToken = generateTestToken(patientId);

    const patient2 = await prisma.user.create({
      data: TestFactory.createPatient(),
    });
    patient2Id = patient2.id;
    patient2Token = generateTestToken(patient2Id);

    // Create doctor and profile
    const doctor = await prisma.user.create({
      data: TestFactory.createDoctor(),
    });

    const doctorProfile = await prisma.doctorProfile.create({
      data: TestFactory.createDoctorProfile(doctor.id, specialtyId),
    });
    doctorProfileId = doctorProfile.id;

    // Create schedules (Monday to Friday, 9-17)
    const daysOfWeek = [1, 2, 3, 4, 5];
    for (const day of daysOfWeek) {
      await prisma.schedule.create({
        data: TestFactory.createSchedule(doctorProfileId, { dayOfWeek: day }),
      });
    }

    // Create an appointment for testing
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // Next week
    futureDate.setHours(0, 0, 0, 0);

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorProfileId,
        specialtyId,
        appointmentDate: futureDate,
        startTime: "10:00",
        endTime: "10:30",
        status: "SCHEDULED",
        notes: "Original appointment",
      },
    });
    appointmentId = appointment.id;
  });

  it("should successfully update appointment notes (happy path)", async () => {
    const response = await request(app)
      .put(`/api/appointments/${appointmentId}`)
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        notes: "Updated notes - patient needs special assistance",
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Cita actualizada exitosamente");
    expect(response.body.appointment.notes).toBe(
      "Updated notes - patient needs special assistance"
    );

    // Verify in database
    const updatedAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    expect(updatedAppointment?.notes).toBe(
      "Updated notes - patient needs special assistance"
    );

    // Verify notification was created
    const notifications = await prisma.notification.findMany({
      where: { userId: patientId, type: "APPOINTMENT_UPDATE" },
    });
    expect(notifications.length).toBe(1);
  });

  it("should prevent rescheduling to conflicting time slot", async () => {
    // Create another appointment at 14:00
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    futureDate.setHours(0, 0, 0, 0);

    await prisma.appointment.create({
      data: {
        patientId: patient2Id,
        doctorProfileId,
        specialtyId,
        appointmentDate: futureDate,
        startTime: "14:00",
        endTime: "14:30",
        status: "SCHEDULED",
      },
    });

    // Try to reschedule our appointment to the same time
    const response = await request(app)
      .put(`/api/appointments/${appointmentId}`)
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        startTime: "14:00",
      });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("El horario ya está reservado");

    // Verify appointment was NOT updated
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    expect(appointment?.startTime).toBe("10:00");
  });

  it("should prevent unauthorized users from updating appointment", async () => {
    const response = await request(app)
      .put(`/api/appointments/${appointmentId}`)
      .set("Authorization", `Bearer ${patient2Token}`) // Different patient
      .send({
        notes: "Trying to update someone else's appointment",
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(
      "No tienes permisos para editar esta cita"
    );

    // Verify appointment was NOT updated
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    expect(appointment?.notes).toBe("Original appointment");
  });
});
