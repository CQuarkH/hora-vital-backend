# Guía de Pruebas de Carga con k6 - Hora Vital Backend

Esta guía te llevará paso a paso para ejecutar pruebas de carga y estrés en tu backend usando Grafana k6.

---

## 📋 Contenido

1. [Qué incluye este proyecto](#qué-incluye-este-proyecto)
2. [Requisitos previos](#requisitos-previos)
3. [Paso 1: Preparar el entorno](#paso-1-preparar-el-entorno)
4. [Paso 2: Ejecutar pruebas locales](#paso-2-ejecutar-pruebas-locales)
5. [Paso 3: Configurar Grafana Cloud (Opcional)](#paso-3-configurar-grafana-cloud-opcional)
6. [Paso 4: Ejecutar con Grafana Cloud](#paso-4-ejecutar-con-grafana-cloud)
7. [Interpretación de resultados](#interpretación-de-resultados)

---

## 📊 Resultados Recientes (2025-11-23)

Se ha realizado una ronda completa de pruebas de carga. Los resultados detallados se encuentran en el [Informe de Pruebas de Carga](INFORME_PRUEBAS_CARGA.md).

**Resumen Rápido:**
*   **Estado**: ⚠️ Estable pero Lento.
*   **Errores**: Muy bajos (< 0.05%), el sistema no falla.
*   **Latencia**: Alta. El registro de usuarios toma ~11s y el login ~4s bajo carga.
*   **Recomendación**: Optimizar operaciones de escritura y hashing de contraseñas.

Para visualizar estos datos, consulta la [Guía de Dashboard Grafana](GUIA_GRAFANA.md).

---

## Qué incluye este proyecto

### Scripts de pruebas

| Script | Descripción | Endpoints probados |
|--------|-------------|-------------------|
| `auth-load-test.js` | Autenticación | `/api/auth/register`, `/api/auth/login` |
| `appointments-load-test.js` | Gestión de citas | `/api/appointments/*` (crear, listar, cancelar, disponibilidad) |
| `admin-load-test.js` | Administración | `/api/admin/*` (usuarios, horarios, citas) |
| `end-to-end-load-test.js` | Flujo completo | Registro → Login → Agendar → Cancelar |

### Tipos de escenarios

Cada script incluye dos escenarios:

- **load**: Carga sostenida para validar rendimiento normal
- **stress**: Carga extrema para encontrar el punto de quiebre
3. Verifica tu email
4. Se creará automáticamente un stack gratuito

### 3.2 Obtener credenciales de Prometheus

1. En el portal de Grafana Cloud, ve a **Connections** → **Add new connection**
2. Busca **"Prometheus"** y haz clic
3. Haz clic en **"Send metrics"** o **"Via Prometheus Remote Write"**
4. Copia los siguientes valores:

**Remote Write Endpoint:**
```
https://prometheus-prod-XX-prod-XX-XX.grafana.net/api/prom/push
```

**Username (Instance ID):**
```
123456
```

**Password (API Token):**
- Haz clic en "Generate now"
- Dale un nombre: `k6-load-tests`
- Rol: **MetricsPublisher**
- Copia el token (empieza con `glc_`)

### 3.3 Configurar archivo .env.k6

Copia el archivo de ejemplo:

```powershell
Copy-Item .env.k6.example .env.k6
```

Edita `.env.k6` con tus credenciales:

```bash
BASE_URL=http://localhost:4000
K6_OUT=experimental-prometheus-rw
K6_PROMETHEUS_RW_SERVER_URL=https://prometheus-prod-XX-prod-XX-XX.grafana.net/api/prom/push
K6_PROMETHEUS_RW_USERNAME=123456
K6_PROMETHEUS_RW_PASSWORD=glc_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 3.4 Ejecutar pruebas con Grafana Cloud

Una vez configurado `.env.k6`, simplemente ejecuta:

```powershell
.\run-all-tests.ps1
```

El script detectará automáticamente las credenciales y enviará las métricas a Grafana Cloud. Verás un mensaje confirmando que está en "Modo: Grafana Cloud".

### Verificar métricas en Grafana Cloud

1. Ve a tu stack en Grafana Cloud
2. Haz clic en **Explore**
3. Selecciona el data source **Prometheus**
4. Escribe en el query: `k6_http_reqs`
5. Haz clic en **Run query**

Deberías ver las métricas de k6.

### Crear dashboard

**Panel 1: Throughput**
```promql
sum(rate(k6_http_reqs[1m]))
```

**Panel 2: Latencia p95**
```promql
histogram_quantile(0.95, sum(rate(k6_http_req_duration_bucket[5m])) by (le))
```

**Panel 3: Error Rate**
```promql
sum(rate(k6_http_req_failed{expected_response="true"}[1m])) / sum(rate(k6_http_reqs[1m])) * 100
```

**Panel 4: Virtual Users**
```promql
k6_vus
```

---

## Interpretación de resultados

### Ejemplo de salida

```
     ✓ user registered successfully
     ✓ user logged in successfully

     checks.........................: 100.00% ✓ 8400      ✗ 0
     http_req_duration..............: avg=245ms    min=89ms   med=220ms  max=890ms  p(95)=456ms  p(99)=678ms
     http_req_failed................: 0.00%   ✓ 0         ✗ 8400
     http_reqs......................: 8400    200/s
     vus............................: 1       min=1       max=50
```

### Métricas clave

| Métrica | Qué significa | Objetivo |
|---------|---------------|----------|
| `http_req_failed` | % de requests fallidas | < 1% |
| `http_req_duration p(95)` | 95% de requests completan en este tiempo | < 800ms |
| `http_req_duration p(99)` | 99% de requests completan en este tiempo | < 1500ms |
| `http_reqs` | Requests por segundo (throughput) | > 50 req/s |
| `vus` | Usuarios virtuales activos | Variable |

### Señales de alerta

❌ **Error rate > 5%**: El sistema está fallando bajo carga  
❌ **p95 > 1500ms**: Latencia muy alta  
❌ **Throughput < 30 req/s**: Capacidad insuficiente  

✅ **Error rate < 1%**: Sistema estable  
✅ **p95 < 800ms**: Rendimiento excelente  
✅ **Throughput > 50 req/s**: Capacidad adecuada  

---
