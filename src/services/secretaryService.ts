// src/services/secretaryService.ts
import prisma from "../db/prisma";
import bcrypt from "bcrypt";
import { BCRYPT_SALT_ROUNDS } from "../config";
import { v4 as uuidv4 } from "uuid";
import { Prisma } from "@prisma/client";

let PrismaClientKnownRequestError: any;
try {
  PrismaClientKnownRequestError =
    require("@prisma/client/runtime").PrismaClientKnownRequestError;
} catch (e) {
  PrismaClientKnownRequestError = Prisma.PrismaClientKnownRequestError;
}

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  rut: true,
  phone: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  gender: true,
  birthDate: true,
  address: true,
};

type RegisterPatientInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  rut: string;
  phone?: string;
  gender?: string;
  birthDate?: string | Date | null;
  address?: string;
};

export const registerPatient = async (data: RegisterPatientInput) => {
  if (!data.rut) {
    const e: any = new Error("RUT requerido");
    e.code = "RUT_REQUIRED";
    throw e;
  }

  const saltRounds = Number(BCRYPT_SALT_ROUNDS ?? 10);
  const hashed = await bcrypt.hash(data.password, saltRounds);

  try {
    const createData: any = {
      id: uuidv4(),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: hashed,
      role: "PATIENT", // Force PATIENT role for secretary registration
      rut: data.rut,
      phone: data.phone,
      gender: data.gender,
      address: data.address,
    };

    if (data.birthDate) {
      createData.birthDate =
        data.birthDate instanceof Date
          ? data.birthDate
          : new Date(String(data.birthDate));
    }

    const user = await prisma.user.create({
      data: createData,
      select: userSelect,
    });

    return user;
  } catch (err: any) {
    // Normalize Prisma unique error to bubble code P2002
    if (
      (PrismaClientKnownRequestError &&
        err instanceof PrismaClientKnownRequestError &&
        err.code === "P2002") ||
      err?.code === "P2002"
    ) {
      const e: any = new Error("Email or RUT already exists");
      e.code = "P2002";
      throw e;
    }
    throw err;
  }
};
