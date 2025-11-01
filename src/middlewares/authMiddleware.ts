import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config";
import prisma from "../db/prisma";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const token = authHeader.split(" ")[1];

    let payload: any;
    try {
      payload = (
        jwt.verify as unknown as (token: string, secret: string) => any
      )(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Token inválido" });
    }

    if (!payload?.userId)
      return res.status(401).json({ message: "Token inválido" });

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user || !user.isActive)
      return res.status(401).json({ message: "Usuario no válido" });

    req.user = { id: user.id, role: user.role };

    return next();
  } catch (err) {
    console.error("auth middleware error", err);
    return res.status(500).json({ message: "Error de servidor" });
  }
};
