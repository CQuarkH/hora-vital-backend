// tests/integration/IT-5.test.ts
import request from "supertest";
import { getPrismaClient } from "../test-helpers";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

// Payload de registro de paciente
const newUserPayload = {
  email: "paciente-it5@mail.com",
  password: "PasswordSegura123!",
  firstName: "Seba",
  lastName: "Tester",
  rut: "19000000-0",
  phone: "+56900000000",
};

/**
 * IT-5: Registrar Paciente (Flujo Feliz)
 */
describe("IT-5 – Registrar Paciente (Flujo Feliz)", () => {
  let prisma: PrismaClient;
  let app: any;

  beforeAll(async () => {
    prisma = getPrismaClient();
    const appModule = await import("../../src/app");
    app = appModule.default || (appModule as any).app;

    // Limpiar cualquier usuario previo con el mismo email
    await prisma.user.deleteMany({ where: { email: newUserPayload.email } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: newUserPayload.email } });
    await prisma.$disconnect();
  });

  it("debe registrar un paciente y verificar la persistencia en BD con contraseña encriptada", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(newUserPayload)
      .expect(201);

    // El token está dentro de data
    expect(response.body.data).toHaveProperty("token");

    const userInDb = await prisma.user.findUnique({
      where: { email: newUserPayload.email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        phone: true,
        rut: true,
      },
    });

    expect(userInDb).not.toBeNull();
    expect(userInDb!.email).toBe(newUserPayload.email);
    expect(userInDb!.firstName).toBe(newUserPayload.firstName);
    expect(userInDb!.lastName).toBe(newUserPayload.lastName);
    expect(userInDb!.rut).toBe(newUserPayload.rut);

    const isPasswordCorrect = await bcrypt.compare(
      newUserPayload.password,
      userInDb!.password
    );
    expect(isPasswordCorrect).toBe(true);
  });
});
