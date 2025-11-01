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

  describe("createUser", () => {
    it("hashes password and creates user", async () => {
      mockedBcrypt.hash.mockResolvedValue("hashed");
      mockedPrisma.user.create.mockResolvedValue({
        id: "1",
        email: "a@test.com",
      });

      const u = await AuthService.createUser({
        name: "A",
        email: "a@test.com",
        password: "p",
      });

      expect(mockedBcrypt.hash).toHaveBeenCalledWith("p", expect.any(Number));
      expect(mockedPrisma.user.create).toHaveBeenCalled();
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
      expect(mockedJwt.sign).toHaveBeenCalled();
      expect(token).toBe("tok-1");
    });
  });
});
