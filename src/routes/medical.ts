import { Router } from "express";
import * as MedicalController from "../controllers/medicalController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @swagger
 * /api/medical/specialties:
 *   get:
 *     summary: Obtener especialidades médicas
 *     description: Obtiene la lista de todas las especialidades médicas disponibles en el sistema
 *     tags:
 *       - Medical
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de especialidades médicas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Specialty'
 *       401:
 *         description: Usuario no autenticado
 *       500:
 *         description: Error de servidor
 */
router.get("/specialties", authenticate, MedicalController.getSpecialties);

/**
 * @swagger
 * /api/medical/doctors:
 *   get:
 *     summary: Obtener médicos disponibles
 *     description: Obtiene la lista de todos los médicos disponibles en el sistema con sus especialidades
 *     tags:
 *       - Medical
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de médicos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DoctorProfile'
 *       401:
 *         description: Usuario no autenticado
 *       500:
 *         description: Error de servidor
 */
router.get("/doctors", authenticate, MedicalController.getDoctors);

export default router;
