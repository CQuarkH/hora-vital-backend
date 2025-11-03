# Pruebas de Software: Hora Vital

### Integrantes

- Herbert Garrido
- Benjamin San Martin
- Cristóbal Pavez
- Elías Currihuil

## Decisión Arquitectónica: Avance 2 - Sistema de Notificaciones Interno

### Contexto

Para el "Avance 2" del proyecto, se implementó un sistema de notificaciones interno en lugar de depender completamente del envío de emails. Esto permite validar la lógica de negocio de manera independiente de servicios externos.

### Decisión

- **Implementación**: Sistema de notificaciones en base de datos que funciona en paralelo al email
- **Modo Test**: En entorno de pruebas (`NODE_ENV=test`), se omite el envío de emails pero se mantienen todas las notificaciones en BD
- **Validación**: Las pruebas validan que las notificaciones se creen correctamente en la base de datos

### Ejecución

Para ejecutar Hora-Vital-Backend usando docker:

```
npm run docker:up
```

Para ejecutar SonarQube usando docker:

```
npm run sonar:up
```

### Testing

Para ejecutar los tests, primero es necesario instalar las dependencias con:

```
npm install
```

Luego, los tests de integración se ejecutan de la siguiente manera:

```
npm run test:it
```

Luego, los tests de BDD se ejecutan de la siguiente manera:

```
npm test
```

Luego, los tests unitarios se ejecutan de la siguiente manera:

```
npm run test:unit
```

