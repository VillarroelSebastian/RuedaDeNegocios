import { describe, expect, it } from 'vitest';
import { ConflictError } from '../../../../shared/domain/errors/domain.error.js';
import type { BookingContext } from '../../domain/models/assistant-dialog.js';
import {
  COMPANY_EVENT_ID,
  COMPANY_USER_ID,
  COUNTERPART_ID,
  FakeActivityBriefing,
  FakeAgendaSuggestions,
  FakeCompanyDirectory,
  FakeEnrollmentStatus,
  FakeEventBriefing,
  FakeFreeTables,
  FakeMeetingAgenda,
  FakeMeetingBooking,
  FakeNewsBriefing,
  FakeRequestStatus,
  FixedClock,
  buildEvent,
  buildMeeting,
} from '../../test-doubles.js';
import { BookingConversation } from '../services/booking-conversation.js';
import { AnswerAssistantUseCase } from './answer-assistant.use-case.js';

interface Parts {
  companies?: FakeCompanyDirectory;
  events?: FakeEventBriefing;
  meetings?: FakeMeetingAgenda;
  activities?: FakeActivityBriefing;
  news?: FakeNewsBriefing;
  enrollment?: FakeEnrollmentStatus;
  requests?: FakeRequestStatus;
  agenda?: FakeAgendaSuggestions;
  tables?: FakeFreeTables;
  bookings?: FakeMeetingBooking;
}

function assistantOf(parts: Parts = {}) {
  const companies = parts.companies ?? new FakeCompanyDirectory();
  const conversation = new BookingConversation(
    companies,
    parts.agenda ?? new FakeAgendaSuggestions(),
    parts.tables ?? new FakeFreeTables(),
    parts.bookings ?? new FakeMeetingBooking(),
  );

  return new AnswerAssistantUseCase(
    companies,
    parts.events ?? new FakeEventBriefing(),
    parts.meetings ?? new FakeMeetingAgenda(),
    parts.activities ?? new FakeActivityBriefing(),
    parts.news ?? new FakeNewsBriefing(),
    parts.enrollment ?? new FakeEnrollmentStatus(),
    parts.requests ?? new FakeRequestStatus(),
    new FixedClock(),
    conversation,
  );
}

function ask(mensaje: string, contexto?: BookingContext | null, parts: Parts = {}) {
  return assistantOf(parts).execute({
    companyEventId: COMPANY_EVENT_ID,
    companyUserId: COMPANY_USER_ID,
    mensaje,
    contexto,
  });
}

describe('AnswerAssistantUseCase', () => {
  it('stops when the caller has no active enrollment', async () => {
    const answer = await ask('hola', null, {
      companies: new FakeCompanyDirectory({ eventId: null }),
    });

    expect(answer.respuesta).toBe('Tu empresa no tiene una inscripción activa para este evento.');
  });

  it('stops when the enrollment points at an event that is gone', async () => {
    const answer = await ask('hola', null, { events: new FakeEventBriefing(null) });

    expect(answer.respuesta).toBe('No hay un evento activo en este momento.');
  });

  it('offers the menu when it understood nothing', async () => {
    const answer = await ask('hola que tal');

    expect(answer.respuesta).toContain('Elige una opción:');
  });

  it('lists the companies of the event', async () => {
    const answer = await ask('ver empresas');

    expect(answer.respuesta).toContain('Hay 1 empresa(s) habilitada(s):');
  });

  it('reads one company by name', async () => {
    const answer = await ask('buscar la empresa Constructora');

    expect(answer.respuesta).toContain('Constructora Sur (RB-CON-2)');
  });

  it('says so when the company is not in the event', async () => {
    const answer = await ask('buscar la empresa Fantasma', null, {
      companies: new FakeCompanyDirectory({ found: null }),
    });

    expect(answer.respuesta).toContain('"fantasma"');
  });

  it('reads the accepted meetings', async () => {
    const answer = await ask('mis reuniones');

    expect(answer.respuesta).toContain('Tienes 1 reunión(es) aceptada(s):');
  });

  it('reads the next meeting', async () => {
    const answer = await ask('cuando me reuno');

    expect(answer.respuesta).toContain('Tu próxima reunión es el');
  });

  it('reads the next table', async () => {
    const answer = await ask('que mesa me toca', null, {
      meetings: new FakeMeetingAgenda({ withTable: buildMeeting({ numeroMesa: 9 }) }),
    });

    expect(answer.respuesta).toContain('Mesa 9');
  });

  it('reads the programme', async () => {
    const answer = await ask('que actividades hay');

    expect(answer.respuesta).toBe('Todavía no hay actividades publicadas para este evento.');
  });

  it('reads the announcements', async () => {
    const answer = await ask('hay comunicados', null, {
      news: new FakeNewsBriefing([{ tituloNoticia: 'Aviso', contenidoNoticia: 'Sala nueva' }]),
    });

    expect(answer.respuesta).toContain('1. Aviso: Sala nueva');
  });

  it('hands out the venue map when the event has one', async () => {
    const answer = await ask('donde es el recinto', null, {
      events: new FakeEventBriefing(buildEvent({ urlImagenMapaRecinto: 'https://cdn/mapa.png' })),
    });

    expect(answer.imageUrl).toBe('https://cdn/mapa.png');
  });

  it('reads the dates of the event', async () => {
    const answer = await ask('fecha del evento');

    expect(answer.respuesta).toContain('El evento "Rueda de Negocios Beni" se realiza desde el');
  });

  it('reads the payment state', async () => {
    const answer = await ask('como va mi pago');

    expect(answer.respuesta).toContain('Estado: aprobado');
  });

  it('counts the pending requests', async () => {
    const answer = await ask('tengo solicitudes', null, { requests: new FakeRequestStatus(3) });

    expect(answer.respuesta).toContain('Tienes 3 solicitud(es)');
  });

  it('counts the seats left', async () => {
    const answer = await ask('cuantos cupos tengo');

    expect(answer.respuesta).toContain('Cupos disponibles: 1.');
  });
});

describe('AnswerAssistantUseCase, booking a meeting', () => {
  it('offers the companies a meeting may be asked from', async () => {
    const companies = new FakeCompanyDirectory();

    const answer = await ask('quiero agendar una reunion', null, { companies });

    expect(answer.respuesta).toContain('Elige una empresa:');
    expect(answer.contexto).toMatchObject({ flujo: 'agendar', paso: 'empresa' });
    expect(companies.bookableCalls[0]).toEqual({ term: '', except: COMPANY_EVENT_ID });
  });

  it('jumps straight to the hours when the company was named', async () => {
    const answer = await ask('agendar reunion con Constructora');

    expect(answer.respuesta).toContain('Estos son los próximos horarios realmente disponibles');
    expect(answer.contexto).toMatchObject({ paso: 'horario', receptoraEeId: COUNTERPART_ID });
  });

  it('says so when the counterpart has no free hours', async () => {
    const answer = await ask('agendar reunion con Constructora', null, {
      agenda: new FakeAgendaSuggestions({ slots: [], duracionMinutos: 20 }),
    });

    expect(answer.respuesta).toContain('no tiene horarios disponibles por ahora');
    expect(answer.contexto).toMatchObject({ paso: 'empresa' });
  });

  it('asks again when it could not tell which company was meant', async () => {
    const context: BookingContext = {
      flujo: 'agendar',
      paso: 'empresa',
      candidatos: [{ id: COUNTERPART_ID, nombre: 'Constructora Sur', codigo: 'RB-CON-2' }],
    };

    const answer = await ask('9', context);

    expect(answer.respuesta).toContain('No entendí cuál empresa');
  });

  it('asks whether the meeting is in person after the slot is picked', async () => {
    const context: BookingContext = {
      flujo: 'agendar',
      paso: 'horario',
      receptoraEeId: COUNTERPART_ID,
      receptoraNombre: 'Constructora Sur',
      slots: ['2026-09-20T17:00:00.000Z'],
      horarioOpciones: ['1:00 p. m.'],
      duracionMin: 20,
    };

    const answer = await ask('1', context);

    expect(answer.respuesta).toContain('¿La reunión será presencial o virtual?');
    expect(answer.contexto).toMatchObject({ paso: 'tipo', inicio: '2026-09-20T17:00:00.000Z' });
  });

  it('offers the free tables for the exact window of the meeting', async () => {
    const tables = new FakeFreeTables([{ id: 3, numeroMesa: 5 }]);
    const context: BookingContext = {
      flujo: 'agendar',
      paso: 'tipo',
      receptoraEeId: COUNTERPART_ID,
      receptoraNombre: 'Constructora Sur',
      inicio: '2026-09-20T17:00:00.000Z',
      duracionMin: 20,
    };

    const answer = await ask('presencial', context, { tables });

    expect(answer.opciones).toEqual(['Mesa 5', 'Cualquiera / Automática']);
    expect(tables.windows[0]).toEqual({
      start: new Date('2026-09-20T17:00:00.000Z'),
      end: new Date('2026-09-20T17:20:00.000Z'),
    });
  });

  it('goes straight to the summary for a virtual meeting', async () => {
    const context: BookingContext = {
      flujo: 'agendar',
      paso: 'tipo',
      receptoraEeId: COUNTERPART_ID,
      receptoraNombre: 'Constructora Sur',
      inicio: '2026-09-20T17:00:00.000Z',
      duracionMin: 20,
    };

    const answer = await ask('virtual', context);

    expect(answer.respuesta).toContain('• Tipo: Virtual');
    expect(answer.respuesta).not.toContain('• Mesa:');
    expect(answer.contexto).toMatchObject({ paso: 'confirmar', mesaId: null });
  });

  it('sends the request the conversation described', async () => {
    const bookings = new FakeMeetingBooking();
    const context: BookingContext = {
      flujo: 'agendar',
      paso: 'confirmar',
      receptoraEeId: COUNTERPART_ID,
      receptoraNombre: 'Constructora Sur',
      inicio: '2026-09-20T17:00:00.000Z',
      duracionMin: 20,
      tipo: 'PRESENCIAL',
      mesaId: 3,
    };

    const answer = await ask('si, enviar', context, { bookings });

    expect(bookings.requested[0]).toEqual({
      solicitanteId: COMPANY_EVENT_ID,
      receptoraId: COUNTERPART_ID,
      companyUserId: COMPANY_USER_ID,
      tipoReunion: 'PRESENCIAL',
      window: {
        start: new Date('2026-09-20T17:00:00.000Z'),
        end: new Date('2026-09-20T17:20:00.000Z'),
      },
      mesaId: 3,
      mensaje: 'Solicitud enviada desde el asistente virtual',
    });
    expect(answer.respuesta).toContain('¡Listo! Envié la solicitud de reunión');
    expect(answer.contexto).toBeNull();
  });

  it('repeats what the owner of the rules refused', async () => {
    const bookings = new FakeMeetingBooking(
      new ConflictError('Ya enviaste una solicitud para ese horario a esta empresa'),
    );
    const context: BookingContext = {
      flujo: 'agendar',
      paso: 'confirmar',
      receptoraEeId: COUNTERPART_ID,
      receptoraNombre: 'Constructora Sur',
      inicio: '2026-09-20T17:00:00.000Z',
      duracionMin: 20,
      tipo: 'VIRTUAL',
      mesaId: null,
    };

    const answer = await ask('si', context, { bookings });

    expect(answer.respuesta).toContain('Ya enviaste una solicitud para ese horario');
    expect(answer.contexto).toBeNull();
  });

  it('never repeats a failure that did not come from the domain', async () => {
    const bookings = new FakeMeetingBooking(new Error('connect ECONNREFUSED 10.0.0.9:5432'));
    const context: BookingContext = {
      flujo: 'agendar',
      paso: 'confirmar',
      receptoraEeId: COUNTERPART_ID,
      receptoraNombre: 'Constructora Sur',
      inicio: '2026-09-20T17:00:00.000Z',
      duracionMin: 20,
      tipo: 'VIRTUAL',
      mesaId: null,
    };

    const answer = await ask('si', context, { bookings });

    expect(answer.respuesta).toContain('error desconocido');
    expect(answer.respuesta).not.toContain('ECONNREFUSED');
  });

  it('starts over instead of booking when the context came back incomplete', async () => {
    const bookings = new FakeMeetingBooking();

    const answer = await ask('si, enviar', { flujo: 'agendar', paso: 'confirmar' }, { bookings });

    expect(bookings.requested).toHaveLength(0);
    expect(answer.respuesta).toBe('¿Con qué empresa quieres agendar la reunión? Escribe su nombre.');
  });

  it('cancels the booking when the company backs out', async () => {
    const answer = await ask('cancelar', { flujo: 'agendar', paso: 'confirmar' });

    expect(answer.respuesta).toBe('Listo, cancelé el agendamiento. ¿Te ayudo con algo más?');
    expect(answer.contexto).toBeNull();
  });
});
