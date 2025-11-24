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
  extractToken,
  randomSleep,
} from './utils.js';

// Métricas personalizadas
const registerDuration = new Trend('auth_register_duration');
const loginDuration = new Trend('auth_login_duration');
const errors = new Counter('auth_errors');

// Configuración de escenarios
export const options = {
  discardResponseBodies: false,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    auth_errors: ['count<10'],
    auth_register_duration: ['p(95)<1500'],
    auth_login_duration: ['p(95)<500'],
  },
  scenarios: {
    load: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 50,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '3m', target: 30 },
        { duration: '2m', target: 5 },
      ],
      tags: { test_type: 'load' },
      exec: 'authFlow',
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '2m', target: 80 },
        { duration: '2m', target: 150 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'stress' },
      exec: 'authFlow',
    },
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

/**
 * Registra un nuevo usuario
 */
function registerUser() {
  const { firstName, lastName } = generateName();
  const rut = generateValidRUT();
  const payload = {
    firstName,
    lastName,
    rut,
    email: generateEmail('auth'),
    phone: generatePhone(),
    password: 'Test123456!',
    role: 'PATIENT',
  };

  const res = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify(payload),
    JSON_HEADERS
  );

  const success = ensure(res, 'user registered successfully', 201, errors);
  registerDuration.add(res.timings.duration);

  if (success && ensureField(res, 'data.token', errors)) {
    return {
      rut: rut,
      password: payload.password,
      token: extractToken(res),
    };
  }

  return null;
}

/**
 * Inicia sesión con credenciales
 */
function loginUser(rut, password) {
  const payload = {
    rut,
    password,
  };

  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify(payload),
    JSON_HEADERS
  );

  const success = ensure(res, 'user logged in successfully', 200, errors);
  loginDuration.add(res.timings.duration);

  if (success && ensureField(res, 'data.token', errors)) {
    return extractToken(res);
  }

  return null;
}

/**
 * Flujo completo de autenticación
 */
export function authFlow() {
  // 1. Registrar nuevo usuario
  const user = registerUser();
  if (!user) {
    sleep(randomSleep(0.5, 1));
    return;
  }

  sleep(randomSleep(0.3, 0.8));

  // 2. Hacer login con el usuario registrado
  const token = loginUser(user.rut, user.password);
  if (!token) {
    errors.add(1);
  }

  sleep(randomSleep(0.5, 1.5));
}

export default authFlow;
