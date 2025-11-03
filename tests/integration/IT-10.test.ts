/**
 * IT-10: Validación de Datos y Casos Edge
 *
 * Suite de pruebas de integración que valida:
 * - Validaciones de entrada en formularios
 * - Casos límite y condiciones de borde
 * - Manejo de errores y datos inválidos
 * - Validaciones de formato y restricciones
 * - Comportamiento con datos duplicados
 * - Validaciones de integridad de datos
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

describe("IT-10: Validación de Datos y Casos Edge", () => {
  let prisma: PrismaClient;
  let adminToken: string;
  let patientToken: string;
  let patientUserId: string;
  let doctorUserId: string;
  let specialtyId: string;
  let doctorProfileId: string;

  beforeAll(async () => {
    prisma = getPrismaClient();
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Crear especialidad
    const specialty = await prisma.specialty.create({
      data: TestFactory.createSpecialty({
        name: "Cardiología",
        description: "Especialidad del corazón",
      }),
    });
    specialtyId = specialty.id;

    // Crear usuario admin
    const adminUser = await prisma.user.create({
      data: TestFactory.createPatient({
        firstName: "Admin",
        lastName: "User",
        email: "admin@test.com",
        phone: "+56900000000",
        rut: "11111111-1",
        role: "ADMIN",
        password: "Password123!",
      }),
    });
    adminToken = `Bearer ${generateTestToken(adminUser.id)}`;

    // Crear usuario paciente
    const patientUser = await prisma.user.create({
      data: TestFactory.createPatient({
        firstName: "Test",
        lastName: "Patient",
        email: "patient@test.com",
        phone: "+56900000001",
        rut: "22222222-2",
        role: "PATIENT",
        password: "Password123!",
      }),
    });
    patientUserId = patientUser.id;
    patientToken = `Bearer ${generateTestToken(patientUser.id)}`;

    // Crear usuario doctor
    const doctorUser = await prisma.user.create({
      data: TestFactory.createDoctor({
        firstName: "Dr.",
        lastName: "Test Doctor",
        email: "doctor@test.com",
        phone: "+56900000002",
        rut: "33333333-3",
        role: "DOCTOR",
        password: "Password123!",
      }),
    });
    doctorUserId = doctorUser.id;

    // Crear perfil de doctor
    const doctorProfile = await prisma.doctorProfile.create({
      data: TestFactory.createDoctorProfile(doctorUser.id, specialty.id),
    });
    doctorProfileId = doctorProfile.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Validaciones de Autenticación", () => {
    it("debe rechazar registro con email inválido", async () => {
      const response = await request(app).post("/api/auth/register").send({
        firstName: "Test",
        lastName: "User",
        email: "email-invalido",
        password: "Password123!",
        rut: "55555555-1", // ✅ Agregado rut
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Validation error");
    });

    it("debe rechazar registro con contraseña débil", async () => {
      const response = await request(app).post("/api/auth/register").send({
        firstName: "Test",
        lastName: "User",
        email: "test@test.com",
        password: "123",
        rut: "55555555-2", // ✅ Agregado rut
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Validation error");
    });

    it("debe rechazar registro con email duplicado", async () => {
      // Primer registro exitoso
      await request(app)
        .post("/api/auth/register")
        .send({
          firstName: "First",
          lastName: "User",
          email: "duplicate@test.com",
          password: "Password123!",
          rut: "55555555-3",
        })
        .expect(201);

      // Segundo registro con el mismo email (RUT diferente)
      const response = await request(app).post("/api/auth/register").send({
        firstName: "Second",
        lastName: "User",
        email: "duplicate@test.com",
        password: "Password123!",
        rut: "55555555-4",
      });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain("registrado");
    });

    it("debe rechazar login con credenciales vacías", async () => {
      const response = await request(app).post("/api/auth/login").send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Validation error");
    });
  });

  describe("Validaciones de Citas", () => {
    it("debe rechazar cita con fecha en el pasado", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", patientToken)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: pastDate.toISOString().split("T")[0],
          startTime: "10:00",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Validation error");
    });

    it("debe rechazar cita con formato de hora inválido", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", patientToken)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: futureDate.toISOString().split("T")[0],
          startTime: "25:99",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Validation error");
    });
  });

  describe("Validaciones de Perfil de Usuario", () => {
    it("debe rechazar actualización con email ya existente", async () => {
      await prisma.user.create({
        data: TestFactory.createPatient({
          firstName: "Other",
          lastName: "User",
          email: "other@test.com",
          phone: "+56900000003",
          rut: "44444444-4",
          role: "PATIENT",
          password: "Password123!",
        }),
      });

      const response = await request(app)
        .put("/api/users/profile")
        .set("Authorization", patientToken)
        .send({
          email: "other@test.com",
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain("registrado");
    });
  });

  describe("Validaciones de Administración", () => {
    it("debe rechazar creación de usuario con datos inválidos", async () => {
      const response = await request(app)
        .post("/api/admin/users")
        .set("Authorization", adminToken)
        .send({
          firstName: "",
          lastName: "",
          email: "invalid-email",
          phone: "+56987654321",
          rut: "55555555-5",
          role: "PATIENT",
          password: "weak",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Validation error");
    });
  });

  describe("Casos Edge de Integridad de Datos", () => {
    it("debe rechazar acceso a recurso inexistente", async () => {
      const response = await request(app)
        .get("/api/appointments/00000000-0000-0000-0000-000000000000")
        .set("Authorization", patientToken);

      expect(response.status).toBe(404);
    });

    it("debe manejar correctamente requests con payloads grandes", async () => {
      const largeString = "a".repeat(1000);

      const response = await request(app)
        .put("/api/users/profile")
        .set("Authorization", patientToken)
        .send({
          firstName: largeString,
        });

      expect([200, 400, 413]).toContain(response.status);
    });

    it("debe rechazar operaciones concurrentes que causen conflictos", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const appointmentData = {
        doctorProfileId,
        specialtyId,
        appointmentDate: futureDate.toISOString().split("T")[0],
        startTime: "10:00",
      };

      const promises = [
        request(app)
          .post("/api/appointments")
          .set("Authorization", patientToken)
          .send(appointmentData),
        request(app)
          .post("/api/appointments")
          .set("Authorization", patientToken)
          .send(appointmentData),
      ];

      const responses = await Promise.all(promises);
      const successCount = responses.filter((r) => r.status === 201).length;
      expect(successCount).toBeLessThanOrEqual(1);
    });
  });

  describe("Validaciones de Límites y Restricciones", () => {
    it("debe respetar límites de disponibilidad de citas", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const appointmentPromises: any[] = [];
      for (let i = 0; i < 5; i++) {
        appointmentPromises.push(
          request(app)
            .post("/api/appointments")
            .set("Authorization", patientToken)
            .send({
              doctorProfileId,
              specialtyId,
              appointmentDate: futureDate.toISOString().split("T")[0],
              startTime: `${9 + i}:00`,
            })
        );
      }

      const responses = await Promise.all(appointmentPromises);
      const successfulAppointments = responses.filter((r) => r.status === 201);
      expect(successfulAppointments.length).toBeLessThan(5);
    });

    it("debe validar horarios de trabajo del doctor", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", patientToken)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: futureDate.toISOString().split("T")[0],
          startTime: "03:00",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("horario");
    });
  });
});
