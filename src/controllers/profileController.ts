// src/controllers/profileController.ts
import { Request, Response } from 'express';
import * as ProfileService from '../services/profileService';

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'No autorizado' });

    const user = await ProfileService.getProfile(userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    return res.json(user);
  } catch (err) {
    console.error('getProfile error', err);
    return res.status(500).json({ message: 'Error de servidor' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'No autorizado' });

    // Para seguridad: asegurar que no se intenta editar otro id vía body
    if (req.body.id && req.body.id !== userId) {
      return res.status(403).json({ message: 'No puedes editar el perfil de otro usuario' });
    }

    // actualizamos solo los campos permitidos (name, email, phone, optional password)
    const { name, email, phone, password } = req.body;

    const updated = await ProfileService.updateOwnProfile(userId, { name, email, phone, password });

    // No devolver password
    return res.json(updated);
  } catch (err: any) {
    console.error('updateProfile error', err);
    // si es error de unique constraint sobre email
    if (err?.code === 'P2002' || err?.message?.toLowerCase().includes('email')) {
      return res.status(409).json({ message: 'Email ya registrado' });
    }
    if (err?.code === 'P2025') {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    return res.status(500).json({ message: 'Error de servidor' });
  }
};
