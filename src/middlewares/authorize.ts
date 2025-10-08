// src/middlewares/authorize.ts
import { Request, Response, NextFunction } from 'express';

/**
 * authorizeRoles: middleware genérico que asegura que req.user.role está en los roles permitidos
 * Usar después de authenticate (que debe poblar req.user)
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user || !user.role) return res.status(401).json({ message: 'No autorizado' });

      // role puede venir como enum o string; hacemos comparación en mayúsculas
      const roleStr = String(user.role).toUpperCase();
      const permitted = allowedRoles.map(r => r.toUpperCase());
      if (!permitted.includes(roleStr)) return res.status(403).json({ message: 'Permisos insuficientes' });

      return next();
    } catch (err) {
      console.error('authorizeRoles error', err);
      return res.status(500).json({ message: 'Error de servidor' });
    }
  };
};
