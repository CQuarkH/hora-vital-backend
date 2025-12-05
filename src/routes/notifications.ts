import { Router } from "express";
import * as NotificationController from "../controllers/notificationController";
import { authenticate } from "../middlewares/authMiddleware";
import { authorizeRoles } from "../middlewares/authorize";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Obtener notificaciones del usuario
 *     description: Obtiene las notificaciones del usuario autenticado con paginación y filtros opcionales
 *     tags:
 *       - Notifications
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Número de notificaciones por página
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado de lectura
 *     responses:
 *       200:
 *         description: Lista de notificaciones obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       401:
 *         description: Usuario no autenticado
 *       500:
 *         description: Error de servidor
 */
router.get("/", NotificationController.getNotifications);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Marcar notificación como leída
 *     description: Marca una notificación específica como leída para el usuario autenticado
 *     tags:
 *       - Notifications
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la notificación
 *     responses:
 *       200:
 *         description: Notificación marcada como leída exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Notificación marcada como leída"
 *                 notification:
 *                   $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: No tienes permisos para marcar esta notificación
 *       404:
 *         description: Notificación no encontrada
 *       500:
 *         description: Error de servidor
 */
router.patch("/:id/read", NotificationController.markAsRead);

// Endpoints para recordatorios - requieren permisos de admin
/**
 * @swagger
 * /api/notifications/reminders/send:
 *   post:
 *     summary: Enviar recordatorios de citas
 *     description: Envía recordatorios por email y notificación para las citas de una fecha específica
 *     tags:
 *       - Notifications
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointmentDate
 *             properties:
 *               appointmentDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-15"
 *                 description: Fecha de las citas para enviar recordatorios
 *     responses:
 *       200:
 *         description: Recordatorios enviados exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Recordatorios enviados"
 *                 results:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       description: Total de citas procesadas
 *                     successful:
 *                       type: number
 *                       description: Recordatorios enviados exitosamente
 *                     failed:
 *                       type: number
 *                       description: Recordatorios fallidos
 *       400:
 *         description: appointmentDate es requerido
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: No tienes permisos de administrador
 *       500:
 *         description: Error de servidor
 */
router.post(
  "/reminders/send",
  authorizeRoles("ADMIN"),
  NotificationController.sendAppointmentReminders,
);

/**
 * @swagger
 * /api/notifications/reminders/batch:
 *   post:
 *     summary: Enviar recordatorios masivos
 *     description: Envía recordatorios automáticos para todas las citas del día siguiente
 *     tags:
 *       - Notifications
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Recordatorios masivos enviados exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Recordatorios masivos enviados para mañana"
 *                 date:
 *                   type: string
 *                   format: date
 *                   example: "2024-12-16"
 *                   description: Fecha para la cual se enviaron los recordatorios
 *                 results:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       description: Total de citas procesadas
 *                     successful:
 *                       type: number
 *                       description: Recordatorios enviados exitosamente
 *                     failed:
 *                       type: number
 *                       description: Recordatorios fallidos
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: No tienes permisos de administrador
 *       500:
 *         description: Error de servidor
 */
router.post(
  "/reminders/batch",
  authorizeRoles("ADMIN"),
  NotificationController.sendBatchReminders,
);

export default router;
