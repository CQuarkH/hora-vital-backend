// src/services/profileService.ts
import prisma from "../db/prisma";
import bcrypt from "bcrypt";
import { BCRYPT_SALT_ROUNDS } from "../config";
import { Prisma } from "@prisma/client";

let PrismaClientKnownRequestError: any;
try {
  PrismaClientKnownRequestError =
    require("@prisma/client/runtime").PrismaClientKnownRequestError;
} catch (e) {
  PrismaClientKnownRequestError = Prisma.PrismaClientKnownRequestError;
}

type UpdateProfileInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  gender?: string;
  address?: string;
};

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  rut: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  gender: true,
  birthDate: true,
  address: true,
};

export const updateOwnProfile = async (
  userId: string,
  data: UpdateProfileInput
) => {
  const updateData: any = { ...data };
  if (data.password) {
    const saltRounds = Number(BCRYPT_SALT_ROUNDS ?? 10);
    updateData.password = await bcrypt.hash(String(data.password), saltRounds);
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: userSelect,
    });
    return user;
  } catch (err: any) {
    if (
      (PrismaClientKnownRequestError &&
        err instanceof PrismaClientKnownRequestError &&
        err.code === "P2002") ||
      err?.code === "P2002"
    ) {
      const e: any = new Error("Email already exists");
      e.code = "P2002";
      throw e;
    }
    if (err?.code === "P2025") {
      const e: any = new Error("Record not found");
      e.code = "P2025";
      throw e;
    }
    throw err;
  }
};

export const getProfile = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });
};
