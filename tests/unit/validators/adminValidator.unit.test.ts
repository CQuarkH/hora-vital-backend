// tests/unit/validators/adminValidator.unit.test.ts
import {
  validate,
  adminCreateSchema,
  adminUpdateSchema,
  statusSchema,
} from "../../../src/validators/adminValidator";
import { createMockResponse } from "../helpers/mockResponse";

describe("adminValidator (unit)", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("adminCreateSchema accepts valid payload", () => {
    const next = jest.fn();
    const req: any = {
      body: {
        firstName: "Juan",
        lastName: "Perez",
        email: "j@t.com",
        password: "Aa123456",
        role: "PATIENT",
        rut: "20.123.456-7",
      },
    };
    const res = createMockResponse();
    const mw = validate(adminCreateSchema);
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("adminCreateSchema rejects missing firstName", () => {
    const next = jest.fn();
    const req: any = {
      body: {
        lastName: "Perez",
        email: "j@t.com",
        password: "Aa123456",
        rut: "20.123.456-7",
      },
    };
    const res = createMockResponse();
    const mw = validate(adminCreateSchema);
    mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
  });

  it("adminUpdateSchema accepts partial update", () => {
    const next = jest.fn();
    const req: any = { body: { email: "x@y.com" } };
    const res = createMockResponse();
    const mw = validate(adminUpdateSchema);
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("statusSchema accepts boolean", () => {
    const next = jest.fn();
    const req: any = { body: { isActive: true } };
    const res = createMockResponse();
    const mw = validate(statusSchema);
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("statusSchema rejects missing isActive", () => {
    const next = jest.fn();
    const req: any = { body: {} };
    const res = createMockResponse();
    const mw = validate(statusSchema);
    mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
  });
});
