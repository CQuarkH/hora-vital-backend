// tests/unit/controllers/profileController.unit.test.ts
import * as ProfileService from "../../../src/services/profileService";
import * as ProfileController from "../../../src/controllers/profileController";
import { createMockResponse } from "../helpers/mockResponse";

jest.mock("../../../src/services/profileService");

const mockedProfileService = ProfileService as unknown as jest.Mocked<
  typeof ProfileService
>;

describe("profileController (unit)", () => {
  afterEach(() => jest.clearAllMocks());

  describe("getProfile", () => {
    it("returns 401 when not authenticated", async () => {
      const req: any = { user: undefined };
      const res = createMockResponse();

      await ProfileController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "No autorizado" });
    });

    it("returns 404 when user not found", async () => {
      const req: any = { user: { id: "1" } };
      const res = createMockResponse();

      mockedProfileService.getProfile.mockResolvedValue(null as any);

      await ProfileController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Usuario no encontrado",
      });
    });

    it("returns user on success", async () => {
      const req: any = { user: { id: "1" } };
      const res = createMockResponse();

      const user = { id: "1", firstName: "A", lastName: "B" };
      mockedProfileService.getProfile.mockResolvedValue(user as any);

      await ProfileController.getProfile(req, res);

      expect(res.json).toHaveBeenCalledWith(user);
    });

    it("returns 500 on unexpected error", async () => {
      const req: any = { user: { id: "1" } };
      const res = createMockResponse();

      mockedProfileService.getProfile.mockRejectedValue(new Error("boom"));

      await ProfileController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
    });
  });

  describe("updateProfile", () => {
    it("returns 401 when not authenticated", async () => {
      const req: any = { user: undefined };
      const res = createMockResponse();

      await ProfileController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "No autorizado" });
    });

    it("returns 403 when trying to edit another user", async () => {
      const req: any = { user: { id: "1" }, body: { id: "2" } };
      const res = createMockResponse();

      await ProfileController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "No puedes editar el perfil de otro usuario",
      });
    });

    it("returns 409 when unique constraint error", async () => {
      const req: any = { user: { id: "1" }, body: { email: "a@test.com" } };
      const res = createMockResponse();

      const err: any = new Error("unique");
      err.code = "P2002";
      mockedProfileService.updateOwnProfile.mockRejectedValue(err);

      await ProfileController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: "Email ya registrado" });
    });

    it("returns 404 when P2025", async () => {
      const req: any = { user: { id: "1" }, body: {} };
      const res = createMockResponse();

      const err: any = new Error("not found");
      err.code = "P2025";
      mockedProfileService.updateOwnProfile.mockRejectedValue(err);

      await ProfileController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Usuario no encontrado",
      });
    });

    it("returns updated user on success", async () => {
      const req: any = { user: { id: "1" }, body: { firstName: "B" } };
      const res = createMockResponse();

      const updated = { id: "1", firstName: "B" };
      mockedProfileService.updateOwnProfile.mockResolvedValue(updated as any);

      await ProfileController.updateProfile(req, res);

      expect(mockedProfileService.updateOwnProfile).toHaveBeenCalledWith("1", {
        firstName: "B",
        lastName: undefined,
        email: undefined,
        phone: undefined,
        password: undefined,
      });

      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it("returns 500 on unexpected error", async () => {
      const req: any = { user: { id: "1" }, body: {} };
      const res = createMockResponse();

      mockedProfileService.updateOwnProfile.mockRejectedValue(
        new Error("boom")
      );

      await ProfileController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
    });
  });
});
