// Para que TS acepte req.user en los tests
import '@types/jest';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role?: string };
    }
  }
}

export {};
