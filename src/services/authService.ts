import prisma from "../db/prisma";
import bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_SALT_ROUNDS } from "../config";

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  rut?: string;
  phone?: string;
};

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

export const createUser = async (data: RegisterInput) => {
  const hashed = await bcrypt.hash(data.password, Number(BCRYPT_SALT_ROUNDS));
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashed,
      rut: data.rut,
      phone: data.phone,
    },
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
