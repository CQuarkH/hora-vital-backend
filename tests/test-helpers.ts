import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';

let prisma: PrismaClient;

/**
 * Obtener instancia de Prisma para tests
 */
export function getPrismaClient(): PrismaClient {
    if (!prisma) {
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
    const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Limpiar todas las tablas según el schema real
 */
export async function cleanDatabase(): Promise<void> {
    const prisma = getPrismaClient();

    try {
        // Desactivar foreign key checks temporalmente
        await prisma.$executeRaw`SET session_replication_role = 'replica';`;

        // Intentar limpiar cada tabla individualmente
        const tables = ['Appointment', 'Schedule', 'DoctorProfile', 'Specialty', 'User'];

        for (const table of tables) {
            try {
                await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
            } catch (err) {
                console.warn(`Tabla ${table} no existe o no se pudo limpiar`);
            }
        }

        // Reactivar foreign key checks
        await prisma.$executeRaw`SET session_replication_role = 'origin';`;
    } catch (error) {
        console.error('Error en cleanDatabase:', error);
        throw error;
    }
}

/**
 * Cerrar conexión de Prisma
 */
export async function disconnectPrisma(): Promise<void> {
    if (prisma) {
        await prisma.$disconnect();
    }
}

/**
 * Factories para crear datos de prueba según el schema real
 */
export const TestFactory = {
    /**
     * Crear un paciente (User con role PATIENT)
     */
    createPatient: (overrides = {}) => ({
        id: uuidv4(),
        name: 'Juan Pérez',
        rut: `${Math.floor(Math.random() * 100000000)}-${Math.floor(Math.random() * 10)}`,
        email: `patient.${Date.now()}.${Math.random()}@test.com`,
        phone: '+56912345678',
        password: '$2b$10$test.hash.password', // Hash de bcrypt de prueba
        role: 'PATIENT' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    }),

    /**
     * Crear una especialidad
     */
    createSpecialty: (overrides = {}) => ({
        id: uuidv4(),
        name: `Medicina General ${Date.now()}`,
        description: 'Especialidad médica general',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    }),

    /**
     * Crear un usuario doctor
     */
    createDoctor: (overrides = {}) => ({
        id: uuidv4(),
        name: 'Dra. María González',
        rut: `${Math.floor(Math.random() * 100000000)}-${Math.floor(Math.random() * 10)}`,
        email: `doctor.${Date.now()}.${Math.random()}@test.com`,
        phone: '+56987654321',
        password: '$2b$10$test.hash.password',
        role: 'DOCTOR' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    }),

    /**
     * Crear un perfil de doctor
     */
    createDoctorProfile: (userId: string, specialtyId: string, overrides = {}) => ({
        id: uuidv4(),
        userId,
        specialtyId,
        licenseNumber: `MED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        bio: 'Médico especialista',
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
        startTime: '09:00',
        endTime: '18:00',
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
        overrides = {}
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
            startTime: '10:00',
            endTime: '10:30',
            status: 'SCHEDULED' as const,
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
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));