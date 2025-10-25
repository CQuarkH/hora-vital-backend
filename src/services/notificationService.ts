import prisma from "../db/prisma";
import { NotificationType } from "@prisma/client";
import * as EmailService from "./emailService";

type NotificationFilters = {
  page: number;
  limit: number;
  isRead?: boolean;
};

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
};

export const getUserNotifications = async (
  userId: string,
  filters: NotificationFilters,
) => {
  const take = Math.min(filters.limit, 100);
  const skip = (Math.max(filters.page, 1) - 1) * take;

  const whereClause: any = {
    userId,
  };

  if (filters.isRead !== undefined) {
    whereClause.isRead = filters.isRead;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where: whereClause }),
  ]);

  return {
    notifications,
    meta: {
      total,
      page: filters.page,
      limit: take,
      pages: Math.ceil(total / take),
    },
  };
};

export const findNotificationById = async (notificationId: string) => {
  return prisma.notification.findUnique({
    where: { id: notificationId },
  });
};

export const markNotificationAsRead = async (notificationId: string) => {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};

export const createNotification = async (data: CreateNotificationInput) => {
  return prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data,
    },
  });
};

export const createAppointmentReminder = async (
  userId: string,
  appointmentData: any,
) => {
  return createNotification({
    userId,
    type: "APPOINTMENT_REMINDER",
    title: "Recordatorio de Cita",
    message: `Recuerda que tienes una cita médica mañana a las ${appointmentData.startTime}`,
    data: appointmentData,
  });
};

export const createAppointmentConfirmation = async (
  userId: string,
  appointmentData: any,
) => {
  const notification = await createNotification({
    userId,
    type: "APPOINTMENT_CONFIRMATION",
    title: "Cita Confirmada",
    message: `Tu cita médica ha sido confirmada para el ${appointmentData.appointmentDate} a las ${appointmentData.startTime}`,
    data: appointmentData,
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (user?.email) {
    await EmailService.sendAppointmentConfirmation(user.email, appointmentData);
  }

  return notification;
};

export const createAppointmentCancellation = async (
  userId: string,
  appointmentData: any,
) => {
  const notification = await createNotification({
    userId,
    type: "APPOINTMENT_CANCELLATION",
    title: "Cita Cancelada",
    message: `Tu cita médica del ${appointmentData.appointmentDate} a las ${appointmentData.startTime} ha sido cancelada`,
    data: appointmentData,
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (user?.email) {
    await EmailService.sendAppointmentCancellation(user.email, appointmentData);
  }

  return notification;
};
