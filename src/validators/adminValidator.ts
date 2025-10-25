// src/validators/adminValidator.ts
import { z } from "zod";
import { Request, Response, NextFunction } from "express";

export const adminCreateSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  email: z.email("Email inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/(?=.*[a-z])/, "Debe contener minúscula")
    .regex(/(?=.*[A-Z])/, "Debe contener mayúscula")
    .regex(/(?=.*\d)/, "Debe contener número"),
  role: z.enum(["PATIENT", "SECRETARY", "ADMIN"]).optional().default("PATIENT"),
  rut: z.string().optional(),
  phone: z.string().optional(),
});

export const adminUpdateSchema = z.object({
  name: z.string().min(1, "Nombre requerido").optional(),
  email: z.email("Email inválido").optional(),
  role: z.enum(["PATIENT", "SECRETARY", "ADMIN"]).optional(),
  rut: z.string().optional(),
  phone: z.string().optional(),
});

export const statusSchema = z.object({
  isActive: z.boolean(),
});

export const createScheduleSchema = z.object({
  doctorProfileId: z.string().min(1, "ID de médico requerido"),
  dayOfWeek: z
    .number()
    .min(0)
    .max(6, "Día de la semana debe estar entre 0 y 6"),
  startTime: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Formato de hora inválido (HH:mm)",
    ),
  endTime: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Formato de hora inválido (HH:mm)",
    ),
  slotDuration: z.number().min(15).max(120).optional(),
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
