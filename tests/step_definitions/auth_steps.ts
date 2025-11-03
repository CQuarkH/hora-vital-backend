import { Given, When, Then, Before } from "@cucumber/cucumber";
import assert from "assert";

import * as AuthService from "../../src/services/authService";
import * as ProfileService from "../../src/services/profileService";
import {
  cleanDatabase,
  getPrismaClient,
  createUserInDb,
} from "../test-helpers";

/**
 * Contexto compartido entre steps
 */
const ctx: {
  created?: any;
  token?: string;
  loginResult?: any;
  updated?: any;
} = {};

/**
 * Helpers
 */
function checkPasswordComplexity(pw: string) {
  // Min 8, al menos una mayúscula, una minúscula, un dígito y un carácter especial
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return re.test(pw);
}

function splitFullName(full: string) {
  const parts = (full || "Nombre Apellido").trim().split(/\s+/);
  const firstName = parts.shift() || "Nombre";
  const lastName = parts.join(" ") || "Apellido";
  return { firstName, lastName };
}

/**
 * Limpieza antes de cada escenario
 */
Before(async () => {
  await cleanDatabase();
  ctx.created = undefined;
  ctx.token = undefined;
  ctx.loginResult = undefined;
  ctx.updated = undefined;
});

/* -----------------------
   Registro
   ----------------------- */
When(
  /me registro con nombre "(.*)", email "(.*)", password "(.*)", rut "(.*)" y teléfono "(.*)"/,
  async (
    fullName: string,
    email: string,
    password: string,
    rut: string,
    phone: string
  ) => {
    if (!checkPasswordComplexity(password)) {
      throw new Error(
        "La contraseña no cumple la política mínima requerida en el test"
      );
    }

    const { firstName, lastName } = splitFullName(fullName);

    const created = await AuthService.createUser({
      firstName,
      lastName,
      email,
      password,
      rut,
      phone,
    } as any);

    const token = AuthService.generateToken({
      userId: created.id,
      role: created.role,
    });

    ctx.created = created;
    ctx.token = token;
  }
);

Then("el registro debe ser exitoso y debo recibir un token", async () => {
  assert.ok(ctx.created, "Usuario no fue creado");
  assert.ok(ctx.token, "Token no fue generado");

  const prisma = getPrismaClient();
  const dbUser = await prisma.user.findUnique({
    where: { id: ctx.created.id },
  });
  assert.ok(dbUser, "Usuario no encontrado en BD tras registro");
  // comprobar nombres y email
  assert.strictEqual(
    (dbUser as any).firstName,
    ctx.created.firstName || ctx.created.firstName,
    "firstName en BD no coincide"
  );
  assert.strictEqual(
    (dbUser as any).lastName,
    ctx.created.lastName || ctx.created.lastName,
    "lastName en BD no coincide"
  );
  assert.strictEqual(
    (dbUser as any).email,
    ctx.created.email,
    "email en BD no coincide"
  );
});

/* -----------------------
   Login
   ----------------------- */
Given(
  /existe un usuario registrado con nombre "(.*)", email "(.*)" y password "(.*)"/,
  async (fullName: string, email: string, password: string) => {
    if (!checkPasswordComplexity(password)) {
      throw new Error("La contraseña de fixture no cumple la política mínima");
    }
    // Preferimos crear vía AuthService.createUser para que el password quede hasheado correctamente.
    const { firstName, lastName } = splitFullName(fullName);
    const created = await AuthService.createUser({
      firstName,
      lastName,
      email,
      password,
      rut: `test-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    } as any);
    ctx.created = created;
  }
);

When(
  /intento iniciar sesión con email "(.*)" y password "(.*)"/,
  async (email: string, password: string) => {
    const user = await AuthService.findUserByEmail(email);
    if (!user) {
      ctx.loginResult = { ok: false, status: 401 };
      return;
    }
    const ok = await AuthService.verifyPassword(password, user.password);
    if (!ok) {
      ctx.loginResult = { ok: false, status: 401 };
      return;
    }
    const token = AuthService.generateToken({
      userId: user.id,
      role: user.role,
    });
    ctx.loginResult = { ok: true, token, user };
  }
);

Then(
  /el login debe devolver un token y los datos del usuario con email "(.*)"/,
  async (expectedEmail: string) => {
    assert.ok(ctx.loginResult, "No hay resultado de login");
    assert.strictEqual(ctx.loginResult.ok, true, "Login falló");
    assert.ok(ctx.loginResult.token, "Token faltante");
    assert.strictEqual(
      ctx.loginResult.user.email,
      expectedEmail,
      "Email devuelto no coincide"
    );
  }
);

/* -----------------------
   Editar perfil
   ----------------------- */
Given(
  /que estoy autenticado como un usuario existente con nombre "(.*)", email "(.*)" y password "(.*)"/,
  async (fullName: string, email: string, password: string) => {
    if (!checkPasswordComplexity(password)) {
      throw new Error("La contraseña de fixture no cumple la política mínima");
    }
    const { firstName, lastName } = splitFullName(fullName);
    const created = await AuthService.createUser({
      firstName,
      lastName,
      email,
      password,
      rut: `test-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    } as any);
    ctx.created = created;
    ctx.token = AuthService.generateToken({
      userId: created.id,
      role: created.role,
    });
  }
);

When(
  /actualizo mi perfil a nombre "(.*)", email "(.*)" y teléfono "(.*)"/,
  async (newFullName: string, newEmail: string, newPhone: string) => {
    assert.ok(
      ctx.created,
      "No hay usuario autenticado en el contexto del test"
    );

    const { firstName, lastName } = splitFullName(newFullName);

    const updated = await ProfileService.updateOwnProfile(ctx.created.id, {
      firstName,
      lastName,
      email: newEmail,
      phone: newPhone,
    } as any);

    ctx.updated = updated;
  }
);

Then(
  /el perfil debe haberse actualizado con nombre "(.*)" y email "(.*)"/,
  async (expectedFullName: string, expectedEmail: string) => {
    assert.ok(ctx.updated, "Perfil no fue actualizado por el service");

    const { firstName: expectedFirst, lastName: expectedLast } =
      splitFullName(expectedFullName);

    assert.strictEqual(
      (ctx.updated as any).email,
      expectedEmail,
      "Email devuelto no coincide"
    );
    const returnedFirst =
      (ctx.updated as any).firstName ??
      (ctx.updated as any).first_name ??
      (ctx.updated as any).name;
    const returnedLast =
      (ctx.updated as any).lastName ??
      (ctx.updated as any).last_name ??
      (ctx.updated as any).surname;

    if (returnedFirst && returnedLast) {
      assert.strictEqual(
        returnedFirst,
        expectedFirst,
        "firstName devuelto no coincide"
      );
      assert.strictEqual(
        returnedLast,
        expectedLast,
        "lastName devuelto no coincide"
      );
    } else if ((ctx.updated as any).name) {
      assert.strictEqual(
        (ctx.updated as any).name,
        expectedFullName,
        "name devuelto no coincide"
      );
    } else {
      // fallback: check DB directly
      const prisma = getPrismaClient();
      const dbUser = await prisma.user.findUnique({
        where: { id: ctx.updated.id },
      });
      assert.ok(dbUser, "Usuario no encontrado en BD luego del update");
      assert.strictEqual(
        (dbUser as any).email,
        expectedEmail,
        "Email en BD no coincide"
      );
      assert.strictEqual(
        (dbUser as any).firstName,
        expectedFirst,
        "firstName en BD no coincide"
      );
      assert.strictEqual(
        (dbUser as any).lastName,
        expectedLast,
        "lastName en BD no coincide"
      );
    }
  }
);
