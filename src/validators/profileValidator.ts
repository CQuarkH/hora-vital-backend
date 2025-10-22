// src/validators/profileValidator.ts
import { z } from "zod";
import { Request, Response, NextFunction } from "express";

export const profileUpdateSchema = z.object({
  name: z.string().min(1, "Nombre requerido").optional(),
  email: z.email("Email inválido").optional(),
  phone: z.string().optional(),
});

export const validate =
  (schema: z.ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      // permitimos body parcial
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
