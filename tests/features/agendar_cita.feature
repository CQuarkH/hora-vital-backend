Feature: Agendar cita
  Como paciente autenticado
  Quiero poder reservar una cita médica
  Para asegurarme de tener una atención en una fecha y hora disponible

  Background:
    Given que el paciente está autenticado en la aplicación
    And existen franjas horarias disponibles publicadas en el sistema

  @positivo
  Scenario: Agendar una cita exitosamente
    When el paciente accede al módulo "Agendar cita"
    And selecciona una franja horaria disponible
    And completa todos los datos obligatorios (nombre, RUT, email)
    And confirma y envía los datos
    Then el sistema guarda la cita
    And el sistema envía un correo de confirmación al paciente
    And el sistema marca la franja horaria como ocupada

  @negativo
  Scenario: Intentar agendar sin completar datos obligatorios
    When el paciente accede al módulo "Agendar cita"
    And selecciona una franja horaria disponible
    And no completa un dato obligatorio
    And confirma y envía los datos
    Then el sistema muestra un mensaje de error indicando datos faltantes
    And no se registra la cita
    And la franja horaria sigue disponible

  @frontera
  Scenario: Intentar agendar la última franja horaria disponible
    Given que solo queda una franja horaria disponible
    When el paciente accede al módulo "Agendar cita"
    And selecciona la última franja horaria
    And completa todos los datos obligatorios
    And confirma y envía los datos
    Then el sistema guarda la cita
    And el sistema envía un correo de confirmación al paciente
    And no quedan más franjas horarias disponibles
