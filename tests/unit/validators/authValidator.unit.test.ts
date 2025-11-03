// tests/unit/validators/authValidator.unit.test.ts
import {
  validate,
  registerSchema,
  loginSchema,
} from "../../../src/validators/authValidator";
import { createMockResponse } from "../helpers/mockResponse";

describe("authValidator (unit)", () => {
  const next = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("registerSchema: permite datos válidos", () => {
    const req: any = {
      body: {
        firstName: "Juan",
        lastName: "Perez",
        email: "j@t.com",
        password: "Aa123456",
        rut: "12.345.678-9",
        phone: "12345",
      },
    };
    const res = createMockResponse();
    const middleware = validate(registerSchema);
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("registerSchema: rechaza cuando falta firstName", () => {
    const req: any = {
      body: {
        lastName: "Perez",
        email: "j@t.com",
        password: "Aa123456",
        rut: "12.345.678-9",
      },
    };
    const res = createMockResponse();
    const middleware = validate(registerSchema);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
  });

  it("loginSchema: acepta rut + password válidos", () => {
    const req: any = { body: { rut: "12.345.678-9", password: "Aa123456" } };
    const res = createMockResponse();
    const middleware = validate(loginSchema);
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("loginSchema: rechaza si falta rut", () => {
    const req: any = { body: { password: "Aa123456" } };
    const res = createMockResponse();
    const middleware = validate(loginSchema);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
  });
});
