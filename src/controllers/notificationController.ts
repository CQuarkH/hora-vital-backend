import { Request, Response } from "express";
import * as NotificationService from "../services/notificationService";

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
