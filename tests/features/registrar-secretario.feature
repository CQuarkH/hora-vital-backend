Feature: Registrar secretarios (administrador)
  Como administrador del sistema
  Quiero poder registrar nuevos secretarios
  Para que puedan gestionar pacientes y citas médicas

  Background:
    Given que la base de datos está limpia
    And que soy un administrador autenticado

  @positivo
  Scenario: Registrar secretario exitosamente con datos válidos
    When registro un secretario con nombre "Ana Martínez", email "ana.martinez@hospital.com", RUT "87654321-0" y teléfono "+56987654321"
    Then el secretario debe registrarse exitosamente
    And debe generarse un usuario con rol "SECRETARY"
    And debe enviarse email de bienvenida con credenciales temporales

  @positivo
  Scenario: Registrar múltiples secretarios
    When registro el secretario "Pedro López" con email "pedro.lopez@hospital.com"
    And registro el secretario "María Silva" con email "maria.silva@hospital.com"
    Then ambos secretarios deben registrarse exitosamente
    And cada uno debe tener credenciales únicas

  @positivo
  Scenario: Secretario registrado puede iniciar sesión
    Given que registré un secretario "Carlos Pérez" con email "carlos.perez@hospital.com"
    When el secretario intenta iniciar sesión con sus credenciales temporales
    Then debe poder acceder al sistema
    And debe tener permisos de secretario

  @negativo
  Scenario: Intentar registrar secretario con email duplicado
    Given que existe un usuario con email "existente@hospital.com"
    When intento registrar un secretario con email "existente@hospital.com"
    Then el sistema debe mostrar error de email duplicado
    And el secretario no debe ser registrado

  @negativo
  Scenario: Intentar registrar con datos incompletos
    When intento registrar un secretario sin proporcionar el email
    Then el sistema debe mostrar error de datos faltantes
    And el secretario no debe ser registrado

  @negativo
  Scenario: Intentar registrar con RUT inválido
    When intento registrar un secretario con RUT "123456789"
    Then el sistema debe mostrar error de formato de RUT
    And el secretario no debe ser registrado

  @negativo
  Scenario: Usuario no administrador intenta registrar secretario
    Given que soy un médico autenticado
    When intento registrar un secretario
    Then el sistema debe denegar el acceso
    And debo recibir error de autorización

  @frontera
  Scenario: Registrar secretario con nombre muy largo
    When intento registrar un secretario con nombre de 300 caracteres
    Then el sistema debe mostrar error de longitud de nombre
    And el secretario no debe ser registrado

  @frontera
  Scenario: Registrar secretario con email al límite de caracteres válidos
    When registro un secretario con email de 254 caracteres válidos
    Then el secretario debe registrarse exitosamente
    And debe poder recibir emails de notificación