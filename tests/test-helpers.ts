/* tests/test-helpers.ts */
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import * as jwt from "jsonwebtoken";
import { execSync } from "child_process";

let prisma: PrismaClient | null = null;

/**
 * Obtener instancia de Prisma para tests
 * - Si SKIP_PRISMA_PUSH != "1" intentamos sincronizar schema con la BD
 *   (npx prisma db push --skip-generate). Esto es útil en entornos de contenedor
 *   de CI/local donde las migraciones no hayan creado tablas.
 * - Puedes deshabilitarlo exportando SKIP_PRISMA_PUSH=1.
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    console.log("Creando nueva instancia de PrismaClient para tests");

    if (!process.env.SKIP_PRISMA_PUSH) {
      try {
        console.log(
          "Intentando `npx prisma db push --skip-generate` (tests)...",
        );
        execSync("npx prisma db push --skip-generate", {
          stdio: "inherit",
          env: { ...process.env },
        });
        console.log("Prisma db push completado (si no falló).");
      } catch (err) {
        console.warn(
          "Aviso: `prisma db push` falló o no aplica. Si tienes migraciones correctamente ejecutadas puedes ignorar este warning.",
          (err as any)?.message ?? err,
        );
      }
    } else {
      console.log("SKIP_PRISMA_PUSH=1 -> no se ejecuta prisma db push");
    }

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Puedes habilitar logs si necesitas debug:
      // log: ['query', 'info', 'warn', 'error'],
    });
  }
  return prisma!;
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
 * Limpiar BD de forma segura:
 * - Consulta las tablas existentes en schema 'public'
 * - Excluye _prisma_migrations
 * - Desactiva triggers, TRUNCATE RESTART IDENTITY CASCADE, reactiva triggers
 *
 * Esto evita errores al listar tablas que no existen en la BD de pruebas.
 */
export async function cleanDatabase(): Promise<void> {
  const client = getPrismaClient();

  try {
    const rows: Array<{ tablename: string }> = await client.$queryRawUnsafe(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    );

    const allTables = rows.map((r) => r.tablename).filter(Boolean);

    // Excluir la tabla de migraciones y cualquier otra que no queramos tocar
    const excluded = ["_prisma_migrations"];
    const tablesToTruncate = allTables.filter(
      (t) => !excluded.includes(t.toLowerCase()),
    );

    if (tablesToTruncate.length === 0) {
      // Nada que hacer
      return;
    }

    // Desactivar triggers en las tablas que existen
    for (const t of tablesToTruncate) {
      // Quote identificador directo para seguridad
      await client.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS ${quoteIdent(t)} DISABLE TRIGGER ALL`,
      );
    }

    // TRUNCATE dinámico con los nombres tal como vienen (ya son lower-case normalmente)
    const truncateSql =
      "TRUNCATE TABLE " +
      tablesToTruncate.map((t) => quoteIdent(t)).join(", ") +
      " RESTART IDENTITY CASCADE;";
    await client.$executeRawUnsafe(truncateSql);

    // Reactivar triggers
    for (const t of tablesToTruncate) {
      await client.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS ${quoteIdent(t)} ENABLE TRIGGER ALL`,
      );
    }

    // pequeña espera para estabilidad
    await new Promise((resolve) => setTimeout(resolve, 200));
  } catch (error) {
    console.error("Error en cleanDatabase:", error);
    throw error;
  }
}

/**
 * Helper para quote_ident (usamos la función SQL quote_ident via pg)
 * Usamos $executeRawUnsafe para ejecutar SELECT quote_ident('name') y obtener el
 * resultado, pero eso sería más costoso. En su lugar, implementamos
 * una versión segura simple: si el nombre contiene solo [a-z0-9_], devolvemos
 * sin comillas (Postgres lowercases unquoted). Para cualquier otro caso,
 * devolvemos la identificación entre comillas dobles escapando las comillas dobles internas.
 *
 * Nota: los nombres devolvidos por pg_tables generalmente son safe (lower-case, sin espacios).
 */
function quoteIdent(name: string) {
  if (/^[a-z0-9_]+$/.test(name)) {
    // identificador simple (lowercase), lo devolvemos sin comillas
    return `"${name}"`;
  }
  // Escapar comillas dobles si las hubiera y envolver en comillas
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Desconectar Prisma (usar en hooks AfterAll)
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    try {
      await prisma.$disconnect();
    } catch (e) {
      console.warn("Error al desconectar Prisma:", e);
    } finally {
      prisma = null;
    }
  }
}

/* ----------------- Factories ----------------- */

/**
 * Helper para dividir un nombre completo en firstName / lastName
 */
function splitName(fullName: string) {
  const parts = (fullName || "Nombre Apellido").trim().split(/\s+/);
  const firstName = parts.shift() || "Nombre";
  const lastName = parts.join(" ") || "Apellido";
  return { firstName, lastName };
}

/**
 * Factories para crear datos de prueba según tu schema.prisma
 * NOTA: usamos firstName/lastName (tu model User los define)
 */
export const TestFactory = {
  createPatient: (overrides: Record<string, any> = {}) => {
    const uuid = uuidv4();
    const fullName = overrides.fullName ?? overrides.name ?? "Juan Pérez";
    const { firstName, lastName } = splitName(fullName);

    const { fullName: _, name: __, ...cleanOverrides } = overrides;

    return {
      id: uuid,
      firstName,
      lastName,
      rut:
        cleanOverrides.rut ??
        `${Math.floor(Math.random() * 100000000)}-${Math.floor(
          Math.random() * 10,
        )}`,
      email:
        cleanOverrides.email ??
        `patient.${Date.now()}.${Math.random()}.${uuid.substring(0, 8)}@test.com`,
      phone: cleanOverrides.phone ?? "+56912345678",
      password: cleanOverrides.password ?? "$2b$10$test.hash.password",
      role: "PATIENT" as const,
      isActive: cleanOverrides.isActive ?? true,
      gender: cleanOverrides.gender ?? null,
      birthDate: cleanOverrides.birthDate ?? null,
      address: cleanOverrides.address ?? null,
      createdAt: cleanOverrides.createdAt ?? new Date(),
      updatedAt: cleanOverrides.updatedAt ?? new Date(),
      ...cleanOverrides,
    };
  },

  createSpecialty: (overrides: Record<string, any> = {}) => {
    const uuid = uuidv4();
    return {
      id: uuid,
      name:
        overrides.name ??
        `Medicina General ${Date.now()}-${uuid.substring(0, 8)}`,
      description: overrides.description ?? "Especialidad médica general",
      isActive: overrides.isActive ?? true,
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: overrides.updatedAt ?? new Date(),
      ...overrides,
    };
  },

  createDoctor: (overrides: Record<string, any> = {}) => {
    const uuid = uuidv4();
    const fullName =
      overrides.fullName ?? overrides.name ?? "Dra. María González";
    const { firstName, lastName } = splitName(fullName);

    const { fullName: _, name: __, ...cleanOverrides } = overrides;

    return {
      id: uuid,
      firstName,
      lastName,
      rut:
        cleanOverrides.rut ??
        `${Math.floor(Math.random() * 100000000)}-${Math.floor(
          Math.random() * 10,
        )}`,
      email:
        cleanOverrides.email ??
        `doctor.${Date.now()}.${Math.random()}.${uuid.substring(0, 8)}@test.com`,
      phone: cleanOverrides.phone ?? "+56987654321",
      password: cleanOverrides.password ?? "$2b$10$test.hash.password",
      role: "DOCTOR" as const,
      isActive: cleanOverrides.isActive ?? true,
      gender: cleanOverrides.gender ?? null,
      birthDate: cleanOverrides.birthDate ?? null,
      address: cleanOverrides.address ?? null,
      createdAt: cleanOverrides.createdAt ?? new Date(),
      updatedAt: cleanOverrides.updatedAt ?? new Date(),
      ...cleanOverrides,
    };
  },

  createDoctorProfile: (
    userId: string,
    specialtyId: string,
    overrides: Record<string, any> = {},
  ) => {
    return {
      id: uuidv4(),
      userId,
      specialtyId,
      licenseNumber:
        overrides.licenseNumber ??
        `MED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bio: overrides.bio ?? "Médico especialista",
      isActive: overrides.isActive ?? true,
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: overrides.updatedAt ?? new Date(),
      ...overrides,
    };
  },

  createSchedule: (
    doctorProfileId: string,
    overrides: Record<string, any> = {},
  ) => {
    return {
      id: uuidv4(),
      doctorProfileId,
      dayOfWeek: overrides.dayOfWeek ?? 1,
      startTime: overrides.startTime ?? "09:00",
      endTime: overrides.endTime ?? "18:00",
      slotDuration: overrides.slotDuration ?? 30,
      isActive: overrides.isActive ?? true,
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: overrides.updatedAt ?? new Date(),
      ...overrides,
    };
  },

  createAppointment: (
    patientId: string,
    doctorProfileId: string,
    specialtyId: string,
    overrides: Record<string, any> = {},
  ) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    return {
      id: uuidv4(),
      patientId,
      doctorProfileId,
      specialtyId,
      appointmentDate: overrides.appointmentDate ?? tomorrow,
      startTime: overrides.startTime ?? "10:00",
      endTime: overrides.endTime ?? "10:30",
      status: overrides.status ?? "SCHEDULED",
      notes: overrides.notes ?? null,
      cancellationReason: overrides.cancellationReason ?? null,
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: overrides.updatedAt ?? new Date(),
      ...overrides,
    };
  },
};

/**
 * Mapear factory -> prisma data shape
 * Importante: **NO** incluir campos que no existan en schema (por ejemplo `name`)
 */
export function userFactoryToPrismaData(userObj: Record<string, any>) {
  return {
    id: userObj.id,
    firstName: userObj.firstName,
    lastName: userObj.lastName,
    rut: userObj.rut,
    email: userObj.email,
    phone: userObj.phone ?? null,
    password: userObj.password,
    role: userObj.role,
    isActive: userObj.isActive,
    gender: userObj.gender ?? null,
    birthDate: userObj.birthDate ?? null,
    address: userObj.address ?? null,
    createdAt: userObj.createdAt,
    updatedAt: userObj.updatedAt,
  } as any; // cast any para evitar desajustes menores en tipos locales
}

/**
 * Crear usuario en la BD con prisma usando factories
 */
export async function createUserInDb(
  kind: "patient" | "doctor",
  overrides: Record<string, any> = {},
) {
  const client = getPrismaClient();
  const factoryData =
    kind === "doctor"
      ? TestFactory.createDoctor(overrides)
      : TestFactory.createPatient(overrides);
  const data = userFactoryToPrismaData(factoryData);
  return client.user.create({ data });
}

/**
 * Small helper sleep
 */
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
