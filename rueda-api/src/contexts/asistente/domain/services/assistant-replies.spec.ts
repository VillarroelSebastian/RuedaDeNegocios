import { describe, expect, it } from 'vitest';
import type {
  AssistantCompany,
  AssistantEnrollmentStatus,
  AssistantMeeting,
} from '../models/assistant-view.js';
import {
  activitiesReply,
  companiesReply,
  companyNotFoundReply,
  companyProfileReply,
  mapReply,
  meetingsReply,
  newsReply,
  nextMeetingReply,
  paymentReply,
  requestsReply,
  seatsReply,
  tableReply,
  talksReply,
} from './assistant-replies.js';

function company(overrides: Partial<AssistantCompany> = {}): AssistantCompany {
  return {
    empresaeventoId: 1,
    nombre: 'Maderas del Norte',
    codigo: 'RB-MAD-1',
    rubro: 'Forestal y Maderero',
    oferta: null,
    ...overrides,
  };
}

function meeting(overrides: Partial<AssistantMeeting> = {}): AssistantMeeting {
  return {
    inicio: new Date('2026-09-20T14:00:00.000Z'),
    fin: new Date('2026-09-20T14:20:00.000Z'),
    estadoReunion: 'PROGRAMADA',
    tipoReunion: 'PRESENCIAL',
    contraparte: 'Constructora Sur',
    numeroMesa: 7,
    ...overrides,
  };
}

function status(overrides: Partial<AssistantEnrollmentStatus> = {}): AssistantEnrollmentStatus {
  return {
    paqueteNombre: 'Paquete Beni',
    estadoVerificacionPago: 'COMPLETADO',
    montoPagado: 1500,
    participantesUsados: 3,
    participantesTotales: 4,
    ...overrides,
  };
}

describe('companiesReply', () => {
  it('numbers the companies and says how many there are', () => {
    const reply = companiesReply([company(), company({ empresaeventoId: 2, nombre: 'Flota Sur' })]);

    expect(reply.respuesta).toContain('Hay 2 empresa(s) habilitada(s):');
    expect(reply.respuesta).toContain('1. Maderas del Norte (RB-MAD-1) · Forestal y Maderero');
    expect(reply.respuesta).toContain('2. Flota Sur');
  });

  it('says so when the event has none', () => {
    expect(companiesReply([]).respuesta).toBe('No hay empresas habilitadas en este evento.');
  });
});

describe('companyProfileReply', () => {
  it('tells the company how to ask this one for a meeting', () => {
    const reply = companyProfileReply(company({ oferta: 'Madera certificada' }));

    expect(reply.respuesta).toContain('Oferta: Madera certificada');
    expect(reply.respuesta).toContain('escribe "agendar reunión con RB-MAD-1"');
  });

  it('falls back to the name when the company has no code', () => {
    const reply = companyProfileReply(company({ codigo: null }));

    expect(reply.respuesta).toContain('escribe "agendar reunión con Maderas del Norte"');
  });
});

describe('companyNotFoundReply', () => {
  it('repeats what was looked for', () => {
    expect(companyNotFoundReply('Maderas').respuesta).toContain('"Maderas"');
  });
});

describe('meetingsReply', () => {
  it('reads a virtual meeting as virtual, with no table', () => {
    const reply = meetingsReply([meeting({ tipoReunion: 'VIRTUAL', numeroMesa: null })]);

    expect(reply.respuesta).toContain('Tienes 1 reunión(es) aceptada(s):');
    expect(reply.respuesta).toContain('Virtual');
  });

  it('says the table is still to be confirmed when it has none', () => {
    const reply = meetingsReply([meeting({ numeroMesa: null })]);

    expect(reply.respuesta).toContain('Mesa por confirmar');
  });

  it('says so when there are none', () => {
    expect(meetingsReply([]).respuesta).toBe('No tienes reuniones aceptadas para este evento.');
  });
});

describe('nextMeetingReply', () => {
  it('names the counterpart, the table and the state', () => {
    const reply = nextMeetingReply(meeting());

    expect(reply.respuesta).toContain('con Constructora Sur');
    expect(reply.respuesta).toContain('Mesa 7');
    expect(reply.respuesta).toContain('Estado: PROGRAMADA');
  });

  it('says the table is to be confirmed when the meeting has none', () => {
    expect(nextMeetingReply(meeting({ numeroMesa: null })).respuesta).toContain('por confirmar');
  });

  it('says so when nothing is coming', () => {
    expect(nextMeetingReply(null).respuesta).toBe('No tienes reuniones programadas próximamente.');
  });
});

describe('tableReply', () => {
  it('names the table of the next meeting that has one', () => {
    expect(tableReply(meeting()).respuesta).toContain('Tu próxima mesa es la Mesa 7');
  });

  it('says so when no table was assigned yet', () => {
    expect(tableReply(null).respuesta).toBe(
      'Aún no tienes una mesa asignada para una reunión próxima.',
    );
  });
});

describe('activitiesReply', () => {
  it('reads the day and the room clock in UTC, not in the local zone', () => {
    const reply = activitiesReply([
      {
        nombreActividad: 'Apertura',
        fechaActividad: new Date('2026-09-20T00:00:00.000Z'),
        horaInicioActividad: new Date('1970-01-01T08:30:00.000Z'),
        nombreSalaEspacio: 'Salón Principal',
      },
    ]);

    expect(reply.respuesta).toContain('1. Apertura');
    expect(reply.respuesta).toContain('08:30');
    expect(reply.respuesta).toContain('Salón Principal');
  });

  it('says so when nothing was published', () => {
    expect(activitiesReply([]).respuesta).toBe(
      'Todavía no hay actividades publicadas para este evento.',
    );
  });
});

describe('newsReply', () => {
  it('lists title and body together', () => {
    const reply = newsReply([{ tituloNoticia: 'Cambio de sala', contenidoNoticia: 'Ahora es la B' }]);

    expect(reply.respuesta).toContain('1. Cambio de sala: Ahora es la B');
  });

  it('says so when nothing was published', () => {
    expect(newsReply([]).respuesta).toBe('No hay comunicados publicados para este evento.');
  });
});

describe('mapReply and talksReply', () => {
  it('carries the picture when the event has one', () => {
    expect(mapReply('https://cdn/mapa.png')).toEqual({
      respuesta: 'Aquí tienes el mapa del recinto.',
      imageUrl: 'https://cdn/mapa.png',
    });
    expect(talksReply('https://cdn/charlas.png').imageUrl).toBe('https://cdn/charlas.png');
  });

  it('answers without a picture when there is none', () => {
    expect(mapReply(null).imageUrl).toBeUndefined();
    expect(talksReply(null).respuesta).toBe('El cronograma de charlas aún no está disponible.');
  });
});

describe('paymentReply', () => {
  it('translates the stored state into words', () => {
    expect(paymentReply(status()).respuesta).toContain('Estado: aprobado');
    expect(paymentReply(status({ estadoVerificacionPago: 'OBSERVADO' })).respuesta).toContain(
      'observado — revisar comentarios',
    );
  });

  it('leaves the amount out when nothing was paid yet', () => {
    expect(paymentReply(status({ montoPagado: null })).respuesta).not.toContain('Monto registrado');
  });

  it('reads an unknown state as it was stored', () => {
    expect(paymentReply(status({ estadoVerificacionPago: 'RARO' })).respuesta).toContain(
      'Estado: RARO',
    );
  });

  it('answers as pending when there is no enrollment to read', () => {
    expect(paymentReply(null).respuesta).toContain('pendiente de verificación');
  });
});

describe('requestsReply', () => {
  it('counts what is waiting', () => {
    expect(requestsReply(2).respuesta).toContain('Tienes 2 solicitud(es)');
    expect(requestsReply(0).respuesta).toBe('No tienes solicitudes de reunión pendientes.');
  });
});

describe('seatsReply', () => {
  it('reports the seats left', () => {
    expect(seatsReply(status()).respuesta).toBe(
      'Tienes 3 participante(s) registrado(s) de 4 cupo(s) totales. Cupos disponibles: 1.',
    );
  });

  it('never reports a negative number of seats', () => {
    const reply = seatsReply(status({ participantesUsados: 6, participantesTotales: 4 }));

    expect(reply.respuesta).toContain('Cupos disponibles: 0.');
  });

  it('says so when it cannot read the enrollment', () => {
    expect(seatsReply(null).respuesta).toBe('No se pudo obtener información de cupos.');
  });
});
