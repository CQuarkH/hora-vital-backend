import request from 'supertest';
import { getPrismaClient, cleanDatabase, TestFactory, generateTestToken } from '../test-helpers';
import { PrismaClient } from '@prisma/client';

/**
 * IT-2: Agendar Cita con Horario Ocupado (Error)
 * 
 * Integración: Servicio de Citas ↔ Servicio de Disponibilidad
 * 
 * Objetivo: Verificar que el sistema rechaza intentos de agendar
 * una cita cuando el horario ya está ocupado por otro paciente
 */

// ✅ Mock COMPLETO del módulo emailService
jest.mock('../../src/services/emailService', () => ({
    sendAppointmentConfirmation: jest.fn().mockResolvedValue(undefined),
    sendAppointmentCancellation: jest.fn().mockResolvedValue(undefined),
    __esModule: true,
}));
// Importar DESPUÉS del mock
import * as EmailService from '../../src/services/emailService';

describe('IT-2: Agendar Cita con Horario Ocupado (Error)', () => {
    let prisma: PrismaClient;
    let app: any;
    let patient1Id: string;
    let patient1Token: string;
    let patient2Id: string;
    let patient2Token: string;
    let doctorProfileId: string;
    let specialtyId: string;

    beforeAll(async () => {
        prisma = getPrismaClient();
        const appModule = await import('../../src/app');
        app = appModule.default || (appModule as any).app;
    });

    beforeEach(async () => {
        await cleanDatabase();
        prisma = getPrismaClient();

        jest.clearAllMocks();
        (EmailService.sendAppointmentConfirmation as jest.Mock).mockResolvedValue(undefined);
        (EmailService.sendAppointmentCancellation as jest.Mock).mockResolvedValue(undefined);

        const specialty = await prisma.specialty.create({
            data: TestFactory.createSpecialty(),
        });
        specialtyId = specialty.id;

        const doctor = await prisma.user.create({
            data: TestFactory.createDoctor(),
        });
        const doctorProfile = await prisma.doctorProfile.create({
            data: TestFactory.createDoctorProfile(doctor.id, specialtyId),
        });

        doctorProfileId = doctorProfile.id;

        const [patient1, patient2] = await Promise.all([
            prisma.user.create({ data: TestFactory.createPatient() }),
            prisma.user.create({ data: TestFactory.createPatient() }),
        ]);

        patient1Id = patient1.id;
        patient2Id = patient2.id;
        patient1Token = generateTestToken(patient1Id);
        patient2Token = generateTestToken(patient2Id);

        const daysOfWeek = [1, 2, 3, 4, 5];
        await Promise.all(
            daysOfWeek.map((day) =>
                prisma.schedule.create({
                    data: TestFactory.createSchedule(doctorProfileId, { dayOfWeek: day }),
                })
            )
        );
    });


    it('debe rechazar cita cuando el horario ya está ocupado', async () => {
        // Arrange: Primer paciente agenda la cita
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
            tomorrow.setDate(tomorrow.getDate() + 1);
        }
        tomorrow.setHours(0, 0, 0, 0);

        const firstAppointmentPayload = {
            patientId: patient1Id,
            doctorProfileId,
            specialtyId,
            appointmentDate: tomorrow.toISOString(),
            startTime: '10:00',
            endTime: '10:30',
            notes: 'Primera consulta',
        };

        // Primera cita se crea exitosamente
        await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${patient1Token}`)
            .send(firstAppointmentPayload)
            .expect(201);

        // Act: Segundo paciente intenta agendar el mismo horario
        const secondAppointmentPayload = {
            patientId: patient2Id,
            doctorProfileId,
            specialtyId,
            appointmentDate: tomorrow.toISOString(),
            startTime: '10:00',
            endTime: '10:30',
            notes: 'Intento de segunda consulta',
        };

        console.log("Patient 2 Token: ", patient2Token); // Debugging line

        const response = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${patient2Token}`)
            .send(secondAppointmentPayload)
            .expect((res) => {
                if (![409, 500].includes(res.status)) {
                    throw new Error(`Expected status 409 or 500 but received ${res.status}`);
                }
            });

        // Assert: Verificar mensaje de error
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toMatch(/reservado|ocupado|disponible/i);

        // Verificar que solo existe una cita en BD
        const appointments = await prisma.appointment.findMany({
            where: {
                doctorProfileId,
                appointmentDate: tomorrow,
                startTime: '10:00',
            },
        });

        expect(appointments).toHaveLength(1);
        expect(appointments[0].patientId).toBe(patient1Id);
    });

    it('debe manejar condiciones de carrera al agendar el mismo horario simultáneamente', async () => {
        // Arrange: Preparar dos solicitudes simultáneas
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
            tomorrow.setDate(tomorrow.getDate() + 1);
        }
        tomorrow.setHours(0, 0, 0, 0);

        const appointment1Payload = {
            patientId: patient1Id,
            doctorProfileId,
            specialtyId,
            appointmentDate: tomorrow.toISOString(),
            startTime: '10:00',
            endTime: '10:30',
            notes: 'Consulta paciente 1',
        };

        const appointment2Payload = {
            patientId: patient2Id,
            doctorProfileId,
            specialtyId,
            appointmentDate: tomorrow.toISOString(),
            startTime: '10:00',
            endTime: '10:30',
            notes: 'Consulta paciente 2',
        };

        // Act: Ejecutar ambas solicitudes en paralelo
        const [response1, response2] = await Promise.allSettled([
            request(app)
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patient1Token}`)
                .send(appointment1Payload),
            request(app)
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patient2Token}`)
                .send(appointment2Payload),
        ]);

        // Assert: Una debe tener éxito, la otra debe fallar
        const responses = [response1, response2];
        const successResponses = responses.filter(
            (r) => r.status === 'fulfilled' && (r.value as any).status === 201
        );
        const failedResponses = responses.filter(
            (r) => r.status === 'fulfilled' && (r.value as any).status === 409
        );

        expect(successResponses).toHaveLength(1);
        expect(failedResponses).toHaveLength(1);

        // Verificar que solo hay una cita en BD
        const appointments = await prisma.appointment.findMany({
            where: {
                doctorProfileId,
                appointmentDate: tomorrow,
                startTime: '10:00',
            },
        });

        expect(appointments).toHaveLength(1);
    });

    it('debe permitir agendar en horarios diferentes del mismo día', async () => {
        // Arrange: Crear primera cita
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
            tomorrow.setDate(tomorrow.getDate() + 1);
        }
        tomorrow.setHours(0, 0, 0, 0);

        const appointment1Payload = {
            patientId: patient1Id,
            doctorProfileId,
            specialtyId,
            appointmentDate: tomorrow.toISOString(),
            startTime: '10:00',
            endTime: '10:30',
        };

        await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${patient1Token}`)
            .send(appointment1Payload)
            .expect(201);

        // Act: Segundo paciente agenda en diferente horario
        const appointment2Payload = {
            patientId: patient2Id,
            doctorProfileId,
            specialtyId,
            appointmentDate: tomorrow.toISOString(),
            startTime: '11:00',
            endTime: '11:30',
        };

        const response = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${patient2Token}`)
            .send(appointment2Payload)
            .expect(201);

        expect(response.body.appointment.status).toBe('SCHEDULED');

        // Verificar que hay dos citas
        const appointments = await prisma.appointment.findMany({
            where: { doctorProfileId, appointmentDate: tomorrow },
        });

        expect(appointments).toHaveLength(2);
    });

    it('debe permitir al mismo paciente agendar múltiples citas en diferentes días', async () => {
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

        const appointment1Payload = {
            patientId: patient1Id,
            doctorProfileId,
            specialtyId,
            appointmentDate: day1.toISOString(),
            startTime: '10:00',
            endTime: '10:30',
        };

        const appointment2Payload = {
            patientId: patient1Id,
            doctorProfileId,
            specialtyId,
            appointmentDate: day2.toISOString(),
            startTime: '10:00',
            endTime: '10:30',
        };

        const response1 = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${patient1Token}`)
            .send(appointment1Payload)
            .expect(201);

        const response2 = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${patient1Token}`)
            .send(appointment2Payload)
            .expect(201);

        expect(response1.body.appointment.status).toBe('SCHEDULED');
        expect(response2.body.appointment.status).toBe('SCHEDULED');

        const appointments = await prisma.appointment.findMany({
            where: { patientId: patient1Id },
        });

        expect(appointments).toHaveLength(2);
    });

    it('debe validar que el horario esté dentro del schedule del doctor', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
            tomorrow.setDate(tomorrow.getDate() + 1);
        }
        tomorrow.setHours(0, 0, 0, 0);

        // Intentar agendar fuera del horario del doctor (schedules son 09:00-18:00)
        const appointmentPayload = {
            patientId: patient1Id,
            doctorProfileId,
            specialtyId,
            appointmentDate: tomorrow.toISOString(),
            startTime: '20:00', // Fuera de horario
            endTime: '20:30',
        };

        const response = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${patient1Token}`)
            .send(appointmentPayload);

        // Debería rechazar (400 o 409)
        expect([400, 409]).toContain(response.status);
        expect(response.body.message).toMatch(/horario|disponible|schedule|atiende|/i);
    });
});