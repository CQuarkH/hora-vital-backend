import { Request, Response } from "express";
import * as MedicalService from "../services/medicalService";

export const getSpecialties = async (req: Request, res: Response) => {
    try {
        const specialties = await MedicalService.getAllSpecialties();
        return res.json(specialties);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error de servidor" });
    }
};

export const getDoctors = async (req: Request, res: Response) => {
    try {
        const { specialtyId } = req.query;
        const doctors = await MedicalService.getDoctors(specialtyId as string);
        return res.json(doctors);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error de servidor" });
    }
};