import { jest } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import { ExtrasController } from './extras/extras.controller.js';
const fn = (value: any = null) => jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(value);
const persona = { id: 9, nombreCompleto: 'Ana Perez', correo: 'ana@example.com', cargo: 'Gerente', telefono: '70000000', urlCredencialQR: 'https://example.com/qr.png' };
const ausp = { id: 8, evento_id: 2, estaActivo: 1, nombreEmpresa: 'Empresa', descripcion: 'Descripcion', cantidadIngresos: 1, personas: [persona] };
const cuenta = { id: 12, correo: persona.correo, contrasenia: 'hash-anterior', telefono: 'AUSP-8-9', rolEvento: 'EMPRESA' };

describe('Acceso y reenvio de auspiciadores', () => {
  it('reutiliza la cuenta creada aunque su primer correo haya fallado', async () => {
    const updateMany = fn({ count: 1 }), transaction = fn();
    const c = new ExtrasController({ usuario: { findFirst: fn(cuenta), updateMany }, $transaction: transaction } as any, {} as any) as any;
    c.enviarAccesoAuspiciador = fn();
    await expect(c.crearAccesoEmpresaAuspiciador(ausp)).resolves.toMatchObject({ creado: true, correoEnviado: true, reutilizado: true });
    expect(transaction).not.toHaveBeenCalled();
    const pwd = c.enviarAccesoAuspiciador.mock.calls[0][2];
    expect(await bcrypt.compare(pwd, updateMany.mock.calls[0][0].data.contrasenia)).toBe(true);
  });
  it('restaura la contrasena anterior cuando falla el correo de acceso', async () => {
    const updateMany = fn({ count: 1 });
    const c = new ExtrasController({ usuario: { findFirst: fn(cuenta), updateMany } } as any, {} as any) as any;
    c.enviarAccesoAuspiciador = jest.fn<(...args: any[]) => Promise<any>>().mockRejectedValue(new Error('SMTP rechazado'));
    await expect(c.crearAccesoEmpresaAuspiciador(ausp)).rejects.toThrow('SMTP rechazado');
    expect(updateMany.mock.calls[1][0].data).toEqual({ correo: cuenta.correo, contrasenia: cuenta.contrasenia });
    expect(updateMany.mock.calls[1][0].where.contrasenia).toBe(updateMany.mock.calls[0][0].data.contrasenia);
  });
  it('nunca cambia la contrasena de otra cuenta con el mismo correo', async () => {
    const updateMany = fn();
    const c = new ExtrasController({ usuario: { findFirst: fn({ ...cuenta, telefono: 'OTRA-CUENTA' }), updateMany } } as any, {} as any) as any;
    await expect(c.crearAccesoEmpresaAuspiciador(ausp)).rejects.toThrow('otra cuenta');
    expect(updateMany).not.toHaveBeenCalled();
  });
  it('informa envio parcial y permite recuperar el acceso aunque falle un QR', async () => {
    const c = new ExtrasController({} as any, {} as any) as any;
    c.obtenerAuspiciador = fn(ausp); c.eventoPrincipalId = fn(2);
    c.enviarCredencialAuspiciador = jest.fn<(...args: any[]) => Promise<any>>().mockRejectedValue(new Error('SMTP'));
    c.crearAccesoEmpresaAuspiciador = fn({ creado: true, correoEnviado: true });
    const r = await c.reenviarCredencialesAuspiciador('8');
    expect(r).toMatchObject({ ok: false, correosFallidos: [persona.correo] });
    expect(c.crearAccesoEmpresaAuspiciador).toHaveBeenCalledWith(ausp);
    expect(c.reenviosAuspiciador.size).toBe(0);
  });
  it('adjunta un QR usable sin depender de imagenes remotas del cliente de correo', async () => {
    const c = new ExtrasController({ auspiciadorpersona: { findUnique: fn({ ...persona, auspiciador: { ...ausp, evento: { nombre: 'Evento' } } }) } } as any, {} as any) as any;
    c.enviarCorreoAuspiciador = fn();
    await c.enviarCredencialAuspiciador(9);
    const mail = c.enviarCorreoAuspiciador.mock.calls[0][0];
    expect(mail.attachments.some((a: any) => a.cid === 'credencial-qr' && Buffer.isBuffer(a.content))).toBe(true);
    expect(mail.html).toContain('cid:credencial-qr');
  });
});

describe('Validacion de auspiciadores en API', () => {
  const c = new ExtrasController({} as any, {} as any) as any;
  it.each([{ telefono: 'abc' }, { correo: 'no-es-correo' }, { cargo: '' }, { nombreCompleto: 'Ana123 Perez' }])('rechaza datos invalidos %j', (cambio) => {
    expect(() => c.personasValidadas({ personas: [{ ...persona, ...cambio }] }, 1)).toThrow();
  });
  it('rechaza correos duplicados sin distinguir mayusculas', () => {
    expect(() => c.personasValidadas({ personas: [persona, { ...persona, correo: 'ANA@EXAMPLE.COM' }] }, 2)).toThrow();
  });
  it.each([0, -1, 1.234, 100000000, Infinity])('rechaza monto %s', (montoAporte) => {
    expect(() => c.datosAuspiciador({ ...ausp, tipoAporte: 'DINERO', montoAporte })).toThrow();
  });
  it('acepta un monto valido y datos normalizados', () => {
    expect(c.datosAuspiciador({ ...ausp, tipoAporte: 'DINERO', montoAporte: 100.25 }).montoAporte).toBe(100.25);
    expect(c.personasValidadas({ personas: [persona] }, 1)[0].correo).toBe(persona.correo);
  });
});
