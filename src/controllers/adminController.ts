// src/controllers/adminController.ts
import { Request, Response } from "express";
import * as AdminService from "../services/adminService";
import { Prisma } from "@prisma/client";

let PrismaClientKnownRequestError: any;
try {
  PrismaClientKnownRequestError = require("@prisma/client/runtime").PrismaClientKnownRequestError;
} catch (e) {
  PrismaClientKnownRequestError = undefined;
}

export const listUsers = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    const result = await AdminService.listUsers(page, limit);
    return res.json(result);
  } catch (err) {
    console.error("listUsers error", err);
    return res.status(500).json({ message: "Error de servidor" });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, rut, phone } = req.body;

    const user = await AdminService.createUser({
      name,
      email,
      password,
      role,
      rut,
      phone,
    });
    return res.status(201).json(user);
  } catch (err: any) {
    console.error("createUser error", err);
    if (
      (PrismaClientKnownRequestError && err instanceof PrismaClientKnownRequestError && err.code === "P2002") ||
      ((err as any)?.code === "P2002")
    ) {
      return res.status(409).json({ message: "Email ya registrado" });
    }
    return res.status(500).json({ message: "Error de servidor" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const user = await AdminService.updateUser(id, payload);
    return res.json(user);
  } catch (err: any) {
    console.error("updateUser error", err);
    if (
      (PrismaClientKnownRequestError && err instanceof PrismaClientKnownRequestError && err.code === "P2002") ||
      ((err as any)?.code === "P2002")
    ) {
      return res.status(409).json({ message: "Email ya registrado" });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    return res.status(500).json({ message: "Error de servidor" });
  }
};

export const patchStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const user = await AdminService.setUserStatus(id, isActive);
    return res.json(user);
  } catch (err: any) {
    console.error("patchStatus error", err);
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    return res.status(500).json({ message: "Error de servidor" });
  }
};

export const getAppointments = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      date,
      patientName,
      doctorName,
      status,
      specialtyId,
    } = req.query;

    const filters = {
      page: Number(page),
      limit: Number(limit),
      date: date as string,
      patientName: patientName as string,
      doctorName: doctorName as string,
      status: status as string,
      specialtyId: specialtyId as string,
    };

    const result = await AdminService.getAppointments(filters);
    return res.json(result);
  } catch (err) {
    console.error("getAppointments error", err);
    return res.status(500).json({ message: "Error de servidor" });
  }
};

export const createSchedule = async (req: Request, res: Response) => {
  try {
    const { doctorProfileId, dayOfWeek, startTime, endTime, slotDuration } =
      req.body;

    const doctorProfile = await AdminService.findDoctorProfile(doctorProfileId);
    if (!doctorProfile) {
      return res
        .status(404)
        .json({ message: "Perfil de médico no encontrado" });
    }

    const existingSchedule = await AdminService.findExistingSchedule(
      doctorProfileId,
      dayOfWeek,
    );
    if (existingSchedule) {
      return res.status(409).json({
        message:
          "Ya existe un horario para este médico en este día de la semana",
      });
    }

    const conflictingAppointment = await AdminService.findConflictingAppointments(
      doctorProfileId,
      Number(dayOfWeek),
      startTime,
      endTime
    );

    if (conflictingAppointment) {
      return res.status(409).json({
        message: `El horario se solapa con una cita ya agendada.`,
      });
    }

    const schedule = await AdminService.createSchedule({
      doctorProfileId,
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime,
      slotDuration: slotDuration || 30,
    });

    return res.status(201).json(schedule);
  } catch (err: any) {
    console.error("createSchedule error", err);
    if ((PrismaClientKnownRequestError && err instanceof PrismaClientKnownRequestError && err.code === 'P2002') || ((err as any)?.code === 'P2002')) {
      return res.status(409).json({ message: "Error de duplicidad al crear horario" });
    }
    return res.status(500).json({ message: "Error de servidor" });
  }
};
