import request from 'supertest';
import { getPrismaClient, generateTestToken } from '../test-helpers';
import { PrismaClient } from '@prisma/client';

// Función auxiliar
const getTestDoctorIdAndToken = async (prisma: PrismaClient) => {
  const specialty = await prisma.specialty.upsert({
    where: { name: 'Cardiología Test' },
    update: {},
    create: { name: 'Cardiología Test' },
  });
  const user = await prisma.user.upsert({
    where: { email: 'doctor-it8-admin@test.com' },
    update: {},
    create: {
      email: 'doctor-it8-admin@test.com',
      password: 'hash-password-test',
      name: 'Dr. Admin 8',
      rut: '1-8',
      role: 'ADMIN',
    },
  });
  const doctor = await prisma.doctorProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      specialtyId: specialty.id,
      licenseNumber: 'TEST-54321',
    },
  });
  const token = generateTestToken(user.id);
  return {
    doctorId: doctor.id,
    doctorUserId: user.id,
    token: `Bearer ${token}`,
    specialtyId: specialty.id,
  };
};

/**
 * IT-8: Gestionar Agenda con Solapamiento (Error)
 */
describe('IT-8 - Gestionar Agenda con Solapamiento (Error)', () => {
  let prisma: PrismaClient;
  let app: any;
  let doctorId: string;
  let tokenAdmin: string;
  let specialtyId: string;

  // 1. Datos de Conflicto
  const targetDate = '2026-01-11';
  const targetDateObject = new Date(targetDate);
  const targetDayOfWeek = targetDateObject.getUTCDay();

  const existingAppointment = {
    startTime: '10:00',
    endTime: '11:00',
  };
  
  const recurringOverlappingSchedule = {
    dayOfWeek: targetDayOfWeek,
    startTime: '10:30',
    endTime: '11:30',
  };

  beforeAll(async () => {
    prisma = getPrismaClient();
    const appModule = await import('../../src/app');
    app = appModule.default || (appModule as any).app;

    const data = await getTestDoctorIdAndToken(prisma);
    doctorId = data.doctorId;
    tokenAdmin = data.token;
    specialtyId = data.specialtyId;

    // Precondición 1: Limpieza
    await prisma.appointment.deleteMany({
      where: { doctorProfileId: doctorId, appointmentDate: targetDateObject },
    });
    await prisma.schedule.deleteMany({
      where: { doctorProfileId: doctorId, dayOfWeek: targetDayOfWeek },
    });

    // Precondición 2: Crear paciente
    const patientUser = await prisma.user.upsert({
      where: { email: 'paciente-it8@test.com' },
      update: {},
      create: {
        email: 'paciente-it8@test.com',
        password: 'hash-password-test',
        name: 'Paciente de Prueba IT-8',
        rut: '1-7',
        role: 'PATIENT',
      }
    });
    
    // Precondición 3: Crear la CITA existente que generará el conflicto
    await prisma.appointment.create({
      data: {
        doctorProfileId: doctorId,
        patientId: patientUser.id,
        specialtyId: specialtyId,
        appointmentDate: targetDateObject,
        startTime: existingAppointment.startTime, // "10:00"
        endTime: existingAppointment.endTime,   // "11:00"
        status: 'SCHEDULED',
      },
    });
  });

  it('debería rechazar la creación del horario con Error HTTP 409 (Conflict)', async () => {
    
    const payload = {
      doctorProfileId: doctorId,
      dayOfWeek: recurringOverlappingSchedule.dayOfWeek,
      startTime: recurringOverlappingSchedule.startTime, // "10:30"
      endTime: recurringOverlappingSchedule.endTime,   // "11:30"
      slotDuration: 30,
    };

    // 2. Acción: Intentar crear el horario que se solapa
    const response = await request(app)
      .post('/api/admin/schedules')
      .set('Authorization', tokenAdmin) 
      .send(payload)
      // 3. Resultado Esperado (API): Status Conflict (409)
      .expect(409);

    // 4. Verificación API: Debe haber un mensaje de error
    expect(response.body).toHaveProperty('message');

    // 5. Verificación Persistencia: Asegurar que NO se creó ningún horario
    const schedules = await prisma.schedule.findMany({
      where: {
        doctorProfileId: doctorId,
        dayOfWeek: recurringOverlappingSchedule.dayOfWeek,
      },
    });
    expect(schedules.length).toBe(0);
  });
});