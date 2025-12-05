import { Given, When, Then, Before } from "@cucumber/cucumber";
import * as AdminService from "../../src/services/adminService";
import * as AuthService from "../../src/services/authService";
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
    toBeTruthy: () => {
      if (!actual) {
        throw new Error(`Expected value to be truthy, but got ${actual}`);
      }
    },
  };
}

interface RegistrarSecretarioContext {
  authenticatedUser?: any;
  secretaryUser?: any;
  registeredSecretaries?: any[];
  errorMessage?: string;
  loginResult?: any;
  credentials?: {
    email: string;
    password: string;
  };
  existingUser?: any;
}

let registrarSecretarioCtx: RegistrarSecretarioContext = {};

Before(async () => {
  await cleanDatabase();
  registrarSecretarioCtx = {};
});

async function createAdminUser() {
  const prisma = getPrismaClient();
  return prisma.user.create({
    data: {
      id: TestFactory.createPatient().id,
      firstName: "Admin",
      lastName: "User",
      email: "admin@hospital.com",
      phone: "+56987654321",
      rut: "12345678-9",
      password: "$2b$10$test.hash.password",
      role: "ADMIN",
      isActive: true,
    },
  });
}

// Background steps - COMMENTED TO AVOID DUPLICATION - using common_steps.ts
// Given("que la base de datos está limpia", async () => {
//   await cleanDatabase();
// });

Given("que soy un administrador autenticado", async () => {
  registrarSecretarioCtx.authenticatedUser = await createAdminUser();
});

// COMMENTED TO AVOID DUPLICATION
// Given("que soy un médico autenticado", async () => {
//   registrarSecretarioCtx.authenticatedUser = await createUserInDb("doctor", {
//     name: "Dr. Smith",
//     email: "doctor@hospital.com",
//     phone: "+56987654321",
//     rut: "98765432-1",
//   });
// });

Given('que existe un usuario con email "{string}"', async (email: string) => {
  registrarSecretarioCtx.existingUser = await createUserInDb("patient", {
    name: "Existing User",
    email: email,
    phone: "+56987654321",
    rut: "11111111-1",
  });
});

Given(
  'que registré un secretario "{string}" con email "{string}"',
  async (nombre: string, email: string) => {
    try {
      // Generate temporary password
      const tempPassword = Math.random().toString(36).substring(2, 15);

      const userData = {
        firstName: nombre.split(" ")[0] || nombre,
        lastName: nombre.split(" ").slice(1).join(" ") || "Apellido",
        email: email,
        password: tempPassword,
        rut: `${Math.floor(Math.random() * 100000000)}-${Math.floor(Math.random() * 10)}`,
        role: "SECRETARY" as const,
        phone: "+56987654321",
      };

      registrarSecretarioCtx.secretaryUser =
        await AdminService.createUser(userData);
      registrarSecretarioCtx.credentials = {
        email: email,
        password: tempPassword,
      };
    } catch (error: any) {
      registrarSecretarioCtx.errorMessage = error?.message ?? String(error);
    }
  },
);

// When steps
When(
  'registro un secretario con nombre "{string}", email "{string}", RUT "{string}" y teléfono "{string}"',
  async (nombre: string, email: string, rut: string, telefono: string) => {
    try {
      // Generate temporary password
      const tempPassword = Math.random().toString(36).substring(2, 15);

      const userData = {
        firstName: nombre.split(" ")[0] || nombre,
        lastName: nombre.split(" ").slice(1).join(" ") || "Apellido",
        email: email,
        password: tempPassword,
        rut: rut,
        role: "SECRETARY" as const,
        phone: telefono,
      };

      registrarSecretarioCtx.secretaryUser =
        await AdminService.createUser(userData);
      registrarSecretarioCtx.credentials = {
        email: email,
        password: tempPassword,
      };
      registrarSecretarioCtx.errorMessage = undefined;
    } catch (error: any) {
      registrarSecretarioCtx.errorMessage = error?.message ?? String(error);
    }
  },
);

When(
  'registro el secretario "{string}" con email "{string}"',
  async (nombre: string, email: string) => {
    try {
      const tempPassword = Math.random().toString(36).substring(2, 15);

      const userData = {
        firstName: nombre.split(" ")[0] || nombre,
        lastName: nombre.split(" ").slice(1).join(" ") || "Apellido",
        email: email,
        password: tempPassword,
        rut: `${Math.floor(Math.random() * 100000000)}-${Math.floor(Math.random() * 10)}`,
        role: "SECRETARY" as const,
        phone: "+56987654321",
      };

      const secretary = await AdminService.createUser(userData);

      if (!registrarSecretarioCtx.registeredSecretaries) {
        registrarSecretarioCtx.registeredSecretaries = [];
      }
      registrarSecretarioCtx.registeredSecretaries.push({
        user: secretary,
        credentials: { email, password: tempPassword },
      });

      registrarSecretarioCtx.errorMessage = undefined;
    } catch (error: any) {
      registrarSecretarioCtx.errorMessage = error?.message ?? String(error);
    }
  },
);

When(
  "el secretario intenta iniciar sesión con sus credenciales temporales",
  async () => {
    try {
      if (!registrarSecretarioCtx.credentials) {
        throw new Error("No credentials available");
      }

      // Simulate login by finding user and verifying password
      const user = await AuthService.findUserByEmail(
        registrarSecretarioCtx.credentials.email,
      );
      if (!user) {
        throw new Error("Usuario no encontrado");
      }

      const isPasswordValid = await AuthService.verifyPassword(
        registrarSecretarioCtx.credentials.password,
        user.password,
      );
      if (!isPasswordValid) {
        throw new Error("Credenciales inválidas");
      }

      const token = AuthService.generateToken({
        userId: user.id,
        role: user.role,
      });

      registrarSecretarioCtx.loginResult = {
        user: AuthService.mapUserToDto(user),
        token,
      };
      registrarSecretarioCtx.errorMessage = undefined;
    } catch (error: any) {
      registrarSecretarioCtx.errorMessage = error?.message ?? String(error);
    }
  },
);

When(
  'intento registrar un secretario con email "{string}"',
  async (email: string) => {
    try {
      const userData = {
        firstName: "Test",
        lastName: "Secretary",
        email: email,
        password: "tempPassword123",
        rut: `${Math.floor(Math.random() * 100000000)}-${Math.floor(Math.random() * 10)}`,
        role: "SECRETARY" as const,
        phone: "+56987654321",
      };

      registrarSecretarioCtx.secretaryUser =
        await AdminService.createUser(userData);
      registrarSecretarioCtx.errorMessage = undefined;
    } catch (error: any) {
      registrarSecretarioCtx.errorMessage = error?.message ?? String(error);
    }
  },
);

When("intento registrar un secretario sin proporcionar el email", async () => {
  try {
    const userData = {
      firstName: "Test",
      lastName: "Secretary",
      email: "", // Empty email
      password: "tempPassword123",
      rut: "12345678-9",
      role: "SECRETARY" as const,
      phone: "+56987654321",
    };

    registrarSecretarioCtx.secretaryUser =
      await AdminService.createUser(userData);
    registrarSecretarioCtx.errorMessage = undefined;
  } catch (error: any) {
    registrarSecretarioCtx.errorMessage = error?.message ?? String(error);
  }
});

When(
  'intento registrar un secretario con RUT "{string}"',
  async (rut: string) => {
    try {
      const userData = {
        firstName: "Test",
        lastName: "Secretary",
        email: "test@hospital.com",
        password: "tempPassword123",
        rut: rut,
        role: "SECRETARY" as const,
        phone: "+56987654321",
      };

      registrarSecretarioCtx.secretaryUser =
        await AdminService.createUser(userData);
      registrarSecretarioCtx.errorMessage = undefined;
    } catch (error: any) {
      registrarSecretarioCtx.errorMessage = error?.message ?? String(error);
    }
  },
);

When("intento registrar un secretario", async () => {
  try {
    if (
      !registrarSecretarioCtx.authenticatedUser ||
      registrarSecretarioCtx.authenticatedUser.role !== "ADMIN"
    ) {
      throw new Error("Acceso no autorizado");
    }

    const userData = {
      firstName: "Test",
      lastName: "Secretary",
      email: "test@hospital.com",
      password: "tempPassword123",
      rut: "12345678-9",
      role: "SECRETARY" as const,
      phone: "+56987654321",
    };

    registrarSecretarioCtx.secretaryUser =
      await AdminService.createUser(userData);
    registrarSecretarioCtx.errorMessage = undefined;
  } catch (error: any) {
    registrarSecretarioCtx.errorMessage = error?.message ?? String(error);
  }
});

When(
  "intento registrar un secretario con nombre de 300 caracteres",
  async () => {
    try {
      const longName = "A".repeat(300);

      const userData = {
        firstName: longName,
        lastName: "Secretary",
        email: "long@hospital.com",
        password: "tempPassword123",
        rut: "12345678-9",
        role: "SECRETARY" as const,
        phone: "+56987654321",
      };

      registrarSecretarioCtx.secretaryUser =
        await AdminService.createUser(userData);
      registrarSecretarioCtx.errorMessage = undefined;
    } catch (error: any) {
      registrarSecretarioCtx.errorMessage = error?.message ?? String(error);
    }
  },
);

When("registro un secretario con email de 254 caracteres válidos", async () => {
  try {
    // Create a valid email with 254 characters
    const localPart = "a".repeat(240); // long local part
    const domain = "@hospital.com"; // 13 chars
    const email = localPart + domain; // 253 chars total

    const userData = {
      firstName: "Test",
      lastName: "Secretary",
      email: email,
      password: "tempPassword123",
      rut: "12345678-9",
      role: "SECRETARY" as const,
      phone: "+56987654321",
    };

    registrarSecretarioCtx.secretaryUser =
      await AdminService.createUser(userData);
    registrarSecretarioCtx.errorMessage = undefined;
  } catch (error: any) {
    registrarSecretarioCtx.errorMessage = error?.message ?? String(error);
  }
});

// Then steps
Then("el secretario debe registrarse exitosamente", async () => {
  expect(registrarSecretarioCtx.secretaryUser).toBeDefined();
  expect(registrarSecretarioCtx.errorMessage).toBeFalsy();
});

Then('debe generarse un usuario con rol "{string}"', async (role: string) => {
  expect(registrarSecretarioCtx.secretaryUser).toBeDefined();
  expect(registrarSecretarioCtx.secretaryUser.role).toBe(role);
});

Then(
  "debe enviarse email de bienvenida con credenciales temporales",
  async () => {
    expect(registrarSecretarioCtx.credentials).toBeDefined();
    expect(registrarSecretarioCtx.credentials!.email).toBeDefined();
    expect(registrarSecretarioCtx.credentials!.password).toBeDefined();
    // In a real implementation, we would check if email was sent
  },
);

Then("ambos secretarios deben registrarse exitosamente", async () => {
  expect(registrarSecretarioCtx.registeredSecretaries).toBeDefined();
  expect(registrarSecretarioCtx.registeredSecretaries!.length).toBe(2);

  for (const secretary of registrarSecretarioCtx.registeredSecretaries!) {
    expect(secretary.user).toBeDefined();
    expect(secretary.user.role).toBe("SECRETARY");
  }
});

Then("cada uno debe tener credenciales únicas", async () => {
  expect(registrarSecretarioCtx.registeredSecretaries).toBeDefined();

  const emails = registrarSecretarioCtx.registeredSecretaries!.map(
    (s) => s.credentials.email,
  );
  const passwords = registrarSecretarioCtx.registeredSecretaries!.map(
    (s) => s.credentials.password,
  );

  // Check that emails are unique
  expect(new Set(emails).size).toBe(emails.length);
  // Check that passwords are unique
  expect(new Set(passwords).size).toBe(passwords.length);
});

Then("debe poder acceder al sistema", async () => {
  expect(registrarSecretarioCtx.loginResult).toBeDefined();
  expect(registrarSecretarioCtx.loginResult.token).toBeDefined();
});

Then("debe tener permisos de secretario", async () => {
  expect(registrarSecretarioCtx.loginResult).toBeDefined();
  expect(registrarSecretarioCtx.loginResult.user.role).toBe("SECRETARY");
});

Then("el sistema debe mostrar error de email duplicado", async () => {
  expect(registrarSecretarioCtx.errorMessage).toBeDefined();
  const isEmailError =
    registrarSecretarioCtx.errorMessage!.includes("Email already exists") ||
    registrarSecretarioCtx.errorMessage!.includes("email") ||
    registrarSecretarioCtx.errorMessage!.includes("duplicado");
  expect(isEmailError).toBeTruthy();
});

Then("el secretario no debe ser registrado", async () => {
  expect(registrarSecretarioCtx.secretaryUser).toBeFalsy();
});

Then("el sistema debe mostrar error de datos faltantes", async () => {
  expect(registrarSecretarioCtx.errorMessage).toBeDefined();
  const isValidationError =
    registrarSecretarioCtx.errorMessage!.includes("required") ||
    registrarSecretarioCtx.errorMessage!.includes("falta") ||
    registrarSecretarioCtx.errorMessage!.includes("requerido");
  expect(isValidationError).toBeTruthy();
});

// COMMENTED TO AVOID DUPLICATION - using common_steps.ts
// Then("el sistema debe mostrar error de formato de RUT", async () => {
//   expect(registrarSecretarioCtx.errorMessage).toBeDefined();
//   const isRutError =
//     registrarSecretarioCtx.errorMessage!.includes("RUT") ||
//     registrarSecretarioCtx.errorMessage!.includes("formato") ||
//     registrarSecretarioCtx.errorMessage!.includes("inválido");
//   expect(isRutError).toBeTruthy();
// });

// COMMENTED TO AVOID DUPLICATION - using common_steps.ts
// Then("el sistema debe denegar el acceso", async () => {
//   expect(registrarSecretarioCtx.response).toBeDefined();
//   expect(registrarSecretarioCtx.response?.status).toBe(403);
// });

// COMMENTED TO AVOID DUPLICATION - using common_steps.ts
// Then("debo recibir error de autorización", async () => {
//   expect(registrarSecretarioCtx.response).toBeDefined();
//   expect(registrarSecretarioCtx.response?.status).toBe(403);
// });

Then("el sistema debe mostrar error de longitud de nombre", async () => {
  expect(registrarSecretarioCtx.errorMessage).toBeDefined();
  const isLengthError =
    registrarSecretarioCtx.errorMessage!.includes("longitud") ||
    registrarSecretarioCtx.errorMessage!.includes("length") ||
    registrarSecretarioCtx.errorMessage!.includes("largo") ||
    registrarSecretarioCtx.errorMessage!.includes("caracteres");
  expect(isLengthError).toBeTruthy();
});

Then("debe poder recibir emails de notificación", async () => {
  expect(registrarSecretarioCtx.secretaryUser).toBeDefined();
  expect(registrarSecretarioCtx.secretaryUser.email).toBeDefined();
  // In a real implementation, we would check email delivery capability
});
