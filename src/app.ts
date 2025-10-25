// src/app.ts
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { json } from "body-parser";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import profileRoutes from "./routes/profile";
import appointmentRoutes from "./routes/appointments";
import notificationRoutes from "./routes/notifications";

const app = express();

app.use(helmet());
app.use(cors());
app.use(json());
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", profileRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/notifications", notificationRoutes);

export default app;
