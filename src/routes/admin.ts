// src/routes/admin.ts
import { Router } from "express";
import * as AdminController from "../controllers/adminController";
import {
  validate,
  adminCreateSchema,
  adminUpdateSchema,
  statusSchema,
  createScheduleSchema,
} from "../validators/adminValidator";
import { authenticate } from "../middlewares/authMiddleware";
import { authorizeRoles } from "../middlewares/authorize";

const router = Router();

router.use(authenticate);

router.get("/users", authorizeRoles("ADMIN"), AdminController.listUsers);

router.post(
  "/users",
  authorizeRoles("ADMIN"),
  validate(adminCreateSchema),
  AdminController.createUser,
);

router.put(
  "/users/:id",
  authorizeRoles("ADMIN"),
  validate(adminUpdateSchema),
  AdminController.updateUser,
);

router.patch(
  "/users/:id/status",
  authorizeRoles("ADMIN"),
  validate(statusSchema),
  AdminController.patchStatus,
);

router.get(
  "/appointments",
  authorizeRoles("ADMIN", "SECRETARY"),
  AdminController.getAppointments,
);

router.post(
  "/schedules",
  authorizeRoles("ADMIN", "SECRETARY"),
  validate(createScheduleSchema),
  AdminController.createSchedule,
);

export default router;
