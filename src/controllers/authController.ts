// src/controllers/authController.ts
import { Request, Response } from "express";
import * as AuthService from "../services/authService";

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Registro y login
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar un usuario
 *     tags: [Auth]
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
 *               password: { type: string }
 *               rut: { type: string }
 *               phone: { type: string }
 *               gender: { type: string }
 *               birthDate: { type: string, format: date }
 *               address: { type: string }
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *       409:
 *         description: Email o RUT ya registrado
 *       500:
 *         description: Error de servidor
 */
export const register = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      rut,
      phone,
      gender,
      birthDate,
      address,
    } = req.body;

    const existingEmail = await AuthService.findUserByEmail(email);
    if (existingEmail)
      return res
        .status(409)
        .json({ success: false, message: "Email ya registrado" });

    const existingRut = await AuthService.findUserByRut(rut);
    if (existingRut)
      return res
        .status(409)
        .json({ success: false, message: "RUT ya registrado" });

    const user = await AuthService.createUser({
      firstName,
      lastName,
      email,
      password,
      rut,
      phone,
      gender,
      birthDate,
      address,
    });

    const token = AuthService.generateToken({
      userId: user.id,
      role: user.role,
    });

    return res.status(201).json({
      success: true,
      message: "Registro exitoso",
      data: {
        user: AuthService.mapUserToDto(user),
        token,
      },
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Error de servidor" });
  }
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login de usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rut: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login exitoso
 *       401:
 *         description: Credenciales inválidas
 *       500:
 *         description: Error de servidor
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { rut, password } = req.body;

    const user = await AuthService.findUserByRut(rut);
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Credenciales inválidas" });

    const ok = await AuthService.verifyPassword(password, user.password);
    if (!ok)
      return res
        .status(401)
        .json({ success: false, message: "Credenciales inválidas" });

    const token = AuthService.generateToken({
      userId: user.id,
      role: user.role,
    });

    return res.json({
      success: true,
      message: "Login exitoso",
      data: {
        user: AuthService.mapUserToDto(user),
        token,
      },
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Error de servidor" });
  }
};
