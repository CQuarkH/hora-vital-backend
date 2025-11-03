// tests/unit/middleware/authorize.unit.test.ts
import { authorizeRoles } from "../../../src/middlewares/authorize";
import { createMockResponse } from "../helpers/mockResponse";

describe("authorizeRoles middleware (unit)", () => {
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when no user present", () => {
    const req: any = { user: undefined };
    const res = createMockResponse();

    const mw = authorizeRoles("ADMIN");
    mw(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "No autorizado" });
  });

  it("returns 403 when role not permitted", () => {
    const req: any = { user: { id: "1", role: "PATIENT" } };
    const res = createMockResponse();

    const mw = authorizeRoles("ADMIN", "SECRETARY");
    mw(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Permisos insuficientes",
    });
  });

  it("calls next when role permitted (case-insensitive)", () => {
    const req: any = { user: { id: "1", role: "patient" } };
    const res = createMockResponse();

    const mw = authorizeRoles("PATIENT", "ADMIN");
    mw(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("handles enum role values as well", () => {
    const req: any = { user: { id: "1", role: "SECRETARY" } };
    const res = createMockResponse();

    const mw = authorizeRoles("secretary");
    mw(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
