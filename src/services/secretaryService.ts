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
      role: "PATIENT",
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

export const getDoctorAgenda = async (doctorId: string, date?: string) => {
  const doctorProfile = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      specialty: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!doctorProfile) {
    const e: any = new Error("Doctor no encontrado");
    e.code = "DOCTOR_NOT_FOUND";
    throw e;
  }

  const targetDate = date ? new Date(date) : new Date();
  const dayOfWeek = targetDate.getDay();

  const schedules = await prisma.schedule.findMany({
    where: {
      doctorProfileId: doctorId,
      dayOfWeek,
      isActive: true,
    },
  });

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const [appointments, blockedPeriods] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        doctorProfileId: doctorId,
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.blockedPeriod.findMany({
      where: {
        doctorProfileId: doctorId,
        isActive: true,
        startDateTime: {
          lte: endOfDay,
        },
        endDateTime: {
          gte: startOfDay,
        },
      },
    }),
  ]);

  return {
    doctor: {
      id: doctorProfile.id,
      name: `${doctorProfile.user.firstName} ${doctorProfile.user.lastName}`,
      specialty: doctorProfile.specialty.name,
    },
    date: targetDate,
    schedules,
    appointments,
    blockedPeriods,
  };
};

export const updateSchedule = async (scheduleId: string, data: any) => {
  const existingSchedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
  });

  if (!existingSchedule) {
    const e: any = new Error("Horario no encontrado");
    e.code = "SCHEDULE_NOT_FOUND";
    throw e;
  }

  const dayOfWeekToCheck =
    data.dayOfWeek !== undefined ? data.dayOfWeek : existingSchedule.dayOfWeek;

  // Determinar el rango horario a verificar
  const newStartTime = data.startTime || existingSchedule.startTime;
  const newEndTime = data.endTime || existingSchedule.endTime;

  if (data.dayOfWeek !== undefined || data.startTime || data.endTime) {
    // Buscar citas futuras que coincidan con el día de la semana del horario
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 365); // Buscar hasta un año adelante

    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        doctorProfileId: existingSchedule.doctorProfileId,
        status: { not: "CANCELLED" },
        appointmentDate: {
          gte: today,
          lte: futureDate,
        },
      },
    });

    // Filtrar las citas que realmente caen en el día de la semana y horario que se está modificando
    const affectedAppointments = conflictingAppointments.filter(
      (appointment) => {
        const appointmentDate = new Date(appointment.appointmentDate);
        const appointmentDayOfWeek = appointmentDate.getDay();

        if (appointmentDayOfWeek !== dayOfWeekToCheck) {
          return false;
        }

        const appointmentTime = appointmentDate.toTimeString().substring(0, 5); // HH:MM

        return appointmentTime >= newStartTime && appointmentTime < newEndTime;
      },
    );

    if (affectedAppointments.length > 0) {
      const e: any = new Error(
        "No se puede modificar, hay citas programadas en este horario",
      );
      e.code = "CONFLICT_WITH_APPOINTMENTS";
      throw e;
    }
  }

  return await prisma.schedule.update({
    where: { id: scheduleId },
    data,
  });
};

export const blockPeriod = async (data: any, createdBy: string) => {
  const { doctorProfileId, startDateTime, endDateTime, reason } = data;

  const doctorProfile = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
  });

  if (!doctorProfile) {
    const e: any = new Error("Doctor no encontrado");
    e.code = "DOCTOR_NOT_FOUND";
    throw e;
  }

  const conflictingAppointments = await prisma.appointment.findMany({
    where: {
      doctorProfileId,
      status: { not: "CANCELLED" },
      appointmentDate: {
        gte: new Date(startDateTime),
        lte: new Date(endDateTime),
      },
    },
  });

  if (conflictingAppointments.length > 0) {
    const e: any = new Error("Hay citas programadas en este período");
    e.code = "CONFLICT_WITH_APPOINTMENTS";
    throw e;
  }

  return await prisma.blockedPeriod.create({
    data: {
      doctorProfileId,
      startDateTime: new Date(startDateTime),
      endDateTime: new Date(endDateTime),
      reason,
      createdBy,
    },
  });
};

export const unblockPeriod = async (blockedPeriodId: string) => {
  const blockedPeriod = await prisma.blockedPeriod.findUnique({
    where: { id: blockedPeriodId },
  });

  if (!blockedPeriod) {
    const e: any = new Error("Período bloqueado no encontrado");
    e.code = "BLOCKED_PERIOD_NOT_FOUND";
    throw e;
  }

  return await prisma.blockedPeriod.update({
    where: { id: blockedPeriodId },
    data: { isActive: false },
  });
};

export const blockPeriodWithOverride = async (data: any, createdBy: string) => {
  const { doctorProfileId, startDateTime, endDateTime, reason } = data;

  const doctorProfile = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
  });

  if (!doctorProfile) {
    const e: any = new Error("Doctor no encontrado");
    e.code = "DOCTOR_NOT_FOUND";
    throw e;
  }

  const conflictingAppointments = await prisma.appointment.findMany({
    where: {
      doctorProfileId,
      status: { not: "CANCELLED" },
      appointmentDate: {
        gte: new Date(startDateTime),
        lte: new Date(endDateTime),
      },
    },
  });

  const blockedPeriod = await prisma.blockedPeriod.create({
    data: {
      doctorProfileId,
      startDateTime: new Date(startDateTime),
      endDateTime: new Date(endDateTime),
      reason,
      createdBy,
    },
  });

  if (conflictingAppointments.length > 0) {
    await prisma.appointment.updateMany({
      where: {
        id: {
          in: conflictingAppointments.map((apt) => apt.id),
        },
      },
      data: {
        status: "CANCELLED",
        cancellationReason: "Cancelada por bloqueo de agenda",
      },
    });
  }

  return {
    blockedPeriod,
    cancelledAppointments: conflictingAppointments.length,
  };
};
