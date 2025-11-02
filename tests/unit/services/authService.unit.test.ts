// tests/unit/services/authService.unit.test.ts

const mockedPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
} as unknown as any;

const mockedBcrypt = {
  hash: jest.fn(),
  compare: jest.fn(),
};

const mockedJwt = {
  sign: jest.fn(),
};

jest.mock("@/db/prisma", () => ({ __esModule: true, default: mockedPrisma }));
jest.mock("bcrypt", () => mockedBcrypt);
jest.mock("jsonwebtoken", () => mockedJwt);

const AuthService =
  require("@/services/authService") as typeof import("../../../src/services/authService");

describe("authService (unit)", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe("findUserByEmail", () => {
    it("delegates to prisma", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: "1",
        email: "a@test.com",
      });
      const u = await AuthService.findUserByEmail("a@test.com");
      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "a@test.com" },
      });
      expect(u).toEqual({ id: "1", email: "a@test.com" });
    });
  });

  describe("findUserByRut", () => {
    it("delegates to prisma", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: "1",
        rut: "12.345.678-9",
      });
      const u = await AuthService.findUserByRut("12.345.678-9");
      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { rut: "12.345.678-9" },
      });
      expect(u).toEqual({ id: "1", rut: "12.345.678-9" });
    });
  });

  describe("createUser", () => {
    it("hashes password and creates user", async () => {
      mockedBcrypt.hash.mockResolvedValue("hashed");
      mockedPrisma.user.create.mockResolvedValue({
        id: "1",
        email: "a@test.com",
      });

      const u = await AuthService.createUser({
        firstName: "A",
        lastName: "B",
        email: "a@test.com",
        password: "p",
        rut: "12.3",
      });

      expect(mockedBcrypt.hash).toHaveBeenCalledWith("p", expect.any(Number));
      expect(mockedPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: "A",
            lastName: "B",
            email: "a@test.com",
            rut: "12.3",
            password: "hashed",
          }),
        })
      );
      expect(u).toEqual({ id: "1", email: "a@test.com" });
    });
  });

  describe("verifyPassword", () => {
    it("returns compare result", async () => {
      mockedBcrypt.compare.mockResolvedValue(true);
      const ok = await AuthService.verifyPassword("plain", "hash");
      expect(mockedBcrypt.compare).toHaveBeenCalledWith("plain", "hash");
      expect(ok).toBe(true);
    });
  });

  describe("generateToken", () => {
    it("returns jwt string from sign", () => {
      mockedJwt.sign.mockReturnValue("tok-1");
      const token = AuthService.generateToken({ userId: "1" });
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { userId: "1" },
        expect.any(String),
        expect.any(Object)
      );
      expect(token).toBe("tok-1");
    });
  });

  describe("mapUserToDto", () => {
    it("maps user correctly", () => {
      const u = {
        id: "1",
        email: "a@t.com",
        firstName: "A",
        lastName: "B",
        rut: "12.3",
        role: "PATIENT",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const dto = AuthService.mapUserToDto(u);
      expect(dto).toHaveProperty("id", "1");
      expect(dto).toHaveProperty("firstName", "A");
      expect(dto).toHaveProperty("lastName", "B");
      expect(dto).toHaveProperty("rut", "12.3");
      expect(dto).toHaveProperty("role", expect.any(String));
    });
  });
});
