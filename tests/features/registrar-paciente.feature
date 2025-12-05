Feature: Registrar paciente
  Como nuevo usuario
  Quiero poder registrarme como paciente
  Para acceder a los servicios médicos del sistema

  Background:
    Given que la base de datos está limpia

  @positivo
  Scenario: Registro exitoso de paciente con datos completos
    When me registro como paciente con nombre "Juan Carlos", apellido "Pérez Mendoza", email "juan.perez@test.com", RUT "12345678-9", teléfono "+56987654321" y contraseña "SecurePass123!"
    Then el registro debe ser exitoso
    And debo recibir un token de autenticación
    And mi rol debe ser "PATIENT"
    And debo recibir email de bienvenida

  @positivo
  Scenario: Registro con datos mínimos requeridos
    When me registro como paciente con nombre "Ana", apellido "García", email "ana@test.com", RUT "98765432-1" y contraseña "Pass1234!"
    Then el registro debe ser exitoso
    And los campos opcionales deben quedar vacíos

  @negativo
  Scenario: Intentar registro con email ya existente
    Given que existe un paciente registrado con email "existente@test.com"
    When intento registrarme con email "existente@test.com"
    Then el sistema debe mostrar error de email duplicado
    And no debo ser registrado

  @negativo
  Scenario: Intentar registro con RUT ya existente
    Given que existe un paciente registrado con RUT "11111111-1"
    When intento registrarme con RUT "11111111-1"
    Then el sistema debe mostrar error de RUT duplicado
    And no debo ser registrado

  @negativo
  Scenario: Intentar registro con contraseña débil
    When intento registrarme con contraseña "123456"
    Then el sistema debe mostrar error de seguridad de contraseña
    And no debo ser registrado

  @negativo
  Scenario: Intentar registro con email inválido
    When intento registrarme con email "email-invalido"
    Then el sistema debe mostrar error de formato de email
    And no debo ser registrado

  @negativo
  Scenario: Intentar registro con RUT inválido
    When intento registrarme con RUT "123456789"
    Then el sistema debe mostrar error de formato de RUT
    And no debo ser registrado

  @negativo
  Scenario: Intentar registro sin datos obligatorios
    When intento registrarme sin proporcionar nombre
    Then el sistema debe mostrar error de campos requeridos
    And no debo ser registrado

  @frontera
  Scenario: Registro con nombre muy largo
    When intento registrarme con nombre de 300 caracteres
    Then el sistema debe mostrar error de longitud
    And no debo ser registrado

  @frontera
  Scenario: Registro con teléfono internacional válido
    When me registro con teléfono "+1234567890"
    Then el registro debe ser exitoso
    And el teléfono debe almacenarse correctamente