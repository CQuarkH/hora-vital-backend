// src/services/adminService.ts
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

export const listUsers = async (page = 1, limit = 20) => {
  const take = Math.min(limit, 100);
  const skip = (Math.max(page, 1) - 1) * take;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: "desc" },
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

type CreateInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  rut: string;
  role?: "PATIENT" | "SECRETARY" | "ADMIN" | "DOCTOR";
  phone?: string;
};

export const createUser = async (data: CreateInput) => {
  if (!data.rut) {
    const e: any = new Error("RUT requerido");
    e.code = "RUT_REQUIRED";
    throw e;
  }

  const saltRounds = Number(BCRYPT_SALT_ROUNDS ?? 10);
  const hashed = await bcrypt.hash(data.password, saltRounds);

  try {
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: hashed,
        role: data.role ?? "PATIENT",
        rut: data.rut,
        phone: data.phone,
      },
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
      const e: any = new Error("Email already exists");
      e.code = "P2002";
      throw e;
    }
    throw err;
  }
};

type UpdateInput = Partial<CreateInput> & { password?: string };

export const updateUser = async (id: string, data: UpdateInput) => {
  const updateData: any = { ...data };
  if (data.password) {
    const saltRounds = Number(BCRYPT_SALT_ROUNDS ?? 10);
    updateData.password = await bcrypt.hash(String(data.password), saltRounds);
  }

  try {
    const user = await prisma.user.update({
      where: { id },
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

export const setUserStatus = async (id: string, isActive: boolean) => {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: userSelect,
    });
    return user;
  } catch (err: any) {
    if (err?.code === "P2025") {
      const e: any = new Error("Record not found");
      e.code = "P2025";
      throw e;
    }
    throw err;
  }
};

type AppointmentFilters = {
  page: number;
  limit: number;
  date?: string;
  patientName?: string;
  doctorName?: string;
  status?: string;
  specialtyId?: string;
};

export const getAppointments = async (filters: AppointmentFilters) => {
  const take = Math.min(filters.limit, 100);
  const skip = (Math.max(filters.page, 1) - 1) * take;

  const whereClause: any = {};

  if (filters.date) {
    const targetDate = new Date(filters.date);
    whereClause.appointmentDate = {
      gte: new Date(targetDate.setHours(0, 0, 0, 0)),
      lte: new Date(targetDate.setHours(23, 59, 59, 999)),
    };
  }

  if (filters.status) {
    whereClause.status = filters.status;
  }

  if (filters.specialtyId) {
    whereClause.specialtyId = filters.specialtyId;
  }

  if (filters.patientName) {
    whereClause.OR = [
      {
        patient: {
          firstName: { contains: filters.patientName, mode: "insensitive" },
        },
      },
      {
        patient: {
          lastName: { contains: filters.patientName, mode: "insensitive" },
        },
      },
    ];
  }

  if (filters.doctorName) {
    whereClause.doctorProfile = {
      user: {
        OR: [
          { firstName: { contains: filters.doctorName, mode: "insensitive" } },
          { lastName: { contains: filters.doctorName, mode: "insensitive" } },
        ],
      },
    };
  }

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where: whereClause,
      skip,
      take,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            rut: true,
          },
        },
        doctorProfile: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            specialty: true,
          },
        },
        specialty: true,
      },
      orderBy: [{ appointmentDate: "desc" }, { startTime: "desc" }],
    }),
    prisma.appointment.count({ where: whereClause }),
  ]);

  return {
    appointments,
    meta: {
      total,
      page: filters.page,
      limit: take,
      pages: Math.ceil(total / take),
    },
  };
};

export const findDoctorProfile = async (doctorProfileId: string) => {
  return prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      specialty: true,
    },
  });
};

export const findExistingSchedule = async (
  doctorProfileId: string,
  dayOfWeek: number
) => {
  return prisma.schedule.findFirst({
    where: {
      doctorProfileId,
      dayOfWeek,
      isActive: true,
    },
  });
};

type CreateScheduleInput = {
  doctorProfileId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
};

export const createSchedule = async (data: CreateScheduleInput) => {
  return prisma.schedule.create({
    data: {
      doctorProfileId: data.doctorProfileId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      slotDuration: data.slotDuration,
    },
    include: {
      doctorProfile: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          specialty: true,
        },
      },
    },
  });
};

export const findConflictingAppointments = async (
  doctorProfileId: string,
  dayOfWeek: number,
  newStartTime: string,
  newEndTime: string
) => {
  try {
    const conflicts: any[] = await prisma.$queryRaw`
      SELECT * FROM "Appointment"
      WHERE "doctorProfileId" = ${doctorProfileId}
        AND "status" = 'SCHEDULED'
        AND EXTRACT(DOW FROM "appointmentDate") = ${dayOfWeek}
        AND CAST("startTime" AS TIME) < CAST(${newEndTime} AS TIME)
        AND CAST("endTime" AS TIME) > CAST(${newStartTime} AS TIME)
      LIMIT 1;
    `;
    return conflicts.length > 0 ? conflicts[0] : null;
  } catch (error) {
    console.error("Error en findConflictingAppointments:", error);
    throw new Error("Error al verificar conflictos de citas");
  }
};
