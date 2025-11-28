Feature: Ver pacientes (médicos y secretarios)
  Como médico o secretario autorizado
  Quiero poder consultar la lista de pacientes
  Para gestionar la información de los pacientes asignados

  Background:
    Given que la base de datos está limpia

  @positivo
  Scenario: Médico consulta lista de sus pacientes
    Given que soy un médico autenticado con nombre "Dr. García"
    And que tengo pacientes asignados con citas
    When consulto la lista de mis pacientes
    Then debo ver todos los pacientes que han tenido citas conmigo
    And cada paciente debe mostrar nombre, RUT, email y teléfono

  @positivo
  Scenario: Secretario consulta lista de todos los pacientes
    Given que soy un secretario autenticado
    And que existen pacientes registrados en el sistema
    When consulto la lista de pacientes
    Then debo ver todos los pacientes del sistema
    And cada paciente debe mostrar información básica

  @positivo
  Scenario: Buscar paciente por nombre
    Given que soy un médico autenticado
    And que existe un paciente con nombre "Juan Pérez"
    When busco pacientes por nombre "Juan"
    Then debo ver los pacientes que coinciden con "Juan" en el nombre

  @positivo
  Scenario: Buscar paciente por RUT
    Given que soy un secretario autenticado
    And que existe un paciente con RUT "12345678-9"
    When busco paciente por RUT "12345678-9"
    Then debo encontrar el paciente correspondiente

  @positivo
  Scenario: Filtrar pacientes por estado activo/inactivo
    Given que soy un médico autenticado
    And que existen pacientes activos e inactivos
    When filtro pacientes por estado "activo"
    Then debo ver solo los pacientes activos

  @positivo
  Scenario: Ver detalles de un paciente específico
    Given que soy un médico autenticado
    And que existe un paciente "María González"
    When consulto los detalles de "María González"
    Then debo ver información completa del paciente
    And debe incluir historial de citas

  @negativo
  Scenario: Paciente intenta acceder a lista de pacientes
    Given que soy un paciente autenticado
    When intento consultar la lista de pacientes
    Then el sistema debe denegar el acceso
    And debo recibir error de autorización

  @negativo
  Scenario: Usuario no autenticado intenta ver pacientes
    Given que no estoy autenticado
    When intento consultar la lista de pacientes
    Then el sistema debe denegar el acceso
    And debo recibir error de autenticación

  @frontera
  Scenario: Consultar pacientes cuando hay muchos registrados (paginación)
    Given que soy un secretario autenticado
    And que existen más de 100 pacientes registrados
    When consulto la lista de pacientes
    Then debo ver los primeros 20 pacientes
    And debe existir opción para ver más pacientes

  @frontera
  Scenario: Médico solo ve pacientes con citas programadas o pasadas
    Given que soy un médico autenticado
    And que existen pacientes sin citas conmigo
    When consulto mi lista de pacientes
    Then no debo ver pacientes sin citas asociadas
    And solo debo ver pacientes que han tenido o tendrán citas conmigo