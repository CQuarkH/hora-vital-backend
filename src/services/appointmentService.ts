import prisma from "../db/prisma";
import { AppointmentStatus } from "@prisma/client";
import * as NotificationService from "./notificationService";

type CreateAppointmentInput = {
  patientId: string;
  doctorProfileId: string;
  specialtyId: string;
  appointmentDate: Date;
  startTime: string;
  notes?: string;
};

type AppointmentFilters = {
  status?: AppointmentStatus;
  dateFrom?: Date;
  dateTo?: Date;
};

type AvailabilityFilters = {
  date?: Date;
  specialtyId?: string;
  doctorProfileId?: string;
};

export const findDoctorProfile = async (doctorProfileId: string) => {
  return prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
    include: {
      specialty: true,
      user: true,
      schedules: true,
    },
  });
};

export const findSpecialty = async (specialtyId: string) => {
  return prisma.specialty.findUnique({
    where: { id: specialtyId },
  });
};

export const checkAppointmentConflict = async (
  doctorProfileId: string,
  appointmentDate: Date,
  startTime: string,
) => {
  return prisma.appointment.findFirst({
    where: {
      doctorProfileId,
      appointmentDate,
      startTime,
      status: {
        not: "CANCELLED",
      },
    },
  });
};

export const checkPatientDuplicateAppointment = async (
  patientId: string,
  doctorProfileId: string,
  appointmentDate: Date,
) => {
  return prisma.appointment.findFirst({
    where: {
      patientId,
      doctorProfileId,
      appointmentDate,
      status: {
        not: "CANCELLED",
      },
    },
  });
};

export const createAppointment = async (data: CreateAppointmentInput) => {
  const [startHour, startMinute] = data.startTime.split(":").map(Number);
  const totalMinutes = startMinute + 30;
  let endHour = startHour + Math.floor(totalMinutes / 60);
  const endMinute = totalMinutes % 60;

  if (endHour >= 24) {
    endHour = endHour % 24;
  }

  const endTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;

  const appointment = await prisma.appointment.create({
    data: {
      patientId: data.patientId,
      doctorProfileId: data.doctorProfileId,
      specialtyId: data.specialtyId,
      appointmentDate: data.appointmentDate,
      startTime: data.startTime,
      endTime,
      notes: data.notes,
    },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
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
  });

  await NotificationService.createAppointmentConfirmation(data.patientId, {
    appointmentDate: data.appointmentDate.toISOString().split("T")[0],
    startTime: data.startTime,
    doctorName: appointment.doctorProfile.user.name,
    specialty: appointment.specialty.name,
  });

  return appointment;
};

export const findAppointmentById = async (appointmentId: string) => {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
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
  });
};

export const cancelAppointment = async (
  appointmentId: string,
  cancellationReason: string,
) => {
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "CANCELLED",
      cancellationReason,
    },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
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
  });

  await NotificationService.createAppointmentCancellation(
    appointment.patientId,
    {
      appointmentDate: appointment.appointmentDate.toISOString().split("T")[0],
      startTime: appointment.startTime,
      doctorName: appointment.doctorProfile.user.name,
      specialty: appointment.specialty.name,
      reason: cancellationReason,
    },
  );

  return appointment;
};

export const findPatientAppointments = async (
  patientId: string,
  filters: AppointmentFilters = {},
) => {
  const whereClause: any = {
    patientId,
  };

  if (filters.status) {
    whereClause.status = filters.status;
  }

  if (filters.dateFrom || filters.dateTo) {
    whereClause.appointmentDate = {};
    if (filters.dateFrom) {
      whereClause.appointmentDate.gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      whereClause.appointmentDate.lte = filters.dateTo;
    }
  }

  return prisma.appointment.findMany({
    where: whereClause,
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
      specialty: true,
    },
    orderBy: [{ appointmentDate: "asc" }, { startTime: "asc" }],
  });
};

export const validateDoctorSchedule = async (
  doctorProfileId: string,
  appointmentDate: Date,
  startTime: string,
) => {
  const doctorProfile = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
    include: {
      schedules: {
        where: {
          isActive: true,
        },
      },
    },
  });

  if (!doctorProfile) {
    return { isValid: false, message: "Médico no encontrado" };
  }

  const dayOfWeek = appointmentDate.getDay();
  const schedule = doctorProfile.schedules.find(
    (s) => s.dayOfWeek === dayOfWeek,
  );

  if (!schedule) {
    return {
      isValid: false,
      message: "El médico no tiene horario de atención para este día",
    };
  }

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const appointmentTimeInMinutes = startHour * 60 + startMinute;

  const [scheduleStartHour, scheduleStartMinute] = schedule.startTime
    .split(":")
    .map(Number);
  const scheduleStartInMinutes = scheduleStartHour * 60 + scheduleStartMinute;

  const [scheduleEndHour, scheduleEndMinute] = schedule.endTime
    .split(":")
    .map(Number);
  const scheduleEndInMinutes = scheduleEndHour * 60 + scheduleEndMinute;

  if (
    appointmentTimeInMinutes < scheduleStartInMinutes ||
    appointmentTimeInMinutes >= scheduleEndInMinutes
  ) {
    return {
      isValid: false,
      message: `El médico atiende de ${schedule.startTime} a ${schedule.endTime} este día`,
    };
  }

  const minutesFromStart = appointmentTimeInMinutes - scheduleStartInMinutes;
  if (minutesFromStart % schedule.slotDuration !== 0) {
    return {
      isValid: false,
      message: `Las citas deben ser programadas en intervalos de ${schedule.slotDuration} minutos`,
    };
  }

  return { isValid: true, message: "Horario válido" };
};

export const getAvailableTimeSlots = async (
  filters: AvailabilityFilters = {},
) => {
  const whereClause: any = {
    isActive: true,
  };

  if (filters.specialtyId) {
    whereClause.specialtyId = filters.specialtyId;
  }

  if (filters.doctorProfileId) {
    whereClause.id = filters.doctorProfileId;
  }

  const doctorProfiles = await prisma.doctorProfile.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      specialty: true,
      schedules: {
        where: {
          isActive: true,
        },
      },
    },
  });

  const availableSlots = [];
  const targetDate = filters.date || new Date();
  const dayOfWeek = targetDate.getDay();

  for (const doctor of doctorProfiles) {
    const schedule = doctor.schedules.find((s) => s.dayOfWeek === dayOfWeek);
    if (!schedule) continue;

    const startHour = parseInt(schedule.startTime.split(":")[0]);
    const startMinute = parseInt(schedule.startTime.split(":")[1]);
    const endHour = parseInt(schedule.endTime.split(":")[0]);
    const endMinute = parseInt(schedule.endTime.split(":")[1]);

    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        doctorProfileId: doctor.id,
        appointmentDate: targetDate,
        status: {
          not: "CANCELLED",
        },
      },
      select: {
        startTime: true,
      },
    });

    const bookedTimes = new Set(bookedAppointments.map((apt) => apt.startTime));

    let currentHour = startHour;
    let currentMinute = startMinute;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMinute < endMinute)
    ) {
      const timeSlot = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;

      if (!bookedTimes.has(timeSlot)) {
        const endTimeMinutes = currentMinute + schedule.slotDuration;
        const endTimeHour = currentHour + Math.floor(endTimeMinutes / 60);
        const endTimeMinute = endTimeMinutes % 60;
        const endTime = `${String(endTimeHour).padStart(2, "0")}:${String(endTimeMinute).padStart(2, "0")}`;

        availableSlots.push({
          doctorProfile: {
            id: doctor.id,
            name: doctor.user.name,
            specialty: doctor.specialty.name,
          },
          date: targetDate.toISOString().split("T")[0],
          startTime: timeSlot,
          endTime,
        });
      }

      currentMinute += schedule.slotDuration;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    }
  }

  return availableSlots;
};
