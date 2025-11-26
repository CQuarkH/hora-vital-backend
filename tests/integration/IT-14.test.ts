import request from "supertest";
import {
  getPrismaClient,
  cleanDatabase,
  TestFactory,
  generateTestToken,
} from "../test-helpers";
import { PrismaClient } from "@prisma/client";

/**
 * IT-14: Ver Pacientes (CU-07)
 *
 * Integración: API ↔ Servicio Admin ↔ Base de Datos
 *
 * Objetivo: Verificar que el personal administrativo puede listar
 * y filtrar pacientes, y que los pacientes no tienen acceso a esta funcionalidad.
 */
describe("IT-14: Ver Pacientes", () => {
  let prisma: PrismaClient;
  let app: any;
  let secretaryId: string;
  let secretaryToken: string;
  let patientId: string;
  let patientToken: string;

  beforeAll(async () => {
    prisma = getPrismaClient();
    const appModule = await import("../../src/app");
    app = appModule.default || (appModule as any).app;
  });

  afterAll(async () => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    await cleanDatabase();
    prisma = getPrismaClient();
    jest.clearAllMocks();

    // Create secretary user
    const secretary = await prisma.user.create({
      data: {
        ...TestFactory.createPatient(),
        role: "SECRETARY",
        firstName: "Secretary",
        lastName: "Admin",
        email: "secretary@test.com",
        rut: "11.111.111-1",
      },
    });
    secretaryId = secretary.id;
    secretaryToken = generateTestToken(secretaryId);

    // Create regular patient
    const patient = await prisma.user.create({
      data: TestFactory.createPatient(),
    });
    patientId = patient.id;
    patientToken = generateTestToken(patientId);

    // Create additional test patients
    await prisma.user.create({
      data: {
        ...TestFactory.createPatient(),
        firstName: "Juan",
        lastName: "Pérez",
        email: "juan@test.com",
        rut: "12.345.678-9",
        role: "PATIENT",
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        ...TestFactory.createPatient(),
        firstName: "María",
        lastName: "González",
        email: "maria@test.com",
        rut: "98.765.432-1",
        role: "PATIENT",
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        ...TestFactory.createPatient(),
        firstName: "Pedro",
        lastName: "Inactive",
        email: "pedro@test.com",
        rut: "11.222.333-4",
        role: "PATIENT",
        isActive: false,
      },
    });

    // Create a doctor (should not appear in patient list)
    await prisma.user.create({
      data: {
        ...TestFactory.createDoctor(),
        role: "DOCTOR",
      },
    });
  });

  it("should allow SECRETARY to list patients with filters", async () => {
    const response = await request(app)
      .get("/api/admin/patients")
      .set("Authorization", `Bearer ${secretaryToken}`)
      .query({
        page: "1",
        limit: "10",
        name: "Juan",
      });

    expect(response.status).toBe(200);
    expect(response.body.patients).toBeDefined();
    expect(response.body.meta).toBeDefined();

    // Should find Juan but not María or doctor
    const juanFound = response.body.patients.some(
      (p: any) => p.firstName === "Juan"
    );
    expect(juanFound).toBe(true);

    // All returned users should be PATIENT role
    const allPatients = response.body.patients.every(
      (p: any) => p.role === "PATIENT"
    );
    expect(allPatients).toBe(true);

    // Should have pagination metadata
    expect(response.body.meta).toHaveProperty("total");
    expect(response.body.meta).toHaveProperty("page");
    expect(response.body.meta).toHaveProperty("limit");
    expect(response.body.meta).toHaveProperty("pages");
  });

  it("should deny PATIENT access to list patients", async () => {
    const response = await request(app)
      .get("/api/admin/patients")
      .set("Authorization", `Bearer ${patientToken}`)
      .query({
        page: "1",
        limit: "10",
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain("Permisos insuficientes");
  });
});
