// tests/unit/services/secretaryService.unit.test.ts
const mockedPrisma = {
  user: {
    create: jest.fn(),
  },
} as unknown as any;

const mockedBcrypt = {
  hash: jest.fn(),
};

jest.mock("../../../src/db/prisma", () => ({
  __esModule: true,
  default: mockedPrisma,
}));
jest.mock("bcrypt", () => mockedBcrypt);

const SecretaryService =
  require("../../../src/services/secretaryService") as typeof import("../../../src/services/secretaryService");

import { BCRYPT_SALT_ROUNDS } from "../../../src/config";

describe("secretaryService (unit)", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe("registerPatient", () => {
    const validInput = {
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

    it("creates patient successfully with all fields", async () => {
      const hashedPassword = "hashed_password";
      mockedBcrypt.hash.mockResolvedValue(hashedPassword);

      const createdUser = {
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

      mockedPrisma.user.create.mockResolvedValue(createdUser);

      const result = await SecretaryService.registerPatient(validInput);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        "SecureP@ss123",
        Number(BCRYPT_SALT_ROUNDS)
      );
      expect(mockedPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: "María",
            lastName: "González",
            email: "maria@test.com",
            password: hashedPassword,
            role: "PATIENT",
            rut: "18.234.567-8",
            phone: "+56987654321",
            gender: "F",
            address: "Av. Providencia 1234",
          }),
          select: expect.any(Object),
        })
      );
      expect(result).toEqual(createdUser);
    });

    it("forces role to PATIENT even if different role provided", async () => {
      const hashedPassword = "hashed_password";
      mockedBcrypt.hash.mockResolvedValue(hashedPassword);

      const createdUser = {
        id: "patient-uuid",
        firstName: "María",
        lastName: "González",
        email: "maria@test.com",
        role: "PATIENT",
        rut: "18.234.567-8",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedPrisma.user.create.mockResolvedValue(createdUser);

      const inputWithAdminRole = {
        ...validInput,
        role: "ADMIN" as any, // Try to create admin
      };

      await SecretaryService.registerPatient(inputWithAdminRole);

      expect(mockedPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: "PATIENT", // Should be forced to PATIENT
          }),
        })
      );
    });

    it("throws RUT_REQUIRED error when rut is missing", async () => {
      const inputWithoutRut = {
        ...validInput,
        rut: "",
      };

      await expect(
        SecretaryService.registerPatient(inputWithoutRut)
      ).rejects.toMatchObject({
        message: "RUT requerido",
        code: "RUT_REQUIRED",
      });

      expect(mockedPrisma.user.create).not.toHaveBeenCalled();
    });

    it("throws P2002 error for duplicate email", async () => {
      const hashedPassword = "hashed_password";
      mockedBcrypt.hash.mockResolvedValue(hashedPassword);

      const prismaError: any = new Error("Unique constraint failed");
      prismaError.code = "P2002";

      mockedPrisma.user.create.mockRejectedValue(prismaError);

      await expect(
        SecretaryService.registerPatient(validInput)
      ).rejects.toMatchObject({
        code: "P2002",
      });
    });

    it("throws P2002 error for duplicate RUT", async () => {
      const hashedPassword = "hashed_password";
      mockedBcrypt.hash.mockResolvedValue(hashedPassword);

      const prismaError: any = new Error("Unique constraint failed");
      prismaError.code = "P2002";

      mockedPrisma.user.create.mockRejectedValue(prismaError);

      await expect(
        SecretaryService.registerPatient(validInput)
      ).rejects.toMatchObject({
        code: "P2002",
      });
    });

    it("hashes password with bcrypt", async () => {
      const hashedPassword = "hashed_password";
      mockedBcrypt.hash.mockResolvedValue(hashedPassword);

      const createdUser = {
        id: "patient-uuid",
        firstName: "María",
        lastName: "González",
        email: "maria@test.com",
        role: "PATIENT",
        rut: "18.234.567-8",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedPrisma.user.create.mockResolvedValue(createdUser);

      await SecretaryService.registerPatient(validInput);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        "SecureP@ss123",
        Number(BCRYPT_SALT_ROUNDS)
      );
      expect(mockedPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: hashedPassword,
          }),
        })
      );
    });

    it("handles birthDate as Date object", async () => {
      const hashedPassword = "hashed_password";
      mockedBcrypt.hash.mockResolvedValue(hashedPassword);

      const createdUser = {
        id: "patient-uuid",
        firstName: "María",
        lastName: "González",
        email: "maria@test.com",
        role: "PATIENT",
        rut: "18.234.567-8",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedPrisma.user.create.mockResolvedValue(createdUser);

      const inputWithDateObject = {
        ...validInput,
        birthDate: new Date("1995-03-15"),
      };

      await SecretaryService.registerPatient(inputWithDateObject as any);

      expect(mockedPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            birthDate: expect.any(Date),
          }),
        })
      );
    });
  });
});
