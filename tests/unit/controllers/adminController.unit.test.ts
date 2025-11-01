import * as AdminService from "../../../src/services/adminService"
import * as AdminController from "../../../src/controllers/adminController"
import { createMockResponse } from "../helpers/mockResponse";

jest.mock("@/services/adminService");

const mockedAdminService = AdminService as unknown as jest.Mocked<
  typeof AdminService
>;

describe("adminController (unit)", () => {
  describe("listUsers", () => {
    it("returns service result", async () => {
      const req: any = { query: { page: "2", limit: "5" } };
      const res = createMockResponse();

      mockedAdminService.listUsers.mockResolvedValue({
        items: [],
        total: 0,
      } as any);

      await AdminController.listUsers(req, res);

      expect(mockedAdminService.listUsers).toHaveBeenCalledWith(2, 5);
      expect(res.json).toHaveBeenCalledWith({ items: [], total: 0 });
    });

    it("handles errors with 500 status", async () => {
      const req: any = { query: {} };
      const res = createMockResponse();

      mockedAdminService.listUsers.mockRejectedValue(new Error("boom"));

      await AdminController.listUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
    });
  });

  describe("createUser", () => {
    it("returns 201 and created user", async () => {
      const req: any = { body: { name: "A", email: "a@test.com" } };
      const res = createMockResponse();

      const created = { id: "1", name: "A", email: "a@test.com" };
      mockedAdminService.createUser.mockResolvedValue(created as any);

      await AdminController.createUser(req, res);

      expect(mockedAdminService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ name: "A", email: "a@test.com" })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(created);
    });

    it("returns 409 for P2002 unique error", async () => {
      const req: any = { body: {} };
      const res = createMockResponse();

      const err: any = new Error("unique");
      err.code = "P2002";
      mockedAdminService.createUser.mockRejectedValue(err);

      await AdminController.createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: "Email ya registrado" });
    });

    it("returns 500 for other errors", async () => {
      const req: any = { body: {} };
      const res = createMockResponse();

      mockedAdminService.createUser.mockRejectedValue(new Error("err"));

      await AdminController.createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
    });
  });

  describe("updateUser", () => {
    it("returns updated user on success", async () => {
      const req: any = { params: { id: "1" }, body: { name: "B" } };
      const res = createMockResponse();

      const updated = { id: "1", name: "B" };
      mockedAdminService.updateUser.mockResolvedValue(updated as any);

      await AdminController.updateUser(req, res);

      expect(mockedAdminService.updateUser).toHaveBeenCalledWith("1", {
        name: "B",
      });
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it("returns 409 when P2002", async () => {
      const req: any = { params: { id: "1" }, body: {} };
      const res = createMockResponse();

      const err: any = new Error("unique");
      err.code = "P2002";
      mockedAdminService.updateUser.mockRejectedValue(err);

      await AdminController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: "Email ya registrado" });
    });

    it("returns 404 when P2025", async () => {
      const req: any = { params: { id: "1" }, body: {} };
      const res = createMockResponse();

      const err: any = new Error("not found");
      err.code = "P2025";
      mockedAdminService.updateUser.mockRejectedValue(err);

      await AdminController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Usuario no encontrado",
      });
    });

    it("returns 500 for other errors", async () => {
      const req: any = { params: { id: "1" }, body: {} };
      const res = createMockResponse();

      mockedAdminService.updateUser.mockRejectedValue(new Error("err"));

      await AdminController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
    });
  });

  describe("patchStatus", () => {
    it("returns user on success", async () => {
      const req: any = { params: { id: "1" }, body: { isActive: false } };
      const res = createMockResponse();

      const out = { id: "1", isActive: false };
      mockedAdminService.setUserStatus.mockResolvedValue(out as any);

      await AdminController.patchStatus(req, res);

      expect(mockedAdminService.setUserStatus).toHaveBeenCalledWith("1", false);
      expect(res.json).toHaveBeenCalledWith(out);
    });

    it("returns 404 when P2025", async () => {
      const req: any = { params: { id: "1" }, body: { isActive: false } };
      const res = createMockResponse();

      const err: any = new Error("not found");
      err.code = "P2025";
      mockedAdminService.setUserStatus.mockRejectedValue(err);

      await AdminController.patchStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Usuario no encontrado",
      });
    });

    it("returns 500 for other errors", async () => {
      const req: any = { params: { id: "1" }, body: { isActive: false } };
      const res = createMockResponse();

      mockedAdminService.setUserStatus.mockRejectedValue(new Error("err"));

      await AdminController.patchStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error de servidor" });
    });
  });
});
