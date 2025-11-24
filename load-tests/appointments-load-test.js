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
  randomSleep,
} from './utils.js';

// Métricas personalizadas
const availabilityDuration = new Trend('appointment_availability_duration');
const creationDuration = new Trend('appointment_creation_duration');
const listDuration = new Trend('appointment_list_duration');
const cancellationDuration = new Trend('appointment_cancellation_duration');
const errors = new Counter('appointment_errors');

// Configuración de escenarios
export const options = {
  discardResponseBodies: false,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    appointment_errors: ['count<15'],
    appointment_availability_duration: ['p(95)<600'],
    appointment_creation_duration: ['p(95)<1500'],
    appointment_cancellation_duration: ['p(95)<800'],
  },
  scenarios: {
    load: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 30,
      maxVUs: 80,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '4m', target: 50 },
        { duration: '2m', target: 30 },
        { duration: '2m', target: 10 },
      ],
      tags: { test_type: 'load' },
      exec: 'appointmentFlow',
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 30 },
        { duration: '2m', target: 100 },
        { duration: '3m', target: 200 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'stress' },
      exec: 'appointmentFlow',
    },
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

/**
 * Registra y autentica un usuario paciente
 */
function registerAndLogin() {
  const { firstName, lastName } = generateName();
  const email = generateEmail('patient');
  const password = 'Test123456!';

  const registerPayload = {
    firstName,
    lastName,
    rut: generateValidRUT(),
    email,
    phone: generatePhone(),
    password,
    role: 'PATIENT',
  };

  const registerRes = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify(registerPayload),
    JSON_HEADERS
  );

  if (!ensure(registerRes, 'patient registered', 201, errors)) {
    return null;
  }

  const token = extractToken(registerRes);
  if (!token) {
    errors.add(1);
    return null;
  }

  return token;
}

/**
 * Consulta disponibilidad de horarios
 */
function checkAvailability(token) {
  const date = generateFutureDate(7);
  
  const res = http.get(
    `${BASE_URL}/api/appointments/availability?date=${date}`,
    authHeaders(token)
  );

  ensure(res, 'availability checked', 200, errors);
  availabilityDuration.add(res.timings.duration);

  try {
    const body = JSON.parse(res.body);
    // El backend devuelve { availableSlots: [...] }
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
 * Crea una cita médica
 */
function createAppointment(token, availableSlot) {
  // Si no hay slot disponible, no intentar crear cita
  if (!availableSlot) {
    return null;
  }

  const payload = {
    doctorProfileId: availableSlot.doctorProfileId,
    specialtyId: availableSlot.specialtyId,
    appointmentDate: availableSlot.date,
    startTime: availableSlot.startTime,
    notes: 'Cita generada por k6 load test',
  };

  const res = http.post(
    `${BASE_URL}/api/appointments`,
    JSON.stringify(payload),
    authHeaders(token)
  );

  const success = ensure(res, 'appointment created', 201, errors);
  creationDuration.add(res.timings.duration);

  if (success) {
    try {
      const body = JSON.parse(res.body);
      // El backend devuelve { message: "...", appointment: {...} }
      return body.appointment?.id || body.id;
    } catch (e) {
      // Ignorar
    }
  }

  return null;
}

/**
 * Lista las citas del paciente
 */
function listMyAppointments(token) {
  const res = http.get(
    `${BASE_URL}/api/appointments/my-appointments`,
    authHeaders(token)
  );

  ensure(res, 'appointments listed', 200, errors);
  listDuration.add(res.timings.duration);

  try {
    const body = JSON.parse(res.body);
    // El backend devuelve { appointments: [...] }
    const appointments = body.appointments || body;
    if (appointments && Array.isArray(appointments) && appointments.length > 0) {
      return appointments[0].id;
    }
  } catch (e) {
    // Ignorar
  }

  return null;
}

/**
 * Cancela una cita médica
 */
function cancelAppointment(token, appointmentId) {
  if (!appointmentId) {
    return;
  }

  const res = http.del(
    `${BASE_URL}/api/appointments/${appointmentId}`,
    null,
    authHeaders(token)
  );

  ensure(res, 'appointment cancelled', 200, errors);
  cancellationDuration.add(res.timings.duration);
}

/**
 * Flujo completo de gestión de citas
 */
export function appointmentFlow() {
  // 1. Registrar y autenticar paciente
  const token = registerAndLogin();
  if (!token) {
    sleep(randomSleep(0.5, 1));
    return;
  }

  sleep(randomSleep(0.5, 1));

  // 2. Consultar disponibilidad
  const availableSlot = checkAvailability(token);
  sleep(randomSleep(0.3, 0.8));

  // 3. Crear cita médica
  const appointmentId = createAppointment(token, availableSlot);
  sleep(randomSleep(0.5, 1.2));

  // 4. Listar mis citas
  const listedAppointmentId = listMyAppointments(token);
  sleep(randomSleep(0.3, 0.8));

  // 5. Cancelar la cita creada
  const idToCancel = appointmentId || listedAppointmentId;
  if (idToCancel) {
    cancelAppointment(token, idToCancel);
  }

  sleep(randomSleep(0.5, 1.5));
}

export default appointmentFlow;
