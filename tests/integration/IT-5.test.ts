import request from 'supertest';
import { getPrismaClient } from '../test-helpers';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt'; 

// 1. Datos de Entrada (Payload)
const newUserPayload = {
  email: 'paciente-it5@mail.com',
  password: 'PasswordSegura123',
  name: 'Seba', 
  lastName: 'Tester',
  rut: '19000000-0',
};

/**
 * IT-5: Registrar Paciente (Flujo Feliz)
 */
describe('IT-5 – Registrar Paciente (Flujo Feliz)', () => {
  let prisma: PrismaClient;
  let app: any;

  // Precondición: Limpiar la tabla de Usuarios antes de la prueba
  beforeAll(async () => {
    prisma = getPrismaClient();
    const appModule = await import('../../src/app');
    app = appModule.default || (appModule as any).app;

    await prisma.user.deleteMany({ where: { email: newUserPayload.email } });
  });

  it('debe registrar un paciente y verificar la persistencia en BD con contraseña encriptada', async () => {
    // 2. Acción: Ejecutar el endpoint de registro
    const response = await request(app)
      .post('/api/auth/register')
      .send(newUserPayload)
      // 3. Resultado Esperado (API): Status Creado (201)
      .expect(201); 

    // 4. Verificación API: El registro debe devolver un token
    expect(response.body).toHaveProperty('token'); 

    // 5. Verificación Persistencia: Buscar el usuario en la BD
    const userInDb = await prisma.user.findUnique({
      where: { email: newUserPayload.email },
      select: { id: true, email: true, password: true, name: true } 
    });

    // 6. Resultado Esperado (BD): Usuario creado y campos básicos correctos
    expect(userInDb).not.toBeNull();
    expect(userInDb!.email).toBe(newUserPayload.email);
    expect(userInDb!.name).toBe(newUserPayload.name);

    // 7. Verificación de Seguridad: Comprobar que la contraseña encriptada es correcta
    const isPasswordCorrect = await bcrypt.compare(newUserPayload.password, userInDb!.password);
    expect(isPasswordCorrect).toBe(true);
  });
});