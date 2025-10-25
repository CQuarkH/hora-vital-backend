// src/services/adminService.ts
import prisma from "../db/prisma";
import bcrypt from "bcrypt";
import { BCRYPT_SALT_ROUNDS } from "../config";
import { Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

type CreateInput = {
  name: string;
  email: string;
  password: string;
  role?: "PATIENT" | "SECRETARY" | "ADMIN";
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

export const createUser = async (data: CreateInput) => {
  const hashed = await bcrypt.hash(data.password, Number(BCRYPT_SALT_ROUNDS));

  try {
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        name: data.name,
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
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const e: any = new Error("Email already exists");
      e.code = "P2002";
      throw e;
    }
    throw err;
  }
};

export const updateUser = async (id: string, data: UpdateInput) => {
  const updateData: any = { ...data };
  if (data.password) {
    updateData.password = await bcrypt.hash(
      String(data.password),
      Number(BCRYPT_SALT_ROUNDS),
    );
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
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const e: any = new Error("Email already exists");
      e.code = "P2002";
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
    whereClause.patient = {
      name: {
        contains: filters.patientName,
        mode: "insensitive",
      },
    };
  }

  if (filters.doctorName) {
    whereClause.doctorProfile = {
      user: {
        name: {
          contains: filters.doctorName,
          mode: "insensitive",
        },
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
            name: true,
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
                name: true,
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
      user: true,
      specialty: true,
    },
  });
};

export const findExistingSchedule = async (
  doctorProfileId: string,
  dayOfWeek: number,
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
              name: true,
            },
          },
          specialty: true,
        },
      },
    },
  });
};
