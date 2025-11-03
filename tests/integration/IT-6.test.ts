// tests/integration/IT-6.test.ts
import request from "supertest";
import { getPrismaClient } from "../test-helpers";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const duplicateUserPayload = {
  email: "duplicate-it6@mail.com",
  password: "Password123!",
  firstName: "Test",
  lastName: "User",
  rut: "20000000-0",
  phone: "+56900000001",
};

/**
 * IT-6: Registrar Paciente con Email Duplicado (Error)
 */
describe("IT-6 – Registrar Paciente con Email Duplicado (Error)", () => {
  let prisma: PrismaClient;
  let app: any;

  beforeAll(async () => {
    prisma = getPrismaClient();
    const appModule = await import("../../src/app");
    app = appModule.default || (appModule as any).app;

    // asegurar ambiente limpio
    await prisma.user.deleteMany({
      where: { email: duplicateUserPayload.email },
    });

    // 1. Precondición: Crear un usuario que cause el conflicto de duplicidad
    const hashedPassword = await bcrypt.hash(duplicateUserPayload.password, 10);
    await prisma.user.create({
      data: {
        email: duplicateUserPayload.email,
        password: hashedPassword,
        firstName: duplicateUserPayload.firstName,
        lastName: duplicateUserPayload.lastName,
        rut: duplicateUserPayload.rut,
        phone: duplicateUserPayload.phone,
        // role, isActive, createdAt, updatedAt will use defaults from Prisma schema
      },
    });
  });

  afterAll(async () => {
    // limpiar y desconectar prisma
    await prisma.user.deleteMany({
      where: { email: duplicateUserPayload.email },
    });
    await prisma.$disconnect();
  });

  it("debería rechazar el registro con Error HTTP 409 (Conflict)", async () => {
    // 2. Acción: Intentar registrar con el mismo email
    const response = await request(app)
      .post("/api/auth/register")
      .send(duplicateUserPayload)
      // 3. Resultado Esperado (API): Status Conflict (409)
      .expect(409);

    // 4. Verificación API: El mensaje de error debe indicar la duplicidad
    // Ajusta el mensaje esperado si tu backend devuelve otro texto.
    expect(response.body).toHaveProperty("message");
    expect(typeof response.body.message).toBe("string");
    expect(response.body.message.toLowerCase()).toMatch(/email|correo/);
  });
});
