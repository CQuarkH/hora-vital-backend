import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Hora Vital Backend API",
      version: "1.0.0",
      description: "Documentación de la API de Hora Vital",
    },
    servers: [
      {
        url: "http://localhost:4000",
      },
    ],
    components: {
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            role: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        Appointment: {
          type: "object",
          properties: {
            id: { type: "string" },
            patientId: { type: "string" },
            doctorProfileId: { type: "string" },
            specialtyId: { type: "string" },
            appointmentDate: { type: "string", format: "date-time" },
            startTime: { type: "string" },
            endTime: { type: "string" },
            status: { type: "string" },
            notes: { type: "string" },
            cancellationReason: { type: "string" },
          },
        },
        Notification: {
          type: "object",
          properties: {
            id: { type: "string" },
            userId: { type: "string" },
            type: { type: "string" },
            title: { type: "string" },
            message: { type: "string" },
            isRead: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        NotificationResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Notification" },
            },
            pagination: {
              type: "object",
              properties: {
                page: { type: "number" },
                limit: { type: "number" },
                total: { type: "number" },
                pages: { type: "number" },
              },
            },
          },
        },
        Specialty: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        DoctorProfile: {
          type: "object",
          properties: {
            id: { type: "string" },
            userId: { type: "string" },
            specialtyId: { type: "string" },
            licenseNumber: { type: "string" },
            isActive: { type: "boolean" },
            user: { $ref: "#/components/schemas/User" },
            specialty: { $ref: "#/components/schemas/Specialty" },
          },
        },
      },
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Ingrese el token JWT obtenido del endpoint de login",
        },
      },
    },
  },
  apis: [
    "./src/controllers/*.ts",
    "./src/routes/*.ts",
    "./dist/controllers/*.js",
    "./dist/routes/*.js",
  ],
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
