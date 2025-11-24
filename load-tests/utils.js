import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

/**
 * Genera un RUT chileno válido con dígito verificador
 */
export function generateValidRUT() {
  const num = Math.floor(Math.random() * 20000000) + 5000000;
  let suma = 0;
  let multiplo = 2;
  
  let numStr = num.toString();
  for (let i = numStr.length - 1; i >= 0; i--) {
    suma += parseInt(numStr[i]) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  
  const resto = suma % 11;
  const dv = 11 - resto;
  
  let dvStr;
  if (dv === 11) dvStr = '0';
  else if (dv === 10) dvStr = 'K';
  else dvStr = dv.toString();
  
  return `${num}-${dvStr}`;
}

/**
 * Genera un sufijo único para evitar colisiones
 */
export function randomSuffix() {
  return `${__VU}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

/**
 * Genera un email único para pruebas
 */
export function generateEmail(prefix = 'loadtest') {
  const suffix = randomSuffix();
  return `${prefix}+${suffix}@horavital.cl`;
}

/**
 * Genera un nombre aleatorio
 */
export function generateName() {
  const nombres = ['Juan', 'María', 'Pedro', 'Ana', 'Carlos', 'Sofía', 'Diego', 'Valentina'];
  const apellidos = ['González', 'Rodríguez', 'Pérez', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Torres'];
  
  return {
    firstName: nombres[Math.floor(Math.random() * nombres.length)],
    lastName: apellidos[Math.floor(Math.random() * apellidos.length)]
  };
}

/**
 * Genera un teléfono chileno válido
 */
export function generatePhone() {
  return `+569${Math.floor(10000000 + Math.random() * 89999999)}`;
}

/**
 * Valida una respuesta HTTP y registra errores
 */
export function ensure(res, message, expectedStatus, errorCounter = null) {
  const ok = check(res, {
    [message]: (r) => r.status === expectedStatus,
  });
  
  if (!ok && errorCounter) {
    errorCounter.add(1);
  }
  
  return ok;
}

/**
 * Valida que la respuesta contenga un campo específico
 * Soporta paths anidados como 'data.token'
 */
export function ensureField(res, fieldPath, errorCounter = null) {
  const ok = check(res, {
    [`response has ${fieldPath}`]: (r) => {
      try {
        const body = JSON.parse(r.body);
        const fields = fieldPath.split('.');
        let current = body;
        
        for (const field of fields) {
          if (current && current[field] !== undefined) {
            current = current[field];
          } else {
            return false;
          }
        }
        
        return true;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!ok && errorCounter) {
    errorCounter.add(1);
  }
  
  return ok;
}

/**
 * Genera una fecha futura para citas médicas
 */
export function generateFutureDate(daysAhead = 7) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
}

/**
 * Genera una hora válida para citas (formato HH:MM)
 */
export function generateAppointmentTime() {
  const hours = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
                 '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
  return hours[Math.floor(Math.random() * hours.length)];
}

/**
 * Configuración base de headers para requests JSON
 */
export const JSON_HEADERS = {
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Crea headers con autenticación JWT
 */
export function authHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
}

/**
 * Thresholds comunes para todas las pruebas
 */
export const commonThresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<800'],
  http_req_duration: ['p(99)<1500'],
};

/**
 * Extrae el token JWT de una respuesta del backend
 * El backend devuelve: { success: true, data: { token: "...", user: {...} } }
 */
export function extractToken(loginResponse) {
  try {
    const body = JSON.parse(loginResponse.body);
    // El backend devuelve el token en data.token
    return body.data?.token || body.token || null;
  } catch (e) {
    return null;
  }
}

/**
 * Extrae el ID del usuario de una respuesta del backend
 */
export function extractUserId(response) {
  try {
    const body = JSON.parse(response.body);
    return body.data?.user?.id || body.user?.id || body.id || null;
  } catch (e) {
    return null;
  }
}

/**
 * Extrae datos de una respuesta del backend
 * El backend suele devolver: { success: true, data: {...} } o directamente el objeto
 */
export function extractData(response, field = null) {
  try {
    const body = JSON.parse(response.body);
    const data = body.data || body;
    
    if (field) {
      return data[field];
    }
    
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Pausa aleatoria entre requests para simular comportamiento humano
 */
export function randomSleep(min = 0.5, max = 2) {
  const sleepTime = min + Math.random() * (max - min);
  return sleepTime;
}
