import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import {
  generateValidRUT,
  generateEmail,
  generateName,
  generatePhone,
  generateFutureDate,
  ensure,
  ensureField,
  JSON_HEADERS,
  authHeaders,
  extractToken,
  extractData,
  randomSleep,
} from './utils.js';

// Métricas personalizadas para el flujo completo
const e2eRegisterDuration = new Trend('e2e_register_duration');
const e2eLoginDuration = new Trend('e2e_login_duration');
const e2eAvailabilityDuration = new Trend('e2e_availability_duration');
const e2eAppointmentCreationDuration = new Trend('e2e_appointment_creation_duration');
const e2eAppointmentCancellationDuration = new Trend('e2e_appointment_cancellation_duration');
const e2eNotificationCheckDuration = new Trend('e2e_notification_check_duration');
const e2eErrors = new Counter('e2e_errors');
const e2eSuccessfulFlows = new Counter('e2e_successful_flows');

// Configuración de escenarios
export const options = {
  discardResponseBodies: false,
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    e2e_errors: ['count<20'],
    e2e_successful_flows: ['count>10'],
  },
  scenarios: {
    load: {
      executor: 'ramping-arrival-rate',
      startRate: 2,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 50,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '3m', target: 30 },
        { duration: '2m', target: 10 },
      ],
      tags: { test_type: 'load' },
      exec: 'endToEndFlow',
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '2m', target: 60 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'stress' },
      exec: 'endToEndFlow',
    },
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

/**
 * Paso 1: Registrar un nuevo paciente
 */
function registerPatient() {
  const { firstName, lastName } = generateName();
  const rut = generateValidRUT();
  const password = 'Test123456!';

  const payload = {
    firstName,
    lastName,
    rut,
    email: generateEmail('e2e'),
    phone: generatePhone(),
    password,
    role: 'PATIENT',
  };

  const res = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify(payload),
    JSON_HEADERS
  );

  const success = ensure(res, '[E2E] patient registered', 201, e2eErrors);
  e2eRegisterDuration.add(res.timings.duration);

  if (success && ensureField(res, 'data.token', e2eErrors)) {
    return {
      rut,
      password,
      token: extractToken(res),
    };
  }

  return null;
}

/**
 * Paso 2: Iniciar sesión
 */
function login(rut, password) {
  const payload = { rut, password };

  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify(payload),
    JSON_HEADERS
  );

  const success = ensure(res, '[E2E] login successful', 200, e2eErrors);
  e2eLoginDuration.add(res.timings.duration);

  if (success && ensureField(res, 'data.token', e2eErrors)) {
    return extractToken(res);
  }

  return null;
}

/**
 * Paso 3: Consultar disponibilidad de horarios
 */
function checkAvailability(token) {
  const date = generateFutureDate(7);

  const res = http.get(
    `${BASE_URL}/api/appointments/availability?date=${date}`,
    authHeaders(token)
  );

  ensure(res, '[E2E] availability checked', 200, e2eErrors);
  e2eAvailabilityDuration.add(res.timings.duration);

  try {
    const body = JSON.parse(res.body);
    const slots = body.availableSlots || body;
    if (slots && Array.isArray(slots) && slots.length > 0) {
      return slots[0];
    }
  } catch (e) {
    // Ignorar errores de parsing
  }

  return null;
}

/**
 * Paso 4: Agendar una cita médica
 */
function createAppointment(token, availableSlot) {
  if (!availableSlot) {
    // Sin slots disponibles, no crear cita
    return null;
  }

  const payload = {
    doctorProfileId: availableSlot.doctorProfileId,
    specialtyId: availableSlot.specialtyId,
    appointmentDate: availableSlot.date,
    startTime: availableSlot.startTime,
    notes: 'Cita end-to-end generada por k6',
  };

  const res = http.post(
    `${BASE_URL}/api/appointments`,
    JSON.stringify(payload),
    authHeaders(token)
  );

  const success = ensure(res, '[E2E] appointment created', 201, e2eErrors);
  e2eAppointmentCreationDuration.add(res.timings.duration);

  if (success) {
    try {
      const body = JSON.parse(res.body);
      return body.appointment?.id || body.id;
    } catch (e) {
      // Ignorar
    }
  }

  return null;
}

/**
 * Paso 5: Verificar notificaciones
 */
function checkNotifications(token) {
  const res = http.get(
    `${BASE_URL}/api/notifications`,
    authHeaders(token)
  );

  // Las notificaciones pueden no existir aún, 200 o 404 son válidos
  const success = res.status === 200 || res.status === 404;
  if (res.status === 200) {
    ensure(res, '[E2E] notifications checked', 200, e2eErrors);
  }
  
  e2eNotificationCheckDuration.add(res.timings.duration);

  return success;
}

/**
 * Paso 6: Cancelar la cita
 */
function cancelAppointment(token, appointmentId) {
  if (!appointmentId) {
    return false;
  }

  const res = http.del(
    `${BASE_URL}/api/appointments/${appointmentId}`,
    null,
    authHeaders(token)
  );

  const success = ensure(res, '[E2E] appointment cancelled', 200, e2eErrors);
  e2eAppointmentCancellationDuration.add(res.timings.duration);

  return success;
}

/**
 * Flujo end-to-end completo
 * Simula el ciclo de vida completo de un paciente
 */
export function endToEndFlow() {
  // 1. Registrar paciente (ya incluye el token)
  const patient = registerPatient();
  if (!patient || !patient.token) {
    sleep(randomSleep(0.5, 1));
    return;
  }

  sleep(randomSleep(0.5, 1));

  // 2. Iniciar sesión (para verificar que funciona)
  const loginToken = login(patient.rut, patient.password);
  if (!loginToken) {
    sleep(randomSleep(0.5, 1));
    return;
  }

  sleep(randomSleep(0.5, 1.2));

  // 3. Consultar disponibilidad
  const availableSlot = checkAvailability(loginToken);
  sleep(randomSleep(0.3, 0.8));

  // 4. Agendar cita
  const appointmentId = createAppointment(loginToken, availableSlot);
  if (!appointmentId) {
    sleep(randomSleep(0.5, 1));
    return;
  }

  sleep(randomSleep(1, 2));

  // 5. Verificar notificaciones (opcional, puede no existir endpoint)
  checkNotifications(loginToken);
  sleep(randomSleep(0.3, 0.8));

  // 6. Cancelar la cita
  const cancelled = cancelAppointment(loginToken, appointmentId);
  
  if (cancelled) {
    e2eSuccessfulFlows.add(1);
  }

  sleep(randomSleep(0.5, 1.5));
}

export default endToEndFlow;
