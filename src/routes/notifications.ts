import { Router } from "express";
import * as NotificationController from "../controllers/notificationController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.use(authenticate);

router.get("/", NotificationController.getNotifications);

router.patch("/:id/read", NotificationController.markAsRead);

export default router;
