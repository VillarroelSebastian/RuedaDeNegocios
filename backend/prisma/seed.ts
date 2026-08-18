import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱 Iniciando seed...');

  // ─── País y Ciudades ───────────────────────────────────────────────────────
  const bolivia = await prisma.pais.upsert({
    where: { id: 1 },
    update: {},
    create: { nombre: 'Bolivia' },
  });

  const [trinidad, santaCruz, laPaz, cochabamba] = await Promise.all([
    prisma.ciudad.upsert({ where: { id: 1 }, update: {}, create: { pais_id: bolivia.id, nombre: 'Trinidad' } }),
    prisma.ciudad.upsert({ where: { id: 2 }, update: {}, create: { pais_id: bolivia.id, nombre: 'Santa Cruz' } }),
    prisma.ciudad.upsert({ where: { id: 3 }, update: {}, create: { pais_id: bolivia.id, nombre: 'La Paz' } }),
    prisma.ciudad.upsert({ where: { id: 4 }, update: {}, create: { pais_id: bolivia.id, nombre: 'Cochabamba' } }),
  ]);

  console.log('✅ País y ciudades creados');

  // ─── Evento Principal ──────────────────────────────────────────────────────
  const evento = await prisma.evento.upsert({
    where: { id: 1 },
    update: {
      maxParticipantesPorEmpresa: 5,
      fechaInicioEvento: new Date('2026-09-15T08:00:00'),
      fechaFinEvento: new Date('2026-09-16T18:00:00'),
    },
    create: {
      nombre: 'IX Rueda de Negocios del Beni 2024',
      edicion: 'IX',
      descripcion: 'El encuentro empresarial más importante del departamento del Beni, Bolivia.',
      fechaInicioEvento: new Date('2026-09-15T08:00:00'),
      fechaFinEvento: new Date('2026-09-16T18:00:00'),
      duracionReunion: 20,
      tiempoEntreReuniones: 5,
      cantidadTotalMesasEvento: 15,
      capacidadPersonasPorMesa: 4,
      montoBaseIncripcionBolivianos: 800.0,
      cantidadParticipantesIncluidos: 2,
      costoParticipanteExtra: 150,
      maxParticipantesPorEmpresa: 5,
      sobreElEvento: 'Espacio de encuentro para empresas del Beni y Bolivia que buscan establecer alianzas comerciales estratégicas.',
      correoContacto: 'contacto@ruedadenegociosbeni.bo',
      telefonoContacto: '78454407',
      estaActivo: 1,
      esPrincipal: 1,
    },
  });

  console.log('✅ Evento principal creado:', evento.nombre);

  // ─── Usuarios (Admin + Técnicos) ───────────────────────────────────────────
  const passAdmin   = await bcrypt.hash('admin123',   10);
  const passTecnico = await bcrypt.hash('tecnico123', 10);

  const admin = await prisma.usuario.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombres: 'Carlos Eduardo', apellidoPaterno: 'Suárez', apellidoMaterno: 'Vaca',
      correo: 'admin@ruedabeni.bo', contrasenia: passAdmin, telefono: '+591 71234567',
      urlFotoPerfil: 'https://ui-avatars.com/api/?name=Carlos+Suarez&background=16a34a&color=fff&size=128',
      rolEvento: 'ADMINISTRADOR', estaActivo: 1,
    },
  });

  await prisma.usuario.upsert({
    where: { id: 2 }, update: {},
    create: {
      evento_id: evento.id, nombres: 'María Fernanda', apellidoPaterno: 'Justiniano', apellidoMaterno: 'Paz',
      correo: 'mfernanda@ruedabeni.bo', contrasenia: passTecnico, telefono: '+591 76543210',
      urlFotoPerfil: 'https://ui-avatars.com/api/?name=Maria+Justiniano&background=0ea5e9&color=fff&size=128',
      rolEvento: 'TECNICO', estaActivo: 1,
    },
  });

  await prisma.usuario.upsert({
    where: { id: 3 }, update: {},
    create: {
      evento_id: evento.id, nombres: 'Roberto', apellidoPaterno: 'Molina', apellidoMaterno: 'Chávez',
      correo: 'rmolina@ruedabeni.bo', contrasenia: passTecnico, telefono: '+591 77891234',
      urlFotoPerfil: 'https://ui-avatars.com/api/?name=Roberto+Molina&background=f59e0b&color=fff&size=128',
      rolEvento: 'TECNICO', estaActivo: 1,
    },
  });

  console.log('✅ Usuarios creados (admin + 2 técnicos)');

  // ─── Empresas (las 8 existentes) ──────────────────────────────────────────
  const empresasData = [
    { ciudad_id: trinidad.id,   nombre: 'Agropecuaria El Mamoré S.R.L.',  rubro: 'Agropecuaria',      telefono: '+591 72345678', correo: 'contacto@mamore.bo',       descripcion: 'Producción y comercialización de productos agropecuarios del Beni.' },
    { ciudad_id: trinidad.id,   nombre: 'Maderera Beni Export',            rubro: 'Madera y Forestal', telefono: '+591 73456789', correo: 'ventas@beniexport.bo',      descripcion: 'Exportación de madera certificada y productos forestales.' },
    { ciudad_id: santaCruz.id,  nombre: 'TechSur Bolivia S.A.',            rubro: 'Tecnología',        telefono: '+591 74567890', correo: 'info@techsur.bo',           descripcion: 'Soluciones tecnológicas y software empresarial.' },
    { ciudad_id: trinidad.id,   nombre: 'Ganadería Trinidad LTDA.',        rubro: 'Ganadería',         telefono: '+591 75678901', correo: 'ganados@trinidad.bo',       descripcion: 'Venta y exportación de ganado bovino de alta calidad.' },
    { ciudad_id: laPaz.id,      nombre: 'Constructora Andes Norte',        rubro: 'Construcción',      telefono: '+591 76789012', correo: 'obras@andesnorte.bo',       descripcion: 'Construcción civil y obras públicas en todo el país.' },
    { ciudad_id: cochabamba.id, nombre: 'Alimentos Naturales Beni',        rubro: 'Alimentos',         telefono: '+591 77890123', correo: 'ventas@alimentosbeni.bo',   descripcion: 'Procesamiento y distribución de alimentos naturales amazónicos.' },
    { ciudad_id: trinidad.id,   nombre: 'Turismo Amazónico S.R.L.',        rubro: 'Turismo',           telefono: '+591 78901234', correo: 'tours@amazonico.bo',        descripcion: 'Ecoturismo y turismo de aventura en la Amazonía beniana.' },
    { ciudad_id: santaCruz.id,  nombre: 'Financiera Oriente S.A.',         rubro: 'Finanzas',          telefono: '+591 79012345', correo: 'info@financieraoriente.bo', descripcion: 'Servicios financieros y microcréditos para el oriente boliviano.' },
  ];

  const empresas = [];
  for (let i = 0; i < empresasData.length; i++) {
    const d = empresasData[i];
    const emp = await prisma.empresa.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        ciudad_id: d.ciudad_id, nombre: d.nombre, rubro: d.rubro,
        telefonoWhatsapp: d.telefono, correoCorporativo: d.correo, descripcion: d.descripcion,
        urlFotoPerfil: `https://ui-avatars.com/api/?name=${encodeURIComponent(d.nombre)}&background=random&size=128`,
        estaActivo: 1,
      },
    });
    empresas.push(emp);
  }

  console.log('✅ 8 empresas creadas');

  // ─── Empresas-Evento (inscripciones con distintos estados) ────────────────
  type EEData = { pago: string; acceso: string; monto: number; participantes: number; obs: string | null };
  const estadosPago: EEData[] = [
    { pago: 'PENDIENTE',   acceso: 'NO_HABILITADO', monto: 800,  participantes: 2, obs: null },
    { pago: 'COMPLETADO',  acceso: 'HABILITADO',    monto: 800,  participantes: 3, obs: null },
    { pago: 'COMPLETADO',  acceso: 'HABILITADO',    monto: 950,  participantes: 3, obs: null },
    { pago: 'PENDIENTE',   acceso: 'NO_HABILITADO', monto: 800,  participantes: 2, obs: null },
    { pago: 'OBSERVADO',   acceso: 'NO_HABILITADO', monto: 800,  participantes: 2, obs: 'El comprobante no muestra claramente el número de transferencia.' },
    { pago: 'COMPLETADO',  acceso: 'HABILITADO',    monto: 1100, participantes: 4, obs: null },
    { pago: 'PENDIENTE',   acceso: 'NO_HABILITADO', monto: 800,  participantes: 2, obs: null },
    { pago: 'RECHAZADO',   acceso: 'BLOQUEADO',     monto: 800,  participantes: 2, obs: 'Comprobante no corresponde al monto correcto.' },
  ];

  const empresasEvento = [];
  for (let i = 0; i < empresas.length; i++) {
    const ep = estadosPago[i];
    const ee = await prisma.empresaevento.upsert({
      where: { id: i + 1 },
      update: {
        estadoVerificacionPago: ep.pago,
        estadoHabilitacionAcceso: ep.acceso,
        estaActivo: 1,
      },
      create: {
        empresa_id: empresas[i].id, evento_id: evento.id, tipoParticipacion: 'EXPOSITOR',
        estadoHabilitacionAcceso: ep.acceso, estadoVerificacionPago: ep.pago,
        montoPagado: ep.monto, numeroParticipantes: ep.participantes,
        fechaHoraEnvioComprobante: new Date(), observacionSobreComprobante: ep.obs, estaActivo: 1,
      },
    });
    empresasEvento.push(ee);
  }

  console.log('✅ 8 empresas inscritas al evento (3 COMPLETADO/HABILITADO)');

  // ─── Comprobantes de pago (iniciales) ─────────────────────────────────────
  for (let i = 0; i < empresasEvento.length; i++) {
    await prisma.empresaeventocomprobantes.upsert({
      where: { id: i + 1 }, update: {},
      create: {
        empresaEvento_id: empresasEvento[i].id,
        urlComprobantePagoInscripcion: 'https://drive.google.com/file/d/demo-comprobante-inicial',
        tipoPago: 'INICIAL',
        estadoPago: 'PENDIENTE',
        estaActivo: 1,
      },
    });
  }

  // ─── Empresa_usuario (representantes) ─────────────────────────────────────
  const cargos = ['Gerente General', 'Directora Comercial', 'CEO', 'Presidente', 'Director de Obras', 'Gerente de Ventas', 'Coordinadora', 'Gerente Financiero'];
  const euIds = [];
  for (let i = 0; i < empresas.length; i++) {
    const eu = await prisma.empresa_usuario.upsert({
      where: { id: i + 1 }, update: { estaActivo: 1 },
      create: {
        empresa_id: empresas[i].id, usuario_id: admin.id,
        empresaevento_id: empresasEvento[i].id, cargo: cargos[i], esResponsable: 1, estaActivo: 1,
      },
    });
    euIds.push(eu.id);
  }

  console.log('✅ Representantes de empresa vinculados');

  // ─── 🧪 EMPRESAS DE PRUEBA — Alpha, Beta, Gamma ───────────────────────────
  const passEmpresa = await bcrypt.hash('Empresa123*', 10);

  // Limpiar TODOS los comprobantes de eeIds test antes de recrearlos
  // Esto garantiza que el historial quede limpio sin duplicados de runs anteriores
  const testEeIds = [9, 10, 11, 12];
  await prisma.empresaeventocomprobantes.deleteMany({
    where: { empresaEvento_id: { in: testEeIds } },
  });
  console.log('✅ Comprobantes de empresas test limpiados (se recrearán a continuación)');

  const testEmpresas = [
    {
      usrId: 10, eeId: 9, euId: 9, empId: 9,
      nombres: 'Alejandro',   apellido: 'Gutiérrez', correo: 'empresa.alpha@test.com',
      nombreEmpresa: 'Empresa Alpha SRL', rubro: 'Agroindustria',
      descripcion: 'Empresa de prueba Alpha para testing del módulo de reuniones.',
      ciudad_id: trinidad.id,
      numeroParticipantes: 5,
    },
    {
      usrId: 11, eeId: 10, euId: 10, empId: 10,
      nombres: 'Beatriz',     apellido: 'Morales',   correo: 'empresa.beta@test.com',
      nombreEmpresa: 'Empresa Beta SRL',  rubro: 'Tecnología',
      descripcion: 'Empresa de prueba Beta para testing del módulo de reuniones.',
      ciudad_id: santaCruz.id,
      numeroParticipantes: 3,
    },
    {
      usrId: 12, eeId: 11, euId: 11, empId: 11,
      nombres: 'Gabriela',    apellido: 'Fernández', correo: 'empresa.gamma@test.com',
      nombreEmpresa: 'Empresa Gamma SRL', rubro: 'Logística',
      descripcion: 'Empresa de prueba Gamma para testing del módulo de reuniones.',
      ciudad_id: laPaz.id,
      numeroParticipantes: 4, // 3 initial + 1 approved additional
    },
  ];

  for (const t of testEmpresas) {
    // Empresa
    const empTest = await prisma.empresa.upsert({
      where: { id: t.empId }, update: { nombre: t.nombreEmpresa },
      create: {
        id: t.empId, ciudad_id: t.ciudad_id, nombre: t.nombreEmpresa,
        rubro: t.rubro, telefonoWhatsapp: '+591 70000000',
        correoCorporativo: t.correo, descripcion: t.descripcion,
        urlFotoPerfil: `https://ui-avatars.com/api/?name=${encodeURIComponent(t.nombreEmpresa)}&background=449D3A&color=fff&size=128`,
        estaActivo: 1,
      },
    });

    // Usuario EMPRESA
    const usrTest = await prisma.usuario.upsert({
      where: { id: t.usrId },
      update: { contrasenia: passEmpresa },
      create: {
        id: t.usrId, nombres: t.nombres, apellidoPaterno: t.apellido,
        correo: t.correo, contrasenia: passEmpresa, telefono: '+591 79999999',
        urlFotoPerfil: `https://ui-avatars.com/api/?name=${encodeURIComponent(t.nombres)}+${encodeURIComponent(t.apellido)}&background=449D3A&color=fff&size=128`,
        rolEvento: 'EMPRESA', estaActivo: 1,
      },
    });

    // EmpresaEvento
    await prisma.empresaevento.upsert({
      where: { id: t.eeId },
      update: {
        estadoVerificacionPago: 'COMPLETADO',
        estadoHabilitacionAcceso: 'HABILITADO',
        estaActivo: 1,
        numeroParticipantes: t.numeroParticipantes,
      },
      create: {
        id: t.eeId, empresa_id: empTest.id, evento_id: evento.id,
        tipoParticipacion: 'EXPOSITOR', estadoHabilitacionAcceso: 'HABILITADO',
        estadoVerificacionPago: 'COMPLETADO', montoPagado: 800,
        numeroParticipantes: t.numeroParticipantes,
        fechaHoraEnvioComprobante: new Date(), estaActivo: 1,
      },
    });

    // Initial comprobante — create fresh (deleteMany above already cleaned the slate)
    await prisma.empresaeventocomprobantes.create({
      data: {
        empresaEvento_id: t.eeId,
        urlComprobantePagoInscripcion: 'https://drive.google.com/file/d/demo-comprobante-inicial',
        tipoPago: 'INICIAL',
        estadoPago: 'COMPLETADO',
        estaActivo: 1,
      },
    });

    // Empresa_usuario encargado — always point to test user
    await prisma.empresa_usuario.upsert({
      where: { id: t.euId },
      update: { usuario_id: usrTest.id, empresa_id: empTest.id, empresaevento_id: t.eeId, estaActivo: 1 },
      create: {
        id: t.euId, empresa_id: empTest.id, usuario_id: usrTest.id,
        empresaevento_id: t.eeId, cargo: 'Gerente General', esResponsable: 1, estaActivo: 1,
      },
    });
  }

  console.log('✅ Empresas de prueba Alpha, Beta y Gamma creadas con usuarios EMPRESA');

  // ─── Participantes adicionales para Alpha ──────────────────────────────────
  // Alpha (eeId=9, empId=9): 3 used slots, 5 paid, 2 available
  const passParticipantes = await bcrypt.hash('Temp1234!', 10);

  await prisma.usuario.upsert({
    where: { id: 13 }, update: {},
    create: {
      id: 13, nombres: 'Marcos', apellidoPaterno: 'Rivero',
      correo: 'marcos.rivero@alpha.test', contrasenia: passParticipantes, telefono: '+591 71111001',
      urlFotoPerfil: 'https://ui-avatars.com/api/?name=Marcos+Rivero&background=449D3A&color=fff&size=128',
      rolEvento: 'EMPRESA', estaActivo: 1,
    },
  });
  await prisma.empresa_usuario.upsert({
    where: { id: 12 }, update: { estaActivo: 1 },
    create: {
      id: 12, empresa_id: 9, usuario_id: 13, empresaevento_id: 9,
      cargo: 'Analista Comercial', esResponsable: 0, estaActivo: 1,
    },
  });

  await prisma.usuario.upsert({
    where: { id: 14 }, update: {},
    create: {
      id: 14, nombres: 'Sofía', apellidoPaterno: 'Mendoza',
      correo: 'sofia.mendoza@alpha.test', contrasenia: passParticipantes, telefono: '+591 71111002',
      urlFotoPerfil: 'https://ui-avatars.com/api/?name=Sofia+Mendoza&background=449D3A&color=fff&size=128',
      rolEvento: 'EMPRESA', estaActivo: 1,
    },
  });
  await prisma.empresa_usuario.upsert({
    where: { id: 13 }, update: { estaActivo: 1 },
    create: {
      id: 13, empresa_id: 9, usuario_id: 14, empresaevento_id: 9,
      cargo: 'Asistente de Ventas', esResponsable: 0, estaActivo: 1,
    },
  });

  console.log('✅ Participantes adicionales Alpha creados (3 usados, 5 pagados, 2 disponibles)');

  // ─── Participante adicional para Beta ─────────────────────────────────────
  // Beta (eeId=10, empId=10): 2 used slots, 3 paid, 1 available
  await prisma.usuario.upsert({
    where: { id: 15 }, update: {},
    create: {
      id: 15, nombres: 'Carlos', apellidoPaterno: 'Quispe',
      correo: 'carlos.quispe@beta.test', contrasenia: passParticipantes, telefono: '+591 72222001',
      urlFotoPerfil: 'https://ui-avatars.com/api/?name=Carlos+Quispe&background=0ea5e9&color=fff&size=128',
      rolEvento: 'EMPRESA', estaActivo: 1,
    },
  });
  await prisma.empresa_usuario.upsert({
    where: { id: 14 }, update: { estaActivo: 1 },
    create: {
      id: 14, empresa_id: 10, usuario_id: 15, empresaevento_id: 10,
      cargo: 'Desarrollador', esResponsable: 0, estaActivo: 1,
    },
  });

  // Beta additional payment comprobante (PENDIENTE)
  await prisma.empresaeventocomprobantes.create({
    data: {
      empresaEvento_id: 10,
      urlComprobantePagoInscripcion: 'https://drive.google.com/file/d/demo-beta-adicional',
      tipoPago: 'ADICIONAL',
      cantidadParticipantes: 2,
      montoPago: 300.00,
      estadoPago: 'PENDIENTE',
      estaActivo: 1,
    },
  });

  console.log('✅ Participante adicional Beta creado con comprobante adicional PENDIENTE');

  // ─── Participante adicional para Gamma ────────────────────────────────────
  // Gamma (eeId=11, empId=11): 2 used slots, 4 paid (3 initial + 1 approved)
  await prisma.usuario.upsert({
    where: { id: 16 }, update: {},
    create: {
      id: 16, nombres: 'Diana', apellidoPaterno: 'Vargas',
      correo: 'diana.vargas@gamma.test', contrasenia: passParticipantes, telefono: '+591 73333001',
      urlFotoPerfil: 'https://ui-avatars.com/api/?name=Diana+Vargas&background=f59e0b&color=fff&size=128',
      rolEvento: 'EMPRESA', estaActivo: 1,
    },
  });
  await prisma.empresa_usuario.upsert({
    where: { id: 15 }, update: { estaActivo: 1 },
    create: {
      id: 15, empresa_id: 11, usuario_id: 16, empresaevento_id: 11,
      cargo: 'Coordinadora Logística', esResponsable: 0, estaActivo: 1,
    },
  });

  // Gamma additional payment comprobante (COMPLETADO - already approved)
  await prisma.empresaeventocomprobantes.create({
    data: {
      empresaEvento_id: 11,
      urlComprobantePagoInscripcion: 'https://drive.google.com/file/d/demo-gamma-adicional',
      tipoPago: 'ADICIONAL',
      cantidadParticipantes: 1,
      montoPago: 150.00,
      estadoPago: 'COMPLETADO',
      estaActivo: 1,
    },
  });

  console.log('✅ Participante adicional Gamma creado con comprobante adicional COMPLETADO');

  // ─── Empresa Delta — pago adicional RECHAZADO ─────────────────────────────
  // Delta (eeId=12, empId=12): 1 used slot, 2 paid, 0 available, additional RECHAZADO
  const empDelta = await prisma.empresa.upsert({
    where: { id: 12 }, update: { nombre: 'Empresa Delta SRL' },
    create: {
      id: 12, ciudad_id: cochabamba.id, nombre: 'Empresa Delta SRL',
      rubro: 'Consultoría', telefonoWhatsapp: '+591 74444001',
      correoCorporativo: 'empresa.delta@test.com', descripcion: 'Empresa de prueba Delta para testing de pago adicional rechazado.',
      urlFotoPerfil: 'https://ui-avatars.com/api/?name=Empresa+Delta&background=dc2626&color=fff&size=128',
      estaActivo: 1,
    },
  });

  const usrDelta = await prisma.usuario.upsert({
    where: { id: 17 },
    update: { contrasenia: passEmpresa },
    create: {
      id: 17, nombres: 'Roberto', apellidoPaterno: 'Alvarado',
      correo: 'empresa.delta@test.com', contrasenia: passEmpresa, telefono: '+591 74444001',
      urlFotoPerfil: 'https://ui-avatars.com/api/?name=Roberto+Alvarado&background=dc2626&color=fff&size=128',
      rolEvento: 'EMPRESA', estaActivo: 1,
    },
  });

  await prisma.empresaevento.upsert({
    where: { id: 12 },
    update: { estadoVerificacionPago: 'COMPLETADO', estadoHabilitacionAcceso: 'HABILITADO', estaActivo: 1, numeroParticipantes: 2 },
    create: {
      id: 12, empresa_id: empDelta.id, evento_id: evento.id,
      tipoParticipacion: 'EXPOSITOR', estadoHabilitacionAcceso: 'HABILITADO',
      estadoVerificacionPago: 'COMPLETADO', montoPagado: 800,
      numeroParticipantes: 2, // stays 2: additional was rejected
      fechaHoraEnvioComprobante: new Date(), estaActivo: 1,
    },
  });

  await prisma.empresa_usuario.upsert({
    where: { id: 16 },
    update: { usuario_id: usrDelta.id, empresa_id: empDelta.id, empresaevento_id: 12, estaActivo: 1 },
    create: {
      id: 16, empresa_id: empDelta.id, usuario_id: usrDelta.id,
      empresaevento_id: 12, cargo: 'Director General', esResponsable: 1, estaActivo: 1,
    },
  });

  // Delta initial comprobante (COMPLETADO)
  await prisma.empresaeventocomprobantes.create({
    data: {
      empresaEvento_id: 12,
      urlComprobantePagoInscripcion: 'https://drive.google.com/file/d/demo-delta-inicial',
      tipoPago: 'INICIAL',
      estadoPago: 'COMPLETADO',
      estaActivo: 1,
    },
  });

  // Delta additional payment comprobante (RECHAZADO)
  await prisma.empresaeventocomprobantes.create({
    data: {
      empresaEvento_id: 12,
      urlComprobantePagoInscripcion: 'https://drive.google.com/file/d/demo-delta-adicional',
      tipoPago: 'ADICIONAL',
      cantidadParticipantes: 2,
      montoPago: 300.00,
      estadoPago: 'RECHAZADO',
      observacion: 'El enlace del comprobante está roto y no corresponde al monto requerido.',
      estaActivo: 1,
    },
  });

  console.log('✅ Empresa Delta creada con comprobante adicional RECHAZADO');

  // ─── Mesas ─────────────────────────────────────────────────────────────────
  // Clean duplicate mesas by numeroMesa - keep only lowest ID per number
  const allMesasForEvento = await prisma.mesa.findMany({
    where: { evento_id: evento.id },
    orderBy: { id: 'asc' },
  });
  const seenNums = new Set<number>();
  for (const m of allMesasForEvento) {
    if (seenNums.has(m.numeroMesa)) {
      // Check if any reuniones reference this mesa, if not, delete it
      const hasReuniones = await prisma.reunion.count({ where: { mesa_id: m.id } });
      if (!hasReuniones) await prisma.mesa.delete({ where: { id: m.id } });
    } else {
      seenNums.add(m.numeroMesa);
    }
  }

  // Now ensure 15 mesas exist
  const remainingMesas = await prisma.mesa.findMany({
    where: { evento_id: evento.id },
    orderBy: { id: 'asc' },
  });

  let mesaDemoId = remainingMesas[0]?.id ?? 1;

  if (remainingMesas.length < 15) {
    // Find which numbers are missing
    const existingNums = new Set(remainingMesas.map((m) => m.numeroMesa));
    for (let i = 1; i <= 15; i++) {
      if (!existingNums.has(i)) {
        await prisma.mesa.create({
          data: {
            evento_id: evento.id, numeroMesa: i, capacidadPersonas: 4,
            estaActivo: i <= 12 ? 1 : 0,
            estaHabilitada: i <= 12 ? 1 : 0,
          },
        });
      }
    }
  } else {
    // Update habilitacion on existing mesas
    const allMesas = await prisma.mesa.findMany({
      where: { evento_id: evento.id },
      orderBy: { numeroMesa: 'asc' },
      take: 15,
    });
    for (let i = 0; i < allMesas.length; i++) {
      const habilitada = i < 12 ? 1 : 0;
      await prisma.mesa.update({
        where: { id: allMesas[i].id },
        data: { estaHabilitada: habilitada, estaActivo: habilitada },
      });
      if (i === 0) mesaDemoId = allMesas[i].id;
    }
  }

  // Refresh to get first mesa id for demo reunion
  const firstMesa = await prisma.mesa.findFirst({
    where: { evento_id: evento.id },
    orderBy: { numeroMesa: 'asc' },
  });
  mesaDemoId = firstMesa?.id ?? mesaDemoId;

  console.log('✅ 15 mesas creadas/actualizadas (12 habilitadas, 3 inactivas)');

  // ─── Solicitudes demo ─────────────────────────────────────────────────────
  // Helper: find or create a solicitud by unique business key
  async function findOrCreateSolicitud(
    eeId: number, recId: number, euId: number, tipo: string,
    ini: Date, fin: Date, estado: string, extras: Record<string, unknown> = {}
  ) {
    const existing = await prisma.solicitudreunion.findFirst({
      where: { empresaEvento_id: eeId, empresaEventorReceptora_id: recId, fechaHoraInicioPropuesta: ini, estaActivo: 1 },
    });
    if (existing) return existing;
    return prisma.solicitudreunion.create({
      data: {
        empresaEvento_id: eeId,
        empresaEventorReceptora_id: recId,
        empresa_usuarioResponsableSolicitud: euId,
        tipoReunion: tipo,
        fechaHoraInicioPropuesta: ini,
        fechaHoraFinPropuesta: fin,
        estadoSolicitud: estado,
        estaActivo: 1,
        ...extras,
      },
    });
  }

  async function findOrCreateReunion(
    solicitudId: number, mesaId: number, tipo: string,
    ini: Date, fin: Date, estado: string, asistentes: number
  ) {
    const existing = await prisma.reunion.findFirst({
      where: { solicitudReunion_id: solicitudId, estaActivo: 1 },
    });
    if (existing) return existing;
    return prisma.reunion.create({
      data: {
        solicitudReunion_id: solicitudId,
        mesa_id: mesaId,
        evento_id: evento.id,
        tipoReunion: tipo,
        fechaHoraInicioReunion: ini,
        fechaHoraFinReunion: fin,
        estadoReunion: estado,
        cantidadAsistentesRegistrados: asistentes,
        seEnvioNotificacionDeRetraso: 0,
        estaActivo: 1,
      },
    });
  }

  // Demo: empresasEvento[1] → empresasEvento[2]
  const solExistente = await findOrCreateSolicitud(
    empresasEvento[1].id, empresasEvento[2].id, euIds[1], 'PRESENCIAL',
    new Date('2026-09-15T09:00:00'), new Date('2026-09-15T09:20:00'), 'ACEPTADA'
  );

  await findOrCreateSolicitud(
    empresasEvento[2].id, empresasEvento[5].id, euIds[2], 'VIRTUAL',
    new Date('2026-09-15T10:00:00'), new Date('2026-09-15T10:20:00'), 'PENDIENTE',
    { enlaceReunionVirtual: 'https://meet.google.com/abc-defg-hij' }
  );

  await findOrCreateSolicitud(
    empresasEvento[5].id, empresasEvento[1].id, euIds[5], 'PRESENCIAL',
    new Date('2026-09-15T11:00:00'), new Date('2026-09-15T11:20:00'), 'RECHAZADA',
    { motivoRechazoSolicitud: 'No disponemos de tiempo en ese horario.' }
  );

  // Alpha → Beta solicitud (ACEPTADA)
  const solAlphaBeta = await findOrCreateSolicitud(
    9, 10, 9, 'PRESENCIAL',
    new Date('2026-09-15T09:00:00'), new Date('2026-09-15T09:20:00'), 'ACEPTADA'
  );

  // Beta → Gamma solicitud (ACEPTADA)
  const solBetaGamma = await findOrCreateSolicitud(
    10, 11, 10, 'PRESENCIAL',
    new Date('2025-09-15T10:00:00'), new Date('2025-09-15T10:20:00'), 'ACEPTADA'
  );

  // Reunión demo 1 (FINALIZADA - past date)
  const reunion1 = await findOrCreateReunion(
    solExistente.id, mesaDemoId, 'PRESENCIAL',
    new Date('2025-09-15T09:00:00'), new Date('2025-09-15T09:20:00'), 'FINALIZADA', 4
  );

  // Reunión Alpha-Beta (PROGRAMADA - future)
  const reunion2 = await findOrCreateReunion(
    solAlphaBeta.id, mesaDemoId, 'PRESENCIAL',
    new Date('2026-09-15T09:00:00'), new Date('2026-09-15T09:20:00'), 'PROGRAMADA', 0
  );

  // Reunión Beta-Gamma (FINALIZADA - past)
  const reunion3 = await findOrCreateReunion(
    solBetaGamma.id, mesaDemoId, 'PRESENCIAL',
    new Date('2025-09-15T10:00:00'), new Date('2025-09-15T10:20:00'), 'FINALIZADA', 4
  );

  console.log('✅ Solicitudes y reuniones demo creadas');

  // ─── Resultados de reuniones ───────────────────────────────────────────────
  async function findOrCreateResultado(
    reunionId: number, calificadoraId: number, calificadaId: number,
    euId: number, rating: number, rango: string, obs: string
  ) {
    const existing = await prisma.resultadoreunion.findFirst({
      where: { reunion_id: reunionId, empresaeventoCalificadora_id: calificadoraId },
    });
    if (existing) return existing;
    return prisma.resultadoreunion.create({
      data: {
        reunion_id: reunionId,
        empresaeventoCalificadora_id: calificadoraId,
        empresaeventoCalificada_id: calificadaId,
        empresa_usuario_id: euId,
        calificacionReunion: rating,
        rangoAcuerdoComercial: rango,
        observacionesPuntosTratados: obs,
        estaActivo: 1,
      },
    });
  }

  // Resultado for reunion 1 (demo): empresa 2 evaluates empresa 3
  await findOrCreateResultado(
    reunion1.id, empresasEvento[1].id, empresasEvento[2].id,
    euIds[1], 4, 'Hasta $us 50.000', 'Excelente reunión, muy productiva.'
  );

  // Resultado for reunion 3 (Beta→Gamma)
  await findOrCreateResultado(
    reunion3.id, 10, 11, 10, 5, 'Hasta $us 100.000', 'Acuerdo comercial prometedor en logística.'
  );

  console.log('✅ Resultados de reuniones creados');

  // ─── Actividades del Programa ──────────────────────────────────────────────
  const actividadesData = [
    { id: 1, tipo: 'CONFERENCIA', estado: 'PROGRAMADA',
      nombre: 'Apertura Oficial IX Rueda de Negocios del Beni',
      descripcion: 'Ceremonia de apertura con autoridades departamentales y nacionales.',
      sala: 'Auditorio Principal', capacidad: 200, fecha: new Date('2026-09-15'),
      hIni: 8, mIni: 0, hFin: 9, mFin: 0,
      expositor: 'Dr. Alejandro Melgar Pedraza', org: 'Gobernación del Beni' },
    { id: 2, tipo: 'TALLER', estado: 'PROGRAMADA',
      nombre: 'Estrategias de Internacionalización para PyMEs Amazónicas',
      descripcion: 'Taller práctico sobre cómo preparar tu empresa para exportar productos amazónicos.',
      sala: 'Sala de Capacitación A', capacidad: 60, fecha: new Date('2026-09-15'),
      hIni: 10, mIni: 0, hFin: 12, mFin: 0,
      expositor: 'Lic. Patricia Zuazo Ibáñez', org: 'Cámara de Exportadores de Bolivia' },
    { id: 3, tipo: 'PANEL', estado: 'PROGRAMADA',
      nombre: 'Financiamiento e Inversión en el Agro-Beni: Oportunidades 2026',
      descripcion: 'Panel de expertos sobre acceso a financiamiento para el sector agropecuario beniano.',
      sala: 'Sala de Conferencias B', capacidad: 80, fecha: new Date('2026-09-15'),
      hIni: 14, mIni: 0, hFin: 16, mFin: 0,
      expositor: 'Ing. Mario Salvatierra Ruiz', org: 'BancoSol S.A.' },
    { id: 4, tipo: 'CONFERENCIA', estado: 'PROGRAMADA',
      nombre: 'Tecnología e Innovación para el Sector Ganadero',
      descripcion: 'Presentación de tecnologías de punta para mejorar la productividad ganadera.',
      sala: 'Auditorio Principal', capacidad: 200, fecha: new Date('2026-09-16'),
      hIni: 9, mIni: 0, hFin: 10, mFin: 30,
      expositor: 'Dr. Juan Carlos Flores Méndez', org: 'Universidad Autónoma del Beni' },
    { id: 5, tipo: 'NETWORKING', estado: 'PROGRAMADA',
      nombre: 'Ronda de Negocios — Sesión Matutina',
      descripcion: 'Sesión de reuniones bilaterales programadas entre empresas participantes.',
      sala: 'Salón Principal de Reuniones', capacidad: 120, fecha: new Date('2026-09-15'),
      hIni: 8, mIni: 0, hFin: 13, mFin: 0,
      expositor: '', org: 'Organización Rueda de Negocios del Beni' },
    { id: 6, tipo: 'NETWORKING', estado: 'PROGRAMADA',
      nombre: 'Ronda de Negocios — Sesión Vespertina',
      descripcion: 'Continuación de la sesión de reuniones bilaterales programadas.',
      sala: 'Salón Principal de Reuniones', capacidad: 120, fecha: new Date('2026-09-15'),
      hIni: 14, mIni: 0, hFin: 18, mFin: 0,
      expositor: '', org: 'Organización Rueda de Negocios del Beni' },
    { id: 7, tipo: 'CLAUSURA', estado: 'PROGRAMADA',
      nombre: 'Ceremonia de Clausura y Firma de Acuerdos',
      descripcion: 'Presentación de resultados del evento y firma de los acuerdos comerciales alcanzados.',
      sala: 'Auditorio Principal', capacidad: 200, fecha: new Date('2026-09-16'),
      hIni: 17, mIni: 0, hFin: 18, mFin: 0,
      expositor: '', org: 'Gobernación del Beni' },
  ];

  for (const a of actividadesData) {
    await prisma.actividadprograma.upsert({
      where: { id: a.id },
      update: {
        fechaActividad: a.fecha,
        nombreActividad: a.nombre,
      },
      create: {
        evento_id: evento.id, tipoActividad: a.tipo, nombreActividad: a.nombre,
        descripcionActividad: a.descripcion, nombreSalaEspacio: a.sala,
        capacidadPersonasSala: a.capacidad, fechaActividad: a.fecha,
        horaInicioActividad: new Date(1970, 0, 1, a.hIni, a.mIni, 0),
        horaFinActividad:    new Date(1970, 0, 1, a.hFin, a.mFin, 0),
        nombreCompletoPilaExpositor: a.expositor || undefined,
        organizacionDelExpositor: a.org || undefined,
        estadoActividad: a.estado, estaActivo: 1,
      },
    });
  }

  console.log('✅ 7 actividades del programa creadas/actualizadas con fechas futuras');

  // ─── Noticias / Comunicados ────────────────────────────────────────────────
  const noticiasData = [
    { id: 1, titulo: '¡Bienvenidos a la IX Rueda de Negocios del Beni 2024!',
      contenido: 'Nos complace anunciar que ya está abierta la inscripción para la IX edición de la Rueda de Negocios del Beni. Este año esperamos más de 80 empresas participantes de toda Bolivia.',
      tipo: 'NOTICIA', estado: 'PUBLICADO',
      urlImg: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800' },
    { id: 2, titulo: 'Cronograma de actividades confirmado para el 15 y 16 de septiembre',
      contenido: 'El cronograma oficial de conferencias, talleres y paneles ya está disponible. Planifica tu participación con anticipación para aprovechar todas las oportunidades de networking.',
      tipo: 'COMUNICADO', estado: 'PUBLICADO',
      urlImg: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800' },
    { id: 3, titulo: 'Instrucciones para usar el sistema de reuniones en línea',
      contenido: 'El sistema de agendamiento de reuniones ya está disponible. Ingresa con tu correo y contraseña para ver el directorio de empresas participantes y solicitar reuniones bilaterales. Las reuniones tienen una duración de 20 minutos con 5 minutos de transición.',
      tipo: 'COMUNICADO', estado: 'PUBLICADO',
      urlImg: null },
    { id: 4, titulo: 'Importante: Protocolo de salud y seguridad para el evento',
      contenido: 'Se solicita a todos los participantes presentar su carnet de identidad en el ingreso. El uso de identificación con cinta del evento es obligatorio dentro del recinto ferial.',
      tipo: 'AVISO', estado: 'PUBLICADO',
      urlImg: null },
  ];

  for (const n of noticiasData) {
    await prisma.noticia.upsert({
      where: { id: n.id }, update: {},
      create: {
        evento_id: evento.id, usuario_id: admin.id,
        tituloNoticia: n.titulo, contenidoNoticia: n.contenido,
        urlImagenNoticia: n.urlImg, tipoNoticia: n.tipo,
        estadoPublicacion: n.estado, fechaHoraPublicacion: new Date(), estaActivo: 1,
      },
    });
  }

  console.log('✅ 4 noticias/comunicados creados');

  // ─── Resumen final ─────────────────────────────────────────────────────────
  console.log('\n🎉 Seed completado exitosamente!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  👤 Admin / Técnicos:');
  console.log('     admin@ruedabeni.bo         | admin123');
  console.log('     mfernanda@ruedabeni.bo     | tecnico123');
  console.log('     rmolina@ruedabeni.bo       | tecnico123');
  console.log('  🏢 Empresas de prueba (EMPRESA):');
  console.log('     empresa.alpha@test.com     | Empresa123*  →  Empresa Alpha SRL  (eeId=9)');
  console.log('     empresa.beta@test.com      | Empresa123*  →  Empresa Beta SRL   (eeId=10)');
  console.log('     empresa.gamma@test.com     | Empresa123*  →  Empresa Gamma SRL  (eeId=11)');
  console.log('     empresa.delta@test.com     | Empresa123*  →  Empresa Delta SRL  (eeId=12)');
  console.log('  📊 Slots y pagos adicionales:');
  console.log('     Alpha: 3 usados / 5 pagados / 2 disponibles / máx 5');
  console.log('     Beta:  2 usados / 3 pagados / 1 disponible  / máx 5  (+2 cupos PENDIENTE)');
  console.log('     Gamma: 2 usados / 4 pagados / 2 disponibles / máx 5  (+1 cupo COMPLETADO)');
  console.log('     Delta: 1 usados / 2 pagados / 1 disponible  / máx 5  (+2 cupos RECHAZADO)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  • 12 empresas (8 demo + 4 test con usuarios reales EMPRESA)');
  console.log('  • 15 mesas (12 habilitadas con estaHabilitada=1)');
  console.log('  • 7 actividades del programa (fechas futuras 2026-09-15/16)');
  console.log('  • 4 noticias/comunicados publicados');
  console.log('  • 5 solicitudes demo y 3 reuniones');
  console.log('  • 2 resultados de reuniones');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => { console.error('❌ Error en seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
