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
 *
 *     ScheduleUpdate:
 *       type: object
 *       properties:
 *         dayOfWeek:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *           example: 1
 *         startTime:
 *           type: string
 *           pattern: '^[0-9]{2}:[0-9]{2}$'
 *           example: "09:00"
 *         endTime:
 *           type: string
 *           pattern: '^[0-9]{2}:[0-9]{2}$'
 *           example: "17:00"
 *         slotDuration:
 *           type: integer
 *           minimum: 15
 *           maximum: 120
 *           example: 30
 *         isActive:
 *           type: boolean
 *           example: true
 *
 *     BlockPeriod:
 *       type: object
 *       properties:
 *         doctorProfileId:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         startDateTime:
 *           type: string
 *           format: date-time
 *           example: "2024-12-01T09:00:00Z"
 *         endDateTime:
 *           type: string
 *           format: date-time
 *           example: "2024-12-01T17:00:00Z"
 *         reason:
 *           type: string
 *           example: "Vacaciones programadas"
 *       required:
 *         - doctorProfileId
 *         - startDateTime
 *         - endDateTime
 *
 *     DoctorAgenda:
 *       type: object
 *       properties:
 *         doctor:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             specialty:
 *               type: string
 *         date:
 *           type: string
 *           format: date-time
 *         schedules:
 *           type: array
 *           items:
 *             type: object
 *         appointments:
 *           type: array
 *           items:
 *             type: object
 *         blockedPeriods:
 *           type: array
 *           items:
 *             type: object
 */

/**
 * @swagger
 * tags:
 *   - name: Secretary
 *     description: Endpoints para secretarios/as - CU-08 Gestionar Agenda
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

/**
 * @swagger
 * /api/secretary/agenda/{doctorId}:
 *   get:
 *     summary: Ver agenda completa del profesional (CU-08)
 *     description: Permite al secretario/a visualizar la agenda completa de un doctor específico con horarios, citas y períodos bloqueados
 *     tags: [Secretary]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del doctor
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha específica (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Agenda del doctor obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DoctorAgenda'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (requiere rol SECRETARY)
 *       404:
 *         description: Doctor no encontrado
 *       500:
 *         description: Error de servidor
 */
export const getDoctorAgenda = async (req: Request, res: Response) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    const agenda = await SecretaryService.getDoctorAgenda(
      doctorId,
      date as string,
    );

    return res.status(200).json(agenda);
  } catch (err: any) {
    console.error("getDoctorAgenda error", err);

    if (err?.code === "DOCTOR_NOT_FOUND") {
      return res.status(404).json({ message: "Doctor no encontrado" });
    }

    return res.status(500).json({ message: "Error de servidor" });
  }
};

/**
 * @swagger
 * /api/secretary/schedules/{id}:
 *   put:
 *     summary: Modificar bloque horario existente (CU-08)
 *     description: Permite al secretario/a modificar los horarios de un doctor, validando que no haya conflictos con citas programadas
 *     tags: [Secretary]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del horario a modificar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScheduleUpdate'
 *     responses:
 *       200:
 *         description: Horario modificado exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (requiere rol SECRETARY)
 *       404:
 *         description: Horario no encontrado
 *       409:
 *         description: Conflicto con citas programadas
 *       500:
 *         description: Error de servidor
 */
export const updateSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    const schedule = await SecretaryService.updateSchedule(id, payload);

    return res.status(200).json(schedule);
  } catch (err: any) {
    console.error("updateSchedule error", err);

    if (err?.code === "SCHEDULE_NOT_FOUND") {
      return res.status(404).json({ message: "Horario no encontrado" });
    }
    if (err?.code === "CONFLICT_WITH_APPOINTMENTS") {
      return res.status(409).json({
        message: "No se puede modificar, hay citas programadas en este horario",
      });
    }

    return res.status(500).json({ message: "Error de servidor" });
  }
};

/**
 * @swagger
 * /api/secretary/blocks:
 *   post:
 *     summary: Bloquear horarios específicos (CU-08)
 *     description: Permite al secretario/a bloquear períodos específicos en la agenda de un doctor
 *     tags: [Secretary]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BlockPeriod'
 *     responses:
 *       201:
 *         description: Período bloqueado exitosamente
 *       400:
 *         description: Datos de entrada inválidos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (requiere rol SECRETARY)
 *       404:
 *         description: Doctor no encontrado
 *       409:
 *         description: Hay citas programadas en este período
 *       500:
 *         description: Error de servidor
 */
export const blockPeriod = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const userId = (req as any).user.id;

    const blockedPeriod = await SecretaryService.blockPeriod(payload, userId);

    return res.status(201).json(blockedPeriod);
  } catch (err: any) {
    console.error("blockPeriod error", err);

    if (err?.code === "DOCTOR_NOT_FOUND") {
      return res.status(404).json({ message: "Doctor no encontrado" });
    }
    if (err?.code === "CONFLICT_WITH_APPOINTMENTS") {
      return res
        .status(409)
        .json({ message: "Hay citas programadas en este período" });
    }

    return res.status(500).json({ message: "Error de servidor" });
  }
};

/**
 * @swagger
 * /api/secretary/blocks/{id}:
 *   delete:
 *     summary: Desbloquear período específico (CU-08)
 *     description: Permite al secretario/a desbloquear un período previamente bloqueado
 *     tags: [Secretary]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del período bloqueado
 *     responses:
 *       200:
 *         description: Período desbloqueado exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (requiere rol SECRETARY)
 *       404:
 *         description: Período bloqueado no encontrado
 *       500:
 *         description: Error de servidor
 */
export const unblockPeriod = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await SecretaryService.unblockPeriod(id);

    return res
      .status(200)
      .json({ message: "Período desbloqueado exitosamente" });
  } catch (err: any) {
    console.error("unblockPeriod error", err);

    if (err?.code === "BLOCKED_PERIOD_NOT_FOUND") {
      return res
        .status(404)
        .json({ message: "Período bloqueado no encontrado" });
    }

    return res.status(500).json({ message: "Error de servidor" });
  }
};

/**
 * @swagger
 * /api/secretary/blocks/override:
 *   post:
 *     summary: Bloquear con override - Flujo Alternativo FA-01 (CU-08)
 *     description: Permite al secretario/a bloquear períodos cancelando automáticamente las citas existentes en ese horario
 *     tags: [Secretary]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BlockPeriod'
 *     responses:
 *       201:
 *         description: Período bloqueado con citas canceladas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 blockedPeriod:
 *                   type: object
 *                 cancelledAppointments:
 *                   type: integer
 *                   description: Número de citas canceladas
 *       400:
 *         description: Datos de entrada inválidos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (requiere rol SECRETARY)
 *       404:
 *         description: Doctor no encontrado
 *       500:
 *         description: Error de servidor
 */
export const blockPeriodWithOverride = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const userId = (req as any).user.id;

    const result = await SecretaryService.blockPeriodWithOverride(
      payload,
      userId,
    );

    return res.status(201).json(result);
  } catch (err: any) {
    console.error("blockPeriodWithOverride error", err);

    if (err?.code === "DOCTOR_NOT_FOUND") {
      return res.status(404).json({ message: "Doctor no encontrado" });
    }

    return res.status(500).json({ message: "Error de servidor" });
  }
};
