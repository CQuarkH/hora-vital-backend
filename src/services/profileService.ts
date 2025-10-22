// src/services/profileService.ts
import prisma from '../db/prisma';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from '../config';

type UpdateProfileInput = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
};

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  rut: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

export const updateOwnProfile = async (userId: string, data: UpdateProfileInput) => {
  const updateData: any = { ...data };
  if (data.password) {
    updateData.password = await bcrypt.hash(String(data.password), Number(BCRYPT_SALT_ROUNDS));
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
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

export const getProfile = async (userId: string) => {
  return prisma.user.findUnique({ where: { id: userId }, select: userSelect });
};
