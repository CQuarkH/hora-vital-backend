// src/routes/calendar.ts
import { Router } from "express";
import * as AdminController from "../controllers/adminController";
import {
  validateQuery,
  calendarAvailabilitySchema,
} from "../validators/calendarValidator";
import { authenticate } from "../middlewares/authMiddleware";
import { authorizeRoles } from "../middlewares/authorize";

const router = Router();

router.use(authenticate);

// Get calendar availability
router.get(
  "/availability",
  authorizeRoles("ADMIN", "SECRETARY"),
  validateQuery(calendarAvailabilitySchema),
  AdminController.getCalendarAvailability,
);

export default router;
