// tests/unit/middlewares/authMiddleware.unit.test.ts
import { authenticate } from "../../../src/middlewares/authMiddleware";
import { createMockResponse } from "../helpers/mockResponse";
import * as jwt from "jsonwebtoken";

jest.mock("../../../src/db/prisma", () => {
  const findUnique = jest.fn();
  return {
    __esModule: true,
    default: {
      user: {
        findUnique,
      },
    },
    __mock: {
      user: {
        findUnique,
      },
    },
  };
});

jest.mock("jsonwebtoken");

const prismaModule = require("../../../src/db/prisma");
const mockedPrisma = prismaModule.default as any;

const mockVerify = (impl: (...args: any[]) => any) => {
  (jwt.verify as unknown as jest.Mock).mockImplementation(impl);
};

describe("authMiddleware (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 if no Authorization header", async () => {
    const req: any = { headers: {} };
    const res = createMockResponse();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "No autorizado" });
  });

  it("returns 401 if token invalid (jwt.verify throws)", async () => {
    const req: any = { headers: { authorization: "Bearer badtoken" } };
    const res = createMockResponse();
    const next = jest.fn();

    mockVerify(() => {
      throw new Error("invalid");
    });

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Token inválido" });
  });

  it("returns 401 if token has no userId", async () => {
    const req: any = { headers: { authorization: "Bearer tok" } };
    const res = createMockResponse();
    const next = jest.fn();

    mockVerify(() => ({ foo: "bar" }));

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Token inválido" });
  });

  it("returns 401 if user not found or not active", async () => {
    const req: any = { headers: { authorization: "Bearer tok" } };
    const res = createMockResponse();
    const next = jest.fn();

    mockVerify(() => ({ userId: "u1" }));

    // CASE 1: user not found
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Usuario no válido" });

    jest.clearAllMocks();

    // CASE 2: user found but inactive
    mockVerify(() => ({ userId: "u1" }));
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      isActive: false,
    });
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Usuario no válido" });
  });

  it("calls next and sets req.user on success", async () => {
    const req: any = { headers: { authorization: "Bearer tok" } };
    const res = createMockResponse();
    const next = jest.fn();

    mockVerify(() => ({ userId: "u1" }));
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      isActive: true,
      role: "PATIENT",
    });

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: "u1", role: "PATIENT" });
  });

  it("returns 500 on unexpected error", async () => {
    const req: any = { headers: { authorization: "Bearer tok" } };
    const res = createMockResponse();
    const next = jest.fn();

    mockVerify(() => ({ userId: "u1" }));
    mockedPrisma.user.findUnique.mockRejectedValue(new Error("boom"));

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
  });
});
