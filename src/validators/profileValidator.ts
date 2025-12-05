import { z } from "zod";
import { Request, Response, NextFunction } from "express";

export const profileUpdateSchema = z.object({
  firstName: z.string().min(1, "Nombre requerido").optional(),
  lastName: z.string().min(1, "Apellido requerido").optional(),
  email: z.string().email("Email inválido").optional(),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .refine(
      (pwd) => /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /\d/.test(pwd),
      "La contraseña debe contener al menos: una minúscula, una mayúscula y un número",
    )
    .optional(),
  gender: z
    .string()
    .optional()
    .refine((g) => {
      if (!g) return true;
      return /^[A-Za-z]{1,20}$/.test(g);
    }, "Gender inválido"),
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
