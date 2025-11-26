import { Request, Response } from "express";
import * as AppointmentService from "../services/appointmentService";

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Endpoints de citas médicas
 */

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Crear una nueva cita
 *     tags: [Appointments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               doctorProfileId: { type: string }
 *               specialtyId: { type: string }
 *               appointmentDate: { type: string, format: date-time }
 *               startTime: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Cita creada exitosamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Usuario no autenticado
 *       404:
 *         description: Médico o especialidad no encontrado
 *       409:
 *         description: Conflicto de horario
 */
export const createAppointment = async (req: Request, res: Response) => {
  try {
    const { doctorProfileId, specialtyId, appointmentDate, startTime, notes } =
      req.body;
    const patientId = req.user?.id;

    if (!patientId) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    const doctorProfile =
      await AppointmentService.findDoctorProfile(doctorProfileId);
    if (!doctorProfile) {
      return res.status(404).json({ message: "Médico no encontrado" });
    }

    const specialty = await AppointmentService.findSpecialty(specialtyId);
    if (!specialty) {
      return res.status(404).json({ message: "Especialidad no encontrada" });
    }

    if (doctorProfile.specialtyId !== specialtyId) {
      return res.status(400).json({
        message: "El médico no pertenece a la especialidad seleccionada",
      });
    }

    const appointmentDateObj = new Date(appointmentDate);

    const scheduleValidation = await AppointmentService.validateDoctorSchedule(
      doctorProfileId,
      appointmentDateObj,
      startTime,
    );
    if (!scheduleValidation.isValid) {
      return res.status(400).json({
        message: scheduleValidation.message,
      });
    }

    const existingAppointment =
      await AppointmentService.checkAppointmentConflict(
        doctorProfileId,
        appointmentDateObj,
        startTime,
      );
    if (existingAppointment) {
      return res.status(409).json({ message: "El horario ya está reservado" });
    }

    const duplicateAppointment =
      await AppointmentService.checkPatientDuplicateAppointment(
        patientId,
        doctorProfileId,
        appointmentDateObj,
      );
    if (duplicateAppointment) {
      return res.status(409).json({
        message: "Ya tienes una cita con este médico en la misma fecha",
      });
    }

    const appointment = await AppointmentService.createAppointment({
      patientId,
      doctorProfileId,
      specialtyId,
      appointmentDate: appointmentDateObj,
      startTime,
      notes,
    });

    return res.status(201).json({
      message: "Cita creada exitosamente",
      appointment,
    });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2002") {
      return res.status(409).json({ message: "El horario ya está reservado" });
    }
    return res.status(500).json({ message: "Error de servidor" });
  }
};

/**
 * @swagger
 * /api/appointments/{id}:
 *   delete:
 *     summary: Cancelar una cita
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancellationReason: { type: string }
 *     responses:
 *       200:
 *         description: Cita cancelada
 *       400:
 *         description: Ya cancelada o completada
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Cita no encontrada
 */
export const cancelAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;
    const patientId = req.user?.id;

    if (!patientId) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    const appointment = await AppointmentService.findAppointmentById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }

    if (appointment.patientId !== patientId) {
      return res
        .status(403)
        .json({ message: "No tienes permisos para cancelar esta cita" });
    }

    if (appointment.status === "CANCELLED") {
      return res.status(400).json({ message: "La cita ya está cancelada" });
    }

    if (appointment.status === "COMPLETED") {
      return res
        .status(400)
        .json({ message: "No se puede cancelar una cita completada" });
    }

    const cancelledAppointment = await AppointmentService.cancelAppointment(
      id,
      cancellationReason,
    );

    return res.json({
      message: "Cita cancelada exitosamente",
      appointment: cancelledAppointment,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error de servidor" });
  }
};

/**
 * @swagger
 * /api/appointments/{id}:
 *   put:
 *     summary: Actualizar/Reprogramar una cita médica
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               doctorProfileId: { type: string }
 *               specialtyId: { type: string }
 *               appointmentDate: { type: string, format: date-time }
 *               startTime: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Cita actualizada exitosamente
 *       400:
 *         description: Datos inválidos o cita no puede ser actualizada
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Cita no encontrada
 *       409:
 *         description: Nuevo horario no disponible
 */
export const updateAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    // Check appointment exists
    const appointment = await AppointmentService.findAppointmentById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }

    // Authorization check: patient owns appointment or is SECRETARY/ADMIN
    const isOwner = appointment.patientId === userId;
    const isStaff = userRole === "SECRETARY" || userRole === "ADMIN";

    if (!isOwner && !isStaff) {
      return res
        .status(403)
        .json({ message: "No tienes permisos para editar esta cita" });
    }

    // Cannot update cancelled or completed appointments
    if (appointment.status === "CANCELLED") {
      return res
        .status(400)
        .json({ message: "No se puede editar una cita cancelada" });
    }

    if (appointment.status === "COMPLETED") {
      return res
        .status(400)
        .json({ message: "No se puede editar una cita completada" });
    }

    // Parse appointment date if provided
    const updateData: any = {};
    if (req.body.doctorProfileId) {
      updateData.doctorProfileId = req.body.doctorProfileId;
    }
    if (req.body.specialtyId) {
      updateData.specialtyId = req.body.specialtyId;
    }
    if (req.body.appointmentDate) {
      updateData.appointmentDate = new Date(req.body.appointmentDate);
    }
    if (req.body.startTime) {
      updateData.startTime = req.body.startTime;
    }
    if (req.body.notes !== undefined) {
      updateData.notes = req.body.notes;
    }

    const updatedAppointment = await AppointmentService.updateAppointment(
      id,
      updateData
    );

    return res.json({
      message: "Cita actualizada exitosamente",
      appointment: updatedAppointment,
    });
  } catch (err: any) {
    console.error(err);

    if (err.message === "Appointment not found") {
      return res.status(404).json({ message: "Cita no encontrada" });
    }
    if (err.message === "Doctor not found") {
      return res.status(404).json({ message: "Médico no encontrado" });
    }
    if (err.message === "The time slot is already reserved") {
      return res.status(409).json({ message: "El horario ya está reservado" });
    }
    if (
      err.message === "Doctor does not belong to the selected specialty"
    ) {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: "Error de servidor" });
  }
};

/**
 * @swagger
 * /api/appointments/me:
 *   get:
 *     summary: Obtener mis citas
 *     tags: [Appointments]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Lista de citas del paciente
 *       401:
 *         description: Usuario no autenticado
 */
export const getMyAppointments = async (req: Request, res: Response) => {
  try {
    const patientId = req.user?.id;
    const { status, dateFrom, dateTo } = req.query;

    if (!patientId) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    const filters: any = {};

    if (status) {
      filters.status = status as string;
    }

    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom as string);
    }

    if (dateTo) {
      filters.dateTo = new Date(dateTo as string);
    }

    const appointments = await AppointmentService.findPatientAppointments(
      patientId,
      filters,
    );

    return res.json({
      appointments,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error de servidor" });
  }
};

/**
 * @swagger
 * /api/appointments/availability:
 *   get:
 *     summary: Obtener horarios disponibles
 *     tags: [Appointments]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: specialtyId
 *         schema: { type: string }
 *       - in: query
 *         name: doctorProfileId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Horarios disponibles
 */
export const getAvailability = async (req: Request, res: Response) => {
  try {
    const { date, specialtyId, doctorProfileId } = req.query;

    const filters: any = {};

    if (date) {
      filters.date = new Date(date as string);
    }

    if (specialtyId) {
      filters.specialtyId = specialtyId as string;
    }

    if (doctorProfileId) {
      filters.doctorProfileId = doctorProfileId as string;
    }

    const availableSlots =
      await AppointmentService.getAvailableTimeSlots(filters);

    return res.json({
      availableSlots,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error de servidor" });
  }
};
