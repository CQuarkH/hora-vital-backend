import request from "supertest";
import {
  getPrismaClient,
  cleanDatabase,
  TestFactory,
  generateTestToken,
} from "../test-helpers";
import { PrismaClient } from "@prisma/client";

/**
 * IT-15: Desplegar Calendario (CU-09)
 *
 * Integración: API ↔ Servicio Admin ↔ Base de Datos
 *
 * Objetivo: Verificar que el personal administrativo puede visualizar
 * la disponibilidad del calendario con slots disponibles y reservados.
 */
describe("IT-15: Desplegar Calendario", () => {
  let prisma: PrismaClient;
  let app: any;
  let secretaryId: string;
  let secretaryToken: string;
  let patientId: string;
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
    jest.clearAllMocks();

    // Create secretary user
    const secretary = await prisma.user.create({
      data: {
        ...TestFactory.createPatient(),
        role: "SECRETARY",
        firstName: "Secretary",
        lastName: "Calendar",
        email: "secretary@test.com",
        rut: "11.111.111-1",
      },
    });
    secretaryId = secretary.id;
    secretaryToken = generateTestToken(secretaryId);

    // Create patient
    const patient = await prisma.user.create({
      data: TestFactory.createPatient(),
    });
    patientId = patient.id;

    // Create specialty
    const specialty = await prisma.specialty.create({
      data: TestFactory.createSpecialty(),
    });
    specialtyId = specialty.id;

    // Create doctor and profile
    const doctor = await prisma.user.create({
      data: TestFactory.createDoctor(),
    });

    const doctorProfile = await prisma.doctorProfile.create({
      data: TestFactory.createDoctorProfile(doctor.id, specialtyId),
    });
    doctorProfileId = doctorProfile.id;

    // Create schedules (Monday to Friday, 9-11 AM for testing)
    const daysOfWeek = [1, 2, 3, 4, 5];
    for (const day of daysOfWeek) {
      await prisma.schedule.create({
        data: {
          doctorProfileId,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "11:00",
          slotDuration: 30,
          isActive: true,
        },
      });
    }
  });

  it("should display calendar with available and reserved slots", async () => {
    // Get a future Monday
    const today = new Date();
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);

    const nextTuesday = new Date(nextMonday);
    nextTuesday.setDate(nextMonday.getDate() + 1);

    // Create an appointment for Monday at 09:00
    await prisma.appointment.create({
      data: {
        patientId,
        doctorProfileId,
        specialtyId,
        appointmentDate: nextMonday,
        startTime: "09:00",
        endTime: "09:30",
        status: "SCHEDULED",
        notes: "Reserved slot",
      },
    });

    const startDate = nextMonday.toISOString().split("T")[0];
    const endDate = nextMonday.toISOString().split("T")[0];

    const response = await request(app)
      .get("/api/calendar/availability")
      .set("Authorization", `Bearer ${secretaryToken}`)
      .query({
        startDate,
        endDate,
      });

    expect(response.status).toBe(200);
    expect(response.body.calendar).toBeDefined();
    expect(Array.isArray(response.body.calendar)).toBe(true);

    // Should have calendar data for Monday
    expect(response.body.calendar.length).toBeGreaterThan(0);

    const mondayData = response.body.calendar[0];
    expect(mondayData).toHaveProperty("date");
    expect(mondayData).toHaveProperty("doctor");
    expect(mondayData).toHaveProperty("slots");

    // Should have slots
    expect(Array.isArray(mondayData.slots)).toBe(true);
    expect(mondayData.slots.length).toBeGreaterThan(0);

    // Find the 09:00 slot (should be unavailable)
    const reservedSlot = mondayData.slots.find(
      (slot: any) => slot.startTime === "09:00"
    );
    expect(reservedSlot).toBeDefined();
    expect(reservedSlot.isAvailable).toBe(false);
    expect(reservedSlot.appointmentId).toBeDefined();

    // Find the 09:30 slot (should be available)
    const availableSlot = mondayData.slots.find(
      (slot: any) => slot.startTime === "09:30"
    );
    expect(availableSlot).toBeDefined();
    expect(availableSlot.isAvailable).toBe(true);
    expect(availableSlot.appointmentId).toBeNull();
  });

  it("should filter calendar by doctor and specialty", async () => {
    // Create another doctor with different specialty
    const specialty2 = await prisma.specialty.create({
      data: {
        ...TestFactory.createSpecialty(),
        name: "Dermatología",
      },
    });

    const doctor2 = await prisma.user.create({
      data: {
        ...TestFactory.createDoctor(),
        email: "doctor2@test.com",
        rut: "22.222.222-2",
      },
    });

    const doctorProfile2 = await prisma.doctorProfile.create({
      data: TestFactory.createDoctorProfile(doctor2.id, specialty2.id),
    });

    // Create schedule for doctor2
    await prisma.schedule.create({
      data: {
        doctorProfileId: doctorProfile2.id,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "11:00",
        slotDuration: 30,
        isActive: true,
      },
    });

    const today = new Date();
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);

    const startDate = nextMonday.toISOString().split("T")[0];
    const endDate = nextMonday.toISOString().split("T")[0];

    // Request calendar filtered by first specialty
    const response = await request(app)
      .get("/api/calendar/availability")
      .set("Authorization", `Bearer ${secretaryToken}`)
      .query({
        startDate,
        endDate,
        specialtyId,
      });

    expect(response.status).toBe(200);
    expect(response.body.calendar).toBeDefined();

    // Should only return data for doctors in the specified specialty
    const allMatchSpecialty = response.body.calendar.every(
      (entry: any) => entry.doctor.specialty !== "Dermatología"
    );
    expect(allMatchSpecialty).toBe(true);
  });
});
