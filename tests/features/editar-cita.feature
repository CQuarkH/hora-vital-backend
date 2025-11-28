Feature: Editar cita médica
  Como paciente registrado
  Quiero poder modificar los detalles de mi cita médica
  Para ajustar la información según mis necesidades

  Background:
    Given que la base de datos está limpia
    And que soy un paciente autenticado
    And que tengo una cita programada

  @positivo
  Scenario: Editar notas de la cita exitosamente
    Given que tengo una cita programada con notas "Consulta general"
    When actualizo las notas a "Consulta de control post operatorio"
    Then la cita debe actualizarse exitosamente
    And las nuevas notas deben guardarse correctamente

  @positivo
  Scenario: Reagendar cita a nueva fecha disponible
    Given que tengo una cita programada para el "2024-12-15"
    And existen horarios disponibles para el "2024-12-20"
    When cambio la fecha de mi cita al "2024-12-20" a las "14:00"
    Then la cita debe reagendarse exitosamente
    And el horario anterior debe quedar disponible
    And el nuevo horario debe marcarse como ocupado

  @positivo
  Scenario: Cambiar especialidad y médico de la cita
    Given que tengo una cita con "Dr. García" en "Cardiología"
    And existe disponibilidad con "Dr. López" en "Dermatología"
    When cambio la cita a "Dr. López" en "Dermatología"
    Then la cita debe actualizarse con el nuevo médico y especialidad

  @negativo
  Scenario: Intentar reagendar a horario no disponible
    Given que tengo una cita programada para el "2024-12-15"
    When intento cambiar la fecha al "2024-12-20" a las "10:00" pero ese horario está ocupado
    Then el sistema debe mostrar error de horario no disponible
    And mi cita original debe permanecer sin cambios

  @negativo
  Scenario: Intentar editar cita ya completada
    Given que tengo una cita con estado "COMPLETED"
    When intento modificar las notas de esa cita
    Then el sistema debe mostrar error indicando que no se puede editar
    And la cita debe permanecer sin cambios

  @negativo
  Scenario: Intentar editar cita de otro paciente
    Given que existe una cita de otro paciente
    When intento modificar esa cita
    Then el sistema debe denegar el acceso
    And debo recibir error de autorización

  @frontera
  Scenario: Reagendar cita con menos de 24 horas de anticipación
    Given que tengo una cita programada para mañana
    When intento reagendar esa cita
    Then el sistema debe mostrar advertencia sobre el tiempo límite
    And debe requerir confirmación adicional

  @frontera
  Scenario: Editar cita múltiples veces en corto período
    Given que tengo una cita programada
    When edito la misma cita 3 veces en 10 minutos
    Then todas las modificaciones deben aplicarse correctamente
    And el historial de cambios debe registrarse