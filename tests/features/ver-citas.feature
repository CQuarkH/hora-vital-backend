Feature: Ver citas médicas
  Como paciente registrado
  Quiero poder consultar mis citas médicas
  Para poder gestionar mi agenda médica y estar informado

  Background:
    Given que la base de datos está limpia
    And que soy un paciente autenticado con nombre "Carlos Pérez"

  @positivo
  Scenario: Listar todas mis citas programadas
    Given que tengo citas programadas para diferentes fechas
    When consulto mis citas médicas
    Then debo ver una lista con todas mis citas
    And cada cita debe mostrar fecha, hora, médico y especialidad

  @positivo
  Scenario: Ver detalles de una cita específica
    Given que tengo una cita programada para el "2024-12-15" a las "10:00" con "Dr. García"
    When consulto los detalles de esa cita
    Then debo ver información completa incluyendo fecha, hora, médico, especialidad y notas

  @positivo
  Scenario: Filtrar citas por estado
    Given que tengo citas en diferentes estados (programadas, completadas, canceladas)
    When filtro mis citas por estado "SCHEDULED"
    Then debo ver solo las citas programadas

  @positivo
  Scenario: Filtrar citas por rango de fechas
    Given que tengo citas en diferentes fechas
    When filtro mis citas entre "2024-12-01" y "2024-12-31"
    Then debo ver solo las citas dentro de ese rango

  @positivo
  Scenario: Ver historial de citas completadas
    Given que tengo citas completadas en el pasado
    When consulto mi historial de citas
    Then debo ver las citas pasadas ordenadas por fecha descendente

  @negativo
  Scenario: Paciente sin citas programadas
    Given que no tengo citas programadas
    When consulto mis citas médicas
    Then debo ver un mensaje indicando que no hay citas
    And la lista debe estar vacía

  @negativo
  Scenario: Intentar ver citas de otro paciente
    Given que existe otro paciente con citas programadas
    When intento acceder a sus citas médicas
    Then el sistema debe denegar el acceso
    And debo recibir error de autorización

  @frontera
  Scenario: Ver citas cuando hay muchas registradas (paginación)
    Given que tengo más de 50 citas registradas
    When consulto mis citas médicas
    Then debo ver las primeras 20 citas
    And debe existir opción para ver más citas