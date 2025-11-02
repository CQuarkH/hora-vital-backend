// tests/unit/validators/profileValidator.unit.test.ts
import { validate, profileUpdateSchema } from "../../../src/validators/profileValidator";
import { createMockResponse } from "../helpers/mockResponse";

describe("profileValidator (unit)", () => {
  const next = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("accepts valid partial payload (firstName)", () => {
    const req: any = { body: { firstName: "Juan" } };
    const res = createMockResponse();
    const mw = validate(profileUpdateSchema);
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("accepts valid partial payload (email)", () => {
    const req: any = { body: { email: "a@test.com" } };
    const res = createMockResponse();
    const mw = validate(profileUpdateSchema);
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("rejects invalid email", () => {
    const req: any = { body: { email: "invalid" } };
    const res = createMockResponse();
    const mw = validate(profileUpdateSchema);
    mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Validation error" })
    );
  });

  it("rejects invalid password (too short / no caps)", () => {
    const req: any = { body: { password: "short" } };
    const res = createMockResponse();
    const mw = validate(profileUpdateSchema);
    mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Validation error" })
    );
  });
});
