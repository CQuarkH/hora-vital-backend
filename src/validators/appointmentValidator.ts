import { z } from "zod";
import { Request, Response, NextFunction } from "express";

export const createAppointmentSchema = z.object({
  doctorProfileId: z.string().min(1, "ID de médico requerido"),
  specialtyId: z.string().min(1, "ID de especialidad requerido"),
  appointmentDate: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed > new Date();
  }, "Fecha de cita debe ser válida y futura"),
  startTime: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Formato de hora inválido (HH:mm)",
    ),
  notes: z.string().optional(),
});

export const appointmentAvailabilitySchema = z.object({
  date: z
    .string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, "Fecha inválida"),
  specialtyId: z.string().min(1, "ID de especialidad inválido").optional(),
  doctorProfileId: z.string().min(1, "ID de médico inválido").optional(),
});

export const myAppointmentsSchema = z.object({
  status: z.enum(["SCHEDULED", "CANCELLED", "COMPLETED", "NO_SHOW"]).optional(),
  dateFrom: z
    .string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, "Fecha desde inválida"),
  dateTo: z
    .string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, "Fecha hasta inválida"),
});

export const cancelAppointmentSchema = z.object({
  cancellationReason: z.string().min(1, "Motivo de cancelación requerido"),
});

export const validate =
  (schema: z.ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      return next();
    } catch (err) {
      const e = err as any;
      if (e?.errors) {
        const messages = e.errors.map((it: any) => it.message);
        return res
          .status(400)
          .json({ message: "Validation error", errors: messages });
      }
      return res.status(400).json({ message: "Validation error" });
    }
  };

export const validateQuery =
  (schema: z.ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      return next();
    } catch (err) {
      const e = err as any;
      if (e?.errors) {
        const messages = e.errors.map((it: any) => it.message);
        return res
          .status(400)
          .json({ message: "Validation error", errors: messages });
      }
      return res.status(400).json({ message: "Validation error" });
    }
  };
