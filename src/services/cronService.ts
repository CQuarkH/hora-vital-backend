import cron from "node-cron";
import prisma from "../db/prisma";
import * as NotificationService from "./notificationService";
import * as EmailService from "./emailService";

export const startReminderJobs = () => {
  cron.schedule("0 18 * * *", async () => {
    console.log("Running daily appointment reminder job...");

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const appointments = await prisma.appointment.findMany({
        where: {
          appointmentDate: {
            gte: tomorrow,
            lt: dayAfterTomorrow,
          },
          status: "SCHEDULED",
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          doctorProfile: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
              specialty: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      for (const appointment of appointments) {
        const appointmentData = {
          appointmentDate: appointment.appointmentDate
            .toISOString()
            .split("T")[0],
          startTime: appointment.startTime,
          doctorName: appointment.doctorProfile.user.name,
          specialty: appointment.doctorProfile.specialty.name,
        };

        await NotificationService.createAppointmentReminder(
          appointment.patient.id,
          appointmentData,
        );

        if (appointment.patient.email) {
          await EmailService.sendAppointmentReminder(
            appointment.patient.email,
            appointmentData,
          );
        }
      }

      console.log(`Sent reminders for ${appointments.length} appointments`);
    } catch (error) {
      console.error("Error running reminder job:", error);
    }
  });

  console.log("Appointment reminder job scheduled (daily at 6 PM)");
};

export const startCronJobs = () => {
  startReminderJobs();
};
