import { Router } from "express";
import * as AuthController from "../controllers/authController";
import {
  validate,
  registerSchema,
  loginSchema,
} from "../validators/authValidator";

const router = Router();

router.post("/register", validate(registerSchema), AuthController.register);
router.post("/login", validate(loginSchema), AuthController.login);

export default router;
