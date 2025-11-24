import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import {
  generateValidRUT,
  generateEmail,
  generateName,
  generatePhone,
  ensure,
  ensureField,
  JSON_HEADERS,
  authHeaders,
  extractToken,
  randomSleep,
} from './utils.js';

// Métricas personalizadas
const scheduleCreationDuration = new Trend('admin_schedule_creation_duration');
const userCreationDuration = new Trend('admin_user_creation_duration');
const appointmentListDuration = new Trend('admin_appointment_list_duration');
const errors = new Counter('admin_errors');

// Configuración de escenarios
export const options = {
  discardResponseBodies: false,
  thresholds: {
    http_req_failed: ['rate<0.05'],  // Más permisivo para admin (5%)
    http_req_duration: ['p(95)<1200', 'p(99)<2000'],
    admin_errors: ['count<20'],
    admin_schedule_creation_duration: ['p(95)<1500'],
    admin_user_creation_duration: ['p(95)<1200'],
  },
  scenarios: {
    load: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 15,
      maxVUs: 30,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '4m', target: 20 },
        { duration: '2m', target: 5 },
      ],
      tags: { test_type: 'load' },
      exec: 'adminFlow',
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 40 },
        { duration: '2m', target: 80 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'stress' },
      exec: 'adminFlow',
    },
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

/**
 * Autentica como usuario administrador usando credenciales del seed
 */
function loginAsAdmin() {
  // Usar credenciales del admin creado por el seed
  const loginPayload = {
    rut: '11111111-1', // RUT del admin del seed
    password: 'Test1234',
  };

  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify(loginPayload),
    JSON_HEADERS
  );

  if (loginRes.status === 200 && ensureField(loginRes, 'data.token')) {
    return {
      token: extractToken(loginRes),
      rut: loginPayload.rut,
    };
  }

  errors.add(1);
  return null;
}

/**
 * Crea un horario médico (schedule)
 * Requiere un doctorProfileId existente
 */
function createSchedule(token, doctorProfileId) {
  if (!doctorProfileId) {
    // Si no hay doctor, no intentar crear schedule
    return false;
  }

  const payload = {
    doctorProfileId,
    dayOfWeek: Math.floor(Math.random() * 7), // 0-6 (Domingo-Sábado)
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 30,
  };

  const res = http.post(
    `${BASE_URL}/api/admin/schedules`,
    JSON.stringify(payload),
    authHeaders(token)
  );

  // Puede fallar con 409 si ya existe, es esperado
  const success = res.status === 201 || res.status === 409;
  if (res.status === 201) {
    ensure(res, 'schedule created', 201);
  }
  
  scheduleCreationDuration.add(res.timings.duration);
  
  return success;
}

/**
 * Lista todas las citas (admin view)
 */
function listAllAppointments(token) {
  const res = http.get(
    `${BASE_URL}/api/admin/appointments`,
    authHeaders(token)
  );

  ensure(res, 'appointments listed by admin', 200, errors);
  appointmentListDuration.add(res.timings.duration);
}

/**
 * Crea un nuevo usuario desde el panel de admin
 */
function createUser(token) {
  const { firstName, lastName } = generateName();
  const payload = {
    firstName,
    lastName,
    rut: generateValidRUT(),
    email: generateEmail('user'),
    phone: generatePhone(),
    password: 'User123456!',
    role: Math.random() > 0.5 ? 'PATIENT' : 'SECRETARY',
  };

  const res = http.post(
    `${BASE_URL}/api/admin/users`,
    JSON.stringify(payload),
    authHeaders(token)
  );

  const success = ensure(res, 'user created by admin', 201, errors);
  userCreationDuration.add(res.timings.duration);

  return success;
}

/**
 * Lista todos los usuarios (admin view) y retorna un doctor si existe
 */
function listUsers(token) {
  const res = http.get(
    `${BASE_URL}/api/admin/users`,
    authHeaders(token)
  );

  ensure(res, 'users listed by admin', 200, errors);

  // Intentar extraer un doctorProfileId de la respuesta
  try {
    const body = JSON.parse(res.body);
    const users = body.users || body;
    
    if (Array.isArray(users)) {
      // Buscar un usuario con rol DOCTOR
      const doctor = users.find(u => u.role === 'DOCTOR' && u.doctorProfile);
      if (doctor && doctor.doctorProfile) {
        return doctor.doctorProfile.id;
      }
    }
  } catch (e) {
    // Ignorar errores
  }

  return null;
}

/**
 * Flujo completo de operaciones administrativas
 */
export function adminFlow() {
  // 1. Autenticar como admin
  const admin = loginAsAdmin();
  if (!admin || !admin.token) {
    sleep(randomSleep(0.5, 1));
    return;
  }

  sleep(randomSleep(0.3, 0.8));

  // 2. Listar usuarios y obtener un doctor
  const doctorProfileId = listUsers(admin.token);
  sleep(randomSleep(0.3, 0.7));

  // 3. Crear nuevo usuario
  createUser(admin.token);
  sleep(randomSleep(0.5, 1));

  // 4. Listar todas las citas
  listAllAppointments(admin.token);
  sleep(randomSleep(0.3, 0.8));

  // 5. Crear un horario si tenemos un doctor
  if (doctorProfileId) {
    createSchedule(admin.token, doctorProfileId);
  }
  
  sleep(randomSleep(0.5, 1.5));
}

export default adminFlow;
