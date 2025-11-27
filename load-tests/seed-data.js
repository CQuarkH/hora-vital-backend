import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  generateValidRUT,
  generateEmail,
  generateName,
  generatePhone,
  ensure,
  JSON_HEADERS,
} from './utils.js';

export const options = {
  vus: 1,
  iterations: 1,
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

// Datos estáticos para pruebas
const ADMIN_USER = {
  firstName: 'Admin',
  lastName: 'Test',
  rut: '11111111-1',
  email: 'admin@horavital.cl',
  password: 'Test1234',
  phone: '+56911111111',
  role: 'ADMIN'
};

const DOCTOR_USER = {
  firstName: 'Doctor',
  lastName: 'Test',
  rut: '33333333-3',
  email: 'doctor@horavital.cl',
  password: 'Test1234',
  phone: '+56933333333',
  role: 'DOCTOR'
};

const PATIENT_USER = {
  firstName: 'Patient',
  lastName: 'Test',
  rut: '55555555-5',
  email: 'patient@horavital.cl',
  password: 'Test1234',
  phone: '+56955555555',
  role: 'PATIENT'
};

export default function () {
  console.log('Iniciando seed de datos vía API...');

  // 1. Crear Admin
  createOrLoginUser(ADMIN_USER);

  // 2. Crear Doctor
  const doctorToken = createOrLoginUser(DOCTOR_USER);

  // 3. Crear Paciente
  createOrLoginUser(PATIENT_USER);

  // 4. Crear Especialidad (requiere token de admin)
  // Nota: Esto requeriría un endpoint de admin para crear especialidades, 
  // si no existe, asumimos que el sistema base ya tiene algunas o el doctor se crea sin perfil inicial.
  
  console.log('Seed completado.');
}

function createOrLoginUser(user) {
  // Intentar login primero
  let res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ rut: user.rut, password: user.password }),
    JSON_HEADERS
  );

  if (res.status === 200) {
    console.log(`Usuario ${user.role} (${user.rut}) ya existe.`);
    try {
      const body = JSON.parse(res.body);
      return body.data?.token || body.token;
    } catch (e) {
      return null;
    }
  }

  // Si no existe, registrar
  console.log(`Creando usuario ${user.role} (${user.rut})...`);
  res = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify(user),
    JSON_HEADERS
  );

  if (res.status === 201) {
    console.log(`Usuario ${user.role} creado exitosamente.`);
    try {
      const body = JSON.parse(res.body);
      return body.data?.token || body.token;
    } catch (e) {
      return null;
    }
  } else {
    console.log(`Error creando usuario ${user.role}: ${res.status} ${res.body}`);
  }
  
  return null;
}
