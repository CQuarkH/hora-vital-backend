# Informe de Pruebas de Carga y Estrés - Hora Vital

**Fecha del Informe:** 23 de Noviembre, 2025
**Herramienta de Prueba:** k6
**Entorno:** Local (Docker) con monitoreo en Grafana Cloud
**Dashboard Grafana:** [Ver Dashboard](#dashboard-grafana)

---

## 1. Descripción del Escenario de Carga

Se realizaron pruebas exhaustivas sobre las APIs críticas del sistema "Hora Vital" para evaluar su comportamiento bajo carga y estrés.

### APIs Incluidas
*   **Autenticación**: Registro (`/register`) y Login (`/login`).
*   **Citas (Appointments)**: Disponibilidad, Creación, Cancelación, Listado.
*   **Administración**: Gestión de usuarios y horarios.
*   **End-to-End (E2E)**: Flujo completo de usuario (Registro -> Login -> Agendar -> Cancelar).

### Perfil de Carga General
*   **Duración Total de Pruebas**: ~30 minutos (acumulado).
*   **Total de Iteraciones Completadas**: ~26,253 flujos de negocio.
*   **Total de Peticiones HTTP**: ~78,800 requests.
*   **Usuarios Virtuales (VUs)**: Varió entre 110 y 280 VUs concurrentes dependiendo del escenario.

---

## 2. Resumen de Resultados

| Prueba | VUs Max | Duración | Throughput (req/s) | p95 Latencia (HTTP) | Tasa de Error | Resultado |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Autenticación** | 200 | 7m 00s | ~21.8 | 10.93s ❌ | 0.04% ✅ | **FALLIDO** |
| **Citas** | 280 | 10m 00s | ~62.4 | 7.20s ❌ | 0.01% ✅ | **FALLIDO** |
| **Admin** | 110 | 8m 02s | ~38.7 | 3.35s ❌ | 0.01% ✅ | **PARCIAL** |
| **E2E** | 150 | 7m 01s | ~32.0 | 6.06s ❌ | 0.05% ✅ | **FALLIDO** |

---

## 3. Análisis Detallado

### 3.1 Autenticación
*   **Escenario**: Load (50 VUs) + Stress (150 VUs).
*   **Volumen**: 4,589 iteraciones completadas.
*   **Métricas Clave**:
    *   `auth_login_duration` (p95): **3.92s** (Objetivo: < 500ms).
    *   `auth_register_duration` (p95): **11.49s** (Objetivo: < 1500ms).
    *   `http_req_duration` (p95): **10.93s**.
*   **Discusión**: El registro de usuarios es el cuello de botella más crítico. La latencia es extremadamente alta, lo que sugiere que el hashing de contraseñas o la escritura en DB está bloqueando el event loop.

### 3.2 Citas (Appointments)
*   **Escenario**: Load (80 VUs) + Stress (200 VUs).
*   **Volumen**: 12,511 iteraciones completadas.
*   **Métricas Clave**:
    *   `appointment_availability_duration` (p95): **4.95s** (Aceptable).
    *   `appointment_list_duration` (p95): **9.27s** (Muy lento).
    *   `http_req_duration` (p95): **7.20s**.
*   **Discusión**: Aunque el throughput es alto (~62 req/s), la latencia general es inaceptable. Listar citas toma casi 10 segundos bajo carga máxima.

### 3.3 Administración
*   **Escenario**: Load (30 VUs) + Stress (80 VUs).
*   **Volumen**: 4,661 iteraciones completadas.
*   **Métricas Clave**:
    *   `admin_user_creation_duration` (p95): **4.26s**.
    *   `http_req_duration` (p95): **3.35s**.
*   **Discusión**: Mejor rendimiento relativo que los endpoints públicos, pero la creación de usuarios sigue siendo lenta.

### 3.4 End-to-End (E2E)
*   **Escenario**: Load (50 VUs) + Stress (100 VUs).
*   **Volumen**: 4,492 iteraciones completadas.
*   **Métricas Clave**:
    *   `e2e_register_duration` (p95): **7.32s**.
    *   `e2e_login_duration` (p95): **2.54s**.
    *   `e2e_successful_flows`: **0** (El contador de éxito estricto no registró flujos completos perfectos, aunque las comprobaciones individuales pasaron).
*   **Discusión**: La experiencia de usuario completa es muy lenta. Un usuario tardaría más de 10 segundos solo en registrarse y loguearse.

---

## 4. Dashboard Grafana

A continuación se muestra una captura del dashboard de Grafana con las métricas en tiempo real durante la ejecución de las pruebas.

![Dashboard Grafana Load Tests](Hora%20Vital-1763943636064.png)

*Nota: La imagen muestra las métricas clave capturadas durante la ejecución de las pruebas.*

---

## 5. Discusión y Conclusiones

### ¿Cumple con objetivos de rendimiento?
**NO**. El sistema es estable (no crashea, tasa de errores < 0.05%) pero **extremadamente lento** bajo carga. Los tiempos de respuesta exceden por mucho los umbrales definidos (p95 > 2s en casi todos los casos).

### Comportamiento bajo estrés
El sistema demuestra robustez en cuanto a disponibilidad. Incluso con 280 usuarios concurrentes, la tasa de errores HTTP 500/Timeouts se mantuvo por debajo del 0.05%. Esto indica que la arquitectura maneja bien la concurrencia a nivel de conexiones, pero el procesamiento de cada petición es costoso.

### Bottlenecks Identificados
1.  **Escritura de Usuarios**: Tanto en registro público como admin, crear un usuario toma entre 4s y 11s.
    *   *Causa probable*: `bcrypt` con work factor muy alto o bloqueos de base de datos.
2.  **Lectura de Listados**: Listar citas toma ~9s.
    *   *Causa probable*: Falta de índices en la base de datos o consultas N+1 en el ORM.

### Recomendaciones
1.  **Optimizar Hashing**: Reducir el costo de bcrypt o moverlo a un worker thread.
2.  **Base de Datos**: Revisar índices en tablas `User` y `Appointment`.
3.  **Caching**: Implementar Redis para endpoints de lectura (`/availability`, `/appointments`).

---

## 6. Criterios de Validación

*   [x] Todas las APIs relevantes probadas.
*   [x] Evidencia de ejecución (Logs k6 y Grafana).
*   [ ] Cumplimiento de KPIs de latencia (Fallido).
*   [x] Análisis de degradación (Documentado).
