import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import {
  EVENT_TEAM,
  assertCanSend,
  groupIntoConversations,
  sanitizeMessageBody,
  senderRoleOf,
} from './message-thread.js';

const ME = 100;
const THEM = 200;

const message = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  emisorEeId: ME,
  receptorEeId: THEM,
  contenido: 'Hola',
  haSidoLeido: true,
  fechaCreacion: new Date('2026-11-10T12:00:00.000Z'),
  ...overrides,
});

describe('sanitizeMessageBody', () => {
  it('trims what was typed', () => {
    expect(sanitizeMessageBody('  Hola  ')).toBe('Hola');
  });

  it('refuses an empty message', () => {
    expect(() => sanitizeMessageBody('   ')).toThrow(ValidationError);
    expect(() => sanitizeMessageBody(undefined)).toThrow(ValidationError);
  });

  it('caps it at the width of its column', () => {
    expect(sanitizeMessageBody('m'.repeat(1200))).toHaveLength(1000);
  });
});

describe('assertCanSend', () => {
  it('lets one company write to another', () => {
    expect(() => assertCanSend(ME, THEM)).not.toThrow();
  });

  it('refuses a company writing to itself', () => {
    expect(() => assertCanSend(ME, ME)).toThrow(
      'No puedes enviarte mensajes a tu propia empresa',
    );
  });

  /** The event team writes one way; there is nobody to reply to. */
  it('refuses replying to the event team', () => {
    expect(() => assertCanSend(ME, EVENT_TEAM)).toThrow(
      'No puedes responder a los mensajes del equipo del evento',
    );
  });
});

describe('senderRoleOf', () => {
  it('reads an administrator as the organisation', () => {
    expect(senderRoleOf('ADMINISTRADOR')).toBe('ADMIN');
  });

  /**
   * Both technician roles write as technicians. The legacy endpoint let only
   * `TECNICO` through, so `TECNICO_EVENTOS` could not message a company at all.
   */
  it('reads both technician roles as a technician', () => {
    expect(senderRoleOf('TECNICO')).toBe('TECNICO');
    expect(senderRoleOf('TECNICO_EVENTOS')).toBe('TECNICO');
  });

  it('refuses a role that is not on the team', () => {
    expect(() => senderRoleOf('EMPRESA')).toThrow(
      'Solo administradores o técnicos pueden usar esta función',
    );
  });
});

describe('groupIntoConversations', () => {
  it('keeps one conversation per counterpart', () => {
    const conversations = groupIntoConversations(
      [
        message({ id: 3, emisorEeId: THEM, receptorEeId: ME }),
        message({ id: 2 }),
        message({ id: 1, emisorEeId: 300, receptorEeId: ME }),
      ],
      ME,
    );

    expect(conversations.map((one) => one.eeId)).toEqual([THEM, 300]);
  });

  /** The list arrives newest first, so the first one seen is the latest. */
  it('shows the latest message of each conversation', () => {
    const conversations = groupIntoConversations(
      [
        message({ id: 3, contenido: 'Lo último' }),
        message({ id: 2, contenido: 'Anterior' }),
      ],
      ME,
    );

    expect(conversations[0].ultimoMensaje).toBe('Lo último');
    expect(conversations[0].esMio).toBe(true);
  });

  it('counts only the incoming messages nobody read', () => {
    const conversations = groupIntoConversations(
      [
        message({ id: 3, emisorEeId: THEM, receptorEeId: ME, haSidoLeido: false }),
        message({ id: 2, emisorEeId: THEM, receptorEeId: ME, haSidoLeido: false }),
        message({ id: 1, emisorEeId: THEM, receptorEeId: ME, haSidoLeido: true }),
        // Sent by me: never unread for me, whatever the flag says.
        message({ id: 4, haSidoLeido: false }),
      ],
      ME,
    );

    expect(conversations[0].noLeidos).toBe(2);
  });

  it('marks the conversation with the event team as such', () => {
    const conversations = groupIntoConversations(
      [message({ emisorEeId: EVENT_TEAM, receptorEeId: ME })],
      ME,
    );

    expect(conversations[0]).toMatchObject({ eeId: EVENT_TEAM, esStaff: true });
  });

  it('orders the conversations by their latest message', () => {
    const conversations = groupIntoConversations(
      [
        message({
          id: 1,
          emisorEeId: 300,
          receptorEeId: ME,
          fechaCreacion: new Date('2026-11-10T09:00:00.000Z'),
        }),
        message({ id: 2, fechaCreacion: new Date('2026-11-10T15:00:00.000Z') }),
      ],
      ME,
    );

    expect(conversations.map((one) => one.eeId)).toEqual([THEM, 300]);
  });

  it('answers with nothing when nobody wrote', () => {
    expect(groupIntoConversations([], ME)).toEqual([]);
  });
});
