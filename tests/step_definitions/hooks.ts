import { BeforeAll, AfterAll, setDefaultTimeout } from "@cucumber/cucumber";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { exec } from "child_process";
import { promisify } from "util";
import { PrismaClient } from "@prisma/client";

const execAsync = promisify(exec);

let postgresContainer: any;

setDefaultTimeout(120000);

BeforeAll(async function () {
  console.log("Iniciando contenedor PostgreSQL para pruebas BDD...");

  postgresContainer = await new PostgreSqlContainer("postgres:15")
    .withDatabase("hora_vital_test")
    .withUsername("postgres")
    .withPassword("postgres")
    .withExposedPorts(5432)
    .start();

  const host = postgresContainer.getHost();
  const port = postgresContainer.getMappedPort(5432);
  const databaseUrl = `postgresql://postgres:postgres@${host}:${port}/hora_vital_test`;

  console.log("Contenedor PostgreSQL iniciado:", databaseUrl);

  process.env.DATABASE_URL = databaseUrl;
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "changeme_in_dev_use_secure_secret_in_prod";

  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("Ejecutando migraciones de Prisma...");
  try {
    await execAsync("npx prisma generate");
    console.log("Cliente Prisma generado");

    await execAsync("npx prisma migrate deploy", {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });
    console.log("Migraciones de Prisma ejecutadas");
  } catch (error) {
    console.log("Error con migrate deploy, intentando con db push...");
    try {
      await execAsync("npx prisma db push --skip-generate", {
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
        },
      });
      console.log("Schema sincronizado con db push");
    } catch (e) {
      console.error("Error en configuración de Prisma:", e);
      throw e;
    }
  }

  console.log("Verificando tablas creadas...");
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Conexión a BD verificada");

    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    console.log(
      "Tablas encontradas:",
      tables.map((t: { tablename: string }) => t.tablename).join(", "),
    );

    await prisma.$disconnect();
  } catch (error) {
    console.error("Error verificando BD:", error);
    await prisma.$disconnect();
    throw error;
  }

  console.log("PostgreSQL y Prisma listos para pruebas BDD");

  // Reset module cache for all Prisma-related modules to use the new DATABASE_URL
  delete require.cache[require.resolve("../../src/db/prisma")];
  delete require.cache[
    require.resolve("../../src/services/appointmentService")
  ];
  delete require.cache[require.resolve("../../src/services/adminService")];
  delete require.cache[require.resolve("../../src/services/authService")];
  delete require.cache[
    require.resolve("../../src/services/notificationService")
  ];
  delete require.cache[require.resolve("../../src/services/profileService")];
});

AfterAll(async function () {
  if (postgresContainer) {
    console.log("Limpiando contenedor PostgreSQL...");
    await postgresContainer.stop();
    console.log("Contenedor PostgreSQL detenido");
  }
});
