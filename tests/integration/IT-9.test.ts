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
 *
 * Total de pruebas: 12 tests
 * Estado: ✅ Todas las pruebas pasando
 */

import request from "supertest";
import {
  getPrismaClient,
  cleanDatabase,
  TestFactory,
  generateTestToken,
} from "../test-helpers";
import { PrismaClient } from "@prisma/client";
import app from "../../src/app";

// Mock del módulo emailService
jest.mock("../../src/services/emailService", () => ({
  sendConfirmationEmail: jest.fn().mockResolvedValue(true),
}));

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

    // Crear usuario admin para tests
    const adminUser = await prisma.user.create({
      data: TestFactory.createPatient({
        name: "Admin User",
        email: "admin@test.com",
        phone: "+56900000000",
        rut: "11111111-1",
        role: "ADMIN",
      }),
    });
    adminUserId = adminUser.id;
    adminToken = `Bearer ${generateTestToken(adminUser.id)}`;

    // Crear usuario paciente para tests
    const patientUser = await prisma.user.create({
      data: TestFactory.createPatient({
        name: "Test Patient",
        email: "patient@test.com",
        phone: "+56900000001",
        rut: "22222222-2",
        role: "PATIENT",
      }),
    });
    patientUserId = patientUser.id;
    patientToken = `Bearer ${generateTestToken(patientUser.id)}`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Gestión de Usuarios por Admin", () => {
    it("debe permitir al admin crear un nuevo doctor", async () => {
      // Crear especialidad
      const specialty = await prisma.specialty.create({
        data: TestFactory.createSpecialty({
          name: "Traumatología",
          description: "Especialidad en lesiones y huesos",
        }),
      });

      // Crear usuario doctor
      const response = await request(app)
        .post("/api/admin/users")
        .set("Authorization", adminToken)
        .send({
          name: "Dr. Carlos Mendoza",
          email: "carlos.mendoza@hospital.com",
          phone: "+56987654321",
          rut: "12345678-9",
          role: "DOCTOR",
          password: "Password123!",
        });

      if (response.status !== 201) {
        console.log("Create user response:", response.body);
      }

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toBe("Dr. Carlos Mendoza");
      expect(response.body.role).toBe("DOCTOR");

      // Verificar persistencia en BD
      const savedUser = await prisma.user.findUnique({
        where: { id: response.body.id },
      });

      expect(savedUser).toBeTruthy();
      expect(savedUser!.name).toBe("Dr. Carlos Mendoza");
      expect(savedUser!.role).toBe("DOCTOR");
    });

    it("debe listar todos los usuarios para admin", async () => {
      // Crear algunos usuarios adicionales
      await prisma.user.create({
        data: TestFactory.createDoctor({
          name: "Dra. Ana García",
          email: "ana.garcia@hospital.com",
          role: "DOCTOR",
        }),
      });

      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", adminToken);

      expect(response.status).toBe(200);
      expect(response.body.users).toBeInstanceOf(Array);
      expect(response.body.users.length).toBeGreaterThan(2); // admin + patient + doctor
    });
  });

  describe("Autenticación y Autorización", () => {
    it("debe rechazar acceso sin token de autenticación", async () => {
      const response = await request(app).get("/api/users/profile").send();

      expect(response.status).toBe(401);
      expect(response.body.message).toContain("autorizado");
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
      expect(response.body.message).toContain("insuficientes");
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
      expect(response.body.name).toBe("Test Patient");
      expect(response.body.email).toBe("patient@test.com");
      expect(response.body.role).toBe("PATIENT");
    });

    it("debe actualizar perfil del usuario autenticado", async () => {
      const response = await request(app)
        .put("/api/users/profile")
        .set("Authorization", patientToken)
        .send({
          name: "Test Patient Updated",
          phone: "+56987654321",
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Test Patient Updated");
      expect(response.body.phone).toBe("+56987654321");

      // Verificar persistencia
      const updatedUser = await prisma.user.findUnique({
        where: { id: patientUserId },
      });

      expect(updatedUser!.name).toBe("Test Patient Updated");
      expect(updatedUser!.phone).toBe("+56987654321");
    });
  });

  describe("Gestión de Citas por Admin", () => {
    it("debe permitir al admin ver todas las citas", async () => {
      // Crear datos necesarios para una cita
      const specialty = await prisma.specialty.create({
        data: TestFactory.createSpecialty(),
      });

      const doctor = await prisma.user.create({
        data: TestFactory.createDoctor(),
      });

      const doctorProfile = await prisma.doctorProfile.create({
        data: TestFactory.createDoctorProfile(doctor.id, specialty.id),
      });

      // Crear una cita
      await prisma.appointment.create({
        data: TestFactory.createAppointment(
          patientUserId,
          doctorProfile.id,
          specialty.id,
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

      const doctor = await prisma.user.create({
        data: TestFactory.createDoctor(),
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

      const doctorUser = await prisma.user.create({
        data: TestFactory.createDoctor({
          name: "Dr. Pedro Ramírez",
          email: "pedro.ramirez@hospital.com",
          role: "DOCTOR",
        }),
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
