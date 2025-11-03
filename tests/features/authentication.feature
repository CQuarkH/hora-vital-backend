Feature: Autenticación de usuarios
  Como usuario del sistema
  Quiero registrarme, iniciar sesión y editar mi perfil
  Para acceder a funcionalidades que requieren autenticación

  Background:
    Given la base de datos está limpia

  Scenario: Registro exitoso de nuevo paciente
    When me registro con nombre "Juan Pérez", email "juan.test@example.com", password "P@ssW0rd!", rut "12345678-9" y teléfono "+56911111111"
    Then el registro debe ser exitoso y debo recibir un token

  Scenario: Login con credenciales válidas
    Given existe un usuario registrado con nombre "María Test", email "maria.test@example.com" y password "Secret123!"
    When intento iniciar sesión con email "maria.test@example.com" y password "Secret123!"
    Then el login debe devolver un token y los datos del usuario con email "maria.test@example.com"

  Scenario: Edición de perfil de usuario
    Given que estoy autenticado como un usuario existente con nombre "Pablo LN", email "pablo.test@example.com" y password "Pwd321!A"
    When actualizo mi perfil a nombre "Pablo Nuevo", email "pablo.new@example.com" y teléfono "+56922222222"
    Then el perfil debe haberse actualizado con nombre "Pablo Nuevo" y email "pablo.new@example.com"
