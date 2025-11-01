import { Given, When, Then, Before, After } from "@cucumber/cucumber";
import { TestFactory, getPrismaClient, cleanDatabase } from "../test-helpers";
import * as AppointmentService from "../../src/services/appointmentService";

const emailService = require("../../src/services/emailService");
emailService.sendAppointmentConfirmation = async () => true;
emailService.sendAppointmentReminder = async () => true;
emailService.sendAppointmentCancellation = async () => true;

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
    name: string;
    specialty: string;
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

Before(async function () {
  await cleanDatabase();
  testContext = {};
});

After(async function () {
  await cleanDatabase();
});

async function createTestUser(userData: any) {
  const prisma = getPrismaClient();
  return await prisma.user.create({
    data: TestFactory.createPatient(userData),
  });
}

async function createTestSpecialty(specialtyData: any) {
  const prisma = getPrismaClient();
  return await prisma.specialty.create({
    data: TestFactory.createSpecialty(specialtyData),
  });
}

async function createTestDoctorUser(userData: any) {
  const prisma = getPrismaClient();
  return await prisma.user.create({
    data: TestFactory.createDoctor(userData),
  });
}

async function createTestDoctorProfile(profileData: any) {
  const prisma = getPrismaClient();
  return await prisma.doctorProfile.create({
    data: TestFactory.createDoctorProfile(
      profileData.userId,
      profileData.specialtyId,
      profileData,
    ),
  });
}

async function createTestSchedule(scheduleData: any) {
  const prisma = getPrismaClient();
  return await prisma.schedule.create({
    data: TestFactory.createSchedule(
      scheduleData.doctorProfileId,
      scheduleData,
    ),
  });
}

Given("que el paciente está autenticado en la aplicación", async function () {
  testContext.authenticatedPatient = await createTestUser({
    name: "Juan Pérez",
    email: "juan.perez@test.com",
    phone: "+56912345678",
    rut: "12345678-9",
    role: "PATIENT",
  });
});

Given(
  "existen franjas horarias disponibles publicadas en el sistema",
  async function () {
    testContext.specialty = await createTestSpecialty({
      name: "Cardiología",
      description: "Especialidad en el corazón",
    });

    testContext.doctorUser = await createTestDoctorUser({
      name: "Dr. Ana García",
      email: "ana.garcia@hospital.com",
      phone: "+56987654321",
      rut: "98765432-1",
      role: "DOCTOR",
    });

    testContext.doctorProfile = await createTestDoctorProfile({
      userId: testContext.doctorUser.id,
      specialtyId: testContext.specialty.id,
      licenseNumber: "DOC-12345",
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    testContext.appointmentDate = tomorrow;
    const dayOfWeek = tomorrow.getDay();

    testContext.schedule = await createTestSchedule({
      doctorProfileId: testContext.doctorProfile.id,
      dayOfWeek: dayOfWeek,
      startTime: "09:00",
      endTime: "17:00",
      slotDuration: 30,
    });

    testContext.availableTimeSlots =
      await AppointmentService.getAvailableTimeSlots({
        date: tomorrow,
        doctorProfileId: testContext.doctorProfile.id,
      });
  },
);

// Scenario 1: Agendar una cita exitosamente
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
  },
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
      testContext.appointmentData,
    );
  } catch (error: any) {
    testContext.errorMessage = error.message;
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
      testContext.authenticatedPatient.email,
    );
  },
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
    (slot: any) => slot.startTime === selectedSlot.startTime,
  );
  expect(bookedSlot).toBeUndefined();
});

// Scenario 2: Intentar agendar sin completar datos obligatorios
When("no completa un dato obligatorio", async function () {
  testContext.appointmentData = {
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
  },
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
    (slot: any) => slot.startTime === selectedSlot.startTime,
  );
  expect(targetSlot).toBeDefined();
});

// Scenario 3: Intentar agendar la última franja horaria disponible
Given("que solo queda una franja horaria disponible", async function () {
  const appointmentDate = testContext.appointmentDate!;

  const slotsToBook = testContext.availableTimeSlots!.slice(0, -1);

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
      appointmentDate: appointmentDate,
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
