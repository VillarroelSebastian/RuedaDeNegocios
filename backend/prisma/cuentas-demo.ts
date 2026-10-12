// Cuentas de demostración para los revisores de Google Play.
//
//   npx tsx prisma/cuentas-demo.ts              crea o actualiza las cuentas y muestra la contraseña
//   npx tsx prisma/cuentas-demo.ts --desactivar baja lógica de todo lo demo (cuando termine la revisión)
//
// Es seguro ejecutarlo varias veces: no usa ids fijos y busca por correo. Todo
// queda con monto 0 (no afecta las finanzas) y solo en el evento principal.
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) } as any);

// Direcciones con alias (+) del correo del evento: pasan la validación de correo de
// la app (dominio .com) y cualquier aviso o restablecimiento de contraseña llega
// al organizador, no a un tercero. Las versiones anteriores usaban @demo-rueda.test.
const BASE = 'ruedadenegociosdelbeni';
const CORREO_ENCARGADO = `${BASE}+revision.encargado@gmail.com`;
const CORREO_PARTICIPANTE = `${BASE}+revision.participante@gmail.com`;
const CORREO_SOCIO = `${BASE}+revision.socio@gmail.com`;
const ANTIGUOS: Record<string, string> = {
  [CORREO_ENCARGADO]: 'revision.encargado@demo-rueda.test',
  [CORREO_PARTICIPANTE]: 'revision.participante@demo-rueda.test',
  [CORREO_SOCIO]: 'revision.socio@demo-rueda.test',
};
const esDemo = (correo: string) => correo.endsWith('@demo-rueda.test') || correo.startsWith(`${BASE}+revision.`);

const avatar = (n: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=449D3A&color=fff&size=128`;

async function desactivar() {
  const usuarios = await prisma.usuario.findMany({ where: { OR: [{ correo: { endsWith: '@demo-rueda.test' } }, { correo: { startsWith: `${BASE}+revision.` } }] }, select: { id: true, correo: true } });
  const ids = usuarios.filter((u) => esDemo(u.correo)).map((u) => u.id);
  const vinculos = await prisma.empresa_usuario.findMany({ where: { usuario_id: { in: ids } }, select: { empresa_id: true, empresaevento_id: true } });
  await prisma.empresa_usuario.updateMany({ where: { usuario_id: { in: ids } }, data: { estaActivo: 0 } });
  await prisma.empresaevento.updateMany({ where: { id: { in: vinculos.map((v) => v.empresaevento_id) } }, data: { estaActivo: 0 } });
  await prisma.empresa.updateMany({ where: { id: { in: vinculos.map((v) => v.empresa_id) } }, data: { estaActivo: 0 } });
  await prisma.pushsubscription.updateMany({ where: { usuarioId: { in: ids } }, data: { estaActivo: 0 } });
  await prisma.usuario.updateMany({ where: { id: { in: ids } }, data: { estaActivo: 0 } });
  console.log(`Cuentas demo desactivadas: ${ids.length} usuarios.`);
}

async function crear() {
  const evento = await prisma.evento.findFirst({ where: { esPrincipal: 1, estaActivo: { not: 0 } } });
  if (!evento) throw new Error('No hay un evento principal activo.');
  const ciudad = await prisma.ciudad.findFirst({ orderBy: { id: 'asc' } });
  if (!ciudad) throw new Error('No hay ciudades cargadas.');
  const paquete = await prisma.paquete.findFirst({
    where: { evento_id: evento.id, estaActivo: 1, tipoPaquete: 'EMPRESA', apareceEnCatalogo: 1 },
    orderBy: { costo: 'asc' },
  });

  const password = process.env.DEMO_PASSWORD || `Rn!${randomBytes(9).toString('base64url')}9aA`;
  const hash = await bcrypt.hash(password, 10);
  const hashSocio = await bcrypt.hash(`Rn!${randomBytes(12).toString('base64url')}9aA`, 10);

  async function usuario(correo: string, nombres: string, apellido: string, telefono: string, contrasenia: string) {
    // Si la cuenta existe con el correo antiguo, se renombra en lugar de duplicarla.
    const existente = (await prisma.usuario.findFirst({ where: { correo } })) ?? (await prisma.usuario.findFirst({ where: { correo: ANTIGUOS[correo] } }));
    const data = { nombres, apellidoPaterno: apellido, correo, contrasenia, telefono, urlFotoPerfil: avatar(`${nombres} ${apellido}`), rolEvento: 'EMPRESA', estaActivo: 1, evento_id: null, creadoModificadoFecha: new Date() };
    return existente ? prisma.usuario.update({ where: { id: existente.id }, data }) : prisma.usuario.create({ data });
  }

  async function empresa(nombre: string, correo: string, descripcion: string, oferta: string, demanda: string) {
    const existente = await prisma.empresa.findFirst({ where: { nombre } });
    const data = {
      ciudad_id: ciudad!.id, nombre, rubro: 'Servicios', telefonoWhatsapp: '+591 70000000', correoCorporativo: correo,
      descripcion, oferta, demanda, interesesBusqueda: 'Alianzas comerciales', urlFotoPerfil: avatar(nombre), estaActivo: 1,
    };
    const emp = existente ? await prisma.empresa.update({ where: { id: existente.id }, data }) : await prisma.empresa.create({ data });
    const ee = await prisma.empresaevento.findFirst({ where: { empresa_id: emp.id, evento_id: evento!.id } });
    const dataEe = {
      empresa_id: emp.id, evento_id: evento!.id, paquete_id: paquete?.id ?? null, tipoParticipacion: 'PRESENCIAL',
      estadoHabilitacionAcceso: 'HABILITADO', estadoVerificacionPago: 'COMPLETADO', montoPagado: 0,
      numeroParticipantes: 2, fechaHoraEnvioComprobante: new Date(), fechaHoraVerificacionPago: new Date(),
      observacionSobreComprobante: 'Cuenta de demostración para la revisión de Google Play. Sin pago real.', estaActivo: 1,
    };
    const inscripcion = ee ? await prisma.empresaevento.update({ where: { id: ee.id }, data: dataEe }) : await prisma.empresaevento.create({ data: dataEe });
    return { emp, ee: inscripcion };
  }

  async function vincular(usuarioId: number, e: { emp: { id: number }; ee: { id: number } }, cargo: string, esResponsable: number) {
    const eu = await prisma.empresa_usuario.findFirst({ where: { usuario_id: usuarioId, empresaevento_id: e.ee.id } });
    const data = { empresa_id: e.emp.id, usuario_id: usuarioId, empresaevento_id: e.ee.id, cargo, esResponsable, estaActivo: 1 };
    return eu ? prisma.empresa_usuario.update({ where: { id: eu.id }, data }) : prisma.empresa_usuario.create({ data });
  }

  const demo = await empresa('Empresa Demo (Revisión Google Play)', `${BASE}+demo@gmail.com`,
    'Cuenta de demostración para revisar la aplicación. No es una empresa real.', 'Servicios de consultoría de ejemplo.', 'Proveedores y aliados de ejemplo.');
  const socio = await empresa('Empresa Demo Socio', `${BASE}+socio@gmail.com`,
    'Segunda empresa de demostración, para probar solicitudes de reunión. No es una empresa real.', 'Productos de ejemplo.', 'Distribuidores de ejemplo.');

  const encargado = await usuario(CORREO_ENCARGADO, 'Revisor', 'Encargado', '+591 70000001', hash);
  const participante = await usuario(CORREO_PARTICIPANTE, 'Revisor', 'Participante', '+591 70000002', hash);
  const encargadoSocio = await usuario(CORREO_SOCIO, 'Socio', 'Demo', '+591 70000003', hashSocio);
  await vincular(encargado.id, demo, 'Gerente (demo)', 1);
  await vincular(participante.id, demo, 'Asistente (demo)', 0);
  await vincular(encargadoSocio.id, socio, 'Gerente (demo)', 1);

  console.log('\nCuentas de demostración listas (evento: ' + evento.nombre + ')');
  console.log('  Encargado:    ' + CORREO_ENCARGADO);
  console.log('  Participante: ' + CORREO_PARTICIPANTE);
  console.log('  Contraseña:   ' + password);
  console.log('  (La empresa "Empresa Demo Socio" existe para probar solicitudes de reunión.)\n');
}

(process.argv.includes('--desactivar') ? desactivar() : crear())
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
