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

  @negativo
  Scenario: Intentar agendar en horario ya ocupado
    Given que existe una franja horaria ocupada
    When el paciente intenta agendar en esa franja horaria
    Then el sistema debe mostrar error de horario no disponible
    And no se debe registrar la cita

  @negativo
  Scenario: Intentar agendar con email inválido
    When el paciente accede al módulo "Agendar cita"
    And selecciona una franja horaria disponible
    And ingresa un email con formato inválido "email-malo"
    And confirma y envía los datos
    Then el sistema debe mostrar error de formato de email
    And no se registra la cita

  @negativo
  Scenario: Intentar agendar con RUT inválido
    When el paciente accede al módulo "Agendar cita"
    And selecciona una franja horaria disponible
    And ingresa un RUT inválido "123456789"
    And confirma y envía los datos
    Then el sistema debe mostrar error de formato de RUT
    And no se registra la cita

  @positivo
  Scenario: Agendar cita con notas adicionales
    When el paciente accede al módulo "Agendar cita"
    And selecciona una franja horaria disponible
    And completa todos los datos obligatorios
    And agrega notas "Consulta de control por dolor de cabeza"
    And confirma y envía los datos
    Then el sistema guarda la cita con las notas adicionales
    And el sistema envía un correo de confirmación al paciente

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

  @frontera
  Scenario: Agendar múltiples citas simultáneamente (concurrencia)
    Given que dos pacientes intentan agendar la misma franja horaria al mismo tiempo
    When ambos pacientes confirman sus datos simultáneamente
    Then solo uno debe lograr agendar la cita
    And el otro debe recibir error de horario no disponible
