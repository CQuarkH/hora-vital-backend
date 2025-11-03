// src/controllers/adminController.ts
import { Request, Response } from "express";
import * as AdminService from "../services/adminService";

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminUserCreate:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           example: "Juan"
 *         lastName:
 *           type: string
 *           example: "Pérez"
 *         email:
 *           type: string
 *           format: email
 *           example: "juan@example.com"
 *         password:
 *           type: string
 *           format: password
 *           example: "S3guraP@ssw0rd"
 *         role:
 *           type: string
 *           enum: ["PATIENT","SECRETARY","ADMIN","DOCTOR"]
 *           example: "PATIENT"
 *         rut:
 *           type: string
 *           example: "20.123.456-7"
 *         phone:
 *           type: string
 *           example: "+56912345678"
 *         gender:
 *           type: string
 *           example: "M"
 *         birthDate:
 *           type: string
 *           format: date
 *           example: "1990-01-01"
 *         address:
 *           type: string
 *           example: "Calle Falsa 123"
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - password
 *         - rut
 *
 *     AdminUserUpdate:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           example: "Juan"
 *         lastName:
 *           type: string
 *           example: "Pérez"
 *         email:
 *           type: string
 *           format: email
 *           example: "juan.new@example.com"
 *         password:
 *           type: string
 *           format: password
 *           example: "Nuev@P4ss"
 *         role:
 *           type: string
 *           enum: ["PATIENT","SECRETARY","ADMIN","DOCTOR"]
 *           example: "DOCTOR"
 *         rut:
 *           type: string
 *           example: "20.123.456-7"
 *         phone:
 *           type: string
 *           example: "+56987654321"
 *         gender:
 *           type: string
 *           example: "F"
 *         birthDate:
 *           type: string
 *           format: date
 *           example: "1985-05-20"
 *         address:
 *           type: string
 *           example: "Avenida Siempre Viva 742"
 *
 *     AdminUser:
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
 *     UsersListResponse:
 *       type: object
 *       properties:
 *         users:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AdminUser'
 *         meta:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             pages:
 *               type: integer
 *
 *     CreateSchedule:
 *       type: object
 *       properties:
 *         doctorProfileId:
 *           type: string
 *           example: "uuid-doctor-profile"
 *         dayOfWeek:
 *           type: integer
 *           description: 0 = Sunday, 6 = Saturday
 *           example: 1
 *         startTime:
 *           type: string
 *           example: "09:00"
 *         endTime:
 *           type: string
 *           example: "17:00"
 *         slotDuration:
 *           type: integer
 *           example: 30
 *       required:
 *         - doctorProfileId
 *         - dayOfWeek
 *         - startTime
 *         - endTime
 *
 *     PatchStatus:
 *       type: object
 *       properties:
 *         isActive:
 *           type: boolean
 *       required:
 *         - isActive
 *
 *     AppointmentPatientMinimal:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *
 *     AppointmentDoctorMinimal:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         user:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             firstName: { type: string }
 *             lastName: { type: string }
 *
 *     AppointmentSpecialtyMinimal:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *
 *     Appointment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         appointmentDate:
 *           type: string
 *           format: date-time
 *         startTime:
 *           type: string
 *         endTime:
 *           type: string
 *         status:
 *           type: string
 *           enum: ["SCHEDULED","CANCELLED","COMPLETED","NO_SHOW"]
 *         patient:
 *           $ref: '#/components/schemas/AppointmentPatientMinimal'
 *         doctorProfile:
 *           $ref: '#/components/schemas/AppointmentDoctorMinimal'
 *         specialty:
 *           $ref: '#/components/schemas/AppointmentSpecialtyMinimal'
 *
 *     AppointmentsListResponse:
 *       type: object
 *       properties:
 *         appointments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Appointment'
 *         meta:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             pages:
 *               type: integer
 */

/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Endpoints de administración
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
 *         description: Página (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Tamaño por página (default 20)
 *     responses:
 *       200:
 *         description: Lista de usuarios con metadata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsersListResponse'
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
 *     summary: Crear un nuevo usuario (admin)
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminUserCreate'
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminUser'
 *       409:
 *         description: Email ya registrado
 *       400:
 *         description: RUT requerido (u otro input inválido)
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
 *         description: ID del usuario (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminUserUpdate'
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminUser'
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
 *         description: ID del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PatchStatus'
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminUser'
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
 *         description: Lista de citas con metadata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentsListResponse'
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
 *             $ref: '#/components/schemas/CreateSchedule'
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
