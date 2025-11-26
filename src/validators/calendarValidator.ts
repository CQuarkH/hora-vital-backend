// src/validators/calendarValidator.ts
import { z } from "zod";
import { Request, Response, NextFunction } from "express";

export const calendarAvailabilitySchema = z.object({
  startDate: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, "Fecha inicial inválida"),
  endDate: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, "Fecha final inválida"),
  doctorProfileId: z.string().min(1, "ID de médico inválido").optional(),
  specialtyId: z.string().min(1, "ID de especialidad inválido").optional(),
});

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
