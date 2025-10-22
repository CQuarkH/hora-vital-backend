// src/controllers/adminController.ts
import { Request, Response } from 'express';
import * as AdminService from '../services/adminService';
import { Prisma } from '@prisma/client';

export const listUsers = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    const result = await AdminService.listUsers(page, limit);
    return res.json(result);
  } catch (err) {
    console.error('listUsers error', err);
    return res.status(500).json({ message: 'Error de servidor' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, rut, phone } = req.body;

    const user = await AdminService.createUser({ name, email, password, role, rut, phone });
    return res.status(201).json(user);
  } catch (err: any) {
    console.error('createUser error', err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ message: 'Email ya registrado' });
    }
    return res.status(500).json({ message: 'Error de servidor' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const user = await AdminService.updateUser(id, payload);
    return res.json(user);
  } catch (err: any) {
    console.error('updateUser error', err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ message: 'Email ya registrado' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    return res.status(500).json({ message: 'Error de servidor' });
  }
};

export const patchStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const user = await AdminService.setUserStatus(id, isActive);
    return res.json(user);
  } catch (err: any) {
    console.error('patchStatus error', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    return res.status(500).json({ message: 'Error de servidor' });
  }
};
