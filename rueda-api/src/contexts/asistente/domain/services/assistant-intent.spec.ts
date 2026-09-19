import { describe, expect, it } from 'vitest';
import { classifyIntent, normalizeMessage } from './assistant-intent.js';

describe('normalizeMessage', () => {
  it('drops case and accents, so "¿Cuándo?" reads like "cuando"', () => {
    expect(normalizeMessage('¿Cuándo?')).toBe('¿cuando?');
  });
});

describe('classifyIntent', () => {
  it('lists the companies of the event', () => {
    expect(classifyIntent('ver empresas participantes')).toEqual({ kind: 'companies' });
  });

  it('does not list them when the message is about meeting one', () => {
    expect(classifyIntent('quiero una reunion con empresas del norte')).not.toEqual({
      kind: 'companies',
    });
  });

  it('looks a company up by its visible code', () => {
    expect(classifyIntent('datos de RB-AGRO-12')).toEqual({
      kind: 'company-search',
      term: 'rb-agro-12',
    });
  });

  it('looks a company up by name when asked to search', () => {
    expect(classifyIntent('buscar la empresa Maderas del Norte')).toEqual({
      kind: 'company-search',
      term: 'maderas del norte',
    });
  });

  it('books instead of searching when the message asks for a meeting', () => {
    expect(classifyIntent('agendar reunion con Maderas')).toEqual({ kind: 'booking' });
    expect(classifyIntent('reunion con RB-AGRO-12')).toEqual({ kind: 'booking' });
  });

  it('reads the accepted meetings', () => {
    expect(classifyIntent('mis reuniones')).toEqual({ kind: 'meetings' });
    expect(classifyIntent('reuniones aceptadas')).toEqual({ kind: 'meetings' });
  });

  it('falls back to the next meeting for any other mention of one', () => {
    expect(classifyIntent('cuando me reuno')).toEqual({ kind: 'next-meeting' });
  });

  it('reads the assigned table', () => {
    expect(classifyIntent('que mesa me toca')).toEqual({ kind: 'table' });
  });

  it('reads the programme', () => {
    expect(classifyIntent('que actividades hay')).toEqual({ kind: 'activities' });
  });

  it('reads the announcements', () => {
    expect(classifyIntent('hay comunicados nuevos')).toEqual({ kind: 'news' });
  });

  it('shows the venue map', () => {
    expect(classifyIntent('donde es el recinto')).toEqual({ kind: 'map' });
  });

  it('shows the talks schedule', () => {
    expect(classifyIntent('cronograma de charlas')).toEqual({ kind: 'talks' });
  });

  it('reads the dates of the event', () => {
    expect(classifyIntent('fecha del evento')).toEqual({ kind: 'dates' });
  });

  it('reads the payment state', () => {
    expect(classifyIntent('como va mi pago')).toEqual({ kind: 'payment' });
  });

  it('counts the pending requests', () => {
    expect(classifyIntent('tengo alguna solicitud')).toEqual({ kind: 'requests' });
  });

  it('counts the seats left', () => {
    expect(classifyIntent('cuantos cupos me quedan')).toEqual({ kind: 'seats' });
  });

  it('offers the menu when it understood nothing', () => {
    expect(classifyIntent('hola que tal')).toEqual({ kind: 'help' });
  });
});
