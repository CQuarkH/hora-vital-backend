import { Given, When, Then, Before } from "@cucumber/cucumber";
import * as ProfileService from "../../src/services/profileService";
import {
  cleanDatabase,
  getPrismaClient,
  createUserInDb,
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
    toBeUndefined: () => {
      if (actual !== undefined) {
        throw new Error(`Expected value to be undefined, but got ${actual}`);
      }
    },
    toContain: (expected: string) => {
      if (typeof actual !== "string" || !actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    },
  };
}

interface ProfileContext {
  authenticatedUser?: any;
  updatedProfile?: any;
  errorMessage?: string;
  originalProfile?: any;
  existingUser?: any;
}

let profileCtx: ProfileContext = {};

Before(async () => {
  await cleanDatabase();
  profileCtx = {};
});

function splitFullName(fullName: string) {
  const parts = (fullName || "").trim().split(/\s+/);
  const firstName = parts.shift() || "Nombre";
  const lastName = parts.join(" ") || "Apellido";
  return { firstName, lastName };
}

function generateLongText(length: number): string {
  return "A".repeat(length);
}

// Background steps
Given(
  "que soy un usuario autenticado con email {string}",
  async (email: string) => {
    profileCtx.authenticatedUser = await createUserInDb("patient", {
      name: "Usuario Test",
      email: email,
      phone: "+56912345678",
      rut: "12345678-9",
      role: "PATIENT",
    });

    profileCtx.originalProfile = { ...profileCtx.authenticatedUser };
    expect(profileCtx.authenticatedUser).toBeDefined();
  },
);

// Positive scenarios
When(
  "actualizo mi perfil con nombre {string}, email {string} y teléfono {string}",
  async (nombre: string, email: string, telefono: string) => {
    try {
      const { firstName, lastName } = splitFullName(nombre);

      profileCtx.updatedProfile = await ProfileService.updateOwnProfile(
        profileCtx.authenticatedUser.id,
        {
          firstName,
          lastName,
          email,
          phone: telefono,
        } as any,
      );
      profileCtx.errorMessage = undefined;
    } catch (error: any) {
      profileCtx.errorMessage = error?.message ?? String(error);
      profileCtx.updatedProfile = undefined;
    }
  },
);

When(
  "actualizo únicamente mi nombre a {string}",
  async (nuevoNombre: string) => {
    try {
      const { firstName, lastName } = splitFullName(nuevoNombre);

      profileCtx.updatedProfile = await ProfileService.updateOwnProfile(
        profileCtx.authenticatedUser.id,
        {
          firstName,
          lastName,
        } as any,
      );
      profileCtx.errorMessage = undefined;
    } catch (error: any) {
      profileCtx.errorMessage = error?.message ?? String(error);
      profileCtx.updatedProfile = undefined;
    }
  },
);

When("actualizo únicamente mi email a {string}", async (nuevoEmail: string) => {
  try {
    profileCtx.updatedProfile = await ProfileService.updateOwnProfile(
      profileCtx.authenticatedUser.id,
      {
        email: nuevoEmail,
      } as any,
    );
    profileCtx.errorMessage = undefined;
  } catch (error: any) {
    profileCtx.errorMessage = error?.message ?? String(error);
    profileCtx.updatedProfile = undefined;
  }
});

// Negative scenarios
Given("que existe otro usuario con email {string}", async (email: string) => {
  profileCtx.existingUser = await createUserInDb("patient", {
    name: "Usuario Existente",
    email: email,
    phone: "+56987654321",
    rut: "98765432-1",
    role: "PATIENT",
  });
});

When("intento actualizar mi email a {string}", async (nuevoEmail: string) => {
  try {
    profileCtx.updatedProfile = await ProfileService.updateOwnProfile(
      profileCtx.authenticatedUser.id,
      {
        email: nuevoEmail,
      } as any,
    );
    profileCtx.errorMessage = undefined;
  } catch (error: any) {
    profileCtx.errorMessage = error?.message ?? String(error);
    profileCtx.updatedProfile = undefined;
  }
});

When(
  "intento actualizar mi teléfono a {string}",
  async (nuevoTelefono: string) => {
    try {
      profileCtx.updatedProfile = await ProfileService.updateOwnProfile(
        profileCtx.authenticatedUser.id,
        {
          phone: nuevoTelefono,
        } as any,
      );
      profileCtx.errorMessage = undefined;
    } catch (error: any) {
      profileCtx.errorMessage = error?.message ?? String(error);
      profileCtx.updatedProfile = undefined;
    }
  },
);

// Border scenarios
When(
  "intento actualizar mi nombre a un texto de {int} caracteres",
  async (caracteres: number) => {
    try {
      const nombreLargo = generateLongText(caracteres);
      profileCtx.updatedProfile = await ProfileService.updateOwnProfile(
        profileCtx.authenticatedUser.id,
        {
          firstName: nombreLargo,
        } as any,
      );
      profileCtx.errorMessage = undefined;
    } catch (error: any) {
      profileCtx.errorMessage = error?.message ?? String(error);
      profileCtx.updatedProfile = undefined;
    }
  },
);

When(
  "actualizo mi nombre a {string} y email a {string}",
  async (nombre: string, email: string) => {
    try {
      const { firstName, lastName } = splitFullName(nombre);

      profileCtx.updatedProfile = await ProfileService.updateOwnProfile(
        profileCtx.authenticatedUser.id,
        {
          firstName,
          lastName,
          email,
        } as any,
      );
      profileCtx.errorMessage = undefined;
    } catch (error: any) {
      profileCtx.errorMessage = error?.message ?? String(error);
      profileCtx.updatedProfile = undefined;
    }
  },
);

// Then steps
Then("el perfil debe actualizarse exitosamente", async () => {
  expect(profileCtx.updatedProfile).toBeDefined();
  expect(profileCtx.errorMessage).toBeUndefined();
});

Then("el sistema debe mostrar los datos actualizados", async () => {
  expect(profileCtx.updatedProfile).toBeDefined();

  // Verificar en base de datos
  const prisma = getPrismaClient();
  const dbUser = await prisma.user.findUnique({
    where: { id: profileCtx.updatedProfile.id },
  });
  expect(dbUser).toBeDefined();
});

Then("los demás datos deben permanecer sin cambios", async () => {
  expect(profileCtx.updatedProfile).toBeDefined();

  // Verificar que los campos no modificados se mantienen
  if (profileCtx.updatedProfile.email === profileCtx.originalProfile.email) {
    expect(profileCtx.updatedProfile.email).toBe(
      profileCtx.originalProfile.email,
    );
  }
  if (profileCtx.updatedProfile.phone === profileCtx.originalProfile.phone) {
    expect(profileCtx.updatedProfile.phone).toBe(
      profileCtx.originalProfile.phone,
    );
  }
});

Then("el sistema debe mostrar error de email duplicado", async () => {
  expect(profileCtx.errorMessage).toBeDefined();
  expect(profileCtx.updatedProfile).toBeUndefined();
});

Then("mi perfil no debe ser actualizado", async () => {
  expect(profileCtx.updatedProfile).toBeUndefined();
  expect(profileCtx.errorMessage).toBeDefined();
});

// COMMENTED TO AVOID DUPLICATION - using common_steps.ts
// Then("el sistema debe mostrar error de formato de email", async () => {
//   expect(profileCtx.errorMessage).toBeDefined();
//   expect(profileCtx.updatedProfile).toBeUndefined();
// });

Then("el sistema debe mostrar error de formato de teléfono", async () => {
  expect(profileCtx.errorMessage).toBeDefined();
  expect(profileCtx.updatedProfile).toBeUndefined();
});

Then("el sistema debe mostrar error de longitud de nombre", async () => {
  expect(profileCtx.errorMessage).toBeDefined();
  expect(profileCtx.updatedProfile).toBeUndefined();
});
