import { Request, Response } from "express";
import * as AppointmentService from "../services/appointmentService";

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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error de servidor" });
  }
};

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
