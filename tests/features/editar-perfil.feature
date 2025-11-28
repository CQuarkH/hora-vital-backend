Feature: Editar perfil de usuario
  Como usuario registrado del sistema
  Quiero poder editar mi información personal
  Para mantener mis datos actualizados

  Background:
    Given que la base de datos está limpia
    And que soy un usuario autenticado con email "usuario.test@example.com"

  @positivo
  Scenario: Editar perfil exitosamente con datos válidos
    When actualizo mi perfil con nombre "Juan Carlos Mendoza", email "juan.mendoza@test.com" y teléfono "+56987654321"
    Then el perfil debe actualizarse exitosamente
    And el sistema debe mostrar los datos actualizados

  @positivo
  Scenario: Cambiar solo el nombre
    When actualizo únicamente mi nombre a "María Fernanda"
    Then el perfil debe actualizarse exitosamente
    And los demás datos deben permanecer sin cambios

  @positivo
  Scenario: Cambiar solo el email
    When actualizo únicamente mi email a "nuevo.email@test.com"
    Then el perfil debe actualizarse exitosamente
    And los demás datos deben permanecer sin cambios

  @negativo
  Scenario: Intentar editar con email ya existente
    Given que existe otro usuario con email "existente@test.com"
    When intento actualizar mi email a "existente@test.com"
    Then el sistema debe mostrar error de email duplicado
    And mi perfil no debe ser actualizado

  @negativo
  Scenario: Intentar editar con formato de email inválido
    When intento actualizar mi email a "email-invalido"
    Then el sistema debe mostrar error de formato de email
    And mi perfil no debe ser actualizado

  @negativo
  Scenario: Intentar editar con teléfono inválido
    When intento actualizar mi teléfono a "123abc"
    Then el sistema debe mostrar error de formato de teléfono
    And mi perfil no debe ser actualizado

  @frontera
  Scenario: Editar perfil con nombre muy largo
    When intento actualizar mi nombre a un texto de 300 caracteres
    Then el sistema debe mostrar error de longitud de nombre
    And mi perfil no debe ser actualizado

  @frontera
  Scenario: Editar perfil con datos mínimos válidos
    When actualizo mi nombre a "A" y email a "a@b.co"
    Then el perfil debe actualizarse exitosamente
    And el sistema debe mostrar los datos actualizados