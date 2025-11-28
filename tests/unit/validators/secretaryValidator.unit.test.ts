import { registerPatientSchema, validate } from "../../../src/validators/secretaryValidator";

describe("secretaryValidator (unit)", () => {
  describe("registerPatientSchema", () => {
    it("validates correct patient data", () => {
      const validData = {
        firstName: "María",
        lastName: "González",
        email: "maria@test.com",
        password: "SecureP@ss123",
        rut: "18.234.567-8",
        phone: "+56987654321",
        gender: "F",
        birthDate: "1995-03-15",
        address: "Av. Providencia 1234",
      };
      const result = registerPatientSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("fails when required fields are missing", () => {
      const invalidData = {
        firstName: "María",
      };
      const result = registerPatientSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("validate middleware", () => {
    it("calls next() when validation passes", () => {
      const req: any = {
        body: {
          firstName: "María",
          lastName: "González",
          email: "maria@test.com",
          password: "SecureP@ss123",
          rut: "18.234.567-8",
        },
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      const middleware = validate(registerPatientSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("returns 400 when validation fails", () => {
      const req: any = {
        body: {
          firstName: "María",
        },
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      const middleware = validate(registerPatientSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });
});
