// tests/unit/controllers/authController.unit.test.ts
import * as AuthService from "../../../src/services/authService";
import * as AuthController from "../../../src/controllers/authController";
import { createMockResponse } from "../helpers/mockResponse";

jest.mock("@/services/authService");

const mockedAuthService = AuthService as unknown as jest.Mocked<
  typeof AuthService
>;

describe("authController (unit)", () => {
  describe("register", () => {
    it("returns 409 if email exists", async () => {
      const req: any = { body: { email: "a@test.com" } };
      const res = createMockResponse();

      mockedAuthService.findUserByEmail.mockResolvedValue({ id: "x" } as any);

      await AuthController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Email ya registrado",
      });
    });

    it("returns 409 if rut exists", async () => {
      const req: any = { body: { email: "a@test.com", rut: "12.3" } };
      const res = createMockResponse();

      mockedAuthService.findUserByEmail.mockResolvedValue(null as any);
      mockedAuthService.findUserByRut.mockResolvedValue({ id: "u" } as any);

      await AuthController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "RUT ya registrado",
      });
    });

    it("creates user and returns token + user", async () => {
      const req: any = {
        body: {
          firstName: "A",
          lastName: "B",
          email: "a@test.com",
          password: "p",
          rut: "12.3",
        },
      };
      const res = createMockResponse();

      const created = {
        id: "1",
        firstName: "A",
        lastName: "B",
        email: "a@test.com",
        rut: "12.3",
        role: "PATIENT",
      };
      mockedAuthService.findUserByEmail.mockResolvedValue(null as any);
      mockedAuthService.findUserByRut.mockResolvedValue(null as any);
      mockedAuthService.createUser.mockResolvedValue(created as any);
      mockedAuthService.generateToken.mockReturnValue("token-123");
      // mockImplementation devuelve DTO completo (sin errores de TS)
      mockedAuthService.mapUserToDto.mockImplementation((u: any) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone ?? "",
        rut: u.rut,
        role: "patient",
        isActive: u.isActive ?? true,
        createdAt: (u.createdAt ?? new Date()).toISOString(),
        updatedAt: (u.updatedAt ?? new Date()).toISOString(),
        gender: u.gender ?? undefined,
        birthDate: u.birthDate
          ? new Date(u.birthDate).toISOString()
          : undefined,
        address: u.address ?? undefined,
      }));

      await AuthController.register(req, res);

      expect(mockedAuthService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "A",
          lastName: "B",
          email: "a@test.com",
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Registro exitoso",
          data: {
            token: "token-123",
            user: expect.objectContaining({
              id: "1",
              email: "a@test.com",
              firstName: "A",
              lastName: "B",
              rut: "12.3",
            }),
          },
        })
      );
    });

    it("returns 500 on unexpected error", async () => {
      const req: any = { body: {} };
      const res = createMockResponse();

      mockedAuthService.findUserByEmail.mockRejectedValue(new Error("boom"));

      await AuthController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Error de servidor",
      });
    });
  });

  describe("login", () => {
    it("returns 401 if user not found", async () => {
      const req: any = { body: { rut: "12.3", password: "p" } };
      const res = createMockResponse();

      mockedAuthService.findUserByRut.mockResolvedValue(null as any);

      await AuthController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Credenciales inválidas",
      });
    });

    it("returns 401 if password invalid", async () => {
      const req: any = { body: { rut: "12.3", password: "p" } };
      const res = createMockResponse();

      const user = { id: "1", password: "hash" };
      mockedAuthService.findUserByRut.mockResolvedValue(user as any);
      mockedAuthService.verifyPassword.mockResolvedValue(false);

      await AuthController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Credenciales inválidas",
      });
    });

    it("returns token and user on success", async () => {
      const req: any = { body: { rut: "12.3", password: "p" } };
      const res = createMockResponse();

      const user = {
        id: "1",
        firstName: "A",
        lastName: "B",
        email: "a@test.com",
        password: "hash",
        rut: "12.3",
        role: "PATIENT",
      };
      mockedAuthService.findUserByRut.mockResolvedValue(user as any);
      mockedAuthService.verifyPassword.mockResolvedValue(true);
      mockedAuthService.generateToken.mockReturnValue("tok-1");
      mockedAuthService.mapUserToDto.mockImplementation((u: any) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone ?? "",
        rut: u.rut,
        role: "patient",
        isActive: u.isActive ?? true,
        createdAt: (u.createdAt ?? new Date()).toISOString(),
        updatedAt: (u.updatedAt ?? new Date()).toISOString(),
        gender: u.gender ?? undefined,
        birthDate: u.birthDate
          ? new Date(u.birthDate).toISOString()
          : undefined,
        address: u.address ?? undefined,
      }));

      await AuthController.login(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Login exitoso",
          data: {
            token: "tok-1",
            user: expect.objectContaining({
              id: "1",
              email: "a@test.com",
              firstName: "A",
              lastName: "B",
              rut: "12.3",
            }),
          },
        })
      );
    });

    it("returns 500 on unexpected error", async () => {
      const req: any = { body: { rut: "12.3" } };
      const res = createMockResponse();

      mockedAuthService.findUserByRut.mockRejectedValue(new Error("boom"));

      await AuthController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Error de servidor",
      });
    });
  });
});
