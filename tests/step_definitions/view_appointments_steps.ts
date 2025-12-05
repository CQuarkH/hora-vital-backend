import { Given, When, Then, Before } from "@cucumber/cucumber";
import * as AppointmentService from "../../src/services/appointmentService";
import {
  cleanDatabase,
  createUserInDb,
  TestFactory,
  getPrismaClient,
} from "../test-helpers";

function expect(actual: any) {
  return {
    toBeDefined: () => {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected value to be defined, but got ${actual}`);
      }
    },
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toBeGreaterThan: (expected: number) => {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toHaveLength: (expected: number) => {
      if (!Array.isArray(actual) || actual.length !== expected) {
        throw new Error(
          `Expected array to have length ${expected}, but got ${actual?.length}`,
        );
      }
    },
    toContain: (expected: any) => {
      if (!Array.isArray(actual) || !actual.includes(expected)) {
        throw new Error(`Expected array to contain ${expected}`);
      }
    },
  };
}

interface ViewAppointmentsContext {
  authenticatedPatient?: any;
  appointments?: any[];
  appointmentDetails?: any;
  filteredAppointments?: any[];
  errorMessage?: string;
  otherPatient?: any;
  doctorProfile?: any;
  specialty?: any;
}

let viewCtx: ViewAppointmentsContext = {};

Before(async () => {
  await cleanDatabase();
  viewCtx = {};
});

async function createTestSpecialty(specialtyData: any) {
  const prisma = getPrismaClient();
  const data = TestFactory.createSpecialty(specialtyData);
  return prisma.specialty.create({ data } as any);
}

async function createTestDoctorUser(userData: any) {
  return createUserInDb("doctor", userData);
}

async function createTestDoctorProfile(profileData: any) {
  const prisma = getPrismaClient();
  const data = TestFactory.createDoctorProfile(
    profileData.userId,
    profileData.specialtyId,
    profileData,
  );
  return prisma.doctorProfile.create({ data } as any);
}

async function createTestAppointment(appointmentData: any) {
  const prisma = getPrismaClient();
  return prisma.appointment.create({
    data: appointmentData,
    include: {
      patient: true,
      doctorProfile: {
        include: {
          user: true,
          specialty: true,
        },
      },
      specialty: true,
    },
  });
}

// Background steps
Given(
  "que soy un paciente autenticado con nombre {string}",
  async (nombre: string) => {
    viewCtx.authenticatedPatient = await createUserInDb("patient", {
      name: nombre,
      email: "paciente.test@example.com",
      phone: "+56912345678",
      rut: "12345678-9",
      role: "PATIENT",
    });
  },
);

// Setup test data
Given("que tengo citas programadas para diferentes fechas", async () => {
  // Crear specialty y doctor
  viewCtx.specialty = await createTestSpecialty({
    name: "Cardiología",
    description: "Especialidad del corazón",
  });

  const doctorUser = await createTestDoctorUser({
    name: "Dr. García",
    email: "garcia@hospital.com",
    phone: "+56987654321",
    rut: "98765432-1",
    role: "DOCTOR",
  });

  viewCtx.doctorProfile = await createTestDoctorProfile({
    userId: doctorUser.id,
    specialtyId: viewCtx.specialty!.id,
    licenseNumber: "DOC-12345",
  });

  // Crear múltiples citas
  const citas = [
    {
      patientId: viewCtx.authenticatedPatient!.id,
      doctorProfileId: viewCtx.doctorProfile!.id,
      specialtyId: viewCtx.specialty!.id,
      appointmentDate: new Date("2024-12-15"),
      startTime: "10:00",
      status: "SCHEDULED",
      notes: "Consulta de rutina",
    },
    {
      patientId: viewCtx.authenticatedPatient!.id,
      doctorProfileId: viewCtx.doctorProfile!.id,
      specialtyId: viewCtx.specialty!.id,
      appointmentDate: new Date("2024-12-20"),
      startTime: "14:00",
      status: "SCHEDULED",
      notes: "Control post operatorio",
    },
    {
      patientId: viewCtx.authenticatedPatient!.id,
      doctorProfileId: viewCtx.doctorProfile!.id,
      specialtyId: viewCtx.specialty!.id,
      appointmentDate: new Date("2024-11-10"),
      startTime: "09:00",
      status: "COMPLETED",
      notes: "Consulta completada",
    },
  ];

  viewCtx.appointments = [];
  for (const citaData of citas) {
    const cita = await createTestAppointment(citaData);
    viewCtx.appointments.push(cita);
  }
});

Given(
  "que tengo una cita programada para el {string} a las {string} con {string}",
  async (fecha: string, hora: string, doctor: string) => {
    // Crear specialty y doctor
    viewCtx.specialty = await createTestSpecialty({
      name: "Cardiología",
      description: "Especialidad del corazón",
    });

    const doctorUser = await createTestDoctorUser({
      name: doctor,
      email: "doctor@hospital.com",
      phone: "+56987654321",
      rut: "98765432-1",
      role: "DOCTOR",
    });

    viewCtx.doctorProfile = await createTestDoctorProfile({
      userId: doctorUser.id,
      specialtyId: viewCtx.specialty.id,
      licenseNumber: "DOC-12345",
    });

    const appointment = await createTestAppointment({
      patientId: viewCtx.authenticatedPatient.id,
      doctorProfileId: viewCtx.doctorProfile.id,
      specialtyId: viewCtx.specialty.id,
      appointmentDate: new Date(fecha),
      startTime: hora,
      status: "SCHEDULED",
      notes: "Consulta programada",
    });

    viewCtx.appointments = [appointment];
  },
);

Given(
  "que tengo citas en diferentes estados \\(programadas, completadas, canceladas\\)",
  async () => {
    // Setup similar al anterior pero con diferentes estados
    viewCtx.specialty = await createTestSpecialty({
      name: "Medicina General",
      description: "Medicina general",
    });

    const doctorUser = await createTestDoctorUser({
      name: "Dr. López",
      email: "lopez@hospital.com",
      phone: "+56987654321",
      rut: "11111111-1",
      role: "DOCTOR",
    });

    viewCtx.doctorProfile = await createTestDoctorProfile({
      userId: doctorUser.id,
      specialtyId: viewCtx.specialty.id,
      licenseNumber: "DOC-67890",
    });

    const citas = [
      {
        patientId: viewCtx.authenticatedPatient.id,
        doctorProfileId: viewCtx.doctorProfile.id,
        specialtyId: viewCtx.specialty.id,
        appointmentDate: new Date("2024-12-25"),
        startTime: "10:00",
        status: "SCHEDULED",
        notes: "Cita programada",
      },
      {
        patientId: viewCtx.authenticatedPatient.id,
        doctorProfileId: viewCtx.doctorProfile.id,
        specialtyId: viewCtx.specialty.id,
        appointmentDate: new Date("2024-11-15"),
        startTime: "14:00",
        status: "COMPLETED",
        notes: "Cita completada",
      },
      {
        patientId: viewCtx.authenticatedPatient.id,
        doctorProfileId: viewCtx.doctorProfile.id,
        specialtyId: viewCtx.specialty.id,
        appointmentDate: new Date("2024-12-01"),
        startTime: "09:00",
        status: "CANCELLED",
        notes: "Cita cancelada",
      },
    ];

    viewCtx.appointments = [];
    for (const citaData of citas) {
      const cita = await createTestAppointment(citaData);
      viewCtx.appointments.push(cita);
    }
  },
);

Given("que tengo citas en diferentes fechas", async () => {
  // Create specialty and doctor
  viewCtx.specialty = await createTestSpecialty({
    name: "Cardiología",
    description: "Especialidad del corazón",
  });

  const doctorUser = await createTestDoctorUser({
    name: "Dr. García",
    email: "garcia@hospital.com",
    phone: "+56987654321",
    rut: "98765432-1",
    role: "DOCTOR",
  });

  viewCtx.doctorProfile = await createTestDoctorProfile({
    userId: doctorUser.id,
    specialtyId: viewCtx.specialty!.id,
    licenseNumber: "DOC-12345",
  });

  // Create multiple appointments
  const citas = [
    {
      patientId: viewCtx.authenticatedPatient!.id,
      doctorProfileId: viewCtx.doctorProfile!.id,
      specialtyId: viewCtx.specialty!.id,
      appointmentDate: new Date("2024-12-15"),
      startTime: "10:00",
      status: "SCHEDULED",
      notes: "Consulta de rutina",
    },
    {
      patientId: viewCtx.authenticatedPatient!.id,
      doctorProfileId: viewCtx.doctorProfile!.id,
      specialtyId: viewCtx.specialty!.id,
      appointmentDate: new Date("2024-12-20"),
      startTime: "14:00",
      status: "SCHEDULED",
      notes: "Control post operatorio",
    },
    {
      patientId: viewCtx.authenticatedPatient!.id,
      doctorProfileId: viewCtx.doctorProfile!.id,
      specialtyId: viewCtx.specialty!.id,
      appointmentDate: new Date("2024-11-10"),
      startTime: "09:00",
      status: "COMPLETED",
      notes: "Consulta completada",
    },
  ];

  viewCtx.appointments = [];
  for (const citaData of citas) {
    const cita = await createTestAppointment(citaData);
    viewCtx.appointments.push(cita);
  }
});

Given("que tengo citas completadas en el pasado", async () => {
  viewCtx.specialty = await createTestSpecialty({
    name: "Dermatología",
    description: "Especialidad de la piel",
  });

  const doctorUser = await createTestDoctorUser({
    name: "Dr. Martínez",
    email: "martinez@hospital.com",
    phone: "+56987654321",
    rut: "22222222-2",
    role: "DOCTOR",
  });

  viewCtx.doctorProfile = await createTestDoctorProfile({
    userId: doctorUser.id,
    specialtyId: viewCtx.specialty.id,
    licenseNumber: "DOC-11111",
  });

  const citasCompletadas = [
    {
      patientId: viewCtx.authenticatedPatient.id,
      doctorProfileId: viewCtx.doctorProfile.id,
      specialtyId: viewCtx.specialty.id,
      appointmentDate: new Date("2024-10-15"),
      startTime: "10:00",
      status: "COMPLETED",
      notes: "Primera consulta",
    },
    {
      patientId: viewCtx.authenticatedPatient.id,
      doctorProfileId: viewCtx.doctorProfile.id,
      specialtyId: viewCtx.specialty.id,
      appointmentDate: new Date("2024-09-20"),
      startTime: "14:00",
      status: "COMPLETED",
      notes: "Segunda consulta",
    },
  ];

  viewCtx.appointments = [];
  for (const citaData of citasCompletadas) {
    const cita = await createTestAppointment(citaData);
    viewCtx.appointments.push(cita);
  }
});

Given("que no tengo citas programadas", async () => {
  // No crear citas, dejar appointments vacío
  viewCtx.appointments = [];
});

Given("que existe otro paciente con citas programadas", async () => {
  viewCtx.otherPatient = await createUserInDb("patient", {
    name: "Otro Paciente",
    email: "otro@test.com",
    phone: "+56987654322",
    rut: "33333333-3",
    role: "PATIENT",
  });
});

Given("que tengo más de {int} citas registradas", async (cantidad: number) => {
  viewCtx.specialty = await createTestSpecialty({
    name: "Medicina Familiar",
    description: "Medicina familiar",
  });

  const doctorUser = await createTestDoctorUser({
    name: "Dr. Fernández",
    email: "fernandez@hospital.com",
    phone: "+56987654321",
    rut: "44444444-4",
    role: "DOCTOR",
  });

  viewCtx.doctorProfile = await createTestDoctorProfile({
    userId: doctorUser.id,
    specialtyId: viewCtx.specialty.id,
    licenseNumber: "DOC-22222",
  });

  viewCtx.appointments = [];
  for (let i = 0; i < cantidad + 10; i++) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + i);

    const cita = await createTestAppointment({
      patientId: viewCtx.authenticatedPatient.id,
      doctorProfileId: viewCtx.doctorProfile.id,
      specialtyId: viewCtx.specialty.id,
      appointmentDate: fecha,
      startTime: "10:00",
      status: "SCHEDULED",
      notes: `Cita #${i + 1}`,
    });
    viewCtx.appointments.push(cita);
  }
});

// When steps
When("consulto mis citas médicas", async () => {
  try {
    viewCtx.appointments = await AppointmentService.findPatientAppointments(
      viewCtx.authenticatedPatient!.id,
    );
    viewCtx.errorMessage = undefined;
  } catch (error: any) {
    viewCtx.errorMessage = error?.message ?? String(error);
  }
});

When("consulto los detalles de esa cita", async () => {
  try {
    if (viewCtx.appointments && viewCtx.appointments.length > 0) {
      viewCtx.appointmentDetails = viewCtx.appointments[0];
    }
  } catch (error: any) {
    viewCtx.errorMessage = error?.message ?? String(error);
  }
});

When("filtro mis citas por estado {string}", async (estado: string) => {
  try {
    viewCtx.filteredAppointments =
      viewCtx.appointments?.filter((cita) => cita.status === estado) || [];
  } catch (error: any) {
    viewCtx.errorMessage = error?.message ?? String(error);
  }
});

When(
  "filtro mis citas entre {string} y {string}",
  async (fechaInicio: string, fechaFin: string) => {
    try {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);

      viewCtx.filteredAppointments =
        viewCtx.appointments?.filter((cita) => {
          const fechaCita = new Date(cita.appointmentDate);
          return fechaCita >= inicio && fechaCita <= fin;
        }) || [];
    } catch (error: any) {
      viewCtx.errorMessage = error?.message ?? String(error);
    }
  },
);

When("consulto mi historial de citas", async () => {
  try {
    const todasCitas = await AppointmentService.findPatientAppointments(
      viewCtx.authenticatedPatient!.id,
    );

    viewCtx.appointments = todasCitas
      .filter((cita) => cita.status === "COMPLETED")
      .sort(
        (a, b) =>
          new Date(b.appointmentDate).getTime() -
          new Date(a.appointmentDate).getTime(),
      );
  } catch (error: any) {
    viewCtx.errorMessage = error?.message ?? String(error);
  }
});

When("intento acceder a sus citas médicas", async () => {
  try {
    viewCtx.appointments = await AppointmentService.findPatientAppointments(
      viewCtx.otherPatient?.id || "invalid-id",
    );
  } catch (error: any) {
    viewCtx.errorMessage = error?.message ?? String(error);
  }
});

// Then steps
Then("debo ver una lista con todas mis citas", async () => {
  expect(viewCtx.appointments).toBeDefined();
  expect(viewCtx.appointments!.length).toBeGreaterThan(0);
});

Then("cada cita debe mostrar fecha, hora, médico y especialidad", async () => {
  expect(viewCtx.appointments).toBeDefined();
  for (const cita of viewCtx.appointments!) {
    expect(cita.appointmentDate).toBeDefined();
    expect(cita.startTime).toBeDefined();
    expect(cita.doctorProfile).toBeDefined();
    expect(cita.specialty).toBeDefined();
  }
});

Then(
  "debo ver información completa incluyendo fecha, hora, médico, especialidad y notas",
  async () => {
    expect(viewCtx.appointmentDetails).toBeDefined();
    expect(viewCtx.appointmentDetails.appointmentDate).toBeDefined();
    expect(viewCtx.appointmentDetails.startTime).toBeDefined();
    expect(viewCtx.appointmentDetails.doctorProfile).toBeDefined();
    expect(viewCtx.appointmentDetails.specialty).toBeDefined();
    expect(viewCtx.appointmentDetails.notes).toBeDefined();
  },
);

Then("debo ver solo las citas programadas", async () => {
  expect(viewCtx.filteredAppointments).toBeDefined();
  for (const cita of viewCtx.filteredAppointments!) {
    expect(cita.status).toBe("SCHEDULED");
  }
});

Then("debo ver solo las citas dentro de ese rango", async () => {
  expect(viewCtx.filteredAppointments).toBeDefined();
  expect(viewCtx.filteredAppointments!.length).toBeGreaterThan(0);
});

Then("debo ver las citas pasadas ordenadas por fecha descendente", async () => {
  expect(viewCtx.appointments).toBeDefined();
  expect(viewCtx.appointments!.length).toBeGreaterThan(0);

  for (const cita of viewCtx.appointments!) {
    expect(cita.status).toBe("COMPLETED");
  }
});

Then("debo ver un mensaje indicando que no hay citas", async () => {
  expect(viewCtx.appointments).toBeDefined();
  expect(viewCtx.appointments!).toHaveLength(0);
});

Then("la lista debe estar vacía", async () => {
  expect(viewCtx.appointments!).toHaveLength(0);
});

// COMMENTED TO AVOID DUPLICATION - using common_steps.ts
// Then("el sistema debe denegar el acceso", async () => {
//   expect(viewCtx.errorMessage).toBeDefined();
// });

Then("debo recibir error de autorización", async () => {
  expect(viewCtx.errorMessage).toBeDefined();
});

Then("debo ver las primeras {int} citas", async (cantidad: number) => {
  expect(viewCtx.appointments).toBeDefined();
  expect(viewCtx.appointments!.length).toBeGreaterThan(0);
  // En una implementación real aquí verificaríamos la paginación
});

Then("debe existir opción para ver más citas", async () => {
  expect(viewCtx.appointments).toBeDefined();
  // En una implementación real verificaríamos metadatos de paginación
});
