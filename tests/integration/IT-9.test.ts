// tests/integration/IT-9.test.ts
/**
 * IT-9: Gestión de Perfiles y Autenticación
 *
 * Suite de pruebas de integración que valida:
 * - Gestión de usuarios por administrador (crear/listar)
 * - Autenticación y autorización basada en roles
 * - Gestión de perfiles de usuario (obtener/actualizar)
 * - Acceso a citas por administrador
 * - Gestión de horarios por administrador
 * - Integridad referencial de base de datos
 */

import request from "supertest";
import {
  getPrismaClient,
  cleanDatabase,
  TestFactory,
  generateTestToken,
  userFactoryToPrismaData,
} from "../test-helpers";
import { PrismaClient, Role } from "@prisma/client";
import app from "../../src/app";

// Mock del módulo emailService (si usas jest en tu entorno)
jest.mock("../../src/services/emailService", () => ({
  sendConfirmationEmail: jest.fn().mockResolvedValue(true),
}));

/**
 * Helper: devuelve un nombre concatenado desde firstName/lastName o fallback
 */
function normalizeNameFromResponse(respBody: any) {
  if (!respBody) return "";
  if (respBody.name) return respBody.name;
  const fn = respBody.firstName ?? respBody.first_name ?? "";
  const ln = respBody.lastName ?? respBody.last_name ?? "";
  return `${fn} ${ln}`.trim();
}

describe("IT-9: Gestión de Perfiles y Autenticación", () => {
  let prisma: PrismaClient;
  let adminToken: string;
  let patientToken: string;
  let adminUserId: string;
  let patientUserId: string;

  beforeAll(async () => {
    prisma = getPrismaClient();
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Crear usuario admin para tests -- usamos mapper para no enviar `name` a Prisma
    const adminFactory = TestFactory.createPatient({
      name: "Admin User",
      email: "admin@test.com",
      phone: "+56900000000",
      rut: "11111111-1",
      role: "ADMIN",
    });
    const adminUser = await prisma.user.create({
      data: userFactoryToPrismaData(adminFactory),
    });
    adminUserId = adminUser.id;
    adminToken = `Bearer ${generateTestToken(adminUser.id)}`;

    // Crear usuario paciente para tests
    const patientFactory = TestFactory.createPatient({
      name: "Test Patient",
      email: "patient@test.com",
      phone: "+56900000001",
      rut: "22222222-2",
      role: "PATIENT",
    });
    const patientUser = await prisma.user.create({
      data: userFactoryToPrismaData(patientFactory),
    });
    patientUserId = patientUser.id;
    patientToken = `Bearer ${generateTestToken(patientUser.id)}`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Gestión de Usuarios por Admin", () => {
    it("debe permitir al admin crear un nuevo doctor", async () => {
      // Crear especialidad (mapper no necesario aquí)
      const specialty = await prisma.specialty.create({
        data: TestFactory.createSpecialty({
          name: "Traumatología",
          description: "Especialidad en lesiones y huesos",
        }),
      });

      // Llamada al endpoint de creación (tu API puede aceptar `name` o `firstName/lastName`).
      const response = await request(app)
        .post("/api/admin/users")
        .set("Authorization", adminToken)
        .send({
          // Para la API normalmente enviarías firstName/lastName; si tu API acepta 'name', ok.
          firstName: "Carlos",
          lastName: "Mendoza",
          email: "carlos.mendoza@hospital.com",
          phone: "+56987654321",
          rut: "12345678-9",
          role: "DOCTOR",
          password: "Password123!",
          specialtyId: specialty.id, // si tu endpoint requiere asociar especialidad
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");

      // Normalizar nombre desde la respuesta (soporta name o firstName/lastName)
      const returnedName = normalizeNameFromResponse(response.body);
      expect(returnedName).toBe("Carlos Mendoza");
      expect(response.body.role).toBe("DOCTOR");

      // Verificar persistencia en BD (aquí comprobamos firstName/lastName)
      const savedUser = await prisma.user.findUnique({
        where: { id: response.body.id },
      });

      expect(savedUser).toBeTruthy();
      const savedFullName =
        `${savedUser!.firstName} ${savedUser!.lastName}`.trim();
      expect(savedFullName).toBe("Carlos Mendoza");
      expect(savedUser!.role).toBe("DOCTOR");
    });

    it("debe listar todos los usuarios para admin", async () => {
      // Crear algunos usuarios adicionales usando mapper para Prisma
      const docFactory = TestFactory.createDoctor({
        name: "Dra. Ana García",
        email: "ana.garcia@hospital.com",
        role: "DOCTOR",
      });
      await prisma.user.create({ data: userFactoryToPrismaData(docFactory) });

      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", adminToken);

      expect(response.status).toBe(200);
      expect(response.body.users).toBeInstanceOf(Array);
      // admin + patient + doctor (al menos 3)
      expect(response.body.users.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Autenticación y Autorización", () => {
    it("debe rechazar acceso sin token de autenticación", async () => {
      const response = await request(app).get("/api/users/profile").send();

      expect(response.status).toBe(401);
      expect(response.body.message || "").toMatch(/autorizad/i);
    });

    it("debe rechazar acceso con token inválido", async () => {
      const response = await request(app)
        .get("/api/users/profile")
        .set("Authorization", "Bearer invalid-token")
        .send();

      expect(response.status).toBe(401);
    });

    it("debe rechazar acceso con rol insuficiente", async () => {
      // Paciente intenta acceder a endpoint de admin
      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", patientToken)
        .send();

      expect(response.status).toBe(403);
      expect(response.body.message || "").toMatch(/insuficientes|rol/i);
    });

    it("debe permitir acceso con rol correcto", async () => {
      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", adminToken)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.users).toBeInstanceOf(Array);
    });
  });

  describe("Gestión de Perfil de Usuario", () => {
    it("debe obtener perfil del usuario autenticado", async () => {
      const response = await request(app)
        .get("/api/users/profile")
        .set("Authorization", patientToken);

      expect(response.status).toBe(200);
      // La API puede devolver name o firstName/lastName; comprobamos ambas opciones
      const returnedName = normalizeNameFromResponse(response.body);
      expect(returnedName).toBe("Test Patient");
      expect(response.body.email).toBe("patient@test.com");
      expect(response.body.role).toBe("PATIENT");
    });

    it("debe actualizar perfil del usuario autenticado", async () => {
      const response = await request(app)
        .put("/api/users/profile")
        .set("Authorization", patientToken)
        .send({
          // enviar firstName/lastName para ajustarse al modelo
          firstName: "Test",
          lastName: "Patient Updated",
          phone: "+56987654321",
        });

      expect(response.status).toBe(200);

      const returnedName = normalizeNameFromResponse(response.body);
      expect(returnedName).toBe("Test Patient Updated");
      expect(response.body.phone).toBe("+56987654321");

      // Verificar persistencia en BD
      const updatedUser = await prisma.user.findUnique({
        where: { id: patientUserId },
      });

      expect(updatedUser).toBeTruthy();
      const savedName =
        `${updatedUser!.firstName} ${updatedUser!.lastName}`.trim();
      expect(savedName).toBe("Test Patient Updated");
      expect(updatedUser!.phone).toBe("+56987654321");
    });
  });

  describe("Gestión de Citas por Admin", () => {
    it("debe permitir al admin ver todas las citas", async () => {
      // Crear datos necesarios para una cita
      const specialty = await prisma.specialty.create({
        data: TestFactory.createSpecialty(),
      });

      const docFactory = TestFactory.createDoctor();
      const doctor = await prisma.user.create({
        data: userFactoryToPrismaData(docFactory),
      });

      const doctorProfile = await prisma.doctorProfile.create({
        data: TestFactory.createDoctorProfile(doctor.id, specialty.id),
      });

      // Crear una cita usando factory (ya devuelve appointment shape correcto)
      await prisma.appointment.create({
        data: TestFactory.createAppointment(
          patientUserId,
          doctorProfile.id,
          specialty.id
        ),
      });

      const response = await request(app)
        .get("/api/admin/appointments")
        .set("Authorization", adminToken);

      expect(response.status).toBe(200);
      expect(response.body.appointments).toBeInstanceOf(Array);
      expect(response.body.appointments.length).toBeGreaterThan(0);
    });

    it("debe rechazar acceso a citas a usuario no autorizado", async () => {
      const response = await request(app)
        .get("/api/admin/appointments")
        .set("Authorization", patientToken);

      expect(response.status).toBe(403);
    });
  });

  describe("Gestión de Horarios por Admin", () => {
    it("debe permitir al admin crear horarios para doctores", async () => {
      // Crear especialidad y doctor
      const specialty = await prisma.specialty.create({
        data: TestFactory.createSpecialty(),
      });

      const docFactory = TestFactory.createDoctor();
      const doctor = await prisma.user.create({
        data: userFactoryToPrismaData(docFactory),
      });

      const doctorProfile = await prisma.doctorProfile.create({
        data: TestFactory.createDoctorProfile(doctor.id, specialty.id),
      });

      const response = await request(app)
        .post("/api/admin/schedules")
        .set("Authorization", adminToken)
        .send({
          doctorProfileId: doctorProfile.id,
          dayOfWeek: 1, // Lunes
          startTime: "09:00",
          endTime: "17:00",
          slotDuration: 30,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.dayOfWeek).toBe(1);
      expect(response.body.startTime).toBe("09:00");

      // Verificar persistencia
      const savedSchedule = await prisma.schedule.findUnique({
        where: { id: response.body.id },
      });

      expect(savedSchedule).toBeTruthy();
      expect(savedSchedule!.doctorProfileId).toBe(doctorProfile.id);
    });
  });

  describe("Validaciones de Integridad", () => {
    it("debe mantener integridad referencial con CASCADE delete", async () => {
      const specialty = await prisma.specialty.create({
        data: TestFactory.createSpecialty({
          name: "Pediatría",
          description: "Especialidad en niños",
        }),
      });

      const docFactory = TestFactory.createDoctor({
        name: "Dr. Pedro Ramírez",
        email: "pedro.ramirez@hospital.com",
        role: "DOCTOR",
      });
      const doctorUser = await prisma.user.create({
        data: userFactoryToPrismaData(docFactory),
      });

      // Crear perfil de doctor
      const doctorProfile = await prisma.doctorProfile.create({
        data: TestFactory.createDoctorProfile(doctorUser.id, specialty.id, {
          licenseNumber: "PED-11111",
        }),
      });

      // Eliminar el usuario (debe eliminar el perfil también por CASCADE)
      await prisma.user.delete({ where: { id: doctorUser.id } });

      // Verificar que el perfil también fue eliminado
      const existingProfile = await prisma.doctorProfile.findUnique({
        where: { id: doctorProfile.id },
      });

      expect(existingProfile).toBeNull();
    });
  });
});
