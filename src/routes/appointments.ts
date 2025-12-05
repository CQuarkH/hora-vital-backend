import { Router } from "express";
import * as AppointmentController from "../controllers/appointmentController";
import {
  validate,
  validateQuery,
  createAppointmentSchema,
  cancelAppointmentSchema,
  updateAppointmentSchema,
  myAppointmentsSchema,
  appointmentAvailabilitySchema,
} from "../validators/appointmentValidator";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

// Agendar Cita Médica
router.post(
  "/",
  authenticate,
  validate(createAppointmentSchema),
  AppointmentController.createAppointment,
);

// Cancelar Cita Médica
/**
 * @swagger
 * /api/appointments/{id}/cancel:
 *   patch:
 *     summary: Cancelar cita médica
 *     description: Cancela una cita médica específica del usuario autenticado
 *     tags:
 *       - Appointments
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la cita a cancelar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cancellationReason
 *             properties:
 *               cancellationReason:
 *                 type: string
 *                 description: Razón de la cancelación de la cita
 *                 example: "Conflicto de horario"
 *     responses:
 *       200:
 *         description: Cita cancelada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cita cancelada exitosamente"
 *                 appointment:
 *                   $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Datos de entrada inválidos
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: No tienes permisos para cancelar esta cita
 *       404:
 *         description: Cita no encontrada
 *       500:
 *         description: Error de servidor
 */
router.patch(
  "/:id/cancel",
  authenticate,
  validate(cancelAppointmentSchema),
  AppointmentController.cancelAppointment,
);

router.delete(
  "/:id",
  authenticate,
  validate(cancelAppointmentSchema),
  AppointmentController.cancelAppointment,
);

// Editar/Actualizar Cita Médica
router.put(
  "/:id",
  authenticate,
  validate(updateAppointmentSchema),
  AppointmentController.updateAppointment,
);

// Visualizar Citas del Paciente
router.get(
  "/my-appointments",
  authenticate,
  validateQuery(myAppointmentsSchema),
  AppointmentController.getMyAppointments,
);

// Visualizar Horarios Disponibles
router.get(
  "/availability",
  validateQuery(appointmentAvailabilitySchema),
  AppointmentController.getAvailability,
);

export default router;
