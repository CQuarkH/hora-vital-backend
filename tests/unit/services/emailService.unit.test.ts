import * as EmailService from "../../../src/services/emailService";

// Mock nodemailer
const mockSendMail = jest.fn();
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

describe("emailService (unit)", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("sendAppointmentConfirmation", () => {
    it("should send confirmation email successfully", async () => {
      const userEmail = "test@example.com";
      const appointmentData = {
        appointmentDate: "2024-12-20",
        startTime: "10:00",
        doctorName: "Dr. Smith",
        specialty: "Cardiology",
      };

      mockSendMail.mockResolvedValue({ messageId: "test-id" });

      await EmailService.sendAppointmentConfirmation(
        userEmail,
        appointmentData,
      );

      expect(mockSendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM || "no-reply@horavital.com",
        to: userEmail,
        subject: "Confirmación de Cita Médica - Hora Vital",
        html: expect.stringContaining("Confirmación de Cita Médica"),
      });
    });

    it("should handle email sending errors gracefully", async () => {
      const userEmail = "test@example.com";
      const appointmentData = {
        appointmentDate: "2024-12-20",
        startTime: "10:00",
        doctorName: "Dr. Smith",
        specialty: "Cardiology",
      };

      mockSendMail.mockRejectedValue(new Error("SMTP Error"));

      // Should not throw even if email fails
      await expect(
        EmailService.sendAppointmentConfirmation(userEmail, appointmentData),
      ).resolves.not.toThrow();
    });
  });

  describe("sendAppointmentCancellation", () => {
    it("should send cancellation email with reason", async () => {
      const userEmail = "test@example.com";
      const appointmentData = {
        appointmentDate: "2024-12-20",
        startTime: "10:00",
        doctorName: "Dr. Smith",
        specialty: "Cardiology",
        reason: "Personal reasons",
      };

      mockSendMail.mockResolvedValue({ messageId: "test-id" });

      await EmailService.sendAppointmentCancellation(
        userEmail,
        appointmentData,
      );

      expect(mockSendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM || "no-reply@horavital.com",
        to: userEmail,
        subject: "Cancelación de Cita Médica - Hora Vital",
        html: expect.stringContaining("Personal reasons"),
      });
    });

    it("should send cancellation email without reason", async () => {
      const userEmail = "test@example.com";
      const appointmentData = {
        appointmentDate: "2024-12-20",
        startTime: "10:00",
        doctorName: "Dr. Smith",
        specialty: "Cardiology",
        // No reason provided
      };

      mockSendMail.mockResolvedValue({ messageId: "test-id" });

      await EmailService.sendAppointmentCancellation(
        userEmail,
        appointmentData,
      );

      expect(mockSendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM || "no-reply@horavital.com",
        to: userEmail,
        subject: "Cancelación de Cita Médica - Hora Vital",
        html: expect.not.stringContaining("<li><strong>Motivo:</strong>"),
      });
    });
  });

  describe("sendAppointmentReminder", () => {
    it("should send reminder email successfully", async () => {
      const userEmail = "test@example.com";
      const appointmentData = {
        appointmentDate: "2024-12-20",
        startTime: "10:00",
        doctorName: "Dr. Smith",
        specialty: "Cardiology",
      };

      mockSendMail.mockResolvedValue({ messageId: "test-id" });

      await EmailService.sendAppointmentReminder(userEmail, appointmentData);

      expect(mockSendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM || "no-reply@horavital.com",
        to: userEmail,
        subject: "Recordatorio de Cita Médica - Hora Vital",
        html: expect.stringContaining("Recordatorio de Cita Médica"),
      });
    });

    it("should handle reminder email errors gracefully", async () => {
      const userEmail = "test@example.com";
      const appointmentData = {
        appointmentDate: "2024-12-20",
        startTime: "10:00",
        doctorName: "Dr. Smith",
        specialty: "Cardiology",
      };

      mockSendMail.mockRejectedValue(new Error("Network error"));

      await expect(
        EmailService.sendAppointmentReminder(userEmail, appointmentData),
      ).resolves.not.toThrow();
    });
  });
});
