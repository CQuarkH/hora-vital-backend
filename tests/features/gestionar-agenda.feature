Feature: Gestionar agenda médica
  Como médico autenticado
  Quiero poder gestionar mi agenda de trabajo
  Para definir mi disponibilidad y horarios de atención

  Background:
    Given que la base de datos está limpia
    And que soy un médico autenticado con nombre "Dr. García"

  @positivo
  Scenario: Definir horarios de trabajo semanales
    When defino mi horario de lunes a viernes de "09:00" a "17:00"
    And establezco slots de 30 minutos
    Then mi agenda debe configurarse exitosamente
    And deben generarse slots disponibles para reservar

  @positivo
  Scenario: Modificar horario existente
    Given que tengo horarios definidos de "09:00" a "17:00"
    When cambio mi horario a "08:00" a "16:00"
    Then mi agenda debe actualizarse exitosamente
    And los nuevos horarios deben estar disponibles para reservas

  @positivo
  Scenario: Definir horarios específicos por día
    When defino horario personalizado para lunes de "08:00" a "12:00"
    And defino horario para martes de "14:00" a "18:00"
    Then cada día debe tener su horario específico
    And los slots deben generarse según cada configuración

  @positivo
  Scenario: Bloquear horarios para actividades no clínicas
    Given que tengo horarios definidos
    When bloqueo el horario del martes de "10:00" a "12:00" por "Reunión administrativa"
    Then ese período debe marcarse como no disponible
    And no debe aceptar reservas de pacientes en esas horas

  @positivo
  Scenario: Ver agenda completa con citas programadas
    Given que tengo horarios definidos y citas programadas
    When consulto mi agenda completa
    Then debo ver mi horario de trabajo
    And las citas programadas en sus respectivos slots
    And los períodos bloqueados claramente identificados

  @negativo
  Scenario: Intentar definir horarios con formato inválido
    When intento definir horario de "25:00" a "30:00"
    Then el sistema debe mostrar error de formato de hora
    And mi agenda no debe modificarse

  @negativo
  Scenario: Intentar modificar agenda con citas ya programadas
    Given que tengo citas programadas para mañana
    When intento cambiar mi horario eliminando las horas con citas
    Then el sistema debe mostrar advertencia sobre citas afectadas
    And debe requerir confirmación para proceder

  @frontera
  Scenario: Definir múltiples especialidades con horarios diferentes
    Given que tengo especialidades "Cardiología" y "Medicina General"
    When defino horarios específicos para cada especialidad
    Then cada especialidad debe tener su agenda independiente
    And los pacientes deben ver disponibilidad según especialidad seleccionada

  @frontera
  Scenario: Gestionar agenda durante días feriados
    Given que se aproxima un día feriado
    When marco ese día como no laborable
    Then no deben generarse slots para ese día
    And las citas existentes deben manejarse según políticas