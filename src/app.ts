import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { json } from "body-parser";
import { setupSwagger } from "./swagger";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import profileRoutes from "./routes/profile";
import appointmentRoutes from "./routes/appointments";
import notificationRoutes from "./routes/notifications";
import calendarRoutes from "./routes/calendar";
import secretaryRoutes from "./routes/secretary";

import medicalRoutes from "./routes/medical";

const app = express();

// Secure CORS configuration
const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Get allowed origins from environment variables
    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000", // React dev server
      "http://localhost:3001", // Alternative dev port
      "https://localhost:3000", // HTTPS dev
      "https://localhost:3001", // HTTPS alternative
      "http://localhost:5123",
      "https://localhost:5123",
    ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS policy"), false);
    }
  },
  credentials: true, // Allow cookies and credentials
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Content-Length", "X-Total-Count"],
  maxAge: 86400, // Cache preflight for 24 hours
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(json());
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", profileRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/secretary", secretaryRoutes);

app.use("/api/medical", medicalRoutes);

// Swagger
setupSwagger(app);

export default app;
