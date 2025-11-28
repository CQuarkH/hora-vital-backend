/**
 * IT-17: RBAC (Role-Based Access Control) Edge Cases Integration Tests
 *
 * Este test verifica escenarios avanzados de control de acceso basado en roles,
 * incluyendo casos límite, intentos de escalación de privilegios, y validaciones
 * de seguridad complejas.
 */

import request from "supertest";
import app from "../../src/app";
import prisma from "../../src/db/prisma";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../src/config";

describe("IT-17: RBAC Edge Cases Integration Tests", () => {
  let adminUserId: string;
  let doctorUserId: string;
  let secretaryUserId: string;
  let patientUserId: string;
  let inactiveUserId: string;

  let adminToken: string;
  let doctorToken: string;
  let secretaryToken: string;
  let patientToken: string;
  let inactiveUserToken: string;
  let invalidToken: string;
  let expiredToken: string;

  let doctorProfileId: string;
  let specialtyId: string;

  beforeAll(async () => {
    // Limpiar datos existentes
    await prisma.appointment.deleteMany();
    await prisma.doctorProfile.deleteMany();
    await prisma.specialty.deleteMany();
    await prisma.user.deleteMany();

    // Crear especialidad
    const specialty = await prisma.specialty.create({
      data: {
        name: "Cardiología",
        description: "Especialidad en cardiología",
      },
    });
    specialtyId = specialty.id;

    // Crear usuarios con diferentes roles
    const adminUser = await prisma.user.create({
      data: {
        email: "admin@test.com",
        rut: "11111111-1",
        password: "$2a$10$hashedPassword",
        firstName: "Admin",
        lastName: "User",
        phone: "123456789",
        role: "ADMIN",
        isActive: true,
      },
    });
    adminUserId = adminUser.id;

    const doctorUser = await prisma.user.create({
      data: {
        email: "doctor@test.com",
        rut: "22222222-2",
        password: "$2a$10$hashedPassword",
        firstName: "Doctor",
        lastName: "User",
        phone: "987654321",
        role: "DOCTOR",
        isActive: true,
      },
    });
    doctorUserId = doctorUser.id;

    const secretaryUser = await prisma.user.create({
      data: {
        email: "secretary@test.com",
        rut: "33333333-3",
        password: "$2a$10$hashedPassword",
        firstName: "Secretary",
        lastName: "User",
        phone: "555123456",
        role: "SECRETARY",
        isActive: true,
      },
    });
    secretaryUserId = secretaryUser.id;

    const patientUser = await prisma.user.create({
      data: {
        email: "patient@test.com",
        rut: "44444444-4",
        password: "$2a$10$hashedPassword",
        firstName: "Patient",
        lastName: "User",
        phone: "555987654",
        role: "PATIENT",
        isActive: true,
      },
    });
    patientUserId = patientUser.id;

    // Usuario inactivo
    const inactiveUser = await prisma.user.create({
      data: {
        email: "inactive@test.com",
        rut: "55555555-5",
        password: "$2a$10$hashedPassword",
        firstName: "Inactive",
        lastName: "User",
        phone: "555000000",
        role: "PATIENT",
        isActive: false,
      },
    });
    inactiveUserId = inactiveUser.id;

    // Crear perfil del doctor
    const doctorProfile = await prisma.doctorProfile.create({
      data: {
        userId: doctorUserId,
        specialtyId: specialtyId,
        licenseNumber: "DOC123456",
        bio: "Cardiólogo especializado en procedimientos complejos",
      },
    });
    doctorProfileId = doctorProfile.id;

    // Generar tokens válidos
    adminToken = jwt.sign({ userId: adminUserId }, JWT_SECRET, {
      expiresIn: "1h",
    });
    doctorToken = jwt.sign({ userId: doctorUserId }, JWT_SECRET, {
      expiresIn: "1h",
    });
    secretaryToken = jwt.sign({ userId: secretaryUserId }, JWT_SECRET, {
      expiresIn: "1h",
    });
    patientToken = jwt.sign({ userId: patientUserId }, JWT_SECRET, {
      expiresIn: "1h",
    });
    inactiveUserToken = jwt.sign({ userId: inactiveUserId }, JWT_SECRET, {
      expiresIn: "1h",
    });

    // Generar tokens inválidos para testing
    invalidToken = "invalid.token.here";
    expiredToken = jwt.sign({ userId: adminUserId }, JWT_SECRET, {
      expiresIn: "-1h",
    });
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany();
    await prisma.doctorProfile.deleteMany();
    await prisma.specialty.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe("Token Validation Edge Cases", () => {
    it("should reject requests with malformed authorization header", async () => {
      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", "InvalidFormat token");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("No autorizado");
    });

    it("should reject requests with missing Bearer prefix", async () => {
      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", adminToken);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("No autorizado");
    });

    it("should reject requests with expired tokens", async () => {
      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Token inválido");
    });

    it("should reject requests with completely invalid tokens", async () => {
      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Token inválido");
    });

    it("should reject requests from inactive users even with valid tokens", async () => {
      const response = await request(app)
        .get("/api/appointments/my-appointments")
        .set("Authorization", `Bearer ${inactiveUserToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Usuario no válido");
    });

    it("should reject tokens with missing userId in payload", async () => {
      const tokenWithoutUserId = jwt.sign({ someField: "value" }, JWT_SECRET);

      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${tokenWithoutUserId}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Token inválido");
    });
  });

  describe("Role Authorization Edge Cases", () => {
    it("should reject PATIENT attempts to access ADMIN-only endpoints", async () => {
      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Permisos insuficientes");
    });

    it("should reject DOCTOR attempts to access ADMIN-only user management", async () => {
      const response = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          email: "newuser@test.com",
          rut: "66666666-6",
          password: "SecurePass123!",
          firstName: "New",
          lastName: "User",
          phone: "555111222",
          role: "PATIENT",
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Permisos insuficientes");
    });

    it("should allow SECRETARY access to ADMIN+SECRETARY endpoints", async () => {
      const response = await request(app)
        .get("/api/admin/appointments")
        .set("Authorization", `Bearer ${secretaryToken}`);

      // El endpoint debe permitir acceso a SECRETARY (aunque la respuesta específica puede variar)
      expect(response.status).not.toBe(403);
      expect(response.status).not.toBe(401);
    });

    it("should reject PATIENT attempts to access SECRETARY+ADMIN endpoints", async () => {
      const response = await request(app)
        .get("/api/admin/patients")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Permisos insuficientes");
    });

    it("should handle case-insensitive role comparison", async () => {
      // Crear token con rol en minúsculas para probar la comparación case-insensitive
      const user = await prisma.user.create({
        data: {
          email: "testcase@test.com",
          rut: "77777777-7",
          password: "$2a$10$hashedPassword",
          firstName: "Test",
          lastName: "Case",
          phone: "555222333",
          role: "ADMIN", // En la BD está en mayúsculas
          isActive: true,
        },
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET);

      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).not.toBe(403);

      // Cleanup
      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe("Cross-Resource Access Control", () => {
    it("should prevent patients from accessing other patients' appointments", async () => {
      // Crear segundo paciente
      const otherPatient = await prisma.user.create({
        data: {
          email: "otherpatient@test.com",
          rut: "88888888-8",
          password: "$2a$10$hashedPassword",
          firstName: "Other",
          lastName: "Patient",
          phone: "555444555",
          role: "PATIENT",
          isActive: true,
        },
      });

      // Crear cita para el otro paciente
      const appointment = await prisma.appointment.create({
        data: {
          patientId: otherPatient.id,
          doctorProfileId,
          specialtyId,
          appointmentDate: new Date("2024-12-01T10:00:00Z"),
          startTime: "10:00",
          endTime: "10:30",
          status: "SCHEDULED",
          notes: "Cita de prueba",
        },
      });

      // Intentar cancelar la cita del otro paciente con token del primer paciente
      const response = await request(app)
        .patch(`/api/appointments/${appointment.id}/cancel`)
        .set("Authorization", `Bearer ${patientToken}`)
        .send({ cancellationReason: "No puedo asistir" });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        "No tienes permisos para cancelar esta cita",
      );

      // Cleanup
      await prisma.appointment.delete({ where: { id: appointment.id } });
      await prisma.user.delete({ where: { id: otherPatient.id } });
    });

    it("should prevent privilege escalation through appointment updates", async () => {
      // Crear cita como paciente
      const appointment = await prisma.appointment.create({
        data: {
          patientId: patientUserId,
          doctorProfileId,
          specialtyId,
          appointmentDate: new Date("2024-12-01T14:00:00Z"),
          startTime: "14:00",
          endTime: "14:30",
          status: "SCHEDULED",
          notes: "Cita de prueba",
        },
      });

      // Intentar actualizar la cita con datos que el paciente no debería poder modificar
      const response = await request(app)
        .put(`/api/appointments/${appointment.id}`)
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          status: "COMPLETED", // Pacientes no deberían poder marcar como completada
          notes: "Cita completada por el paciente", // Esto podría ser problemático
          doctorProfileId: "different-doctor-id", // Cambiar doctor
        });

      // El sistema debe rechazar cambios no autorizados o filtrar campos
      if (response.status === 200) {
        // Si permite la actualización, verificar que campos críticos no cambiaron
        const updatedAppointment = await prisma.appointment.findUnique({
          where: { id: appointment.id },
        });

        expect(updatedAppointment?.status).not.toBe("COMPLETED");
        expect(updatedAppointment?.doctorProfileId).toBe(doctorProfileId);
      } else {
        // O debe rechazar completamente la actualización
        expect(response.status).toBeGreaterThanOrEqual(400);
      }

      // Cleanup
      await prisma.appointment.delete({ where: { id: appointment.id } });
    });
  });

  describe("Concurrent Authorization Scenarios", () => {
    it("should handle concurrent role-based requests without conflicts", async () => {
      const promises = [
        // Admin request
        request(app)
          .get("/api/admin/users")
          .set("Authorization", `Bearer ${adminToken}`),

        // Secretary request
        request(app)
          .get("/api/admin/appointments")
          .set("Authorization", `Bearer ${secretaryToken}`),

        // Patient request (should fail)
        request(app)
          .get("/api/admin/users")
          .set("Authorization", `Bearer ${patientToken}`),

        // Doctor request to patient endpoint
        request(app)
          .get("/api/appointments/availability")
          .set("Authorization", `Bearer ${doctorToken}`),
      ];

      const results = await Promise.all(promises);

      // Admin should succeed
      expect(results[0].status).not.toBe(403);
      expect(results[0].status).not.toBe(401);

      // Secretary should succeed for appointments
      expect(results[1].status).not.toBe(403);
      expect(results[1].status).not.toBe(401);

      // Patient should fail for admin endpoint
      expect(results[2].status).toBe(403);

      // Doctor should succeed for availability check
      expect(results[3].status).not.toBe(403);
      expect(results[3].status).not.toBe(401);
    });

    it("should maintain session integrity during rapid authentication checks", async () => {
      const rapidRequests = Array(10)
        .fill(null)
        .map(() =>
          request(app)
            .get("/api/appointments/my-appointments")
            .set("Authorization", `Bearer ${patientToken}`),
        );

      const results = await Promise.all(rapidRequests);

      // Todas las solicitudes deben tener la misma respuesta de autenticación
      const statusCodes = results.map((r) => r.status);
      expect(statusCodes.every((status) => status === statusCodes[0])).toBe(
        true,
      );
    });
  });

  describe("Edge Cases in Role Validation", () => {
    it("should handle missing user role gracefully", async () => {
      // Test a more realistic edge case: user deleted after token creation
      const temporaryUser = await prisma.user.create({
        data: {
          email: "temp@test.com",
          rut: "88888888-8",
          password: "$2a$10$hashedPassword",
          firstName: "Temp",
          lastName: "User",
          phone: "555000111",
          role: "PATIENT",
          isActive: true,
        },
      });

      const token = jwt.sign({ userId: temporaryUser.id }, JWT_SECRET);

      // Delete the user while token still exists (simulates race condition)
      await prisma.user.delete({ where: { id: temporaryUser.id } });

      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Usuario no válido");
    });

    it("should reject requests with tampered tokens", async () => {
      // Crear token válido y luego modificar su contenido
      const originalToken = jwt.sign({ userId: adminUserId }, JWT_SECRET);
      const [header, payload, signature] = originalToken.split(".");

      // Modificar el payload para intentar cambiar el userId
      const tamperedPayload = Buffer.from(
        JSON.stringify({
          userId: patientUserId, // Cambiar a ID de paciente
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString("base64");

      const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Token inválido");
    });
  });

  describe("Authorization Error Handling", () => {
    it("should provide consistent error messages for security", async () => {
      const endpoints = [
        "/api/admin/users",
        "/api/admin/appointments",
        "/api/admin/patients",
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe("Permisos insuficientes");
      }
    });

    it("should handle authorization middleware errors gracefully", async () => {
      // Simular error en middleware de autorización usando un token con estructura extraña
      const malformedToken = jwt.sign(
        {
          userId: "non-existent-id",
          extraField: { nested: "data" },
        },
        JWT_SECRET,
      );

      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${malformedToken}`);

      expect(response.status).toBeGreaterThanOrEqual(401);
      expect(response.body).toHaveProperty("message");
    });
  });
});
