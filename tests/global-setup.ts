import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);

export default async function globalSetup() {
  console.log('🚀 Iniciando contenedor PostgreSQL para pruebas...');

  // Iniciar contenedor PostgreSQL
  const postgresContainer = await new PostgreSqlContainer('postgres:15')
    .withDatabase('hora_vital_test')
    .withUsername('postgres')
    .withPassword('postgres')
    .withExposedPorts(5432)
    .start();

  // Construir URI de conexión
  const host = postgresContainer.getHost();
  const port = postgresContainer.getMappedPort(5432);
  const databaseUrl = `postgresql://postgres:postgres@${host}:${port}/hora_vital_test`;

  console.log('📦 Contenedor PostgreSQL iniciado:', databaseUrl);

  // Guardar información del contenedor
  (global as any).__POSTGRES_CONTAINER__ = postgresContainer;

  // Configurar variables de entorno
  process.env.DATABASE_URL = databaseUrl;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'changeme_in_dev_use_secure_secret_in_prod';

  // Esperar a que PostgreSQL esté completamente listo
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Ejecutar migraciones de Prisma
  console.log('🔄 Ejecutando migraciones de Prisma...');
  try {
    // Primero generar el cliente
    await execAsync('npx prisma generate');
    console.log('✅ Cliente Prisma generado');

    // Luego aplicar migraciones (CORREGIDO PARA WINDOWS)
    await execAsync('npx prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });
    console.log('✅ Migraciones de Prisma ejecutadas');
  } catch (error) {
    console.log('⚠️  Error con migrate deploy, intentando con db push...');
    try {
      // Si migrate deploy falla, usar db push (CORREGIDO PARA WINDOWS)
      await execAsync('npx prisma db push --skip-generate', {
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
        },
      });
      console.log('✅ Schema sincronizado con db push');
    } catch (e) {
      console.error('❌ Error en configuración de Prisma:', e);
      throw e;
    }
  }

  // Verificar que las tablas se crearon
  console.log('🔍 Verificando tablas creadas...');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    // Hacer una query simple para verificar conexión
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Conexión a BD verificada');

    // Verificar que existen las tablas principales
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    // Bien (Línea 78)
    console.log('📋 Tablas encontradas:', tables.map((t: { tablename: string }) => t.tablename).join(', '));

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error verificando BD:', error);
    await prisma.$disconnect();
    throw error;
  }

  console.log('✅ PostgreSQL y Prisma listos para pruebas');
}