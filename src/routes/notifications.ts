import { Router } from "express";
import * as NotificationController from "../controllers/notificationController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorizeRoles } from "../middlewares/authorize";

const router = Router();

router.use(authenticate);

router.get("/", NotificationController.getNotifications);

router.patch("/:id/read", NotificationController.markAsRead);

// Endpoints para recordatorios - requieren permisos de admin
router.post(
  "/reminders/send",
  authorizeRoles("ADMIN"),
  NotificationController.sendAppointmentReminders,
);

router.post(
  "/reminders/batch",
  authorizeRoles("ADMIN"),
  NotificationController.sendBatchReminders,
);

export default router;
