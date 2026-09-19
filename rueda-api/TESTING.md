# Guía de pruebas — rueda-api

Instructivo para escribir y ejecutar pruebas en este backend. Runner: **Vitest**
(config unitaria `vitest.config.ts`, config e2e `vitest.config.e2e.ts`).

## Estado actual

- **~82 pruebas unitarias** (caja blanca): funciones de dominio en
  `domain/services/` y casos de uso en `application/use-cases/` con
  *test-doubles*.
- **1 prueba de integración** (caja negra): `test/app.e2e-spec.ts`, arranque de
  la aplicación por HTTP. Es mínima (liveness) y conviene ampliarla.
- La **transición de estado** existe como pruebas unitarias de dominio
  (estado de mesa, ciclo de la reunión), no como una suite formal.

El hueco real del proyecto es la **cobertura de integración**: prácticamente
todos los endpoints están sin prueba contra una base de datos real.

## Preparación

```bash
cd rueda-api
bun install        # una sola vez
```

Convención: cada prueba se llama `<archivo>.spec.ts` y vive junto al código que
prueba. Los imports llevan extensión `.js` (ESM nodenext).

---

## 1. Prueba unitaria (caja blanca)

Aísla una unidad —una función o un caso de uso— y verifica entrada → salida,
sin base de datos ni red. Las dependencias externas se reemplazan por
*test-doubles* (fakes en memoria).

Ubicación: dominio puro en `domain/services/`, casos de uso en
`application/use-cases/`.

### Dominio puro

```ts
import { describe, expect, it } from 'vitest';
import { computeTableState } from './table-state.js';

describe('computeTableState', () => {
  it('lee una mesa vacía como libre', () => {
    expect(computeTableState([], 0)).toBe('LIBRE');
  });
});
```

### Caso de uso con fake

Cada contexto tiene un `test-doubles.ts` con fakes que implementan los puertos.
Se inyecta el fake, se ejecuta el caso de uso y se verifica el resultado y lo
que el fake registró.

```ts
const repo = new FakeAttendanceRepository();
const useCase = new RecordAttendanceUseCase(repo, new FixedClock(), ENV);

await useCase.execute({ /* ... */ });

expect(repo.guardadas).toHaveLength(1); // efecto observable
```

### Ejecutar

```bash
bun run test                          # todas
bunx vitest run src/contexts/mesas    # un contexto
bunx vitest                           # modo watch
```

---

## 2. Prueba de integración (caja negra, contra la app real)

Levanta el `AppModule` completo y golpea los endpoints por HTTP con base de
datos real. Comprueba que controllers + casos de uso + Prisma + guards funcionen
juntos. Es lo que falta y conviene ampliar.

Ubicación: `test/`, archivos `*.e2e-spec.ts`.

### Requisitos

Una base de datos de prueba y las variables de entorno:

```bash
DATABASE_URL="postgresql://usuario:pass@localhost:5432/rueda_test" \
JWT_SECRET="un-secreto-de-desarrollo-suficientemente-largo" \
NODE_ENV=test \
bunx vitest run --config vitest.config.e2e.ts
```

### Escribir una

```ts
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('CompaniesController (e2e)', () => {
  let app;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/companies exige autenticación', () =>
    request(app.getHttpServer()).get('/api/v1/companies').expect(401));

  it('acepta un token válido', () =>
    request(app.getHttpServer())
      .get('/api/v1/companies')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200));
});
```

### Pasos

1. Crear una base de datos vacía.
2. Aplicar las migraciones: `bunx prisma migrate deploy`.
3. Sembrar datos mínimos, u obtener un token a través del endpoint de login.
4. Escribir un `.e2e-spec.ts` por controller.
5. Ejecutar el comando de arriba. Cada prueba debe limpiar lo que escribe.

---

## 3. Prueba de transición de estado

Verifica la máquina de estados de una entidad: qué transiciones son válidas y
cuáles deben rechazarse. La reunión va `PROGRAMADA → EN_CURSO → FINALIZADA`, con
`CANCELADA` como salida, y transiciones prohibidas (de `FINALIZADA` no se sale).

Ubicación: unitaria en `domain/services/` si se prueba la función de decisión;
integración en `test/` si se prueba el endpoint que cambia el estado.

### La tabla de transiciones

Se lista cada par origen → destino y su resultado esperado. Los pares inválidos
suelen ser los que revelan errores, así que se incluyen todos.

```ts
import { describe, expect, it } from 'vitest';

const validas   = [['PROGRAMADA', 'EN_CURSO'], ['EN_CURSO', 'FINALIZADA'], ['PROGRAMADA', 'CANCELADA']];
const invalidas = [['FINALIZADA', 'EN_CURSO'], ['CANCELADA', 'FINALIZADA'], ['FINALIZADA', 'PROGRAMADA']];

describe('transición de estado de reunión', () => {
  it.each(validas)('permite %s → %s', (desde, hacia) => {
    expect(puedeTransicionar(desde, hacia)).toBe(true);
  });

  it.each(invalidas)('rechaza %s → %s', (desde, hacia) => {
    expect(puedeTransicionar(desde, hacia)).toBe(false);
  });
});
```

### Método

1. Dibujar el diagrama de estados de la entidad.
2. Armar una tabla con todos los pares posibles, incluidos los inválidos.
3. Un `it.each` para las transiciones válidas y otro para las inválidas.
4. Si el cambio de estado dispara efectos (notificar, liberar una mesa),
   verificar esos efectos con un fake: ahí se cruza con la prueba unitaria de
   caso de uso.

Se ejecuta como las unitarias (`bun run test`), o como e2e si se escribe a nivel
de endpoint.
