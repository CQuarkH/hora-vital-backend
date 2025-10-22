// src/routes/profile.ts
import { Router } from 'express';
import * as ProfileController from '../controllers/profileController';
import { authenticate } from '../middlewares/authMiddleware';
import { validate, profileUpdateSchema } from '../validators/profileValidator';

const router = Router();

// todas las rutas requieren autenticación
router.use(authenticate);

/**
 * GET /api/users/profile
 * Obtiene el perfil del usuario autenticado
 */
router.get('/profile', ProfileController.getProfile);

/**
 * PUT /api/users/profile
 * Actualiza el perfil del usuario autenticado (solo su propio perfil)
 */
router.put('/profile', validate(profileUpdateSchema), ProfileController.updateProfile);

export default router;
