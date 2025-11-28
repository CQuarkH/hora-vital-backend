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
    .regex(/(?=.*[a-z])/, "Debe contener minúscula")
    .regex(/(?=.*[A-Z])/, "Debe contener mayúscula")
    .regex(/(?=.*\d)/, "Debe contener número"),
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
