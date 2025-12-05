// tests/unit/validators/appointmentValidator.unit.test.ts
import {
  validate,
  validateQuery,
  createAppointmentSchema,
  appointmentAvailabilitySchema,
  myAppointmentsSchema,
  cancelAppointmentSchema,
} from "../../../src/validators/appointmentValidator";
import { createMockResponse } from "../helpers/mockResponse";

describe("appointmentValidator (unit)", () => {
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createAppointmentSchema via middleware", () => {
    it("accepts valid payload", () => {
      const req: any = {
        body: {
          doctorProfileId: "d1",
          specialtyId: "s1",
          appointmentDate: new Date(
            Date.now() + 1000 * 60 * 60 * 24
          ).toISOString(), // tomorrow
          startTime: "10:00",
          notes: "test",
        },
      };
      const res = createMockResponse();
      const mw = validate(createAppointmentSchema);
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("rejects invalid date (past)", () => {
      const req: any = {
        body: {
          doctorProfileId: "d1",
          specialtyId: "s1",
          appointmentDate: new Date(
            Date.now() - 1000 * 60 * 60 * 24
          ).toISOString(),
          startTime: "10:00",
        },
      };
      const res = createMockResponse();
      const mw = validate(createAppointmentSchema);
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Validation error" })
      );
    });

    it("rejects invalid time format", () => {
      const req: any = {
        body: {
          doctorProfileId: "d1",
          specialtyId: "s1",
          appointmentDate: new Date(
            Date.now() + 1000 * 60 * 60 * 24
          ).toISOString(),
          startTime: "25:00",
        },
      };
      const res = createMockResponse();
      const mw = validate(createAppointmentSchema);
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("appointmentAvailabilitySchema via query validator", () => {
    it("accepts empty query", () => {
      const req: any = { query: {} };
      const res = createMockResponse();
      const mw = validateQuery(appointmentAvailabilitySchema);
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("accepts valid date query", () => {
      const req: any = {
        query: {
          date: new Date().toISOString().split("T")[0],
          specialtyId: "s1",
        },
      };
      const res = createMockResponse();
      const mw = validateQuery(appointmentAvailabilitySchema);
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("rejects invalid date query", () => {
      const req: any = { query: { date: "not-a-date" } };
      const res = createMockResponse();
      const mw = validateQuery(appointmentAvailabilitySchema);
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("myAppointmentsSchema via query validator", () => {
    it("accepts valid filters", () => {
      const req: any = {
        query: {
          status: "SCHEDULED",
          dateFrom: "2025-12-01",
          dateTo: "2025-12-31",
        },
      };
      const res = createMockResponse();
      const mw = validateQuery(myAppointmentsSchema);
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("rejects invalid status value", () => {
      const req: any = { query: { status: "INVALID" } };
      const res = createMockResponse();
      const mw = validateQuery(myAppointmentsSchema);
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("cancelAppointmentSchema via middleware", () => {
    it("accepts valid cancellation reason", () => {
      const req: any = { body: { cancellationReason: "No puedo asistir" } };
      const res = createMockResponse();
      const mw = validate(cancelAppointmentSchema);
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("rejects empty cancellation reason", () => {
      const req: any = { body: { cancellationReason: "" } };
      const res = createMockResponse();
      const mw = validate(cancelAppointmentSchema);
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("updateAppointmentSchema via middleware", () => {
    const { updateAppointmentSchema } =
      require("../../../src/validators/appointmentValidator");

    it("accepts partial updates", () => {
      const req: any = { body: { notes: "Updated notes only" } };
      const res = createMockResponse();
      const mw = validate(updateAppointmentSchema);
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("validates date format if provided", () => {
      const req: any = {
        body: {
          appointmentDate: new Date(
            Date.now() + 1000 * 60 * 60 * 24
          ).toISOString(),
        },
      };
      const res = createMockResponse();
      const mw = validate(updateAppointmentSchema);
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("validates time format if provided", () => {
      const invalidReq: any = { body: { startTime: "25:00" } };
      const res = createMockResponse();
      const mw = validate(updateAppointmentSchema);
      mw(invalidReq, res, next);
      expect(res.status).toHaveBeenCalledWith(400);

      jest.clearAllMocks();
      const validReq: any = { body: { startTime: "14:30" } };
      const res2 = createMockResponse();
      mw(validReq, res2, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("calendarAvailabilitySchema via query validator", () => {
    const { calendarAvailabilitySchema } =
      require("../../../src/validators/calendarValidator");
    const { validateQuery: calValidateQuery } =
      require("../../../src/validators/calendarValidator");

    it("validates valid date range", () => {
      const req: any = {
        query: {
          startDate: "2025-12-01",
          endDate: "2025-12-07",
        },
      };
      const res = createMockResponse();
      const mw = calValidateQuery(calendarAvailabilitySchema);
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("rejects invalid date formats", () => {
      const req: any = {
        query: {
          startDate: "invalid",
          endDate: "2025-12-07",
        },
      };
      const res = createMockResponse();
      const mw = calValidateQuery(calendarAvailabilitySchema);
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("validates optional filters", () => {
      const req: any = {
        query: {
          startDate: "2025-12-01",
          endDate: "2025-12-07",
          doctorProfileId: "doctor-123",
          specialtyId: "specialty-456",
        },
      };
      const res = createMockResponse();
      const mw = calValidateQuery(calendarAvailabilitySchema);
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
