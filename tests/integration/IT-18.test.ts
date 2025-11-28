/**
 * IT-18: Time Slot Overlap Validation Integration Tests
 *
 * Este test verifica escenarios complejos de validación de solapamiento de horarios,
 * incluyendo conflictos de tiempo, validaciones de disponibilidad, y casos límite
 * en la gestión de citas médicas.
 */

import request from "supertest";
import app from "../../src/app";
import prisma from "../../src/db/prisma";

// Helper function to create future dates for testing
function getFutureDate(daysOffset: number = 1, hour: number = 10): Date {
  const date = new Date();
  let daysAdded = 0;

  // Add days, counting only weekdays
  while (daysAdded < daysOffset) {
    date.setDate(date.getDate() + 1);
    // If it's a weekday, count it
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      daysAdded++;
    }
  }

  date.setHours(hour, 0, 0, 0);
  return date;
}

describe("IT-18: Time Slot Overlap Validation Integration Tests", () => {
  let adminUserId: string;
  let doctorUserId: string;
  let patientUserId: string;
  let patient2UserId: string;

  let patientToken: string;
  let patient2Token: string;

  let doctorProfileId: string;
  let doctor2ProfileId: string;
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
        name: "Medicina General",
        description: "Especialidad en medicina general",
      },
    });
    specialtyId = specialty.id;

    // Crear admin
    const adminUser = await prisma.user.create({
      data: {
        firstName: "Admin",
        lastName: "User",
        email: "admin@test.com",
        phone: "123456789",
        rut: "12345678-9",
        password: "$2a$10$hashedPassword",
        role: "ADMIN",
      },
    });
    adminUserId = adminUser.id;

    // Crear doctor
    const doctorUser = await prisma.user.create({
      data: {
        firstName: "Dr. Juan",
        lastName: "Pérez",
        email: "doctor@test.com",
        phone: "987654321",
        rut: "98765432-1",
        password: "$2a$10$hashedPassword",
        role: "DOCTOR",
      },
    });
    doctorUserId = doctorUser.id;

    // Crear segundo doctor
    const doctor2User = await prisma.user.create({
      data: {
        firstName: "Dr. María",
        lastName: "González",
        email: "doctor2@test.com",
        phone: "555666777",
        rut: "55566677-7",
        password: "$2a$10$hashedPassword",
        role: "DOCTOR",
      },
    });

    // Crear pacientes
    const patientUser = await prisma.user.create({
      data: {
        firstName: "Paciente",
        lastName: "Uno",
        email: "patient1@test.com",
        phone: "111222333",
        rut: "11122233-3",
        password: "$2a$10$hashedPassword",
        role: "PATIENT",
      },
    });
    patientUserId = patientUser.id;

    const patient2User = await prisma.user.create({
      data: {
        firstName: "Paciente",
        lastName: "Dos",
        email: "patient2@test.com",
        phone: "444555666",
        rut: "44455566-6",
        password: "$2a$10$hashedPassword",
        role: "PATIENT",
      },
    });
    patient2UserId = patient2User.id;

    // Crear perfiles de doctores
    const doctorProfile = await prisma.doctorProfile.create({
      data: {
        userId: doctorUserId,
        specialtyId: specialtyId,
        licenseNumber: "DOC001",
        bio: "Doctor especialista en medicina general",
      },
    });
    doctorProfileId = doctorProfile.id;

    const doctor2Profile = await prisma.doctorProfile.create({
      data: {
        userId: doctor2User.id,
        specialtyId: specialtyId,
        licenseNumber: "DOC002",
        bio: "Doctora especialista en medicina general",
      },
    });
    doctor2ProfileId = doctor2Profile.id;

    // Crear horarios para ambos doctores (Lunes a Viernes)
    const daysOfWeek = [1, 2, 3, 4, 5]; // Lunes a Viernes
    for (const day of daysOfWeek) {
      await prisma.schedule.create({
        data: {
          doctorProfileId: doctorProfileId,
          dayOfWeek: day,
          startTime: "08:00",
          endTime: "18:00",
          isActive: true,
        },
      });

      await prisma.schedule.create({
        data: {
          doctorProfileId: doctor2ProfileId,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "17:00",
          isActive: true,
        },
      });
    }

    // Crear tokens JWT
    const jwt = require("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET || "test_secret";

    patientToken = jwt.sign({ userId: patientUserId }, JWT_SECRET);
    patient2Token = jwt.sign({ userId: patient2UserId }, JWT_SECRET);
  });

  describe("Basic Time Slot Conflict Detection", () => {
    beforeEach(async () => {
      // Limpiar citas antes de cada test
      await prisma.appointment.deleteMany();
    });

    it("should prevent creating appointment in exact same time slot", async () => {
      const appointmentDate = getFutureDate(1, 10); // Tomorrow at 10:00
      const startTime = "10:00";

      // Crear primera cita
      const firstResponse = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: appointmentDate.toISOString(),
          startTime,
          notes: "Primera cita",
        });

      expect(firstResponse.status).toBe(201);

      // Intentar crear segunda cita en el mismo horario
      const secondResponse = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patient2Token}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: appointmentDate.toISOString(),
          startTime,
          notes: "Segunda cita",
        });

      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.message).toBe("El horario ya está reservado");
    });

    it("should allow creating appointment in same time slot with different doctors", async () => {
      const appointmentDate = getFutureDate(2, 14); // Day after tomorrow at 2PM
      const startTime = "14:00";

      // Crear cita con primer doctor
      const firstResponse = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: appointmentDate.toISOString(),
          startTime,
          notes: "Cita doctor 1",
        });

      expect(firstResponse.status).toBe(201);

      // Crear cita con segundo doctor en mismo horario
      const secondResponse = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patient2Token}`)
        .send({
          doctorProfileId: doctor2ProfileId,
          specialtyId,
          appointmentDate: appointmentDate.toISOString(),
          startTime,
          notes: "Cita doctor 2",
        });

      expect(secondResponse.status).toBe(201);
    });

    it("should prevent patient from booking duplicate appointment with same doctor", async () => {
      const appointmentDate = getFutureDate(3, 16); // 3 days from now at 4PM
      const startTime = "16:00";

      // Crear primera cita
      const firstResponse = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: appointmentDate.toISOString(),
          startTime,
          notes: "Primera cita del día",
        });

      expect(firstResponse.status).toBe(201);

      // Intentar crear segunda cita el mismo día con el mismo doctor
      const secondResponse = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: appointmentDate.toISOString(),
          startTime: "17:00", // Diferente hora
          notes: "Segunda cita del día",
        });

      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.message).toBe(
        "Ya tienes una cita con este médico en la misma fecha",
      );
    });

    it("should allow creating appointment after cancelled appointment", async () => {
      const appointmentDate = getFutureDate(4, 9); // 4 days from now at 9AM
      const startTime = "09:00";

      // Crear primera cita
      const firstResponse = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: appointmentDate.toISOString(),
          startTime,
          notes: "Cita a cancelar",
        });

      expect(firstResponse.status).toBe(201);
      const appointmentId = firstResponse.body.appointment.id;

      // Cancelar primera cita
      await request(app)
        .patch(`/api/appointments/${appointmentId}/cancel`)
        .set("Authorization", `Bearer ${patientToken}`)
        .send({ cancellationReason: "No puedo asistir" });

      // Crear nueva cita en el mismo horario
      const newResponse = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patient2Token}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: appointmentDate.toISOString(),
          startTime,
          notes: "Nueva cita en horario liberado",
        });

      expect(newResponse.status).toBe(201);
    });
  });

  describe("Complex Time Overlap Scenarios", () => {
    beforeEach(async () => {
      await prisma.appointment.deleteMany();
    });

    it("should handle sequential appointments without conflicts", async () => {
      const appointmentDate = getFutureDate(5, 8); // 5 days from now starting at 8AM
      const times = ["08:00", "08:30", "09:00", "09:30"];

      const responses: any[] = [];
      for (let i = 0; i < times.length; i++) {
        const token = i % 2 === 0 ? patientToken : patient2Token;

        const response = await request(app)
          .post("/api/appointments")
          .set("Authorization", `Bearer ${token}`)
          .send({
            doctorProfileId,
            specialtyId,
            appointmentDate: appointmentDate.toISOString(),
            startTime: times[i],
            notes: `Cita ${i + 1}`,
          });

        responses.push(response);

        if (i === 0 || i === 1) {
          expect(response.status).toBe(201);
        } else {
          // Las citas 3 y 4 deberían fallar por duplicate patient appointment
          expect(response.status).toBe(409);
        }
      }
    });

    it("should handle boundary time conditions correctly", async () => {
      const appointmentDate = getFutureDate(6, 17); // 6 days from now at 5:30 PM
      const startTime = "17:30";

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: appointmentDate.toISOString(),
          startTime,
          notes: "Cita al final del día",
        });

      // Debería crear la cita exitosamente (endTime sería 18:00)
      expect(response.status).toBe(201);

      const appointment = response.body.appointment;
      expect(appointment.startTime).toBe("17:30");
      expect(appointment.endTime).toBe("18:00");
    });

    it("should prevent overlapping appointments during updates", async () => {
      const appointmentDate = getFutureDate(7, 10); // 7 days from now at 10AM

      // Crear dos citas en horarios diferentes
      const appointment1Response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: appointmentDate.toISOString(),
          startTime: "10:00",
          notes: "Primera cita",
        });

      const appointment2Response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patient2Token}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: appointmentDate.toISOString(),
          startTime: "11:00",
          notes: "Segunda cita",
        });

      expect(appointment1Response.status).toBe(201);
      expect(appointment2Response.status).toBe(201);

      const appointment1Id = appointment1Response.body.appointment.id;

      // Intentar actualizar la primera cita para que coincida con la segunda
      const updateResponse = await request(app)
        .put(`/api/appointments/${appointment1Id}`)
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          startTime: "11:00", // Conflicto con segunda cita
          notes: "Cita actualizada",
        });

      expect(updateResponse.status).toBe(409);
      expect(updateResponse.body.message).toBe("El horario ya está reservado");
    });
  });

  describe("Multi-Day and Cross-Date Scenarios", () => {
    beforeEach(async () => {
      await prisma.appointment.deleteMany();
    });

    it("should allow same time slots on different dates", async () => {
      const date1 = getFutureDate(1, 10); // 1 day from now (next weekday)
      const date2 = getFutureDate(2, 10); // 2 days from now (next next weekday)
      const startTime = "10:00";

      // Crear cita en primer día
      const response1 = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: date1.toISOString(),
          startTime,
          notes: "Cita día 1",
        });

      expect(response1.status).toBe(201);

      // Crear cita en segundo día, mismo horario
      const response2 = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: date2.toISOString(),
          startTime,
          notes: "Cita día 2",
        });

      expect(response2.status).toBe(201);
    });

    it("should handle concurrent appointment creation attempts", async () => {
      const appointmentDate = getFutureDate(10, 15); // 10 days from now at 3PM
      const startTime = "15:00";

      // Intentar crear dos citas simultáneamente en el mismo horario
      const promises = [
        request(app)
          .post("/api/appointments")
          .set("Authorization", `Bearer ${patientToken}`)
          .send({
            doctorProfileId,
            specialtyId,
            appointmentDate: appointmentDate.toISOString(),
            startTime,
            notes: "Cita concurrente 1",
          }),
        request(app)
          .post("/api/appointments")
          .set("Authorization", `Bearer ${patient2Token}`)
          .send({
            doctorProfileId,
            specialtyId,
            appointmentDate: appointmentDate.toISOString(),
            startTime,
            notes: "Cita concurrente 2",
          }),
      ];

      const responses = await Promise.all(promises);
      const successfulResponses = responses.filter((r) => r.status === 201);
      const conflictResponses = responses.filter((r) => r.status === 409);

      expect(successfulResponses.length).toBe(1);
      expect(conflictResponses.length).toBe(1);
    });
  });

  describe("Availability Validation Edge Cases", () => {
    beforeEach(async () => {
      await prisma.appointment.deleteMany();
    });

    it("should correctly show availability after appointment updates", async () => {
      const appointmentDate = getFutureDate(11); // 11 days from now
      const initialTime = "10:00";
      const newTime = "11:00";

      // Crear cita inicial
      const createResponse = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: appointmentDate.toISOString(),
          startTime: initialTime,
          notes: "Cita inicial",
        });

      expect(createResponse.status).toBe(201);
      const appointmentId = createResponse.body.appointment.id;

      // Verificar disponibilidad antes de la actualización
      const availabilityBefore = await request(app)
        .get("/api/appointments/availability")
        .query({
          date: appointmentDate.toISOString().split("T")[0],
          doctorProfileId,
        });

      expect(availabilityBefore.status).toBe(200);

      // Actualizar la cita a un nuevo horario
      const updateResponse = await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          startTime: newTime,
          notes: "Cita actualizada",
        });

      expect(updateResponse.status).toBe(200);

      // Verificar disponibilidad después de la actualización
      const availabilityAfter = await request(app)
        .get("/api/appointments/availability")
        .query({
          date: appointmentDate.toISOString().split("T")[0],
          doctorProfileId,
        });

      expect(availabilityAfter.status).toBe(200);
    });

    it("should handle multiple rapid availability checks consistently", async () => {
      const date = getFutureDate(12).toISOString().split("T")[0]; // 12 days from now

      const promises = Array(5)
        .fill(null)
        .map(() =>
          request(app).get("/api/appointments/availability").query({
            date,
            doctorProfileId,
          }),
        );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Todas las respuestas deberían ser iguales
      const firstResponse = responses[0].body;
      responses.slice(1).forEach((response) => {
        expect(response.body).toEqual(firstResponse);
      });
    });
  });

  describe("Error Handling in Overlap Detection", () => {
    beforeEach(async () => {
      await prisma.appointment.deleteMany();
    });

    it("should handle invalid time formats gracefully", async () => {
      const appointmentDate = getFutureDate(13); // 13 days from now

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: appointmentDate.toISOString(),
          startTime: "25:00", // Hora inválida
          notes: "Cita con hora inválida",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation error");
    });

    it("should handle corrupted appointment data in conflict detection", async () => {
      const appointmentDate = getFutureDate(14, 11); // 14 days from now at 11AM

      // Crear cita válida primero
      const validResponse = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: appointmentDate.toISOString(),
          startTime: "11:00",
          notes: "Cita válida",
        });

      expect(validResponse.status).toBe(201);

      // Intentar crear otra cita que forzará la validación de conflictos
      const conflictResponse = await request(app)
        .post("/api/appointments")
        .set("Authorization", `Bearer ${patient2Token}`)
        .send({
          doctorProfileId,
          specialtyId,
          appointmentDate: appointmentDate.toISOString(),
          startTime: "11:00",
          notes: "Cita conflictiva",
        });

      expect(conflictResponse.status).toBe(409);
      expect(conflictResponse.body.message).toBe(
        "El horario ya está reservado",
      );
    });

    it("should maintain data integrity during high-load scenarios", async () => {
      const appointmentDate = getFutureDate(15, 9); // 15 days from now at 9AM

      // Crear múltiples intentos simultáneos de citas
      const appointmentRequests: any[] = [];
      for (let i = 0; i < 5; i++) {
        const token = i % 2 === 0 ? patientToken : patient2Token;
        appointmentRequests.push(
          request(app)
            .post("/api/appointments")
            .set("Authorization", `Bearer ${token}`)
            .send({
              doctorProfileId,
              specialtyId,
              appointmentDate: appointmentDate.toISOString(),
              startTime: "09:00",
              notes: `Cita carga alta ${i + 1}`,
            }),
        );
      }

      const responses = await Promise.all(appointmentRequests);
      const successCount = responses.filter(
        (r: any) => r.status === 201,
      ).length;
      const conflictCount = responses.filter(
        (r: any) => r.status === 409,
      ).length;

      expect(successCount).toBe(1); // Solo un horario puede estar reservado
      expect(conflictCount).toBe(4); // Las demás deberían ser rechazadas

      // Verificar integridad de la base de datos
      const appointments = await prisma.appointment.findMany({
        where: {
          doctorProfileId,
          appointmentDate: appointmentDate,
          startTime: "09:00",
          status: "SCHEDULED",
        },
      });

      expect(appointments.length).toBe(1); // Solo debe haber 1 cita guardada
    });
  });

  afterAll(async () => {
    // Limpiar datos después de todas las pruebas
    await prisma.appointment.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.doctorProfile.deleteMany();
    await prisma.specialty.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });
});
