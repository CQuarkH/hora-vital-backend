// src/validators/secretaryValidator.ts
import { z } from "zod";
import { Request, Response, NextFunction } from "express";

export const registerPatientSchema = z.object({
  firstName: z.string().min(1, "Nombre (firstName) requerido"),
  lastName: z.string().min(1, "Apellido (lastName) requerido"),
  email: z.email("Email inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .refine(
      (pwd) => /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /\d/.test(pwd),
      "La contraseña debe contener al menos: una minúscula, una mayúscula y un número",
    ),
  rut: z.string().min(1, "RUT requerido"),
  phone: z.string().optional(),
  gender: z
    .string()
    .optional()
    .refine((g) => {
      if (!g) return true;
      return /^[A-Za-z]{1,20}$/.test(g);
    }, "Gender inválido"),
  birthDate: z
    .string()
    .optional()
    .refine((d) => {
      if (!d) return true;
      const parsed = new Date(d);
      return !isNaN(parsed.getTime());
    }, "Fecha de nacimiento inválida"),
  address: z.string().max(255, "Address demasiado larga").optional(),
});

export const updateScheduleSchema = z.object({
  dayOfWeek: z.number().min(0).max(6).optional(),
  startTime: z
    .string()
    .refine(
      (time) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time),
      "Formato de hora inválido (HH:mm)",
    )
    .optional(),
  endTime: z
    .string()
    .refine(
      (time) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time),
      "Formato de hora inválido (HH:mm)",
    )
    .optional(),
  slotDuration: z.number().min(15).max(120).optional(),
  isActive: z.boolean().optional(),
});

export const blockPeriodSchema = z.object({
  doctorProfileId: z.string().uuid("ID de doctor inválido"),
  startDateTime: z.string().datetime("Fecha y hora de inicio inválida"),
  endDateTime: z.string().datetime("Fecha y hora de fin inválida"),
  reason: z.string().optional(),
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
