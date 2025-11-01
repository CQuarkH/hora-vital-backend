// tests/unit/services/profileService.unit.test.ts

const mockedPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
} as unknown as any;

const mockedBcrypt = {
  hash: jest.fn(),
};

jest.mock("@/db/prisma", () => ({ __esModule: true, default: mockedPrisma }));
jest.mock("bcrypt", () => mockedBcrypt);

const ProfileService =
  require("@/services/profileService") as typeof import("../../../src/services/profileService");

import { BCRYPT_SALT_ROUNDS } from "../../../src/config";

describe("profileService (unit)", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe("getProfile", () => {
    it("returns user from prisma", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ id: "1", name: "A" });
      const u = await ProfileService.getProfile("1");
      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "1" } })
      );
      expect(u).toEqual({ id: "1", name: "A" });
    });
  });

  describe("updateOwnProfile", () => {
    it("hashes password when provided and updates", async () => {
      mockedBcrypt.hash.mockResolvedValue("hashed-new");
      const updated = { id: "1", name: "B" };
      mockedPrisma.user.update.mockResolvedValue(updated);

      const out = await ProfileService.updateOwnProfile("1", {
        name: "B",
        password: "newpass",
      });

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        "newpass",
        Number(BCRYPT_SALT_ROUNDS)
      );
      expect(mockedPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "1" },
          data: expect.objectContaining({ name: "B", password: "hashed-new" }),
          select: expect.any(Object),
        })
      );
      expect(out).toEqual(updated);
    });

    it("rethrows P2002 with code", async () => {
      mockedBcrypt.hash.mockResolvedValue("h");
      mockedPrisma.user.update.mockRejectedValue({ code: "P2002" });

      await expect(
        ProfileService.updateOwnProfile("1", { email: "x@test.com" })
      ).rejects.toMatchObject({ code: "P2002" });
    });
  });
});
