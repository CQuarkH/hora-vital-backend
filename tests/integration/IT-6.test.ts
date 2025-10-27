import request from 'supertest';
import { getPrismaClient } from '../test-helpers';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const duplicateUserPayload = {
  email: 'duplicate-it6@mail.com',
  password: 'Password123',
  name: 'Test', 
  rut: '20000000-0', 
};

/**
 * IT-6: Registrar Paciente con Email Duplicado (Error)
 */
describe('IT-6 – Registrar Paciente con Email Duplicado (Error)', () => {
  let prisma: PrismaClient;
  let app: any;

  beforeAll(async () => {
    prisma = getPrismaClient();
    const appModule = await import('../../src/app');
    app = appModule.default || (appModule as any).app;

    await prisma.user.deleteMany({ where: { email: duplicateUserPayload.email } });

    // 1. Precondición: Crear un usuario que cause el conflicto de duplicidad
    const hashedPassword = await bcrypt.hash(duplicateUserPayload.password, 10);
    await prisma.user.create({
      data: {
        email: duplicateUserPayload.email,
        password: hashedPassword,
        name: duplicateUserPayload.name,
        rut: duplicateUserPayload.rut,
      },
    });
  });

  it('debería rechazar el registro con Error HTTP 409 (Conflict)', async () => {
    // 2. Acción: Intentar registrar con el mismo email
    const response = await request(app)
      .post('/api/auth/register')
      .send(duplicateUserPayload)
      // 3. Resultado Esperado (API): Status Conflict (409)
      .expect(409); 

    // 4. Verificación API: El mensaje de error debe indicar la duplicidad
    expect(response.body).toHaveProperty('message', 'Email ya registrado');
  });
});