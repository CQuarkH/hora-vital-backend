// src/services/authService.ts
import prisma from "../db/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_SALT_ROUNDS } from "../config";

type CreateUserInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  rut: string;
  phone?: string;
  gender?: string;
  birthDate?: string;
  address?: string;
  role?: string;
};

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

export const findUserByRut = async (rut: string) => {
  return prisma.user.findUnique({ where: { rut } });
};

export const createUser = async (data: CreateUserInput) => {
  const saltRounds = Number(BCRYPT_SALT_ROUNDS ?? 10);
  const hashed = await bcrypt.hash(data.password, saltRounds);
  const createData: any = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    password: hashed,
    rut: data.rut,
    phone: data.phone,
    gender: data.gender,
    address: data.address,
  };
  if (data.birthDate) createData.birthDate = new Date(data.birthDate);
  if (data.role) createData.role = data.role;
  const user = await prisma.user.create({
    data: createData,
  });
  return user;
};

export const verifyPassword = async (plain: string, hash: string) => {
  return bcrypt.compare(plain, hash);
};

export const generateToken = (payload: object) => {
  const token = (jwt as unknown as any).sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
  return token as string;
};

export const mapUserToDto = (user: any) => {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone ?? "",
    rut: user.rut,
    role: (user.role || "PATIENT").toString().toLowerCase(),
    isActive: user.isActive ?? true,
    createdAt: user.createdAt?.toISOString?.() ?? null,
    updatedAt: user.updatedAt?.toISOString?.() ?? null,
    gender: user.gender ?? undefined,
    birthDate: user.birthDate
      ? new Date(user.birthDate).toISOString()
      : undefined,
    address: user.address ?? undefined,
  };
};
