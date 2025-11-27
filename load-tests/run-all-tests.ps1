# Script completo para ejecutar pruebas de carga con entorno aislado
# Uso: .\run-all-tests.ps1

Write-Host "`n=== Setup de Pruebas de Carga (Entorno Aislado) ===" -ForegroundColor Cyan
Write-Host "Este script levantara un entorno Docker dedicado para pruebas (DB + Backend + k6)`n" -ForegroundColor Yellow

# Paso 0: Cargar variables de entorno (Grafana Cloud)
if (Test-Path .env.k6) {
    Write-Host "Cargando configuración de Grafana Cloud desde .env.k6..." -ForegroundColor Cyan
    Get-Content .env.k6 | Where-Object { $_ -notmatch '^#' -and $_.Trim() -ne "" } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        if ($name -and $value) {
            [Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim())
        }
    }
    
    if ($env:K6_OUT -match "prometheus") {
        Write-Host "Modo: Grafana Cloud activado ☁️" -ForegroundColor Magenta
    }
} else {
    Write-Host "No se encontró .env.k6, ejecutando en modo local solamente." -ForegroundColor Yellow
}

# Paso 1: Levantar entorno de pruebas
Write-Host "Paso 1: Levantando entorno de pruebas (DB + Backend)..." -ForegroundColor Green
try {
    docker-compose -f docker-compose.load-tests.yml up -d db_test backend_test
    
    Write-Host "Esperando a que el backend este listo (20s)..." -ForegroundColor Gray
    Start-Sleep -Seconds 20
} catch {
    Write-Host "Error levantando entorno: $_" -ForegroundColor Red
    exit 1
}

# Paso 2: Verificar health
Write-Host "Paso 2: Verificando backend de pruebas..." -ForegroundColor Green
try {
    # El backend de pruebas corre en el puerto 4001
    $response = Invoke-WebRequest -Uri "http://localhost:4001/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "Backend de pruebas OK`n" -ForegroundColor Green
    } else {
        throw "Status code $($response.StatusCode)"
    }
} catch {
    Write-Host "Backend no responde en puerto 4001. Verifica logs: docker logs k6_backend_test" -ForegroundColor Red
    # No salimos, intentamos seguir por si acaso es solo timeout
}

# Paso 3: Ejecutar Seed via k6
Write-Host "Paso 3: Ejecutando Seed de datos via API..." -ForegroundColor Green
try {
    docker-compose -f docker-compose.load-tests.yml run --rm k6 run /scripts/seed-data.js
    if ($LASTEXITCODE -ne 0) { throw "Error en seed" }
    
    # Actualizar roles directamente en DB ya que el API solo crea PATIENT
    Write-Host "Actualizando roles de usuarios..." -ForegroundColor Cyan
    docker exec k6_db_test psql -U postgres -d hora_vital_test -c 'UPDATE \"User\" SET role = ''ADMIN'' WHERE email = ''admin@horavital.cl'';'
    docker exec k6_db_test psql -U postgres -d hora_vital_test -c 'UPDATE \"User\" SET role = ''DOCTOR'' WHERE email = ''doctor@horavital.cl'';'
    
    Write-Host "Datos de prueba creados exitosamente`n" -ForegroundColor Green
} catch {
    Write-Host "Error creando datos: $_" -ForegroundColor Red
    Write-Host "Continuando..." -ForegroundColor Yellow
}

# Paso 4: Ejecutar Pruebas
Write-Host "Paso 4: Ejecutando pruebas de carga..." -ForegroundColor Green

function Invoke-LoadTest {
    param([string]$Name, [string]$Script)
    Write-Host "=== $Name ===" -ForegroundColor Cyan
    
    # Ejecutar k6 usando el servicio definido en docker-compose
    docker-compose -f docker-compose.load-tests.yml run --rm k6 run /scripts/$Script
    
    Start-Sleep -Seconds 2
}

Invoke-LoadTest "Autenticacion" "auth-load-test.js"
Invoke-LoadTest "Citas" "appointments-load-test.js"
Invoke-LoadTest "Admin" "admin-load-test.js"
Invoke-LoadTest "End-to-End" "end-to-end-load-test.js"

Write-Host "`n=== Pruebas completadas! ===" -ForegroundColor Green
Write-Host "Para detener el entorno de pruebas ejecuta:" -ForegroundColor Yellow
Write-Host "docker-compose -f docker-compose.load-tests.yml down -v" -ForegroundColor White
