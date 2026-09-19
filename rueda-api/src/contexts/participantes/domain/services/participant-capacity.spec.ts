import { describe, expect, it } from 'vitest';
import { ConflictError } from '../../../../shared/domain/errors/domain.error.js';
import {
  type CapacitySource,
  assertSlotAvailable,
  availableSlots,
  maxParticipantsOf,
} from './participant-capacity.js';

function buildCapacity(overrides: Partial<CapacitySource> = {}): CapacitySource {
  return {
    paidSlots: 4,
    usedSlots: 2,
    packageName: 'Paquete Oro',
    packageMaxParticipants: 6,
    packageIncludedCredentials: 4,
    eventMaxPerCompany: 5,
    ...overrides,
  };
}

describe('maxParticipantsOf', () => {
  it('lets the package decide, taking the most generous of its two limits', () => {
    expect(maxParticipantsOf(buildCapacity())).toBe(6);
  });

  it('uses the included credentials when they exceed the declared maximum', () => {
    expect(
      maxParticipantsOf(buildCapacity({ packageMaxParticipants: 2, packageIncludedCredentials: 8 })),
    ).toBe(8);
  });

  it('treats an absent package limit as zero rather than as unlimited', () => {
    expect(
      maxParticipantsOf(
        buildCapacity({ packageMaxParticipants: null, packageIncludedCredentials: null }),
      ),
    ).toBe(0);
  });

  it('falls back to the event limit for enrollments made before packages existed', () => {
    expect(
      maxParticipantsOf(
        buildCapacity({
          packageName: null,
          packageMaxParticipants: null,
          packageIncludedCredentials: null,
          eventMaxPerCompany: 7,
        }),
      ),
    ).toBe(7);
  });

  it('falls back to five when neither a package nor an event limit exists', () => {
    expect(
      maxParticipantsOf(
        buildCapacity({
          packageName: null,
          packageMaxParticipants: null,
          packageIncludedCredentials: null,
          eventMaxPerCompany: null,
        }),
      ),
    ).toBe(5);
  });
});

describe('availableSlots', () => {
  it('reports the paid slots not yet taken', () => {
    expect(availableSlots(buildCapacity({ paidSlots: 4, usedSlots: 2 }))).toBe(2);
  });

  it('never reports a negative number when more people were added than paid for', () => {
    expect(availableSlots(buildCapacity({ paidSlots: 2, usedSlots: 5 }))).toBe(0);
  });
});

describe('assertSlotAvailable', () => {
  it('passes when a paid slot is free and the ceiling is not reached', () => {
    expect(() => assertSlotAvailable(buildCapacity())).not.toThrow();
  });

  it('refuses when every paid slot is taken', () => {
    expect(() => assertSlotAvailable(buildCapacity({ paidSlots: 2, usedSlots: 2 }))).toThrow(
      new ConflictError('No hay cupos pagados disponibles. Solicita cupos adicionales.'),
    );
  });

  it('names the package when its ceiling is what blocks the addition', () => {
    const capacity = buildCapacity({
      paidSlots: 10,
      usedSlots: 6,
      packageMaxParticipants: 6,
      packageIncludedCredentials: 4,
    });

    expect(() => assertSlotAvailable(capacity)).toThrow(
      /Tu Paquete Oro permite hasta 6 participantes y ya los tienes registrados/,
    );
  });

  it('cites the event rules when there is no package', () => {
    const capacity = buildCapacity({
      paidSlots: 10,
      usedSlots: 5,
      packageName: null,
      packageMaxParticipants: null,
      packageIncludedCredentials: null,
      eventMaxPerCompany: 5,
    });

    expect(() => assertSlotAvailable(capacity)).toThrow(
      /superarías el máximo permitido \(5\) por las reglas del evento/,
    );
  });

  it('checks the paid slots before the ceiling, matching the legacy order', () => {
    // Both limits are exceeded; the paid-slot message is the one that surfaces.
    const capacity = buildCapacity({ paidSlots: 2, usedSlots: 6, packageMaxParticipants: 6 });

    expect(() => assertSlotAvailable(capacity)).toThrow(/No hay cupos pagados disponibles/);
  });
});
