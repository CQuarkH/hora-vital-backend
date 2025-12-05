// src/routes/secretary.ts
import { Router } from "express";
import * as SecretaryController from "../controllers/secretaryController";
import {
  validate,
  registerPatientSchema,
  updateScheduleSchema,
  blockPeriodSchema,
} from "../validators/secretaryValidator";
import { authenticate } from "../middlewares/authMiddleware";
import { authorizeRoles } from "../middlewares/authorize";

const router = Router();

router.use(authenticate);

router.post(
  "/patients",
  authorizeRoles("SECRETARY"),
  validate(registerPatientSchema),
  SecretaryController.registerPatient,
);

router.get(
  "/agenda/:doctorId",
  authorizeRoles("SECRETARY"),
  SecretaryController.getDoctorAgenda,
);

router.put(
  "/schedules/:id",
  authorizeRoles("SECRETARY"),
  validate(updateScheduleSchema),
  SecretaryController.updateSchedule,
);

router.post(
  "/blocks",
  authorizeRoles("SECRETARY"),
  validate(blockPeriodSchema),
  SecretaryController.blockPeriod,
);

router.delete(
  "/blocks/:id",
  authorizeRoles("SECRETARY"),
  SecretaryController.unblockPeriod,
);

router.post(
  "/blocks/override",
  authorizeRoles("SECRETARY"),
  validate(blockPeriodSchema),
  SecretaryController.blockPeriodWithOverride,
);

export default router;
