import { PostgreSqlContainer, StartedTestContainer } from 'testcontainers';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Variables globales para compartir entre tests
declare global {
    var postgresContainer: StartedTestContainer;
    var databaseUrl: string;
    var prisma: PrismaClient;
}

// Configuración global antes de todos los tests
beforeAll(async () => {
    console.log('🚀 Iniciando contenedor PostgreSQL para pruebas...');

    // Iniciar contenedor PostgreSQL
    globalThis.postgresContainer = await new PostgreSqlContainer('postgres:15')
        .withDatabase('hora_vital_test')
        .withUsername('postgres')
        .withPassword('postgres')
        .withExposedPorts(5432)
        .start();

    // Construir manualmente la URI de conexión porque StartedTestContainer no expone getConnectionUri en los tipos
    const host = globalThis.postgresContainer.getHost();
    const port = globalThis.postgresContainer.getMappedPort(5432);
    globalThis.databaseUrl = `postgres://postgres:postgres@${host}:${port}/hora_vital_test`;

    console.log('📦 Contenedor PostgreSQL iniciado:', globalThis.databaseUrl);

    // Configurar variable de entorno para la aplicación
    process.env.DATABASE_URL = globalThis.databaseUrl;
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';

    // Inicializar Prisma
    globalThis.prisma = new PrismaClient();

    // Esperar a que PostgreSQL esté listo
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Ejecutar migraciones de Prisma
    console.log('🔄 Ejecutando migraciones de Prisma...');
    try {
        await execAsync('npx prisma migrate deploy');
        console.log('✅ Migraciones de Prisma ejecutadas');
    } catch (error) {
        console.log('⚠️  No se pudieron ejecutar migraciones, intentando generar client...');
        await execAsync('npx prisma generate');
    }

    console.log('✅ PostgreSQL y Prisma listos para pruebas');
}, 60000);

// Limpieza después de todos los tests
afterAll(async () => {
    console.log('🧹 Deteniendo contenedor PostgreSQL...');
    if (globalThis.postgresContainer) {
        await globalThis.postgresContainer.stop();
    }
    if (globalThis.prisma) {
        await globalThis.prisma.$disconnect();
    }
}, 30000);