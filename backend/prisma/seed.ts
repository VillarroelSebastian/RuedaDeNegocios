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
    update: {},
    create: {
      nombre: 'IX Rueda de Negocios del Beni 2024',
      edicion: 'IX',
      descripcion: 'El encuentro empresarial más importante del departamento del Beni, Bolivia.',
      fechaInicioEvento: new Date('2024-09-15T08:00:00'),
      fechaFinEvento: new Date('2024-09-16T18:00:00'),
      duracionReunion: 20,
      tiempoEntreReuniones: 5,
      cantidadTotalMesasEvento: 15,
      capacidadPersonasPorMesa: 4,
      montoBaseIncripcionBolivianos: 800.0,
      cantidadParticipantesIncluidos: 2,
      costoParticipanteExtra: 150,
      sobreElEvento: 'Espacio de encuentro para empresas del Beni y Bolivia que buscan establecer alianzas comerciales estratégicas.',
      correoContacto: 'contacto@ruedadenegociosbeni.bo',
      telefonoContacto: '+591 3 4621890',
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
      nombres: 'Carlos Eduardo',
      apellidoPaterno: 'Suárez',
      apellidoMaterno: 'Vaca',
      correo: 'admin@ruedabeni.bo',
      contrasenia: passAdmin,
      telefono: '+591 71234567',
      urlFotoPerfil: 'https://ui-avatars.com/api/?name=Carlos+Suarez&background=16a34a&color=fff&size=128',
      rolEvento: 'Administrador',
      estaActivo: 1,
    },
  });

  await prisma.usuario.upsert({
    where: { id: 2 },
    update: {},
    create: {
      nombres: 'María Fernanda',
      apellidoPaterno: 'Justiniano',
      apellidoMaterno: 'Paz',
      correo: 'mfernanda@ruedabeni.bo',
      contrasenia: passTecnico,
      telefono: '+591 76543210',
      urlFotoPerfil: 'https://ui-avatars.com/api/?name=Maria+Justiniano&background=0ea5e9&color=fff&size=128',
      rolEvento: 'TECNICO',
      estaActivo: 1,
    },
  });

  await prisma.usuario.upsert({
    where: { id: 3 },
    update: {},
    create: {
      nombres: 'Roberto',
      apellidoPaterno: 'Molina',
      apellidoMaterno: 'Chávez',
      correo: 'rmolina@ruedabeni.bo',
      contrasenia: passTecnico,
      telefono: '+591 77891234',
      urlFotoPerfil: 'https://ui-avatars.com/api/?name=Roberto+Molina&background=f59e0b&color=fff&size=128',
      rolEvento: 'TECNICO',
      estaActivo: 1,
    },
  });

  console.log('✅ Usuarios creados (admin + 2 técnicos)');

  // ─── Empresas ──────────────────────────────────────────────────────────────
  const empresasData = [
    { ciudad_id: trinidad.id,    nombre: 'Agropecuaria El Mamoré S.R.L.',  rubro: 'Agropecuaria',      telefono: '+591 72345678', correo: 'contacto@mamore.bo',          descripcion: 'Producción y comercialización de productos agropecuarios del Beni.' },
    { ciudad_id: trinidad.id,    nombre: 'Maderera Beni Export',            rubro: 'Madera y Forestal', telefono: '+591 73456789', correo: 'ventas@beniexport.bo',         descripcion: 'Exportación de madera certificada y productos forestales.' },
    { ciudad_id: santaCruz.id,   nombre: 'TechSur Bolivia S.A.',            rubro: 'Tecnología',        telefono: '+591 74567890', correo: 'info@techsur.bo',              descripcion: 'Soluciones tecnológicas y software empresarial.' },
    { ciudad_id: trinidad.id,    nombre: 'Ganadería Trinidad LTDA.',        rubro: 'Ganadería',         telefono: '+591 75678901', correo: 'ganados@trinidad.bo',          descripcion: 'Venta y exportación de ganado bovino de alta calidad.' },
    { ciudad_id: laPaz.id,       nombre: 'Constructora Andes Norte',        rubro: 'Construcción',      telefono: '+591 76789012', correo: 'obras@andesnorte.bo',          descripcion: 'Construcción civil y obras públicas en todo el país.' },
    { ciudad_id: cochabamba.id,  nombre: 'Alimentos Naturales Beni',        rubro: 'Alimentos',         telefono: '+591 77890123', correo: 'ventas@alimentosbeni.bo',      descripcion: 'Procesamiento y distribución de alimentos naturales amazónicos.' },
    { ciudad_id: trinidad.id,    nombre: 'Turismo Amazónico S.R.L.',        rubro: 'Turismo',           telefono: '+591 78901234', correo: 'tours@amazonico.bo',           descripcion: 'Ecoturismo y turismo de aventura en la Amazonía beniana.' },
    { ciudad_id: santaCruz.id,   nombre: 'Financiera Oriente S.A.',         rubro: 'Finanzas',          telefono: '+591 79012345', correo: 'info@financieraoriente.bo',    descripcion: 'Servicios financieros y microcréditos para el oriente boliviano.' },
  ];

  const empresas = [];
  for (let i = 0; i < empresasData.length; i++) {
    const d = empresasData[i];
    const emp = await prisma.empresa.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        ciudad_id: d.ciudad_id,
        nombre: d.nombre,
        rubro: d.rubro,
        telefonoWhatsapp: d.telefono,
        correoCorporativo: d.correo,
        descripcion: d.descripcion,
        urlFotoPerfil: `https://ui-avatars.com/api/?name=${encodeURIComponent(d.nombre)}&background=random&size=128`,
        estaActivo: 1,
      },
    });
    empresas.push(emp);
  }

  console.log('✅ 8 empresas creadas');

  // ─── Empresas-Evento (inscripciones con distintos estados de pago) ─────────
  type EmpresaEventoData = {
    estadoVerificacionPago: string;
    estadoHabilitacionAcceso: string;
    monto: number;
    participantes: number;
    observacion: string | null;
  };

  const estadosPago: EmpresaEventoData[] = [
    { estadoVerificacionPago: 'PENDIENTE',  estadoHabilitacionAcceso: 'PENDIENTE',  monto: 800,  participantes: 2, observacion: null },
    { estadoVerificacionPago: 'APROBADO',   estadoHabilitacionAcceso: 'HABILITADO', monto: 800,  participantes: 3, observacion: null },
    { estadoVerificacionPago: 'APROBADO',   estadoHabilitacionAcceso: 'HABILITADO', monto: 950,  participantes: 3, observacion: null },
    { estadoVerificacionPago: 'PENDIENTE',  estadoHabilitacionAcceso: 'PENDIENTE',  monto: 800,  participantes: 2, observacion: null },
    { estadoVerificacionPago: 'OBSERVADO',  estadoHabilitacionAcceso: 'PENDIENTE',  monto: 800,  participantes: 2, observacion: 'El comprobante no muestra claramente el número de transferencia. Favor reenviar con mejor calidad.' },
    { estadoVerificacionPago: 'APROBADO',   estadoHabilitacionAcceso: 'HABILITADO', monto: 1100, participantes: 4, observacion: null },
    { estadoVerificacionPago: 'PENDIENTE',  estadoHabilitacionAcceso: 'PENDIENTE',  monto: 800,  participantes: 2, observacion: null },
    { estadoVerificacionPago: 'RECHAZADO',  estadoHabilitacionAcceso: 'RECHAZADO',  monto: 800,  participantes: 2, observacion: 'Comprobante no corresponde al monto correcto.' },
  ];

  const empresasEvento = [];
  for (let i = 0; i < empresas.length; i++) {
    const ep = estadosPago[i];
    const ee = await prisma.empresaevento.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        empresa_id: empresas[i].id,
        evento_id: evento.id,
        tipoParticipacion: 'EXPOSITOR',
        estadoHabilitacionAcceso: ep.estadoHabilitacionAcceso,
        estadoVerificacionPago: ep.estadoVerificacionPago,
        montoPagado: ep.monto,
        numeroParticipantes: ep.participantes,
        fechaHoraEnvioComprobante: new Date(),
        observacionSobreComprobante: ep.observacion,
        estaActivo: 1,
      },
    });
    empresasEvento.push(ee);
  }

  console.log('✅ 8 empresas inscritas al evento con distintos estados de pago');

  // ─── Comprobantes de pago ──────────────────────────────────────────────────
  for (let i = 0; i < empresasEvento.length; i++) {
    await prisma.empresaeventocomprobantes.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        empresaEvento_id: empresasEvento[i].id,
        urlComprobantePagoInscripcion: 'https://res.cloudinary.com/dk5u8dljb/image/upload/v1/samples/ecommerce/analog-clock.jpg',
        estaActivo: 1,
      },
    });
  }

  console.log('✅ Comprobantes de pago creados');

  // ─── Empresa_usuario (representantes) ─────────────────────────────────────
  const cargos = ['Gerente General', 'Directora Comercial', 'CEO', 'Presidente', 'Director de Obras', 'Gerente de Ventas', 'Coordinadora', 'Gerente Financiero'];
  const euIds = [];
  for (let i = 0; i < empresas.length; i++) {
    const eu = await prisma.empresa_usuario.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        empresa_id: empresas[i].id,
        usuario_id: admin.id,
        empresaevento_id: empresasEvento[i].id,
        cargo: cargos[i],
        esResponsable: 1,
      },
    });
    euIds.push(eu.id);
  }

  console.log('✅ Representantes de empresa vinculados');

  // ─── Mesas ─────────────────────────────────────────────────────────────────
  for (let i = 1; i <= 15; i++) {
    await prisma.mesa.upsert({
      where: { id: i },
      update: {},
      create: {
        evento_id: evento.id,
        numeroMesa: i,
        capacidadPersonas: 4,
        estaActivo: i <= 12 ? 1 : 0,
      },
    });
  }

  console.log('✅ 15 mesas creadas (12 activas, 3 inactivas)');

  // ─── Solicitudes y Reuniones ───────────────────────────────────────────────
  const estadosSolicitud = ['ACEPTADA', 'PENDIENTE', 'COMPLETADA'];
  const estadosReunion   = ['PROGRAMADA', 'EN_CURSO', 'COMPLETADA'];

  const solicitudes = [];
  for (let i = 0; i < 3; i++) {
    const sol = await prisma.solicitudreunion.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        empresaEvento_id: empresasEvento[i].id,
        empresaEventorReceptora_id: empresasEvento[(i + 2) % 6 + 1].id,
        empresa_usuarioResponsableSolicitud: euIds[i],
        tipoReunion: 'PRESENCIAL',
        fechaHoraInicioPropuesta: new Date('2024-09-15T09:00:00'),
        fechaHoraFinPropuesta: new Date('2024-09-15T09:20:00'),
        estadoSolicitud: estadosSolicitud[i],
        estaActivo: 1,
      },
    });
    solicitudes.push(sol);
  }

  const horasReunion = [9, 10, 11];
  for (let i = 0; i < 3; i++) {
    const h = String(horasReunion[i]).padStart(2, '0');
    await prisma.reunion.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        solicitudReunion_id: solicitudes[i].id,
        mesa_id: i + 1,
        evento_id: evento.id,
        tipoReunion: 'PRESENCIAL',
        fechaHoraInicioReunion: new Date(`2024-09-15T${h}:00:00`),
        fechaHoraFinReunion:    new Date(`2024-09-15T${h}:20:00`),
        estadoReunion: estadosReunion[i],
        cantidadAsistentesRegistrados: i === 2 ? 4 : 0,
        seEnvioNotificacionDeRetraso: 0,
        estaActivo: 1,
      },
    });
  }

  console.log('✅ 3 solicitudes y 3 reuniones creadas');

  // ─── Actividades del Programa ──────────────────────────────────────────────
  const actividadesData = [
    {
      tipo: 'CONFERENCIA', estadoActividad: 'PROGRAMADA',
      nombre: 'Apertura Oficial IX Rueda de Negocios del Beni',
      descripcion: 'Ceremonia de apertura con autoridades departamentales y nacionales. Presentación de la agenda y objetivos del evento.',
      sala: 'Auditorio Principal', capacidad: 200, fecha: new Date('2024-09-15'),
      hIni: 8, mIni: 0, hFin: 9, mFin: 0,
      expositor: 'Dr. Alejandro Melgar Pedraza', org: 'Gobernación del Beni',
    },
    {
      tipo: 'TALLER', estadoActividad: 'EN_CURSO',
      nombre: 'Estrategias de Internacionalización para PyMEs Amazónicas',
      descripcion: 'Taller práctico sobre cómo preparar tu empresa para exportar productos amazónicos al mercado internacional.',
      sala: 'Sala de Capacitación A', capacidad: 60, fecha: new Date('2024-09-15'),
      hIni: 10, mIni: 0, hFin: 12, mFin: 0,
      expositor: 'Lic. Patricia Zuazo Ibáñez', org: 'Cámara de Exportadores de Bolivia',
    },
    {
      tipo: 'PANEL', estadoActividad: 'PROGRAMADA',
      nombre: 'Financiamiento e Inversión en el Agro-Beni: Oportunidades 2024',
      descripcion: 'Panel de expertos sobre acceso a financiamiento para el sector agropecuario beniano con representantes de banca nacional.',
      sala: 'Sala de Conferencias B', capacidad: 80, fecha: new Date('2024-09-15'),
      hIni: 14, mIni: 0, hFin: 16, mFin: 0,
      expositor: 'Ing. Mario Salvatierra Ruiz', org: 'BancoSol S.A.',
    },
    {
      tipo: 'CONFERENCIA', estadoActividad: 'PROGRAMADA',
      nombre: 'Tecnología e Innovación para el Sector Ganadero',
      descripcion: 'Presentación de tecnologías de punta para mejorar la productividad ganadera en condiciones tropicales.',
      sala: 'Auditorio Principal', capacidad: 200, fecha: new Date('2024-09-16'),
      hIni: 9, mIni: 0, hFin: 10, mFin: 30,
      expositor: 'Dr. Juan Carlos Flores Méndez', org: 'Universidad Autónoma del Beni',
    },
  ];

  for (let i = 0; i < actividadesData.length; i++) {
    const a = actividadesData[i];
    await prisma.actividadprograma.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        evento_id: evento.id,
        tipoActividad: a.tipo,
        nombreActividad: a.nombre,
        descripcionActividad: a.descripcion,
        nombreSalaEspacio: a.sala,
        capacidadPersonasSala: a.capacidad,
        fechaActividad: a.fecha,
        horaInicioActividad: new Date(1970, 0, 1, a.hIni, a.mIni, 0),
        horaFinActividad:    new Date(1970, 0, 1, a.hFin, a.mFin, 0),
        nombreCompletoPilaExpositor: a.expositor,
        organizacionDelExpositor: a.org,
        estadoActividad: a.estadoActividad,
        estaActivo: 1,
      },
    });
  }

  console.log('✅ 4 actividades del programa creadas');

  // ─── Noticias ──────────────────────────────────────────────────────────────
  const noticiasData = [
    {
      titulo: '¡Bienvenidos a la IX Rueda de Negocios del Beni 2024!',
      contenido: 'Nos complace anunciar que ya está abierta la inscripción para la IX edición de la Rueda de Negocios del Beni. Este año esperamos más de 80 empresas participantes de toda Bolivia.',
      tipo: 'NOTICIA', estado: 'PUBLICADO',
      urlImagen: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800',
    },
    {
      titulo: 'Cronograma de actividades confirmado para el 15 y 16 de septiembre',
      contenido: 'El cronograma oficial de conferencias, talleres y paneles ya está disponible. Descarga el programa completo y planifica tu participación con anticipación.',
      tipo: 'COMUNICADO', estado: 'PUBLICADO',
      urlImagen: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    },
    {
      titulo: 'Recordatorio: fecha límite de pago es el 10 de septiembre',
      contenido: 'Recordamos a todas las empresas inscritas que el plazo máximo para enviar el comprobante de pago es el 10 de septiembre de 2024. Pasada esa fecha no se garantiza el acceso al evento.',
      tipo: 'COMUNICADO', estado: 'BORRADOR',
      urlImagen: null,
    },
  ];

  for (let i = 0; i < noticiasData.length; i++) {
    const n = noticiasData[i];
    await prisma.noticia.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        evento_id: evento.id,
        usuario_id: admin.id,
        tituloNoticia: n.titulo,
        contenidoNoticia: n.contenido,
        urlImagenNoticia: n.urlImagen,
        tipoNoticia: n.tipo,
        estadoPublicacion: n.estado,
        fechaHoraPublicacion: new Date(),
        estaActivo: 1,
      },
    });
  }

  console.log('✅ 3 noticias/comunicados creados');

  // ─── Resumen final ─────────────────────────────────────────────────────────
  console.log('\n🎉 Seed completado exitosamente!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Credenciales de acceso:');
  console.log('  Admin    → correo: admin@ruedabeni.bo      | pass: admin123');
  console.log('  Técnico1 → correo: mfernanda@ruedabeni.bo  | pass: tecnico123');
  console.log('  Técnico2 → correo: rmolina@ruedabeni.bo    | pass: tecnico123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Datos creados:');
  console.log('  • 1 evento principal (esPrincipal=1)');
  console.log('  • 4 ciudades bolivianas');
  console.log('  • 8 empresas con distintos rubros y ciudades');
  console.log('  • 8 inscripciones: 3 APROBADO, 3 PENDIENTE, 1 OBSERVADO, 1 RECHAZADO');
  console.log('  • 15 mesas (12 activas, 3 inactivas)');
  console.log('  • 4 actividades del programa');
  console.log('  • 3 noticias/comunicados (2 publicados, 1 borrador)');
  console.log('  • 3 solicitudes y 3 reuniones de prueba');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => { console.error('❌ Error en seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
