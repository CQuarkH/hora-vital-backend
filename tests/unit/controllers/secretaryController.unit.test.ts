import * as SecretaryService from "../../../src/services/secretaryService";
import * as SecretaryController from "../../../src/controllers/secretaryController";
import { createMockResponse } from "../helpers/mockResponse";

jest.mock("../../../src/services/secretaryService");
const mockedSecretaryService = SecretaryService as unknown as jest.Mocked<
  typeof SecretaryService
>;

describe("secretaryController (unit)", () => {
  afterEach(() => jest.clearAllMocks());

  describe("registerPatient", () => {
    it("returns 201 and created patient on success", async () => {
      const req: any = {
        body: {
          firstName: "María",
          lastName: "González",
          email: "maria@test.com",
          password: "SecureP@ss123",
          rut: "18.234.567-8",
          phone: "+56987654321",
          gender: "F",
          birthDate: "1995-03-15",
          address: "Av. Providencia 1234",
        },
      };
      const res = createMockResponse();

      const createdPatient = {
        id: "patient-uuid",
        firstName: "María",
        lastName: "González",
        email: "maria@test.com",
        role: "PATIENT",
        rut: "18.234.567-8",
        phone: "+56987654321",
        gender: "F",
        birthDate: new Date("1995-03-15"),
        address: "Av. Providencia 1234",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedSecretaryService.registerPatient.mockResolvedValue(
        createdPatient as any
      );

      await SecretaryController.registerPatient(req, res);

      expect(mockedSecretaryService.registerPatient).toHaveBeenCalledWith(
        req.body
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(createdPatient);
    });

    it("returns 409 for duplicate email (P2002)", async () => {
      const req: any = {
        body: {
          firstName: "María",
          lastName: "González",
          email: "duplicate@test.com",
          password: "SecureP@ss123",
          rut: "18.234.567-8",
        },
      };
      const res = createMockResponse();

      const err: any = new Error("Email or RUT already exists");
      err.code = "P2002";
      mockedSecretaryService.registerPatient.mockRejectedValue(err);

      await SecretaryController.registerPatient(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: "Email o RUT ya registrado",
      });
    });

    it("returns 409 for duplicate RUT (P2002)", async () => {
      const req: any = {
        body: {
          firstName: "María",
          lastName: "González",
          email: "maria@test.com",
          password: "SecureP@ss123",
          rut: "18.234.567-8",
        },
      };
      const res = createMockResponse();

      const err: any = new Error("Email or RUT already exists");
      err.code = "P2002";
      mockedSecretaryService.registerPatient.mockRejectedValue(err);

      await SecretaryController.registerPatient(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: "Email o RUT ya registrado",
      });
    });

    it("returns 400 when RUT is missing (RUT_REQUIRED)", async () => {
      const req: any = {
        body: {
          firstName: "María",
          lastName: "González",
          email: "maria@test.com",
          password: "SecureP@ss123",
        },
      };
      const res = createMockResponse();

      const err: any = new Error("RUT requerido");
      err.code = "RUT_REQUIRED";
      mockedSecretaryService.registerPatient.mockRejectedValue(err);

      await SecretaryController.registerPatient(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "RUT requerido" });
    });

    it("returns 500 for system errors", async () => {
      const req: any = {
        body: {
          firstName: "María",
          lastName: "González",
          email: "maria@test.com",
          password: "SecureP@ss123",
          rut: "18.234.567-8",
        },
      };
      const res = createMockResponse();

      const err = new Error("Database connection failed");
      mockedSecretaryService.registerPatient.mockRejectedValue(err);

      await SecretaryController.registerPatient(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
    });

    it("returns 500 for unknown errors", async () => {
      const req: any = {
        body: {
          firstName: "María",
          lastName: "González",
          email: "maria@test.com",
          password: "SecureP@ss123",
          rut: "18.234.567-8",
        },
      };
      const res = createMockResponse();

      mockedSecretaryService.registerPatient.mockRejectedValue(
        new Error("Unknown error")
      );

      await SecretaryController.registerPatient(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
    });
  });
});
