const mockedPrisma = {
  notification: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
} as unknown as any;

const mockedEmailService = {
  sendAppointmentConfirmation: jest.fn(),
  sendAppointmentCancellation: jest.fn(),
  sendAppointmentReminder: jest.fn(),
};

jest.mock("../../../src/db/prisma", () => ({
  __esModule: true,
  default: mockedPrisma,
}));
jest.mock("../../../src/services/emailService", () => mockedEmailService);

const NotificationService =
  require("../../../src/services/notificationService") as typeof import("../../../src/services/notificationService");

describe("notificationService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset NODE_ENV for each test
    process.env.NODE_ENV = "test";
    delete process.env.FORCE_EMAIL_IN_TESTS;
  });

  describe("getUserNotifications", () => {
    it("should get user notifications with default filters", async () => {
      const mockNotifications = [
        { id: "1", title: "Test", message: "Test message", isRead: false },
      ];
      mockedPrisma.notification.findMany.mockResolvedValue(mockNotifications);
      mockedPrisma.notification.count.mockResolvedValue(1);

      const result = await NotificationService.getUserNotifications("user-1", {
        page: 1,
        limit: 10,
      });

      expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual({
        notifications: mockNotifications,
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
        },
      });
    });

    it("should filter by isRead when provided", async () => {
      const mockNotifications = [
        { id: "1", title: "Test", message: "Test message", isRead: false },
      ];
      mockedPrisma.notification.findMany.mockResolvedValue(mockNotifications);
      mockedPrisma.notification.count.mockResolvedValue(1);

      await NotificationService.getUserNotifications("user-1", {
        page: 1,
        limit: 10,
        isRead: false,
      });

      expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1", isRead: false },
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
      });
    });

    it("should limit results to maximum 100 per page", async () => {
      mockedPrisma.notification.findMany.mockResolvedValue([]);
      mockedPrisma.notification.count.mockResolvedValue(0);

      await NotificationService.getUserNotifications("user-1", {
        page: 1,
        limit: 200, // Over limit
      });

      expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        skip: 0,
        take: 100, // Should be capped at 100
        orderBy: { createdAt: "desc" },
      });
    });

    it("should handle page numbers correctly", async () => {
      mockedPrisma.notification.findMany.mockResolvedValue([]);
      mockedPrisma.notification.count.mockResolvedValue(0);

      await NotificationService.getUserNotifications("user-1", {
        page: 0, // Invalid page
        limit: 10,
      });

      expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        skip: 0, // Should be treated as page 1
        take: 10,
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("findNotificationById", () => {
    it("should find notification by id", async () => {
      const mockNotification = { id: "1", title: "Test" };
      mockedPrisma.notification.findUnique.mockResolvedValue(mockNotification);

      const result = await NotificationService.findNotificationById("1");

      expect(mockedPrisma.notification.findUnique).toHaveBeenCalledWith({
        where: { id: "1" },
      });
      expect(result).toBe(mockNotification);
    });
  });

  describe("markNotificationAsRead", () => {
    it("should mark notification as read", async () => {
      const mockNotification = { id: "1", isRead: true };
      mockedPrisma.notification.update.mockResolvedValue(mockNotification);

      const result = await NotificationService.markNotificationAsRead("1");

      expect(mockedPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: { isRead: true },
      });
      expect(result).toBe(mockNotification);
    });
  });

  describe("createNotification", () => {
    it("should create notification", async () => {
      const notificationData = {
        userId: "user-1",
        type: "APPOINTMENT_REMINDER" as const,
        title: "Test",
        message: "Test message",
        data: { test: true },
      };
      const mockNotification = { id: "1", ...notificationData };
      mockedPrisma.notification.create.mockResolvedValue(mockNotification);

      const result =
        await NotificationService.createNotification(notificationData);

      expect(mockedPrisma.notification.create).toHaveBeenCalledWith({
        data: notificationData,
      });
      expect(result).toBe(mockNotification);
    });
  });

  describe("createAppointmentReminder", () => {
    it("should create appointment reminder", async () => {
      const appointmentData = {
        startTime: "10:00",
        doctorName: "Dr. Smith",
      };
      const mockNotification = { id: "1", type: "APPOINTMENT_REMINDER" };
      mockedPrisma.notification.create.mockResolvedValue(mockNotification);

      const result = await NotificationService.createAppointmentReminder(
        "user-1",
        appointmentData,
      );

      expect(mockedPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          type: "APPOINTMENT_REMINDER",
          title: "Recordatorio de Cita",
          message: `Recuerda que tienes una cita médica mañana a las ${appointmentData.startTime}`,
          data: appointmentData,
        },
      });
      expect(result).toBe(mockNotification);
    });
  });

  describe("createAppointmentConfirmation", () => {
    it("should create confirmation notification in test mode without sending email", async () => {
      const appointmentData = {
        appointmentDate: "2024-12-20",
        startTime: "10:00",
      };
      const mockNotification = { id: "1", type: "APPOINTMENT_CONFIRMATION" };
      mockedPrisma.notification.create.mockResolvedValue(mockNotification);

      // Spy on console.log
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const result = await NotificationService.createAppointmentConfirmation(
        "user-1",
        appointmentData,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Email confirmation would be sent to user user-1 (test mode - not sending)",
      );
      expect(result).toBe(mockNotification);

      consoleSpy.mockRestore();
    });

    it("should send email when not in test mode", async () => {
      process.env.NODE_ENV = "production";

      const appointmentData = {
        appointmentDate: "2024-12-20",
        startTime: "10:00",
      };
      const mockNotification = { id: "1", type: "APPOINTMENT_CONFIRMATION" };
      const mockUser = { email: "user@test.com" };

      mockedPrisma.notification.create.mockResolvedValue(mockNotification);
      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockedEmailService.sendAppointmentConfirmation.mockResolvedValue(
        undefined,
      );

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await NotificationService.createAppointmentConfirmation(
        "user-1",
        appointmentData,
      );

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: { email: true },
      });
      expect(
        mockedEmailService.sendAppointmentConfirmation,
      ).toHaveBeenCalledWith("user@test.com", appointmentData);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Email confirmation sent successfully to user@test.com",
      );

      consoleSpy.mockRestore();
    });

    it("should handle email sending errors gracefully", async () => {
      process.env.NODE_ENV = "production";

      const appointmentData = {
        appointmentDate: "2024-12-20",
        startTime: "10:00",
      };
      const mockNotification = { id: "1", type: "APPOINTMENT_CONFIRMATION" };
      const mockUser = { email: "user@test.com" };

      mockedPrisma.notification.create.mockResolvedValue(mockNotification);
      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockedEmailService.sendAppointmentConfirmation.mockRejectedValue(
        new Error("SMTP Error"),
      );

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await NotificationService.createAppointmentConfirmation(
        "user-1",
        appointmentData,
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to send appointment confirmation email to user@test.com:",
        expect.any(Error),
      );
      expect(result).toBe(mockNotification);

      consoleErrorSpy.mockRestore();
    });

    it("should not send email when user has no email", async () => {
      process.env.NODE_ENV = "production";

      const appointmentData = {
        appointmentDate: "2024-12-20",
        startTime: "10:00",
      };
      const mockNotification = { id: "1", type: "APPOINTMENT_CONFIRMATION" };

      mockedPrisma.notification.create.mockResolvedValue(mockNotification);
      mockedPrisma.user.findUnique.mockResolvedValue(null);

      const result = await NotificationService.createAppointmentConfirmation(
        "user-1",
        appointmentData,
      );

      expect(
        mockedEmailService.sendAppointmentConfirmation,
      ).not.toHaveBeenCalled();
      expect(result).toBe(mockNotification);
    });

    it("should send email when FORCE_EMAIL_IN_TESTS is true", async () => {
      process.env.FORCE_EMAIL_IN_TESTS = "true";

      const appointmentData = {
        appointmentDate: "2024-12-20",
        startTime: "10:00",
      };
      const mockNotification = { id: "1", type: "APPOINTMENT_CONFIRMATION" };
      const mockUser = { email: "user@test.com" };

      mockedPrisma.notification.create.mockResolvedValue(mockNotification);
      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockedEmailService.sendAppointmentConfirmation.mockResolvedValue(
        undefined,
      );

      await NotificationService.createAppointmentConfirmation(
        "user-1",
        appointmentData,
      );

      expect(mockedEmailService.sendAppointmentConfirmation).toHaveBeenCalled();
    });
  });

  describe("createAppointmentCancellation", () => {
    it("should create cancellation notification in test mode without sending email", async () => {
      const appointmentData = {
        appointmentDate: "2024-12-20",
        startTime: "10:00",
      };
      const mockNotification = { id: "1", type: "APPOINTMENT_CANCELLATION" };
      mockedPrisma.notification.create.mockResolvedValue(mockNotification);

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const result = await NotificationService.createAppointmentCancellation(
        "user-1",
        appointmentData,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Email cancellation would be sent to user user-1 (test mode - not sending)",
      );
      expect(result).toBe(mockNotification);

      consoleSpy.mockRestore();
    });

    it("should send cancellation email when not in test mode", async () => {
      process.env.NODE_ENV = "production";

      const appointmentData = {
        appointmentDate: "2024-12-20",
        startTime: "10:00",
      };
      const mockNotification = { id: "1", type: "APPOINTMENT_CANCELLATION" };
      const mockUser = { email: "user@test.com" };

      mockedPrisma.notification.create.mockResolvedValue(mockNotification);
      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockedEmailService.sendAppointmentCancellation.mockResolvedValue(
        undefined,
      );

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await NotificationService.createAppointmentCancellation(
        "user-1",
        appointmentData,
      );

      expect(
        mockedEmailService.sendAppointmentCancellation,
      ).toHaveBeenCalledWith("user@test.com", appointmentData);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Email cancellation sent successfully to user@test.com",
      );

      consoleSpy.mockRestore();
    });

    it("should handle cancellation email sending errors", async () => {
      process.env.NODE_ENV = "production";

      const appointmentData = {
        appointmentDate: "2024-12-20",
        startTime: "10:00",
      };
      const mockNotification = { id: "1", type: "APPOINTMENT_CANCELLATION" };
      const mockUser = { email: "user@test.com" };

      mockedPrisma.notification.create.mockResolvedValue(mockNotification);
      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockedEmailService.sendAppointmentCancellation.mockRejectedValue(
        new Error("SMTP Error"),
      );

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      await NotificationService.createAppointmentCancellation(
        "user-1",
        appointmentData,
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to send appointment cancellation email to user@test.com:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("createAppointmentUpdate", () => {
    it("should create update notification in test mode", async () => {
      const appointmentData = {
        appointmentDate: "2024-12-20",
        startTime: "10:00",
      };
      const mockNotification = { id: "1", type: "APPOINTMENT_UPDATE" };
      mockedPrisma.notification.create.mockResolvedValue(mockNotification);

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const result = await NotificationService.createAppointmentUpdate(
        "user-1",
        appointmentData,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Email update would be sent to user user-1 (test mode - not sending)",
      );
      expect(result).toBe(mockNotification);

      consoleSpy.mockRestore();
    });

    it("should log update notification when not in test mode", async () => {
      process.env.NODE_ENV = "production";

      const appointmentData = {
        appointmentDate: "2024-12-20",
        startTime: "10:00",
      };
      const mockNotification = { id: "1", type: "APPOINTMENT_UPDATE" };
      const mockUser = { email: "user@test.com" };

      mockedPrisma.notification.create.mockResolvedValue(mockNotification);
      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await NotificationService.createAppointmentUpdate(
        "user-1",
        appointmentData,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Email update notification would be sent to user@test.com",
      );

      consoleSpy.mockRestore();
    });
  });
});
