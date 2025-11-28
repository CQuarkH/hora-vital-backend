// src/controllers/secretaryController.ts
import { Request, Response } from "express";
import * as SecretaryService from "../services/secretaryService";

/**
 * @swagger
 * components:
 *   schemas:
 *     PatientCreate:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           example: "María"
 *         lastName:
 *           type: string
 *           example: "González"
 *         email:
 *           type: string
 *           format: email
 *           example: "maria.gonzalez@example.com"
 *         password:
 *           type: string
 *           format: password
 *           example: "S3guraP@ssw0rd"
 *         rut:
 *           type: string
 *           example: "18.234.567-8"
 *         phone:
 *           type: string
 *           example: "+56987654321"
 *         gender:
 *           type: string
 *           example: "F"
 *         birthDate:
 *           type: string
 *           format: date
 *           example: "1995-03-15"
 *         address:
 *           type: string
 *           example: "Av. Providencia 1234, Santiago"
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - password
 *         - rut
 *
 *     PatientResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "uuid-v4"
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         role:
 *           type: string
 *           example: "PATIENT"
 *         rut:
 *           type: string
 *         phone:
 *           type: string
 *         gender:
 *           type: string
 *         birthDate:
 *           type: string
 *           format: date
 *         address:
 *           type: string
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   - name: Secretary
 *     description: Endpoints para secretarios/as
 */

/**
 * @swagger
 * /api/secretary/patients:
 *   post:
 *     summary: Registrar un nuevo paciente (CU-10)
 *     description: Permite a un secretario/a crear una nueva cuenta de paciente en el sistema
 *     tags: [Secretary]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PatientCreate'
 *     responses:
 *       201:
 *         description: Paciente creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PatientResponse'
 *       400:
 *         description: Datos de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Validation error"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (requiere rol SECRETARY)
 *       409:
 *         description: Email o RUT ya registrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email o RUT ya registrado"
 *       500:
 *         description: Error de servidor
 */
export const registerPatient = async (req: Request, res: Response) => {
  try {
    const payload = req.body as any;

    const patient = await SecretaryService.registerPatient(payload);

    return res.status(201).json(patient);
  } catch (err: any) {
    console.error("registerPatient error", err);

    if (err?.code === "P2002") {
      return res.status(409).json({ message: "Email o RUT ya registrado" });
    }
    if (err?.code === "RUT_REQUIRED") {
      return res.status(400).json({ message: "RUT requerido" });
    }

    return res.status(500).json({ message: "Error de servidor" });
  }
};
