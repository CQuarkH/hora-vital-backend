// src/controllers/authController.ts
import { Request, Response } from 'express';
import * as AuthService from '../services/authService';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, rut, phone } = req.body;

    const existing = await AuthService.findUserByEmail(email);
    if (existing) return res.status(409).json({ message: 'Email ya registrado' });

    const user = await AuthService.createUser({ name, email, password, rut, phone });

    const token = AuthService.generateToken({ userId: user.id, role: user.role });

    return res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error de servidor' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await AuthService.findUserByEmail(email);
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

    const ok = await AuthService.verifyPassword(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

    const token = AuthService.generateToken({ userId: user.id, role: user.role });

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error de servidor' });
  }
};




