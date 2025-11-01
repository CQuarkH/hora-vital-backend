import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import * as jwt from "jsonwebtoken";

let prisma: PrismaClient;

/**
 * Obtener instancia de Prisma para tests
 * IMPORTANTE: Crear nueva instancia cada vez para evitar cache
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    console.log("Creando nueva instancia de PrismaClient para tests");
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return prisma;
}

/**
 * Generar token JWT para tests
 */
export function generateTestToken(userId: string): string {
  const JWT_SECRET =
    process.env.JWT_SECRET || "changeme_in_dev_use_secure_secret_in_prod";
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
}

/**
 * Limpiar BD desactivando temporalmente las constraints
 */
export async function cleanDatabase(): Promise<void> {
  const client = getPrismaClient();

  try {
    // Desactivar todas las constraints de FK temporalmente
    await client.$executeRawUnsafe(`
      DO $$ 
      DECLARE 
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'ALTER TABLE IF EXISTS ' || quote_ident(r.tablename) || ' DISABLE TRIGGER ALL';
        END LOOP;
      END $$;
    `);

    // Ahora sí podemos truncar todo
    await client.$executeRawUnsafe(`
      TRUNCATE TABLE 
        "Notification",
        "Schedule", 
        "Appointment", 
        "DoctorProfile", 
        "Specialty", 
        "User" 
      RESTART IDENTITY CASCADE;
    `);

    // Reactivar constraints
    await client.$executeRawUnsafe(`
      DO $$ 
      DECLARE 
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'ALTER TABLE IF EXISTS ' || quote_ident(r.tablename) || ' ENABLE TRIGGER ALL';
        END LOOP;
      END $$;
    `);

    // Esperar un momento para asegurar que la BD esté lista
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    console.error("Error en cleanDatabase:", error);
    throw error;
  }
}

/**
 * Cerrar conexión de Prisma
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null!;
  }
}

/**
 * Factories para crear datos de prueba según el schema real
 */
export const TestFactory = {
  /**
   * Crear un paciente (User con role PATIENT)
   */
  createPatient: (overrides = {}) => {
    const uuid = uuidv4();
    return {
      id: uuid,
      name: "Juan Pérez",
      rut: `${Math.floor(Math.random() * 100000000)}-${Math.floor(Math.random() * 10)}-${uuid.substring(0, 8)}`,
      email: `patient.${Date.now()}.${Math.random()}.${uuid.substring(0, 8)}@test.com`,
      phone: "+56912345678",
      password: "$2b$10$test.hash.password", // Hash de bcrypt de prueba
      role: "PATIENT" as const,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Crear una especialidad
   */
  createSpecialty: (overrides = {}) => {
    const uuid = uuidv4();
    return {
      id: uuid,
      name: `Medicina General ${Date.now()}-${uuid.substring(0, 8)}`,
      description: "Especialidad médica general",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Crear un usuario doctor
   */
  createDoctor: (overrides = {}) => {
    const uuid = uuidv4();
    return {
      id: uuid,
      name: "Dra. María González",
      rut: `${Math.floor(Math.random() * 100000000)}-${Math.floor(Math.random() * 10)}-${uuid.substring(0, 8)}`,
      email: `doctor.${Date.now()}.${Math.random()}.${uuid.substring(0, 8)}@test.com`,
      phone: "+56987654321",
      password: "$2b$10$test.hash.password",
      role: "DOCTOR" as const,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Crear un perfil de doctor
   */
  createDoctorProfile: (
    userId: string,
    specialtyId: string,
    overrides = {},
  ) => ({
    id: uuidv4(),
    userId,
    specialtyId,
    licenseNumber: `MED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    bio: "Médico especialista",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  /**
   * Crear horario (Schedule)
   */
  createSchedule: (doctorProfileId: string, overrides = {}) => ({
    id: uuidv4(),
    doctorProfileId,
    dayOfWeek: 1, // Lunes
    startTime: "09:00",
    endTime: "18:00",
    slotDuration: 30,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  /**
   * Crear una cita
   */
  createAppointment: (
    patientId: string,
    doctorProfileId: string,
    specialtyId: string,
    overrides = {},
  ) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    return {
      id: uuidv4(),
      patientId,
      doctorProfileId,
      specialtyId,
      appointmentDate: tomorrow,
      startTime: "10:00",
      endTime: "10:30",
      status: "SCHEDULED" as const,
      notes: null,
      cancellationReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  },
};

/**
 * Helper para esperar un tiempo determinado
 */
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
