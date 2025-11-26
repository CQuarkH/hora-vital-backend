import { Router } from "express";
import * as AppointmentController from "../controllers/appointmentController";
import {
  validate,
  validateQuery,
  createAppointmentSchema,
  cancelAppointmentSchema,
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