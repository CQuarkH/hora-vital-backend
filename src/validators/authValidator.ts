// src/validators/authValidator.ts
import { z } from "zod";
import { Request, Response, NextFunction } from "express";

export const registerSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  email: z.email("Email inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/(?=.*[a-z])/, "Debe contener minúscula")
    .regex(/(?=.*[A-Z])/, "Debe contener mayúscula")
    .regex(/(?=.*\d)/, "Debe contener número"),
  rut: z.string().optional(),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.email("Email inválido"),
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
          .json({ message: "Validation error", errors: messages });
      }
      return res.status(400).json({ message: "Validation error" });
    }
};
