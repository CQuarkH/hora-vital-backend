// src/validators/adminValidator.ts
import { z } from "zod";
import { Request, Response, NextFunction } from "express";

export const adminCreateSchema = z.object({
  firstName: z.string().min(1, "Nombre (firstName) requerido"),
  lastName: z.string().min(1, "Apellido (lastName) requerido"),
  email: z.email("Email inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/(?=.*[a-z])/, "Debe contener minúscula")
    .regex(/(?=.*[A-Z])/, "Debe contener mayúscula")
    .regex(/(?=.*\d)/, "Debe contener número"),
  role: z
    .enum(["PATIENT", "SECRETARY", "ADMIN", "DOCTOR"])
    .optional()
    .default("PATIENT"),
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

export const adminUpdateSchema = z.object({
  firstName: z.string().min(1, "Nombre requerido").optional(),
  lastName: z.string().min(1, "Apellido requerido").optional(),
  email: z.email("Email inválido").optional(),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/(?=.*[a-z])/, "Debe contener minúscula")
    .regex(/(?=.*[A-Z])/, "Debe contener mayúscula")
    .regex(/(?=.*\d)/, "Debe contener número")
    .optional(),
  role: z.enum(["PATIENT", "SECRETARY", "ADMIN", "DOCTOR"]).optional(),
  rut: z.string().optional(),
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
      "Formato de hora inválido (HH:mm)"
    ),
  endTime: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Formato de hora inválido (HH:mm)"
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

export const listPatientsSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  name: z.string().optional(),
  rut: z.string().optional(),
  status: z.string().optional(),
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
