// src/@types/express/index.d.ts
import { Role } from '@prisma/client'; // opcional: basado en tu enum Prisma

declare global {
  namespace Express {
    export interface Request {
      user?: {
        id: string;
        role: Role | string;
      };
    }
  }
}
