// src/controllers/profileController.ts
import { Request, Response } from "express";
import * as ProfileService from "../services/profileService";

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: Gestión de perfil del usuario
 */

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Obtener perfil del usuario
 *     tags: [Profile]
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "No autorizado" });

    const user = await ProfileService.getProfile(userId);
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });
    return res.json(user);
  } catch (err) {
    console.error("getProfile error", err);
    return res.status(500).json({ message: "Error de servidor" });
  }
};

/**
 * @swagger
 * /api/profile:
 *   put:
 *     summary: Actualizar perfil propio
 *     tags: [Profile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       403:
 *         description: No autorizado para actualizar otro usuario
 *       404:
 *         description: Usuario no encontrado
 *       409:
 *         description: Email ya registrado
 *       500:
 *         description: Error de servidor
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "No autorizado" });

    if (req.body.id && req.body.id !== userId) {
      return res
        .status(403)
        .json({ message: "No puedes editar el perfil de otro usuario" });
    }

    const { firstName, lastName, email, phone, password } = req.body;

    const updated = await ProfileService.updateOwnProfile(userId, {
      firstName,
      lastName,
      email,
      phone,
      password,
    });

    return res.json(updated);
  } catch (err: any) {
    if (
      err?.code === "P2002" ||
      err?.message?.toLowerCase()?.includes("email")
    ) {
      return res.status(409).json({ message: "Email ya registrado" });
    }
    if (err?.code === "P2025") {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Only log unexpected errors
    console.error("updateProfile unexpected error:", err);
    return res.status(500).json({ message: "Error de servidor" });
  }
};
