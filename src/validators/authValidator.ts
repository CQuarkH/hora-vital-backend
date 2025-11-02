// src/validators/authValidator.ts
import { z } from "zod";
import { Request, Response, NextFunction } from "express";

export const registerSchema = z.object({
  firstName: z.string().min(1, "Nombre (firstName) requerido"),
  lastName: z.string().min(1, "Apellido (lastName) requerido"),
  email: z.email("Email inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/(?=.*[a-z])/, "Debe contener minúscula")
    .regex(/(?=.*[A-Z])/, "Debe contener mayúscula")
    .regex(/(?=.*\d)/, "Debe contener número"),
  rut: z.string().min(5, "RUT inválido"),
  phone: z.string().optional(),
  gender: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
});

export const loginSchema = z.object({
  rut: z.string().min(1, "RUT requerido"),
  password: z.string().min(1, "Password requerido"),
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
          .json({
            success: false,
            message: "Validation error",
            errors: messages,
          });
      }
      return res
        .status(400)
        .json({ success: false, message: "Validation error" });
    }
  };
