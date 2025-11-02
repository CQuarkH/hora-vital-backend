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
            },
        },
    },
    apis: ["./dist/controllers/*.js", "./dist/routes/*.js"], 
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express) => {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};