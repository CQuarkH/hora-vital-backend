// src/controllers/adminController.ts
import { Request, Response } from "express";
import * as AdminService from "../services/adminService";

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Endpoints de administración
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Lista todos los usuarios
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *       500:
 *         description: Error de servidor
 */
export const listUsers = async (req: Request, res: Response) => {
  try {
    const q = req.query as Record<string, any>;
    const page = Number(q.page ?? 1);
    const limit = Number(q.limit ?? 20);

    const result = await AdminService.listUsers(page, limit);
    return res.json(result);
  } catch (err) {
    console.error("listUsers error", err);
    return res.status(500).json({ message: "Error de servidor" });
  }
};

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Crear un nuevo usuario
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       409:
 *         description: Email ya registrado
 *       400:
 *         description: RUT requerido
 *       500:
 *         description: Error de servidor
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const payload = req.body as any;

    const user = await AdminService.createUser(payload);

    return res.status(201).json(user);
  } catch (err: any) {
    console.error("createUser error", err);

    if (err?.code === "P2002") {
      return res.status(409).json({ message: "Email ya registrado" });
    }
    if (err?.code === "RUT_REQUIRED") {
      return res.status(400).json({ message: "RUT requerido" });
    }

    return res.status(500).json({ message: "Error de servidor" });
  }
};

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Actualiza un usuario
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *       404:
 *         description: Usuario no encontrado
 *       409:
 *         description: Email ya registrado
 *       500:
 *         description: Error de servidor
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const payload = req.body;
    const user = await AdminService.updateUser(id, payload);
    return res.json(user);
  } catch (err: any) {
    console.error("updateUser error", err);
    if (err?.code === "P2002") {
      return res.status(409).json({ message: "Email ya registrado" });
    }
    if (err?.code === "P2025") {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    return res.status(500).json({ message: "Error de servidor" });
  }
};

/**
 * @swagger
 * /api/admin/users/{id}/status:
 *   patch:
 *     summary: Cambia el estado activo/inactivo de un usuario
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error de servidor
 */
export const patchStatus = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { isActive } = req.body as { isActive: boolean };
    const user = await AdminService.setUserStatus(id, isActive);
    return res.json(user);
  } catch (err: any) {
    console.error("patchStatus error", err);
    if (err?.code === "P2025") {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    return res.status(500).json({ message: "Error de servidor" });
  }
};

/**
 * @swagger
 * /api/admin/appointments:
 *   get:
 *     summary: Lista las citas con filtros
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: patientName
 *         schema:
 *           type: string
 *       - in: query
 *         name: doctorName
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: specialtyId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de citas
 *       500:
 *         description: Error de servidor
 */
export const getAppointments = async (req: Request, res: Response) => {
  try {
    const q = req.query as Record<string, any>;
    const filters = {
      page: Number(q.page ?? 1),
      limit: Number(q.limit ?? 20),
      date: q.date as string | undefined,
      patientName: q.patientName as string | undefined,
      doctorName: q.doctorName as string | undefined,
      status: q.status as string | undefined,
      specialtyId: q.specialtyId as string | undefined,
    };

    const result = await AdminService.getAppointments(filters);
    return res.json(result);
  } catch (err) {
    console.error("getAppointments error", err);
    return res.status(500).json({ message: "Error de servidor" });
  }
};

/**
 * @swagger
 * /api/admin/schedules:
 *   post:
 *     summary: Crear un nuevo horario para un médico
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               doctorProfileId:
 *                 type: string
 *               dayOfWeek:
 *                 type: integer
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *               slotDuration:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Horario creado exitosamente
 *       404:
 *         description: Perfil de médico no encontrado
 *       409:
 *         description: Conflicto o duplicidad de horario
 *       500:
 *         description: Error de servidor
 */
export const createSchedule = async (req: Request, res: Response) => {
  try {
    const { doctorProfileId, dayOfWeek, startTime, endTime, slotDuration } =
      req.body;

    const doctorProfile = await AdminService.findDoctorProfile(
      String(doctorProfileId)
    );
    if (!doctorProfile) {
      return res
        .status(404)
        .json({ message: "Perfil de médico no encontrado" });
    }

    const existingSchedule = await AdminService.findExistingSchedule(
      String(doctorProfileId),
      Number(dayOfWeek)
    );
    if (existingSchedule) {
      return res.status(409).json({
        message:
          "Ya existe un horario para este médico en este día de la semana",
      });
    }

    const conflictingAppointment =
      await AdminService.findConflictingAppointments(
        String(doctorProfileId),
        Number(dayOfWeek),
        String(startTime),
        String(endTime)
      );

    if (conflictingAppointment) {
      return res
        .status(409)
        .json({ message: `El horario se solapa con una cita ya agendada.` });
    }

    const schedule = await AdminService.createSchedule({
      doctorProfileId: String(doctorProfileId),
      dayOfWeek: Number(dayOfWeek),
      startTime: String(startTime),
      endTime: String(endTime),
      slotDuration: Number(slotDuration ?? 30),
    });

    return res.status(201).json(schedule);
  } catch (err: any) {
    console.error("createSchedule error", err);
    if (err?.code === "P2002") {
      return res
        .status(409)
        .json({ message: "Error de duplicidad al crear horario" });
    }
    return res.status(500).json({ message: "Error de servidor" });
  }
};
