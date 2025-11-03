import { Given, When, Then, Before, After } from "@cucumber/cucumber";
import {
  TestFactory,
  getPrismaClient,
  cleanDatabase,
  createUserInDb,
} from "../test-helpers";
import * as AppointmentService from "../../src/services/appointmentService";

// Mocks simples del emailService para evitar envío real
const emailService = require("../../src/services/emailService");
emailService.sendAppointmentConfirmation = async () => true;
emailService.sendAppointmentReminder = async () => true;
emailService.sendAppointmentCancellation = async () => true;

// pequeño expect utilitario (tu versión original)
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
    toBeUndefined: () => {
      if (actual !== undefined) {
        throw new Error(`Expected value to be undefined, but got ${actual}`);
      }
    },
  };
}

interface TimeSlot {
  doctorProfile: {
    id: string;
    name?: string;
    specialty?: string;
  };
  date: string;
  startTime: string;
  endTime: string;
}

interface TestContext {
  authenticatedPatient?: any;
  availableTimeSlots?: TimeSlot[];
  selectedTimeSlot?: TimeSlot;
  appointmentData?: any;
  createdAppointment?: any;
  errorMessage?: string;
  doctorProfile?: any;
  specialty?: any;
  schedule?: any;
  doctorUser?: any;
  appointmentDate?: Date;
}

let testContext: TestContext = {};

// Hooks: limpiar BD antes y después
Before(async function () {
  await cleanDatabase();
  testContext = {};
});

After(async function () {
  await cleanDatabase();
});

/**
 * Helpers para crear datos en BD usando las factories y el mapper de test-helpers
 * Usamos createUserInDb para evitar pasar propiedades que Prisma no espera.
 */
async function createTestUser(userData: any) {
  // createUserInDb devuelve el resultado de prisma.user.create con shape correcto
  return createUserInDb("patient", userData);
}

async function createTestSpecialty(specialtyData: any) {
  const prisma = getPrismaClient();
  // TestFactory.createSpecialty ya retorna campos que coinciden con el modelo Specialty
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
    profileData
  );
  return prisma.doctorProfile.create({ data } as any);
}

async function createTestSchedule(scheduleData: any) {
  const prisma = getPrismaClient();
  const data = TestFactory.createSchedule(
    scheduleData.doctorProfileId,
    scheduleData
  );
  return prisma.schedule.create({ data } as any);
}

/* -------------------------
   Steps (Gherkin) 
   ------------------------- */

Given("que el paciente está autenticado en la aplicación", async function () {
  // Creamos paciente en BD y lo guardamos en contexto
  testContext.authenticatedPatient = await createTestUser({
    name: "Juan Pérez",
    email: "juan.perez@test.com",
    phone: "+56912345678",
    rut: "12345678-9",
    role: "PATIENT",
  });

  expect(testContext.authenticatedPatient).toBeDefined();
});

Given(
  "existen franjas horarias disponibles publicadas en el sistema",
  async function () {
    // Crear specialty
    testContext.specialty = await createTestSpecialty({
      name: "Cardiología",
      description: "Especialidad en el corazón",
    });

    // Crear user doctor
    testContext.doctorUser = await createTestDoctorUser({
      name: "Dr. Ana García",
      email: "ana.garcia@hospital.com",
      phone: "+56987654321",
      rut: "98765432-1",
      role: "DOCTOR",
    });

    // Crear doctorProfile
    testContext.doctorProfile = await createTestDoctorProfile({
      userId: testContext.doctorUser.id,
      specialtyId: testContext.specialty.id,
      licenseNumber: "DOC-12345",
    });

    // Crear schedule para la fecha de mañana
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    testContext.appointmentDate = tomorrow;
    const dayOfWeek = tomorrow.getDay();

    testContext.schedule = await createTestSchedule({
      doctorProfileId: testContext.doctorProfile.id,
      dayOfWeek,
      startTime: "09:00",
      endTime: "17:00",
      slotDuration: 30,
    });

    // Llamamos a AppointmentService para obtener los slots disponibles
    testContext.availableTimeSlots =
      await AppointmentService.getAvailableTimeSlots({
        date: tomorrow,
        doctorProfileId: testContext.doctorProfile.id,
      });

    expect(testContext.availableTimeSlots).toBeDefined();
    expect(testContext.availableTimeSlots!.length).toBeGreaterThan(0);
  }
);

// ---------- Escenario positivo ----------
When('el paciente accede al módulo "Agendar cita"', async function () {
  expect(testContext.authenticatedPatient).toBeDefined();
  expect(testContext.availableTimeSlots).toBeDefined();
  expect(testContext.availableTimeSlots!.length).toBeGreaterThan(0);
});

When("selecciona una franja horaria disponible", async function () {
  expect(testContext.availableTimeSlots!.length).toBeGreaterThan(0);
  testContext.selectedTimeSlot = testContext.availableTimeSlots![0];
});

When(
  "completa todos los datos obligatorios \\(nombre, RUT, email\\)",
  async function () {
    testContext.appointmentData = {
      patientId: testContext.authenticatedPatient.id,
      doctorProfileId: testContext.doctorProfile.id,
      specialtyId: testContext.specialty.id,
      appointmentDate: testContext.appointmentDate!,
      startTime: testContext.selectedTimeSlot!.startTime,
      notes: "Consulta de rutina",
    };
  }
);

When("completa todos los datos obligatorios", async function () {
  testContext.appointmentData = {
    patientId: testContext.authenticatedPatient.id,
    doctorProfileId: testContext.doctorProfile.id,
    specialtyId: testContext.specialty.id,
    appointmentDate: testContext.appointmentDate!,
    startTime: testContext.selectedTimeSlot!.startTime,
    notes: "Consulta de rutina",
  };
});

When("confirma y envía los datos", async function () {
  try {
    testContext.createdAppointment = await AppointmentService.createAppointment(
      testContext.appointmentData
    );
    testContext.errorMessage = undefined;
  } catch (error: any) {
    testContext.createdAppointment = undefined;
    testContext.errorMessage = error?.message ?? String(error);
  }
});

Then("el sistema guarda la cita", async function () {
  expect(testContext.createdAppointment).toBeDefined();
  expect(testContext.createdAppointment.id).toBeDefined();
  expect(testContext.createdAppointment.status).toBe("SCHEDULED");
});

Then(
  "el sistema envía un correo de confirmación al paciente",
  async function () {
    expect(testContext.createdAppointment.patient).toBeDefined();
    expect(testContext.createdAppointment.patient.email).toBe(
      testContext.authenticatedPatient.email
    );
  }
);

Then("el sistema marca la franja horaria como ocupada", async function () {
  const newAvailableSlots = await AppointmentService.getAvailableTimeSlots({
    date: testContext.appointmentData.appointmentDate,
    doctorProfileId: testContext.doctorProfile.id,
  });

  const originalSlotCount = testContext.availableTimeSlots!.length;
  expect(newAvailableSlots.length).toBe(originalSlotCount - 1);

  const selectedSlot = testContext.selectedTimeSlot as TimeSlot;
  const bookedSlot = newAvailableSlots.find(
    (slot: any) => slot.startTime === selectedSlot.startTime
  );
  expect(bookedSlot).toBeUndefined();
});

// ---------- Escenario negativo ----------
When("no completa un dato obligatorio", async function () {
  testContext.appointmentData = {
    // faltando patientId intencionalmente
    doctorProfileId: testContext.doctorProfile.id,
    specialtyId: testContext.specialty.id,
    appointmentDate: testContext.appointmentDate!,
    startTime: testContext.selectedTimeSlot!.startTime,
    notes: "Consulta de rutina",
  };
});

Then(
  "el sistema muestra un mensaje de error indicando datos faltantes",
  async function () {
    expect(testContext.errorMessage).toBeDefined();
    expect(testContext.createdAppointment).toBeUndefined();
  }
);

Then("no se registra la cita", async function () {
  expect(testContext.createdAppointment).toBeUndefined();
});

Then("la franja horaria sigue disponible", async function () {
  const availableSlots = await AppointmentService.getAvailableTimeSlots({
    date: testContext.appointmentData.appointmentDate,
    doctorProfileId: testContext.doctorProfile.id,
  });

  const originalSlotCount = testContext.availableTimeSlots!.length;
  expect(availableSlots.length).toBe(originalSlotCount);

  const selectedSlot = testContext.selectedTimeSlot as TimeSlot;
  const targetSlot = availableSlots.find(
    (slot: any) => slot.startTime === selectedSlot.startTime
  );
  expect(targetSlot).toBeDefined();
});

// ---------- Escenario frontera ----------
Given("que solo queda una franja horaria disponible", async function () {
  const appointmentDate = testContext.appointmentDate!;
  const slotsToBook = testContext.availableTimeSlots!.slice(0, -1);

  // Reservar todas menos la última con pacientes temporales
  for (const slot of slotsToBook) {
    const tempPatient = await createTestUser({
      name: `Patient ${Math.random()}`,
      email: `patient${Math.random()}@test.com`,
      phone: "+56912345679",
      rut: `${Math.floor(Math.random() * 99999999)}-9`,
      role: "PATIENT",
    });

    await AppointmentService.createAppointment({
      patientId: tempPatient.id,
      doctorProfileId: testContext.doctorProfile.id,
      specialtyId: testContext.specialty.id,
      appointmentDate,
      startTime: slot.startTime,
      notes: "Test booking",
    });
  }

  const remainingSlots = await AppointmentService.getAvailableTimeSlots({
    date: appointmentDate,
    doctorProfileId: testContext.doctorProfile.id,
  });

  expect(remainingSlots.length).toBe(1);
  testContext.availableTimeSlots = remainingSlots;
});

When("selecciona la última franja horaria", async function () {
  expect(testContext.availableTimeSlots!.length).toBe(1);
  testContext.selectedTimeSlot = testContext.availableTimeSlots![0];
});

Then("no quedan más franjas horarias disponibles", async function () {
  const availableSlots = await AppointmentService.getAvailableTimeSlots({
    date: testContext.appointmentData.appointmentDate,
    doctorProfileId: testContext.doctorProfile.id,
  });

  expect(availableSlots.length).toBe(0);
});
