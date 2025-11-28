// src/routes/secretary.ts
import { Router } from "express";
import * as SecretaryController from "../controllers/secretaryController";
import { validate, registerPatientSchema } from "../validators/secretaryValidator";
import { authenticate } from "../middlewares/authMiddleware";
import { authorizeRoles } from "../middlewares/authorize";

const router = Router();

router.use(authenticate);

router.post(
  "/patients",
  authorizeRoles("SECRETARY"),
  validate(registerPatientSchema),
  SecretaryController.registerPatient
);

export default router;
