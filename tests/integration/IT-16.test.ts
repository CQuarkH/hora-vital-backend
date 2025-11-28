import request from "supertest";
import {
  getPrismaClient,
  cleanDatabase,
  TestFactory,
  generateTestToken,
} from "../test-helpers";
import { PrismaClient } from "@prisma/client";

/**
 * IT-16: Registrar Paciente (Secretario) - CU-10
 */
describe("IT-16: Registrar Paciente (Secretario)", () => {
  let prisma: PrismaClient;
  let app: any;
  let secretaryId: string;
  let secretaryToken: string;
  let patientToken: string;
  let adminToken: string;

  beforeAll(async () => {
    prisma = getPrismaClient();
    const appModule = await import("../../src/app");
    app = appModule.default || (appModule as any).app;
  });

  beforeEach(async () => {
    await cleanDatabase();
    prisma = getPrismaClient();

    // Create secretary user
    const secretary = await prisma.user.create({
      data: {
        ...TestFactory.createPatient({
          role: "SECRETARY",
          email: "secretary@test.com",
        }),
      },
    });
    secretaryId = secretary.id;
    secretaryToken = generateTestToken(secretaryId);

    // Create patient user for testing authorization
    const patient = await prisma.user.create({
      data: TestFactory.createPatient({ email: "patient@test.com" }),
    });
    patientToken = generateTestToken(patient.id);

    // Create admin user for testing authorization
    const admin = await prisma.user.create({
      data: {
        ...TestFactory.createPatient({
          role: "ADMIN",
          email: "admin@test.com",
        }),
      },
    });
    adminToken = generateTestToken(admin.id);
  });

  describe("Happy Path - Successful Patient Registration", () => {
    it("debe registrar un nuevo paciente exitosamente con todos los campos", async () => {
      const patientData = {
        firstName: "María",
        lastName: "González",
        email: "maria.gonzalez@test.com",
        password: "SecureP@ss123",
        rut: "18.234.567-8",
        phone: "+56987654321",
        gender: "F",
        birthDate: "1995-03-15",
        address: "Av. Providencia 1234, Santiago",
      };

      const response = await request(app)
        .post("/api/secretary/patients")
        .set("Authorization", `Bearer ${secretaryToken}`)
        .send(patientData);

      if (response.status !== 201) {
        console.log("Error response:", response.body);
      }

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.firstName).toBe("María");
      expect(response.body.lastName).toBe("González");
      expect(response.body.email).toBe("maria.gonzalez@test.com");
      expect(response.body.role).toBe("PATIENT");
      expect(response.body.rut).toBe("18.234.567-8");
      expect(response.body.phone).toBe("+56987654321");
      expect(response.body.gender).toBe("F");
      expect(response.body.address).toBe("Av. Providencia 1234, Santiago");
      expect(response.body.isActive).toBe(true);
      expect(response.body).not.toHaveProperty("password");

      // Verify persistence in database
      const savedPatient = await prisma.user.findUnique({
        where: { id: response.body.id },
      });

      expect(savedPatient).not.toBeNull();
      expect(savedPatient?.role).toBe("PATIENT");
      expect(savedPatient?.email).toBe("maria.gonzalez@test.com");
      expect(savedPatient?.isActive).toBe(true);
    });

    it("debe registrar un paciente con solo campos requeridos", async () => {
      const minimalPatientData = {
        firstName: "Carlos",
        lastName: "Rodríguez",
        email: "carlos.rodriguez@test.com",
        password: "SecureP@ss456",
        rut: "19.345.678-9",
      };

      const response = await request(app)
        .post("/api/secretary/patients")
        .set("Authorization", `Bearer ${secretaryToken}`)
        .send(minimalPatientData);

      expect(response.status).toBe(201);
      expect(response.body.firstName).toBe("Carlos");
      expect(response.body.lastName).toBe("Rodríguez");
      expect(response.body.email).toBe("carlos.rodriguez@test.com");
      expect(response.body.role).toBe("PATIENT");
      expect(response.body.rut).toBe("19.345.678-9");
    });

    it("debe forzar el rol a PATIENT incluso si se intenta crear otro rol", async () => {
      const patientDataWithAdminRole = {
        firstName: "Intento",
        lastName: "Admin",
        email: "intento.admin@test.com",
        password: "SecureP@ss789",
        rut: "20.456.789-0",
        role: "ADMIN", // Intentar crear un admin
      };

      const response = await request(app)
        .post("/api/secretary/patients")
        .set("Authorization", `Bearer ${secretaryToken}`)
        .send(patientDataWithAdminRole);

      expect(response.status).toBe(201);
      expect(response.body.role).toBe("PATIENT"); // Debe ser PATIENT, no ADMIN
    });
  });

  describe("FA-01: Email/RUT ya registrado", () => {
    it("debe retornar 409 cuando el email ya existe", async () => {
      // Create existing patient
      await prisma.user.create({
        data: TestFactory.createPatient({
          email: "existing@test.com",
          rut: "11.111.111-1",
        }),
      });

      const duplicateEmailData = {
        firstName: "Nuevo",
        lastName: "Paciente",
        email: "existing@test.com", // Email duplicado
        password: "SecureP@ss123",
        rut: "22.222.222-2",
      };

      const response = await request(app)
        .post("/api/secretary/patients")
        .set("Authorization", `Bearer ${secretaryToken}`)
        .send(duplicateEmailData);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toMatch(/email|rut|registrado/i);
    });

    it("debe retornar 409 cuando el RUT ya existe", async () => {
      // Create existing patient
      await prisma.user.create({
        data: TestFactory.createPatient({
          email: "unique@test.com",
          rut: "33.333.333-3",
        }),
      });

      const duplicateRutData = {
        firstName: "Nuevo",
        lastName: "Paciente",
        email: "another@test.com",
        password: "SecureP@ss123",
        rut: "33.333.333-3", // RUT duplicado
      };

      const response = await request(app)
        .post("/api/secretary/patients")
        .set("Authorization", `Bearer ${secretaryToken}`)
        .send(duplicateRutData);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toMatch(/email|rut|registrado/i);
    });
  });

  describe("Validation Errors", () => {
    it("debe retornar 400 cuando falta firstName", async () => {
      const invalidData = {
        lastName: "González",
        email: "test@test.com",
        password: "SecureP@ss123",
        rut: "18.234.567-8",
      };

      const response = await request(app)
        .post("/api/secretary/patients")
        .set("Authorization", `Bearer ${secretaryToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toMatch(/validation/i);
    });

    it("debe retornar 400 cuando falta lastName", async () => {
      const invalidData = {
        firstName: "María",
        email: "test@test.com",
        password: "SecureP@ss123",
        rut: "18.234.567-8",
      };

      const response = await request(app)
        .post("/api/secretary/patients")
        .set("Authorization", `Bearer ${secretaryToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toMatch(/validation/i);
    });

    it("debe retornar 400 cuando el email es inválido", async () => {
      const invalidData = {
        firstName: "María",
        lastName: "González",
        email: "invalid-email",
        password: "SecureP@ss123",
        rut: "18.234.567-8",
      };

      const response = await request(app)
        .post("/api/secretary/patients")
        .set("Authorization", `Bearer ${secretaryToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toMatch(/validation/i);
    });

    it("debe retornar 400 cuando la contraseña es débil", async () => {
      const invalidData = {
        firstName: "María",
        lastName: "González",
        email: "test@test.com",
        password: "weak",
        rut: "18.234.567-8",
      };

      const response = await request(app)
        .post("/api/secretary/patients")
        .set("Authorization", `Bearer ${secretaryToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toMatch(/validation/i);
    });

    it("debe retornar 400 cuando falta RUT", async () => {
      const invalidData = {
        firstName: "María",
        lastName: "González",
        email: "test@test.com",
        password: "SecureP@ss123",
      };

      const response = await request(app)
        .post("/api/secretary/patients")
        .set("Authorization", `Bearer ${secretaryToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toMatch(/validation/i);
    });
  });

  describe("Authentication and Authorization", () => {
    it("debe retornar 401 sin token de autenticación", async () => {
      const patientData = {
        firstName: "María",
        lastName: "González",
        email: "test@test.com",
        password: "SecureP@ss123",
        rut: "18.234.567-8",
      };

      const response = await request(app)
        .post("/api/secretary/patients")
        .send(patientData);

      expect(response.status).toBe(401);
    });

    it("debe retornar 403 cuando un paciente intenta registrar otro paciente", async () => {
      const patientData = {
        firstName: "María",
        lastName: "González",
        email: "test@test.com",
        password: "SecureP@ss123",
        rut: "18.234.567-8",
      };

      const response = await request(app)
        .post("/api/secretary/patients")
        .set("Authorization", `Bearer ${patientToken}`)
        .send(patientData);

      expect(response.status).toBe(403);
    });

    it("debe denegar acceso a admin en endpoint de secretario", async () => {
      const patientData = {
        firstName: "María",
        lastName: "González",
        email: "admin.created@test.com",
        password: "SecureP@ss123",
        rut: "18.234.567-8",
      };

      const response = await request(app)
        .post("/api/secretary/patients")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(patientData);

      // Admin should NOT be able to use secretary endpoint
      expect(response.status).toBe(403);
    });
  });

  describe("Patient Login After Registration", () => {
    it("debe permitir que el paciente recién creado inicie sesión", async () => {
      const patientData = {
        firstName: "María",
        lastName: "González",
        email: "newpatient@test.com",
        password: "SecureP@ss123",
        rut: "18.234.567-8",
      };

      // Register patient
      const registerResponse = await request(app)
        .post("/api/secretary/patients")
        .set("Authorization", `Bearer ${secretaryToken}`)
        .send(patientData);

      expect(registerResponse.status).toBe(201);

      // Try to login with the new credentials
      const loginResponse = await request(app)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send({
          rut: "18.234.567-8",
          password: "SecureP@ss123",
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty("data");
      expect(loginResponse.body.data).toHaveProperty("token");
      expect(loginResponse.body.data).toHaveProperty("user");
      expect(loginResponse.body.data.user.email).toBe("newpatient@test.com");
      // The role returned might be lowercase "patient" or uppercase "PATIENT" depending on how it's stored/returned
      expect(loginResponse.body.data.user.role.toUpperCase()).toBe("PATIENT");
    });
  });
});
