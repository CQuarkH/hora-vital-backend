// src/services/adminService.ts
import prisma from '../db/prisma';
import bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from '../config';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

type CreateInput = {
  name: string;
  email: string;
  password: string;
  role?: 'PATIENT' | 'SECRETARY' | 'ADMIN';
  rut?: string;
  phone?: string;
};

type UpdateInput = Partial<CreateInput>;

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  rut: true,
  phone: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

export const listUsers = async (page = 1, limit = 20) => {
  const take = Math.min(limit, 100);
  const skip = (Math.max(page, 1) - 1) * take;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: userSelect,
    }),
    prisma.user.count(),
  ]);

  return {
    users,
    meta: {
      total,
      page,
      limit: take,
      pages: Math.ceil(total / take),
    },
  };
};

export const getUserById = async (id: string) => {
  return prisma.user.findUnique({ where: { id }, select: userSelect });
};

export const createUser = async (data: CreateInput) => {
  const hashed = await bcrypt.hash(data.password, Number(BCRYPT_SALT_ROUNDS));

  try {
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        name: data.name,
        email: data.email,
        password: hashed,
        role: data.role ?? 'PATIENT',
        rut: data.rut,
        phone: data.phone,
      },
      select: userSelect,
    });
    return user;
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const e: any = new Error('Email already exists');
      e.code = 'P2002';
      throw e;
    }
    throw err;
  }
};

export const updateUser = async (id: string, data: UpdateInput) => {
  const updateData: any = { ...data };
  if (data.password) {
    updateData.password = await bcrypt.hash(String(data.password), Number(BCRYPT_SALT_ROUNDS));
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: userSelect,
    });

    return user;
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const e: any = new Error('Email already exists');
      e.code = 'P2002';
      throw e;
    }
    throw err;
  }
};

export const setUserStatus = async (id: string, isActive: boolean) => {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: userSelect,
    });
    return user;
  } catch (err: any) {
    throw err;
  }
};
