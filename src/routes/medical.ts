import { Router } from "express";
import * as MedicalController from "../controllers/medicalController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.get("/specialties", authenticate, MedicalController.getSpecialties);
router.get("/doctors", authenticate, MedicalController.getDoctors);

export default router;