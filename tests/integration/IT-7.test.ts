// tests/integration/IT-7.test.ts
import request from "supertest";
import { getPrismaClient, generateTestToken } from "../test-helpers";
import { PrismaClient } from "@prisma/client";

// Función auxiliar
const getTestDoctorIdAndToken = async (prisma: PrismaClient) => {
  const specialty = await prisma.specialty.upsert({
    where: { name: "Cardiología Test" },
    update: {},
    create: { name: "Cardiología Test" },
  });

  const user = await prisma.user.upsert({
    where: { email: "doctor-it7-admin@test.com" },
    update: {},
    create: {
      email: "doctor-it7-admin@test.com",
      password: "hash-password-test", // si necesitas hash real, hazlo antes o crea vía service
      firstName: "Dr.",
      lastName: "Admin",
      rut: "1-9",
      // phone, role, isActive: puedes dejar defaults o añadir explícitamente
      role: "ADMIN" as any,
    },
  });

  const doctor = await prisma.doctorProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      specialtyId: specialty.id,
      licenseNumber: "TEST-12345",
    },
  });

  const token = generateTestToken(user.id);
  return {
    doctorId: doctor.id,
    doctorUserId: user.id,
    token: `Bearer ${token}`,
  };
};

/**
 * IT-7: Gestionar Agenda (Flujo Feliz)
 */
describe("IT-7 – Gestionar Agenda (Flujo Feliz)", () => {
  let prisma: PrismaClient;
  let app: any;
  let doctorId: string;
  let tokenAdmin: string;

  // 1. Datos de Entrada (Payload)
  const recurringSchedulePayload = {
    doctorProfileId: "", // Se llenará en beforeAll
    dayOfWeek: 6, // 6 = Sábado
    startTime: "09:00",
    endTime: "10:00",
    slotDuration: 30,
  };

  beforeAll(async () => {
    prisma = getPrismaClient();
    const appModule = await import("../../src/app");
    app = appModule.default || (appModule as any).app;

    const data = await getTestDoctorIdAndToken(prisma);
    doctorId = data.doctorId;
    tokenAdmin = data.token;

    // 2. Configuración: Asignar y limpiar horarios existentes para el día de la prueba
    recurringSchedulePayload.doctorProfileId = doctorId;

    await prisma.schedule.deleteMany({
      where: {
        doctorProfileId: doctorId,
        dayOfWeek: recurringSchedulePayload.dayOfWeek,
      },
    });
  });

  afterAll(async () => {
    // limpiar datos creados (opcional)
    await prisma.schedule.deleteMany({
      where: {
        doctorProfileId: doctorId,
        dayOfWeek: recurringSchedulePayload.dayOfWeek,
      },
    });
    // si quieres borrar usuario/doctor/specialty, añadir aquí
    await prisma.$disconnect();
  });

  it("debería guardar bloques horarios y verificar la persistencia en BD", async () => {
    // 3. Acción: Ejecutar el endpoint para crear el horario
    await request(app)
      .post("/api/admin/schedules")
      .set("Authorization", tokenAdmin)
      .send(recurringSchedulePayload)
      // 4. Resultado Esperado (API): Status Creado (201)
      .expect(201);

    // 5. Verificación Persistencia: Buscar el horario creado en la BD
    const blocksInDb = await prisma.schedule.findMany({
      where: {
        doctorProfileId: doctorId,
        dayOfWeek: recurringSchedulePayload.dayOfWeek,
        startTime: recurringSchedulePayload.startTime, // Buscar por HH:mm
      },
    });

    // 6. Resultado Esperado (BD): Se debe haber creado exactamente 1 bloque
    expect(blocksInDb).toHaveLength(1);
    expect(blocksInDb[0].endTime).toEqual(recurringSchedulePayload.endTime);
  });
});
