import nodemailer from "nodemailer";

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "localhost",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendAppointmentConfirmation = async (
  userEmail: string,
  appointmentData: any,
) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || "no-reply@horavital.com",
    to: userEmail,
    subject: "Confirmación de Cita Médica - Hora Vital",
    html: `
      <h2>Confirmación de Cita Médica</h2>
      <p>Estimado/a paciente,</p>
      <p>Su cita médica ha sido confirmada con los siguientes detalles:</p>
      <ul>
        <li><strong>Fecha:</strong> ${appointmentData.appointmentDate}</li>
        <li><strong>Hora:</strong> ${appointmentData.startTime}</li>
        <li><strong>Médico:</strong> ${appointmentData.doctorName}</li>
        <li><strong>Especialidad:</strong> ${appointmentData.specialty}</li>
      </ul>
      <p>Gracias por confiar en Hora Vital.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Confirmation email sent successfully");
  } catch (error) {
    console.error("Error sending confirmation email:", error);
  }
};

export const sendAppointmentReminder = async (
  userEmail: string,
  appointmentData: any,
) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || "no-reply@horavital.com",
    to: userEmail,
    subject: "Recordatorio de Cita Médica - Hora Vital",
    html: `
      <h2>Recordatorio de Cita Médica</h2>
      <p>Estimado/a paciente,</p>
      <p>Le recordamos que tiene una cita médica mañana:</p>
      <ul>
        <li><strong>Fecha:</strong> ${appointmentData.appointmentDate}</li>
        <li><strong>Hora:</strong> ${appointmentData.startTime}</li>
        <li><strong>Médico:</strong> ${appointmentData.doctorName}</li>
        <li><strong>Especialidad:</strong> ${appointmentData.specialty}</li>
      </ul>
      <p>Por favor, llegue 15 minutos antes de su cita.</p>
      <p>Gracias por confiar en Hora Vital.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Reminder email sent successfully");
  } catch (error) {
    console.error("Error sending reminder email:", error);
  }
};

export const sendAppointmentCancellation = async (
  userEmail: string,
  appointmentData: any,
) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || "no-reply@horavital.com",
    to: userEmail,
    subject: "Cancelación de Cita Médica - Hora Vital",
    html: `
      <h2>Cancelación de Cita Médica</h2>
      <p>Estimado/a paciente,</p>
      <p>Su cita médica ha sido cancelada:</p>
      <ul>
        <li><strong>Fecha:</strong> ${appointmentData.appointmentDate}</li>
        <li><strong>Hora:</strong> ${appointmentData.startTime}</li>
        <li><strong>Médico:</strong> ${appointmentData.doctorName}</li>
        <li><strong>Especialidad:</strong> ${appointmentData.specialty}</li>
        ${appointmentData.reason ? `<li><strong>Motivo:</strong> ${appointmentData.reason}</li>` : ""}
      </ul>
      <p>Puede agendar una nueva cita cuando guste.</p>
      <p>Gracias por confiar en Hora Vital.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Cancellation email sent successfully");
  } catch (error) {
    console.error("Error sending cancellation email:", error);
  }
};
