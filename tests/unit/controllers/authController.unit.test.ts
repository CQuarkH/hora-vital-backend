import * as AuthService from "../../../src/services/authService"
import * as AuthController from "../../../src/controllers/authController"
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
      expect(res.json).toHaveBeenCalledWith({ message: "Email ya registrado" });
    });

    it("creates user and returns token + user", async () => {
      const req: any = {
        body: { name: "A", email: "a@test.com", password: "p" },
      };
      const res = createMockResponse();

      const created = {
        id: "1",
        name: "A",
        email: "a@test.com",
        role: "PATIENT",
      };
      mockedAuthService.findUserByEmail.mockResolvedValue(null as any);
      mockedAuthService.createUser.mockResolvedValue(created as any);
      mockedAuthService.generateToken.mockReturnValue("token-123");

      await AuthController.register(req, res);

      expect(mockedAuthService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ name: "A", email: "a@test.com" })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: "token-123",
          user: { id: "1", name: "A", email: "a@test.com", role: "PATIENT" },
        })
      );
    });

    it("returns 500 on unexpected error", async () => {
      const req: any = { body: {} };
      const res = createMockResponse();

      mockedAuthService.findUserByEmail.mockRejectedValue(new Error("boom"));

      await AuthController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
    });
  });

  describe("login", () => {
    it("returns 401 if user not found", async () => {
      const req: any = { body: { email: "a@test.com" } };
      const res = createMockResponse();

      mockedAuthService.findUserByEmail.mockResolvedValue(null as any);

      await AuthController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Credenciales inválidas",
      });
    });

    it("returns 401 if password invalid", async () => {
      const req: any = { body: { email: "a@test.com", password: "p" } };
      const res = createMockResponse();

      const user = { id: "1", password: "hash" };
      mockedAuthService.findUserByEmail.mockResolvedValue(user as any);
      mockedAuthService.verifyPassword.mockResolvedValue(false);

      await AuthController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Credenciales inválidas",
      });
    });

    it("returns token and user on success", async () => {
      const req: any = { body: { email: "a@test.com", password: "p" } };
      const res = createMockResponse();

      const user = {
        id: "1",
        name: "A",
        email: "a@test.com",
        password: "hash",
        role: "PATIENT",
      };
      mockedAuthService.findUserByEmail.mockResolvedValue(user as any);
      mockedAuthService.verifyPassword.mockResolvedValue(true);
      mockedAuthService.generateToken.mockReturnValue("tok-1");

      await AuthController.login(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: "tok-1",
          user: { id: "1", name: "A", email: "a@test.com", role: "PATIENT" },
        })
      );
    });

    it("returns 500 on unexpected error", async () => {
      const req: any = { body: { email: "a@test.com" } };
      const res = createMockResponse();

      mockedAuthService.findUserByEmail.mockRejectedValue(new Error("boom"));

      await AuthController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
    });
  });
});
