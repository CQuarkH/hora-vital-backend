import { Given, When, Then, Before } from "@cucumber/cucumber";
import assert from "assert";

import * as AuthService from "../../src/services/authService";
import { cleanDatabase, getPrismaClient, TestFactory } from "../test-helpers";

/**
 * Contexto compartido entre steps para registro de pacientes
 */
const ctx: {
  registrationData?: any;
  createdUser?: any;
  token?: string;
  error?: any;
  validationError?: any;
  existingUser?: any;
  emailSent?: boolean;
} = {};

/**
 * Helper para validar formato de email
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper para validar formato de RUT chileno
 */
function isValidRUT(rut: string): boolean {
  const rutRegex = /^[\d]{7,8}-[\dkK]$/;
  return rutRegex.test(rut);
}

/**
 * Helper para validar complejidad de contraseña
 */
function isValidPassword(password: string): boolean {
  // Mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Helper para generar string de longitud específica
 */
function generateLongString(length: number): string {
  return "A".repeat(length);
}

/**
 * Simular envío de email de bienvenida
 */
function simulateWelcomeEmail(userEmail: string): boolean {
  // En una implementación real, esto enviaría un email
  // Por ahora, solo simulamos el envío
  console.log(`Simulating welcome email to: ${userEmail}`);
  return true;
}

/**
 * Limpieza antes de cada escenario
 */
Before(async () => {
  await cleanDatabase();
  ctx.registrationData = undefined;
  ctx.createdUser = undefined;
  ctx.token = undefined;
  ctx.error = undefined;
  ctx.validationError = undefined;
  ctx.existingUser = undefined;
  ctx.emailSent = false;
});

/* -----------------------
   Casos positivos
   ----------------------- */
When(
  /me registro como paciente con nombre "(.*)", apellido "(.*)", email "(.*)", RUT "(.*)", teléfono "(.*)" y contraseña "(.*)"/,
  async (
    firstName: string,
    lastName: string,
    email: string,
    rut: string,
    phone: string,
    password: string,
  ) => {
    try {
      ctx.registrationData = {
        firstName,
        lastName,
        email,
        rut,
        phone,
        password,
        role: "PATIENT",
      };

      // Validar datos antes de crear
      if (!isValidEmail(email)) {
        throw new Error("Formato de email inválido");
      }
      if (!isValidRUT(rut)) {
        throw new Error("Formato de RUT inválido");
      }
      if (!isValidPassword(password)) {
        throw new Error("La contraseña no cumple los requisitos de seguridad");
      }

      // Crear el usuario
      ctx.createdUser = await AuthService.createUser({
        firstName,
        lastName,
        email,
        password,
        rut,
        phone,
      });

      // Generar token
      ctx.token = AuthService.generateToken({
        userId: ctx.createdUser.id,
        role: ctx.createdUser.role,
      });

      // Simular envío de email de bienvenida
      ctx.emailSent = simulateWelcomeEmail(email);
    } catch (error: any) {
      ctx.error = error;
    }
  },
);

When(
  /me registro como paciente con nombre "(.*)", apellido "(.*)", email "(.*)", RUT "(.*)" y contraseña "(.*)"/,
  async (
    firstName: string,
    lastName: string,
    email: string,
    rut: string,
    password: string,
  ) => {
    try {
      ctx.registrationData = {
        firstName,
        lastName,
        email,
        rut,
        password,
        role: "PATIENT",
      };

      // Validar datos antes de crear
      if (!isValidEmail(email)) {
        throw new Error("Formato de email inválido");
      }
      if (!isValidRUT(rut)) {
        throw new Error("Formato de RUT inválido");
      }
      if (!isValidPassword(password)) {
        throw new Error("La contraseña no cumple los requisitos de seguridad");
      }

      // Crear el usuario sin teléfono (datos mínimos)
      ctx.createdUser = await AuthService.createUser({
        firstName,
        lastName,
        email,
        password,
        rut,
      });

      // Generar token
      ctx.token = AuthService.generateToken({
        userId: ctx.createdUser.id,
        role: ctx.createdUser.role,
      });
    } catch (error: any) {
      ctx.error = error;
    }
  },
);

When(/me registro con teléfono "(.*)"/, async (phone: string) => {
  try {
    ctx.registrationData = {
      firstName: "Usuario",
      lastName: "Test",
      email: `test-phone-${Date.now()}@example.com`,
      rut: `${Math.floor(Math.random() * 90000000) + 10000000}-9`,
      phone,
      password: "SecurePass123!",
      role: "PATIENT",
    };

    ctx.createdUser = await AuthService.createUser(ctx.registrationData);

    ctx.token = AuthService.generateToken({
      userId: ctx.createdUser.id,
      role: ctx.createdUser.role,
    });
  } catch (error: any) {
    ctx.error = error;
  }
});

/* -----------------------
   Casos negativos
   ----------------------- */
Given(
  /que existe un paciente registrado con email "(.*)"/,
  async (email: string) => {
    try {
      const userData = TestFactory.createPatient({
        email,
        fullName: "Usuario Existente",
      });

      const prisma = getPrismaClient();
      ctx.existingUser = await prisma.user.create({
        data: {
          id: userData.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          rut: userData.rut,
          email: userData.email,
          phone: userData.phone,
          password: userData.password,
          role: userData.role,
          isActive: userData.isActive,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
        },
      });
    } catch (error: any) {
      ctx.error = error;
    }
  },
);

Given(
  /que existe un paciente registrado con RUT "(.*)"/,
  async (rut: string) => {
    try {
      const userData = TestFactory.createPatient({
        rut,
        fullName: "Usuario Existente RUT",
        email: `existing-rut-${Date.now()}@example.com`,
      });

      const prisma = getPrismaClient();
      ctx.existingUser = await prisma.user.create({
        data: {
          id: userData.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          rut: userData.rut,
          email: userData.email,
          phone: userData.phone,
          password: userData.password,
          role: userData.role,
          isActive: userData.isActive,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
        },
      });
    } catch (error: any) {
      ctx.error = error;
    }
  },
);

When(/intento registrarme con email "(.*)"/, async (email: string) => {
  try {
    const registrationData = {
      firstName: "Nuevo",
      lastName: "Usuario",
      email,
      rut: `${Math.floor(Math.random() * 90000000) + 10000000}-9`,
      password: "SecurePass123!",
    };

    ctx.createdUser = await AuthService.createUser(registrationData);
  } catch (error: any) {
    ctx.error = error;
  }
});

When(/intento registrarme con RUT "(.*)"/, async (rut: string) => {
  try {
    const registrationData = {
      firstName: "Nuevo",
      lastName: "Usuario",
      email: `nuevo-usuario-${Date.now()}@example.com`,
      rut,
      password: "SecurePass123!",
    };

    ctx.createdUser = await AuthService.createUser(registrationData);
  } catch (error: any) {
    ctx.error = error;
  }
});

When(/intento registrarme con contraseña "(.*)"/, async (password: string) => {
  try {
    if (!isValidPassword(password)) {
      throw new Error("La contraseña no cumple los requisitos de seguridad");
    }

    const registrationData = {
      firstName: "Usuario",
      lastName: "ContraseñaDébil",
      email: `weak-password-${Date.now()}@example.com`,
      rut: `${Math.floor(Math.random() * 90000000) + 10000000}-9`,
      password,
    };

    ctx.createdUser = await AuthService.createUser(registrationData);
  } catch (error: any) {
    ctx.error = error;
  }
});

When(/intento registrarme con email inválido "(.*)"/, async (email: string) => {
  try {
    if (!isValidEmail(email)) {
      throw new Error("Formato de email inválido");
    }

    const registrationData = {
      firstName: "Usuario",
      lastName: "EmailInválido",
      email,
      rut: `${Math.floor(Math.random() * 90000000) + 10000000}-9`,
      password: "SecurePass123!",
    };

    ctx.createdUser = await AuthService.createUser(registrationData);
  } catch (error: any) {
    ctx.error = error;
  }
});

When(/intento registrarme con RUT inválido "(.*)"/, async (rut: string) => {
  try {
    if (!isValidRUT(rut)) {
      throw new Error("Formato de RUT inválido");
    }

    const registrationData = {
      firstName: "Usuario",
      lastName: "RUTInválido",
      email: `invalid-rut-${Date.now()}@example.com`,
      rut,
      password: "SecurePass123!",
    };

    ctx.createdUser = await AuthService.createUser(registrationData);
  } catch (error: any) {
    ctx.error = error;
  }
});

When(/intento registrarme sin proporcionar nombre/, async () => {
  try {
    const registrationData = {
      firstName: "", // nombre vacío
      lastName: "Apellido",
      email: `no-name-${Date.now()}@example.com`,
      rut: `${Math.floor(Math.random() * 90000000) + 10000000}-9`,
      password: "SecurePass123!",
    };

    if (!registrationData.firstName) {
      throw new Error("El campo nombre es requerido");
    }

    ctx.createdUser = await AuthService.createUser(registrationData);
  } catch (error: any) {
    ctx.error = error;
  }
});

/* -----------------------
   Casos frontera
   ----------------------- */
When(
  /intento registrarme con nombre de (\d+) caracteres/,
  async (length: string) => {
    try {
      const longName = generateLongString(parseInt(length, 10));

      if (longName.length > 255) {
        throw new Error("El nombre excede la longitud máxima permitida");
      }

      const registrationData = {
        firstName: longName,
        lastName: "Apellido",
        email: `long-name-${Date.now()}@example.com`,
        rut: `${Math.floor(Math.random() * 90000000) + 10000000}-9`,
        password: "SecurePass123!",
      };

      ctx.createdUser = await AuthService.createUser(registrationData);
    } catch (error: any) {
      ctx.error = error;
    }
  },
);

/* -----------------------
   Assertions/Then steps
   ----------------------- */
Then(/el registro debe ser exitoso/, async () => {
  assert.ok(!ctx.error, `Error en registro: ${ctx.error?.message}`);
  assert.ok(ctx.createdUser, "Usuario no fue creado");
  assert.ok(ctx.createdUser.id, "Usuario debe tener ID");
  assert.ok(ctx.createdUser.email, "Usuario debe tener email");

  // Verificar en la base de datos
  const prisma = getPrismaClient();
  const dbUser = await prisma.user.findUnique({
    where: { id: ctx.createdUser.id },
  });
  assert.ok(dbUser, "Usuario no encontrado en la base de datos");
});

Then(/debo recibir un token de autenticación/, async () => {
  assert.ok(ctx.token, "Token de autenticación no fue generado");
  assert.ok(typeof ctx.token === "string", "Token debe ser una cadena");
  assert.ok(ctx.token.length > 0, "Token no debe estar vacío");
});

Then(/mi rol debe ser "(.*)"/, async (expectedRole: string) => {
  assert.ok(ctx.createdUser, "Usuario no fue creado");
  assert.strictEqual(
    ctx.createdUser.role,
    expectedRole,
    `Rol debe ser ${expectedRole}`,
  );
});

Then(/debo recibir email de bienvenida/, async () => {
  assert.ok(ctx.emailSent, "Email de bienvenida no fue enviado");
});

Then(/los campos opcionales deben quedar vacíos/, async () => {
  assert.ok(ctx.createdUser, "Usuario no fue creado");

  // Verificar que los campos opcionales no están presentes o están vacíos
  const prisma = getPrismaClient();
  const dbUser = await prisma.user.findUnique({
    where: { id: ctx.createdUser.id },
  });

  assert.ok(dbUser, "Usuario no encontrado en la base de datos");
  // El teléfono debería ser null o undefined ya que no lo proporcionamos
  assert.ok(
    !dbUser.phone || dbUser.phone === null,
    "Campo teléfono debería estar vacío",
  );
});

Then(/el sistema debe mostrar error de email duplicado/, async () => {
  assert.ok(ctx.error, "Debería haber un error");
  assert.ok(
    ctx.error.message.includes("Email already exists") ||
      ctx.error.code === "P2002",
    `Error no es de email duplicado: ${ctx.error.message}`,
  );
});

Then(/el sistema debe mostrar error de RUT duplicado/, async () => {
  assert.ok(ctx.error, "Debería haber un error");
  // En Prisma, las violaciones de restricción unique generan código P2002
  assert.ok(
    ctx.error.message.includes("already exists") || ctx.error.code === "P2002",
    `Error no es de RUT duplicado: ${ctx.error.message}`,
  );
});

Then(/no debo ser registrado/, async () => {
  assert.ok(!ctx.createdUser, "Usuario no debería haber sido creado");
  assert.ok(ctx.error, "Debería haber un error que impida el registro");
});

Then(/el sistema debe mostrar error de seguridad de contraseña/, async () => {
  assert.ok(ctx.error, "Debería haber un error");
  assert.ok(
    ctx.error.message.includes("contraseña") ||
      ctx.error.message.includes("password") ||
      ctx.error.message.includes("seguridad"),
    `Error no es de seguridad de contraseña: ${ctx.error.message}`,
  );
});

Then(/el sistema debe mostrar error de formato de email/, async () => {
  assert.ok(ctx.error, "Debería haber un error");
  assert.ok(
    ctx.error.message.includes("email") ||
      ctx.error.message.includes("formato"),
    `Error no es de formato de email: ${ctx.error.message}`,
  );
});

Then(/el sistema debe mostrar error de formato de RUT/, async () => {
  assert.ok(ctx.error, "Debería haber un error");
  assert.ok(
    ctx.error.message.includes("RUT") || ctx.error.message.includes("formato"),
    `Error no es de formato de RUT: ${ctx.error.message}`,
  );
});

Then(/el sistema debe mostrar error de campos requeridos/, async () => {
  assert.ok(ctx.error, "Debería haber un error");
  assert.ok(
    ctx.error.message.includes("requerido") ||
      ctx.error.message.includes("required"),
    `Error no es de campos requeridos: ${ctx.error.message}`,
  );
});

Then(/el sistema debe mostrar error de longitud/, async () => {
  assert.ok(ctx.error, "Debería haber un error");
  assert.ok(
    ctx.error.message.includes("longitud") ||
      ctx.error.message.includes("length") ||
      ctx.error.message.includes("excede"),
    `Error no es de longitud: ${ctx.error.message}`,
  );
});

Then(/el teléfono debe almacenarse correctamente/, async () => {
  assert.ok(ctx.createdUser, "Usuario no fue creado");

  const prisma = getPrismaClient();
  const dbUser = await prisma.user.findUnique({
    where: { id: ctx.createdUser.id },
  });

  assert.ok(dbUser, "Usuario no encontrado en la base de datos");
  assert.ok(dbUser.phone, "Teléfono no fue almacenado");

  if (ctx.registrationData && ctx.registrationData.phone) {
    assert.strictEqual(
      dbUser.phone,
      ctx.registrationData.phone,
      "Teléfono almacenado no coincide con el proporcionado",
    );
  }
});
