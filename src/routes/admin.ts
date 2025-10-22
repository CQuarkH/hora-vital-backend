// src/routes/admin.ts
import { Router } from 'express';
import * as AdminController from '../controllers/adminController';
import { validate, adminCreateSchema, adminUpdateSchema, statusSchema } from '../validators/adminValidator';
import { authenticate } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/authorize';

const router = Router();

// todos protegidos: authenticate + authorizeRoles('ADMIN')
router.use(authenticate, authorizeRoles('ADMIN'));

/**
 * GET /api/admin/users
 * Query: page, limit
 */
router.get('/users', AdminController.listUsers);

/**
 * POST /api/admin/users
 * Body: name, email, password, role, rut, phone
 */
router.post('/users', validate(adminCreateSchema), AdminController.createUser);

/**
 * PUT /api/admin/users/:id
 * Body: name?, email?, role?, rut?, phone?, password? (si se desea)
 */
router.put('/users/:id', validate(adminUpdateSchema), AdminController.updateUser);

/**
 * PATCH /api/admin/users/:id/status
 * Body: { isActive: boolean }
 */
router.patch('/users/:id/status', validate(statusSchema), AdminController.patchStatus);

export default router;
