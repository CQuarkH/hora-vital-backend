// tests/unit/controllers/adminController.unit.test.ts - Tests for CU-07 listPatients
import * as AdminService from "../../../src/services/adminService";
import * as AdminController from "../../../src/controllers/adminController";
import { createMockResponse } from "../helpers/mockResponse";
import { Role } from "@prisma/client";

jest.mock("../../../src/services/adminService");

const mockedAdminService = AdminService as unknown as jest.Mocked<
  typeof AdminService
>;

describe("adminController - listPatients", () => {
  afterEach(() => jest.clearAllMocks());

  const mockPatients = [
    {
      id: "p1",
      firstName: "Juan",
      lastName: "Pérez",
      email: "juan@test.com",
      role: Role.PATIENT,
      rut: "12.345.678-9",
      isActive: true,
      phone: null,
      gender: null,
      birthDate: null,
      address: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it("should return paginated patient list", async () => {
    const req: any = {
      query: { page: "1", limit: "20" },
    };
    const res = createMockResponse();

    mockedAdminService.listPatients.mockResolvedValue({
      patients: mockPatients,
      meta: { total: 1, page: 1, limit: 20, pages: 1 },
    });

    await AdminController.listPatients(req, res);

    expect(res.json).toHaveBeenCalledWith({
      patients: mockPatients,
      meta: { total: 1, page: 1, limit: 20, pages: 1 },
    });
  });

  it("should filter by name", async () => {
    const req: any = {
      query: { page: "1", limit: "20", name: "Juan" },
    };
    const res = createMockResponse();

    mockedAdminService.listPatients.mockResolvedValue({
      patients: mockPatients,
      meta: { total: 1, page: 1, limit: 20, pages: 1 },
    });

    await AdminController.listPatients(req, res);

    expect(mockedAdminService.listPatients).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      name: "Juan",
      rut: undefined,
      status: undefined,
    });
  });

  it("should filter by RUT", async () => {
    const req: any = {
      query: { page: "1", limit: "20", rut: "12.345" },
    };
    const res = createMockResponse();

    mockedAdminService.listPatients.mockResolvedValue({
      patients: [],
      meta: { total: 0, page: 1, limit: 20, pages: 0 },
    });

    await AdminController.listPatients(req, res);

    expect(mockedAdminService.listPatients).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      name: undefined,
      rut: "12.345",
      status: undefined,
    });
  });

  it("should filter by status", async () => {
    const req: any = {
      query: { page: "1", limit: "20", status: "true" },
    };
    const res = createMockResponse();

    mockedAdminService.listPatients.mockResolvedValue({
      patients: mockPatients,
      meta: { total: 1, page: 1, limit: 20, pages: 1 },
    });

    await AdminController.listPatients(req, res);

    expect(mockedAdminService.listPatients).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      name: undefined,
      rut: undefined,
      status: true,
    });
  });
});
