import prisma from "../db/prisma";
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
  status?: "SCHEDULED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  dateFrom?: Date;
  dateTo?: Date;
};

type AvailabilityFilters = {
  date?: Date;
  specialtyId?: string;
  doctorProfileId?: string;
};

type UpdateAppointmentInput = {
  doctorProfileId?: string;
  specialtyId?: string;
  appointmentDate?: Date;
  startTime?: string;
  notes?: string;
};

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
};

const doctorUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
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

const buildFullName = (user: any) => {
  if (!user) return "";
  if (typeof user.firstName === "string" || typeof user.lastName === "string") {
    return `${user.firstName ?? ""}${user.lastName ? " " + user.lastName : ""}`.trim();
  }

  return (user.name as string) ?? "";
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

  let appointment;
  try {
    appointment = await prisma.appointment.create({
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
          select: userSelect,
        },
        doctorProfile: {
          include: {
            user: {
              select: doctorUserSelect,
            },
            specialty: true,
          },
        },
        specialty: true,
      },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      const cancelledAppointment = await prisma.appointment.findFirst({
        where: {
          doctorProfileId: data.doctorProfileId,
          appointmentDate: data.appointmentDate,
          startTime: data.startTime,
          status: "CANCELLED",
        },
      });

      if (cancelledAppointment) {
        await prisma.appointment.delete({
          where: { id: cancelledAppointment.id },
        });

        appointment = await prisma.appointment.create({
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
              select: userSelect,
            },
            doctorProfile: {
              include: {
                user: {
                  select: doctorUserSelect,
                },
                specialty: true,
              },
            },
            specialty: true,
          },
        });
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }

  try {
    const doctorName = buildFullName(appointment.doctorProfile?.user);
    const specialtyName =
      appointment.specialty?.name ??
      appointment.doctorProfile?.specialty?.name ??
      "";
    await NotificationService.createAppointmentConfirmation(data.patientId, {
      appointmentDate: data.appointmentDate.toISOString().split("T")[0],
      startTime: data.startTime,
      doctorName,
      specialty: specialtyName,
    });
  } catch (error) {
    console.error(
      "Failed to create appointment confirmation notification. Error details:",
      error instanceof Error ? error.message : error,
    );
  }

  return appointment;
};

export const findAppointmentById = async (appointmentId: string) => {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: {
        select: userSelect,
      },
      doctorProfile: {
        include: {
          user: {
            select: doctorUserSelect,
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
        select: userSelect,
      },
      doctorProfile: {
        include: {
          user: {
            select: doctorUserSelect,
          },
          specialty: true,
        },
      },
      specialty: true,
    },
  });

  try {
    const doctorName = buildFullName(appointment.doctorProfile?.user);
    await NotificationService.createAppointmentCancellation(
      appointment.patientId,
      {
        appointmentDate: appointment.appointmentDate
          .toISOString()
          .split("T")[0],
        startTime: appointment.startTime,
        doctorName,
        specialty: appointment.specialty?.name ?? "",
        reason: cancellationReason,
      },
    );
  } catch (error) {
    console.error(
      "Failed to create appointment cancellation notification. Error details:",
      error instanceof Error ? error.message : error,
    );
  }

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
            select: doctorUserSelect,
          },
          specialty: true,
        },
      },
      specialty: true,
    },
    orderBy: [{ appointmentDate: "asc" }, { startTime: "asc" }],
  });
};

export const updateAppointment = async (
  appointmentId: string,
  data: UpdateAppointmentInput,
) => {
  const currentAppointment = await findAppointmentById(appointmentId);
  if (!currentAppointment) {
    throw new Error("Appointment not found");
  }

  const isReschedule =
    (data.doctorProfileId &&
      data.doctorProfileId !== currentAppointment.doctorProfileId) ||
    (data.appointmentDate &&
      data.appointmentDate.toISOString() !==
        currentAppointment.appointmentDate.toISOString()) ||
    (data.startTime && data.startTime !== currentAppointment.startTime);

  if (isReschedule) {
    const newDoctorId =
      data.doctorProfileId || currentAppointment.doctorProfileId;
    const newDate = data.appointmentDate || currentAppointment.appointmentDate;
    const newStartTime = data.startTime || currentAppointment.startTime;

    if (
      data.doctorProfileId &&
      data.doctorProfileId !== currentAppointment.doctorProfileId
    ) {
      const doctorProfile = await findDoctorProfile(data.doctorProfileId);
      if (!doctorProfile) {
        throw new Error("Doctor not found");
      }

      if (data.specialtyId && doctorProfile.specialtyId !== data.specialtyId) {
        throw new Error("Doctor does not belong to the selected specialty");
      }
    }

    const scheduleValidation = await validateDoctorSchedule(
      newDoctorId,
      newDate,
      newStartTime,
    );
    if (!scheduleValidation.isValid) {
      throw new Error(scheduleValidation.message);
    }

    const conflict = await prisma.appointment.findFirst({
      where: {
        doctorProfileId: newDoctorId,
        appointmentDate: newDate,
        startTime: newStartTime,
        status: {
          not: "CANCELLED",
        },
        id: {
          not: appointmentId,
        },
      },
    });

    if (conflict) {
      throw new Error("The time slot is already reserved");
    }
  }

  let endTime: string | undefined;
  if (data.startTime) {
    const [startHour, startMinute] = data.startTime.split(":").map(Number);
    const totalMinutes = startMinute + 30;
    let endHour = startHour + Math.floor(totalMinutes / 60);
    const endMinute = totalMinutes % 60;

    if (endHour >= 24) {
      endHour = endHour % 24;
    }

    endTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
  }

  const updateData: any = {};
  if (data.doctorProfileId) updateData.doctorProfileId = data.doctorProfileId;
  if (data.specialtyId) updateData.specialtyId = data.specialtyId;
  if (data.appointmentDate) updateData.appointmentDate = data.appointmentDate;
  if (data.startTime) updateData.startTime = data.startTime;
  if (endTime) updateData.endTime = endTime;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const updatedAppointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: updateData,
    include: {
      patient: {
        select: userSelect,
      },
      doctorProfile: {
        include: {
          user: {
            select: doctorUserSelect,
          },
          specialty: true,
        },
      },
      specialty: true,
    },
  });

  try {
    const doctorName = buildFullName(updatedAppointment.doctorProfile?.user);
    const specialtyName = updatedAppointment.specialty?.name ?? "";
    await NotificationService.createAppointmentUpdate(
      updatedAppointment.patientId,
      {
        appointmentDate: updatedAppointment.appointmentDate
          .toISOString()
          .split("T")[0],
        startTime: updatedAppointment.startTime,
        doctorName,
        specialty: specialtyName,
      },
    );
  } catch (error) {
    console.error("Failed to create appointment update notification:", error);
  }

  return updatedAppointment;
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
  const schedule = (doctorProfile as any).schedules?.find(
    (s: any) => s.dayOfWeek === dayOfWeek,
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
        select: doctorUserSelect,
      },
      specialty: true,
      schedules: {
        where: {
          isActive: true,
        },
      },
    },
  });

  const availableSlots: any[] = [];
  const targetDate = filters.date || new Date();
  const dayOfWeek = targetDate.getDay();

  for (const doctor of doctorProfiles) {
    const schedule = (doctor as any).schedules?.find(
      (s: any) => s.dayOfWeek === dayOfWeek,
    );
    if (!schedule) continue;

    const startHour = parseInt(schedule.startTime.split(":")[0], 10);
    const startMinute = parseInt(schedule.startTime.split(":")[1], 10);
    const endHour = parseInt(schedule.endTime.split(":")[0], 10);
    const endMinute = parseInt(schedule.endTime.split(":")[1], 10);

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

    const bookedTimes = new Set(
      bookedAppointments.map((apt: { startTime: string }) => apt.startTime),
    );

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
            name: buildFullName(doctor.user),
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
