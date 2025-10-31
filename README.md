# Pruebas de Software: Hora Vital

### Integrantes
- Herbert Garrido
- Benjamin San Martin
- Cristóbal Pavez
- Elías Currihuil

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
npx jest tests/unit --verbose
```
Por ultimo, las pruebas unitarias con reporte de cobertura se ejecutan de la siguiente manera:

```
npx jest tests/unit --coverage --coverageDirectory=coverage-unit
```
