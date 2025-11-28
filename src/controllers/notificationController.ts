import { Request, Response } from "express";
import * as NotificationService from "../services/notificationService";
import prisma from "../db/prisma";
import * as EmailService from "../services/emailService";

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 20, isRead } = req.query;

    if (!userId) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    const filters = {
      page: Number(page),
      limit: Number(limit),
      isRead: isRead === "true" ? true : isRead === "false" ? false : undefined,
    };

    const result = await NotificationService.getUserNotifications(
      userId,
      filters,
    );
    return res.json(result);
  } catch (err) {
    console.error("getNotifications error", err);
    return res.status(500).json({ message: "Error de servidor" });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    const notification = await NotificationService.findNotificationById(id);
    if (!notification) {
      return res.status(404).json({ message: "Notificación no encontrada" });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({
        message: "No tienes permisos para marcar esta notificación como leída",
      });
    }

    const updatedNotification =
      await NotificationService.markNotificationAsRead(id);
    return res.json({
      message: "Notificación marcada como leída",
      notification: updatedNotification,
    });
  } catch (err) {
    console.error("markAsRead error", err);
    return res.status(500).json({ message: "Error de servidor" });
  }
};

export const sendAppointmentReminders = async (req: Request, res: Response) => {
  try {
    const { appointmentDate } = req.body;

    if (!appointmentDate) {
      return res.status(400).json({
        message: "appointmentDate es requerido",
      });
    }

    const targetDate = new Date(appointmentDate);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: targetDate,
          lt: nextDay,
        },
        status: "SCHEDULED",
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        doctorProfile: {
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
        },
      },
    });

    let successCount = 0;
    let errorCount = 0;

    for (const appointment of appointments) {
      try {
        const doctorUser = appointment.doctorProfile?.user;
        const doctorName = doctorUser
          ? `${doctorUser.firstName ?? ""}${doctorUser.lastName ? " " + doctorUser.lastName : ""}`.trim()
          : "";

        const appointmentData = {
          appointmentDate: appointment.appointmentDate
            .toISOString()
            .split("T")[0],
          startTime: appointment.startTime,
          doctorName,
          specialty: appointment.doctorProfile?.specialty?.name ?? "",
        };

        await NotificationService.createAppointmentReminder(
          appointment.patient.id,
          appointmentData,
        );

        if (appointment.patient.email && process.env.NODE_ENV !== "test") {
          await EmailService.sendAppointmentReminder(
            appointment.patient.email,
            appointmentData,
          );
        }

        successCount++;
      } catch (err) {
        console.error(
          "Error sending reminder for appointment",
          appointment.id,
          err,
        );
        errorCount++;
      }
    }

    return res.json({
      message: "Recordatorios enviados",
      results: {
        total: appointments.length,
        successful: successCount,
        failed: errorCount,
      },
    });
  } catch (err) {
    console.error("sendAppointmentReminders error", err);
    return res.status(500).json({ message: "Error de servidor" });
  }
};

export const sendBatchReminders = async (req: Request, res: Response) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: tomorrow,
          lt: dayAfterTomorrow,
        },
        status: "SCHEDULED",
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        doctorProfile: {
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
        },
      },
    });

    let successCount = 0;
    let errorCount = 0;

    for (const appointment of appointments) {
      try {
        const doctorUser = appointment.doctorProfile?.user;
        const doctorName = doctorUser
          ? `${doctorUser.firstName ?? ""}${doctorUser.lastName ? " " + doctorUser.lastName : ""}`.trim()
          : "";

        const appointmentData = {
          appointmentDate: appointment.appointmentDate
            .toISOString()
            .split("T")[0],
          startTime: appointment.startTime,
          doctorName,
          specialty: appointment.doctorProfile?.specialty?.name ?? "",
        };

        await NotificationService.createAppointmentReminder(
          appointment.patient.id,
          appointmentData,
        );

        if (appointment.patient.email && process.env.NODE_ENV !== "test") {
          await EmailService.sendAppointmentReminder(
            appointment.patient.email,
            appointmentData,
          );
        }

        successCount++;
      } catch (err) {
        console.error(
          "Error sending batch reminder for appointment",
          appointment.id,
          err,
        );
        errorCount++;
      }
    }

    return res.json({
      message: "Recordatorios masivos enviados para mañana",
      date: tomorrow.toISOString().split("T")[0],
      results: {
        total: appointments.length,
        successful: successCount,
        failed: errorCount,
      },
    });
  } catch (err) {
    console.error("sendBatchReminders error", err);
    return res.status(500).json({ message: "Error de servidor" });
  }
};
