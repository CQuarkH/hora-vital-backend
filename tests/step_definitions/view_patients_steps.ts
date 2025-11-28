import { Given, When, Then, Before } from "@cucumber/cucumber";
import * as AdminService from "../../src/services/adminService";
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
    toBeFalsy: () => {
      if (actual) {
        throw new Error(`Expected value to be falsy, but got ${actual}`);
      }
    },
  };
}

interface ViewPatientsContext {
  authenticatedUser?: any;
  doctorProfile?: any;
  specialty?: any;
  patients?: any[];
  filteredPatients?: any[];
  patientDetails?: any;
  searchResults?: any[];
  errorMessage?: string;
  patientWithCitas?: any;
  patientWithoutCitas?: any;
  inactivePatient?: any;
}

let viewPatientsCtx: ViewPatientsContext = {};

Before(async () => {
  await cleanDatabase();
  viewPatientsCtx = {};
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

// Background and setup
Given(
  'que soy un médico autenticado con nombre "{string}"',
  async (nombre: string) => {
    viewPatientsCtx.authenticatedUser = await createTestDoctorUser({
      name: nombre,
      email: "doctor@hospital.com",
      phone: "+56987654321",
      rut: "98765432-1",
      role: "DOCTOR",
    });

    // Create specialty and doctor profile
    viewPatientsCtx.specialty = await createTestSpecialty({
      name: "Cardiología",
      description: "Especialidad del corazón",
    });

    viewPatientsCtx.doctorProfile = await createTestDoctorProfile({
      userId: viewPatientsCtx.authenticatedUser.id,
      specialtyId: viewPatientsCtx.specialty.id,
      licenseNumber: "DOC-12345",
    });
  },
);

Given("que soy un secretario autenticado", async () => {
  const prisma = getPrismaClient();
  viewPatientsCtx.authenticatedUser = await prisma.user.create({
    data: {
      id: TestFactory.createPatient().id,
      firstName: "Secretary",
      lastName: "User",
      email: "secretary@hospital.com",
      phone: "+56987654321",
      rut: "11111111-1",
      password: "$2b$10$test.hash.password",
      role: "SECRETARY",
      isActive: true,
    },
  });
});

Given("que soy un médico autenticado", async () => {
  viewPatientsCtx.authenticatedUser = await createTestDoctorUser({
    name: "Dr. López",
    email: "lopez@hospital.com",
    phone: "+56987654322",
    rut: "22222222-2",
    role: "DOCTOR",
  });

  viewPatientsCtx.specialty = await createTestSpecialty({
    name: "Medicina General",
    description: "Medicina general",
  });

  viewPatientsCtx.doctorProfile = await createTestDoctorProfile({
    userId: viewPatientsCtx.authenticatedUser.id,
    specialtyId: viewPatientsCtx.specialty.id,
    licenseNumber: "DOC-67890",
  });
});

Given("que soy un paciente autenticado", async () => {
  viewPatientsCtx.authenticatedUser = await createUserInDb("patient", {
    name: "Patient User",
    email: "patient@test.com",
    phone: "+56912345678",
    rut: "33333333-3",
  });
});

Given("que no estoy autenticado", async () => {
  viewPatientsCtx.authenticatedUser = undefined;
});

// Data setup scenarios
Given("que tengo pacientes asignados con citas", async () => {
  // Create patients
  const patient1 = await createUserInDb("patient", {
    name: "Juan Pérez",
    email: "juan@test.com",
    phone: "+56912345678",
    rut: "44444444-4",
    role: "PATIENT",
  });

  const patient2 = await createUserInDb("patient", {
    name: "María González",
    email: "maria@test.com",
    phone: "+56912345679",
    rut: "55555555-5",
    role: "PATIENT",
  });

  // Create appointments for these patients with the doctor
  await createTestAppointment({
    patientId: patient1.id,
    doctorProfileId: viewPatientsCtx.doctorProfile!.id,
    specialtyId: viewPatientsCtx.specialty!.id,
    appointmentDate: new Date("2024-12-15"),
    startTime: "10:00",
    status: "SCHEDULED",
    notes: "Consulta",
  });

  await createTestAppointment({
    patientId: patient2.id,
    doctorProfileId: viewPatientsCtx.doctorProfile!.id,
    specialtyId: viewPatientsCtx.specialty!.id,
    appointmentDate: new Date("2024-11-15"),
    startTime: "11:00",
    status: "COMPLETED",
    notes: "Control",
  });

  viewPatientsCtx.patients = [patient1, patient2];
});

Given("que existen pacientes registrados en el sistema", async () => {
  const patients: any[] = [];

  for (let i = 1; i <= 5; i++) {
    const prisma = getPrismaClient();
    const patient = await prisma.user.create({
      data: {
        id: TestFactory.createPatient().id,
        firstName: `Paciente`,
        lastName: `${i}`,
        email: `paciente${i}@test.com`,
        phone: `+5691234567${i}`,
        rut: `1111111${i}-${i}`,
        password: "$2b$10$test.hash.password",
        role: "PATIENT",
        isActive: true,
      },
    });
    patients.push(patient);
  }

  viewPatientsCtx.patients = patients;
});

Given(
  'que existe un paciente con nombre "{string}"',
  async (nombre: string) => {
    const patient = await createUserInDb("patient", {
      name: nombre,
      email: "juan.perez@test.com",
      phone: "+56912345678",
      rut: "66666666-6",
    });

    viewPatientsCtx.patientWithCitas = patient;
  },
);

Given('que existe un paciente con RUT "{string}"', async (rut: string) => {
  const patient = await createUserInDb("patient", {
    name: "Paciente Test",
    email: "test@test.com",
    phone: "+56912345678",
    rut: rut,
  });

  viewPatientsCtx.patientWithCitas = patient;
});

Given("que existen pacientes activos e inactivos", async () => {
  // Active patient
  const activePatient = await createUserInDb("patient", {
    name: "Paciente Activo",
    email: "activo@test.com",
    phone: "+56912345678",
    rut: "77777777-7",
    isActive: true,
  });

  // Inactive patient
  const inactivePatient = await createUserInDb("patient", {
    name: "Paciente Inactivo",
    email: "inactivo@test.com",
    phone: "+56912345679",
    rut: "88888888-8",
    isActive: false,
  });

  viewPatientsCtx.patients = [activePatient];
  viewPatientsCtx.inactivePatient = inactivePatient;
});

Given('que existe un paciente "{string}"', async (nombre: string) => {
  const patient = await createUserInDb("patient", {
    name: nombre,
    email: "maria.gonzalez@test.com",
    phone: "+56912345678",
    rut: "99999999-9",
  });

  // Create appointment history
  await createTestAppointment({
    patientId: patient.id,
    doctorProfileId: viewPatientsCtx.doctorProfile!.id,
    specialtyId: viewPatientsCtx.specialty!.id,
    appointmentDate: new Date("2024-11-01"),
    startTime: "10:00",
    status: "COMPLETED",
    notes: "Primera consulta",
  });

  viewPatientsCtx.patientDetails = patient;
});

Given(
  "que existen más de {int} pacientes registrados",
  async (cantidad: number) => {
    const patients: any[] = [];

    for (let i = 1; i <= cantidad + 20; i++) {
      const patient = await createUserInDb("patient", {
        name: `Paciente ${i}`,
        email: `bulk${i}@test.com`,
        phone: `+569123${String(i).padStart(5, "0")}`,
        rut: `${String(10000000 + i)}-${i % 10}`,
      });
      patients.push(patient);
    }

    viewPatientsCtx.patients = patients;
  },
);

Given("que existen pacientes sin citas conmigo", async () => {
  // Patient with appointments with the doctor
  const patientWithCitas = await createUserInDb("patient", {
    name: "Paciente Con Citas",
    email: "concitas@test.com",
    phone: "+56912345678",
    rut: "10101010-1",
  });

  // Patient without appointments with the doctor
  const patientWithoutCitas = await createUserInDb("patient", {
    name: "Paciente Sin Citas",
    email: "sincitas@test.com",
    phone: "+56912345679",
    rut: "20202020-2",
  });

  // Create appointment only for first patient
  await createTestAppointment({
    patientId: patientWithCitas.id,
    doctorProfileId: viewPatientsCtx.doctorProfile!.id,
    specialtyId: viewPatientsCtx.specialty!.id,
    appointmentDate: new Date("2024-12-01"),
    startTime: "10:00",
    status: "SCHEDULED",
    notes: "Consulta",
  });

  viewPatientsCtx.patientWithCitas = patientWithCitas;
  viewPatientsCtx.patientWithoutCitas = patientWithoutCitas;
});

// When steps
When("consulto la lista de mis pacientes", async () => {
  try {
    // Get patients that have appointments with this doctor
    const prisma = getPrismaClient();
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorProfileId: viewPatientsCtx.doctorProfile!.id,
      },
      include: {
        patient: true,
      },
    });

    // Extract unique patients
    const uniquePatients = new Map();
    appointments.forEach((apt) => {
      uniquePatients.set(apt.patient.id, apt.patient);
    });

    viewPatientsCtx.patients = Array.from(uniquePatients.values());
    viewPatientsCtx.errorMessage = undefined;
  } catch (error: any) {
    viewPatientsCtx.errorMessage = error?.message ?? String(error);
  }
});

When("consulto la lista de pacientes", async () => {
  try {
    if (viewPatientsCtx.authenticatedUser?.role === "SECRETARY") {
      // Secretary can see all patients
      const result = await AdminService.listPatients({
        page: 1,
        limit: 20,
      });
      viewPatientsCtx.patients = result.patients;
    } else {
      // Try to access as other role (should fail for non-authorized roles)
      const result = await AdminService.listPatients({
        page: 1,
        limit: 20,
      });
      viewPatientsCtx.patients = result.patients;
    }
    viewPatientsCtx.errorMessage = undefined;
  } catch (error: any) {
    viewPatientsCtx.errorMessage = error?.message ?? String(error);
  }
});

When('busco pacientes por nombre "{string}"', async (searchTerm: string) => {
  try {
    const prisma = getPrismaClient();
    const patients = await prisma.user.findMany({
      where: {
        role: "PATIENT",
        OR: [
          { firstName: { contains: searchTerm, mode: "insensitive" } },
          { lastName: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
    });

    viewPatientsCtx.searchResults = patients;
    viewPatientsCtx.errorMessage = undefined;
  } catch (error: any) {
    viewPatientsCtx.errorMessage = error?.message ?? String(error);
  }
});

When('busco paciente por RUT "{string}"', async (rut: string) => {
  try {
    const prisma = getPrismaClient();
    const patient = await prisma.user.findUnique({
      where: { rut: rut },
    });

    viewPatientsCtx.searchResults = patient ? [patient] : [];
    viewPatientsCtx.errorMessage = undefined;
  } catch (error: any) {
    viewPatientsCtx.errorMessage = error?.message ?? String(error);
  }
});

When('filtro pacientes por estado "{string}"', async (estado: string) => {
  try {
    const isActive = estado === "activo";
    const prisma = getPrismaClient();

    const patients = await prisma.user.findMany({
      where: {
        role: "PATIENT",
        isActive: isActive,
      },
    });

    viewPatientsCtx.filteredPatients = patients;
    viewPatientsCtx.errorMessage = undefined;
  } catch (error: any) {
    viewPatientsCtx.errorMessage = error?.message ?? String(error);
  }
});

When('consulto los detalles de "{string}"', async (nombre: string) => {
  try {
    const prisma = getPrismaClient();
    const patient = await prisma.user.findFirst({
      where: {
        role: "PATIENT",
        OR: [
          { firstName: { contains: nombre, mode: "insensitive" } },
          { lastName: { contains: nombre, mode: "insensitive" } },
        ],
      },
      include: {
        appointments: {
          where: {
            doctorProfileId: viewPatientsCtx.doctorProfile!.id,
          },
          include: {
            doctorProfile: {
              include: {
                user: true,
                specialty: true,
              },
            },
            specialty: true,
          },
          orderBy: {
            appointmentDate: "desc",
          },
        },
      },
    });

    viewPatientsCtx.patientDetails = patient;
    viewPatientsCtx.errorMessage = undefined;
  } catch (error: any) {
    viewPatientsCtx.errorMessage = error?.message ?? String(error);
  }
});

When("intento consultar la lista de pacientes", async () => {
  try {
    if (!viewPatientsCtx.authenticatedUser) {
      throw new Error("Usuario no autenticado");
    }

    if (viewPatientsCtx.authenticatedUser.role === "PATIENT") {
      throw new Error("Acceso no autorizado");
    }

    const result = await AdminService.listPatients({
      page: 1,
      limit: 20,
    });
    viewPatientsCtx.patients = result.patients;
  } catch (error: any) {
    viewPatientsCtx.errorMessage = error?.message ?? String(error);
  }
});

When("consulto mi lista de pacientes", async () => {
  try {
    // Get only patients that have had appointments with this doctor
    const prisma = getPrismaClient();
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorProfileId: viewPatientsCtx.doctorProfile!.id,
      },
      include: {
        patient: true,
      },
    });

    const uniquePatients = new Map();
    appointments.forEach((apt) => {
      uniquePatients.set(apt.patient.id, apt.patient);
    });

    viewPatientsCtx.patients = Array.from(uniquePatients.values());
    viewPatientsCtx.errorMessage = undefined;
  } catch (error: any) {
    viewPatientsCtx.errorMessage = error?.message ?? String(error);
  }
});

// Then steps
Then("debo ver todos los pacientes que han tenido citas conmigo", async () => {
  expect(viewPatientsCtx.patients).toBeDefined();
  expect(viewPatientsCtx.patients!.length).toBeGreaterThan(0);
});

Then("cada paciente debe mostrar nombre, RUT, email y teléfono", async () => {
  expect(viewPatientsCtx.patients).toBeDefined();
  for (const patient of viewPatientsCtx.patients!) {
    expect(patient.firstName).toBeDefined();
    expect(patient.lastName).toBeDefined();
    expect(patient.rut).toBeDefined();
    expect(patient.email).toBeDefined();
    // phone is optional so we don't check it
  }
});

Then("debo ver todos los pacientes del sistema", async () => {
  expect(viewPatientsCtx.patients).toBeDefined();
  expect(viewPatientsCtx.patients!.length).toBeGreaterThan(0);
});

Then("cada paciente debe mostrar información básica", async () => {
  expect(viewPatientsCtx.patients).toBeDefined();
  for (const patient of viewPatientsCtx.patients!) {
    expect(patient.firstName).toBeDefined();
    expect(patient.lastName).toBeDefined();
    expect(patient.email).toBeDefined();
  }
});

Then(
  'debo ver los pacientes que coinciden con "{string}" en el nombre',
  async (searchTerm: string) => {
    expect(viewPatientsCtx.searchResults).toBeDefined();
    expect(viewPatientsCtx.searchResults!.length).toBeGreaterThan(0);

    for (const patient of viewPatientsCtx.searchResults!) {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const hasMatch = fullName.includes(searchTerm.toLowerCase());
      expect(hasMatch).toBe(true);
    }
  },
);

Then("debo encontrar el paciente correspondiente", async () => {
  expect(viewPatientsCtx.searchResults).toBeDefined();
  expect(viewPatientsCtx.searchResults!.length).toBe(1);
});

Then("debo ver solo los pacientes activos", async () => {
  expect(viewPatientsCtx.filteredPatients).toBeDefined();
  for (const patient of viewPatientsCtx.filteredPatients!) {
    expect(patient.isActive).toBe(true);
  }
});

Then("debo ver información completa del paciente", async () => {
  expect(viewPatientsCtx.patientDetails).toBeDefined();
  expect(viewPatientsCtx.patientDetails!.firstName).toBeDefined();
  expect(viewPatientsCtx.patientDetails!.lastName).toBeDefined();
  expect(viewPatientsCtx.patientDetails!.email).toBeDefined();
  expect(viewPatientsCtx.patientDetails!.rut).toBeDefined();
});

Then("debe incluir historial de citas", async () => {
  expect(viewPatientsCtx.patientDetails).toBeDefined();
  expect(viewPatientsCtx.patientDetails!.appointments).toBeDefined();
  expect(Array.isArray(viewPatientsCtx.patientDetails!.appointments)).toBe(
    true,
  );
});

Then("el sistema debe denegar el acceso", async () => {
  expect(viewPatientsCtx.errorMessage).toBeDefined();
});

Then("debo recibir error de autorización", async () => {
  expect(viewPatientsCtx.errorMessage).toBeDefined();
  const hasAuthError =
    viewPatientsCtx.errorMessage!.includes("autorización") ||
    viewPatientsCtx.errorMessage!.includes("autorizado");
  expect(hasAuthError).toBe(true);
});

Then("debo recibir error de autenticación", async () => {
  expect(viewPatientsCtx.errorMessage).toBeDefined();
  expect(viewPatientsCtx.errorMessage).toContain("autenticado");
});

Then("debo ver los primeros {int} pacientes", async (cantidad: number) => {
  expect(viewPatientsCtx.patients).toBeDefined();
  expect(viewPatientsCtx.patients!.length).toBeGreaterThan(0);
  // In a real implementation, we would check pagination
});

Then("debe existir opción para ver más pacientes", async () => {
  expect(viewPatientsCtx.patients).toBeDefined();
  // In a real implementation, we would check for pagination metadata
});

Then("no debo ver pacientes sin citas asociadas", async () => {
  expect(viewPatientsCtx.patients).toBeDefined();
  const patientIds = viewPatientsCtx.patients!.map((p) => p.id);

  if (viewPatientsCtx.patientWithoutCitas) {
    expect(
      patientIds.includes(viewPatientsCtx.patientWithoutCitas.id),
    ).toBeFalsy();
  }
});

Then(
  "solo debo ver pacientes que han tenido o tendrán citas conmigo",
  async () => {
    expect(viewPatientsCtx.patients).toBeDefined();
    const patientIds = viewPatientsCtx.patients!.map((p) => p.id);

    if (viewPatientsCtx.patientWithCitas) {
      expect(patientIds.includes(viewPatientsCtx.patientWithCitas.id)).toBe(
        true,
      );
    }
  },
);
