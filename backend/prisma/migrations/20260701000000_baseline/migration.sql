-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "actividadprograma" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "tipoActividad" VARCHAR(45) NOT NULL,
    "nombreActividad" VARCHAR(255) NOT NULL,
    "descripcionActividad" VARCHAR(450) NOT NULL,
    "nombreSalaEspacio" VARCHAR(155) NOT NULL,
    "capacidadPersonasSala" SMALLINT NOT NULL,
    "fechaActividad" DATE NOT NULL,
    "horaInicioActividad" TIME(6) NOT NULL,
    "horaFinActividad" TIME(6) NOT NULL,
    "nombreCompletoPilaExpositor" VARCHAR(450),
    "organizacionDelExpositor" VARCHAR(150),
    "urlImagenBannerActividad" VARCHAR(505),
    "estadoActividad" VARCHAR(45) NOT NULL,
    "latitudPresencial" DECIMAL(10,8),
    "longitudPresencial" DECIMAL(11,8),
    "direccion_texto" VARCHAR(205),
    "linkReunionVirtual" VARCHAR(505),
    "ubicacionGoogleMapsPresencial" VARCHAR(505),
    "estadoEnVivo" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "notaEnVivo" VARCHAR(305),
    "horaInicioReal" TIMESTAMP(6),
    "horaFinReal" TIMESTAMP(6),
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoModificadoFecha" TIMESTAMP(6),

    CONSTRAINT "actividadprograma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paquete" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "nombre" VARCHAR(105) NOT NULL,
    "objetivo" VARCHAR(205),
    "descripcion" VARCHAR(505),
    "contenido" VARCHAR(2000),
    "costo" DECIMAL(10,2) NOT NULL,
    "credencialesIncluidas" SMALLINT NOT NULL,
    "urlQR" VARCHAR(505),
    "orden" SMALLINT NOT NULL DEFAULT 0,
    "maxParticipantes" SMALLINT NOT NULL DEFAULT 5,
    "nivelMesa" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    "tipoParticipacion" VARCHAR(75) NOT NULL DEFAULT 'PRESENCIAL',
    "apareceEnCatalogo" SMALLINT NOT NULL DEFAULT 1,
    "logoEnWeb" SMALLINT NOT NULL DEFAULT 0,
    "destacadoEnListados" SMALLINT NOT NULL DEFAULT 0,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoModificadoFecha" TIMESTAMP(6),

    CONSTRAINT "paquete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auspiciador" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "nombreEmpresa" VARCHAR(155) NOT NULL,
    "descripcion" VARCHAR(1000),
    "tipoAporte" VARCHAR(20) NOT NULL,
    "detalleAporte" VARCHAR(505),
    "montoAporte" DECIMAL(10,2),
    "paquete_id" INTEGER,
    "cantidadIngresos" SMALLINT NOT NULL,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoModificadoFecha" TIMESTAMP(6),

    CONSTRAINT "auspiciador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auspiciadorpersona" (
    "id" SERIAL NOT NULL,
    "auspiciador_id" INTEGER NOT NULL,
    "nombreCompleto" VARCHAR(155) NOT NULL,
    "cargo" VARCHAR(105),
    "correo" VARCHAR(105),
    "urlCredencialQR" VARCHAR(505),
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auspiciadorpersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fotoevento" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "empresa_usuario_id" INTEGER,
    "usuario_id" INTEGER,
    "autorNombre" VARCHAR(155) NOT NULL,
    "urlFoto" VARCHAR(505) NOT NULL,
    "descripcion" VARCHAR(305),
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotoevento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ciudad" (
    "id" SERIAL NOT NULL,
    "pais_id" INTEGER NOT NULL,
    "nombre" VARCHAR(45) NOT NULL,

    CONSTRAINT "ciudad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresa" (
    "id" SERIAL NOT NULL,
    "ciudad_id" INTEGER NOT NULL,
    "nombre" VARCHAR(55) NOT NULL,
    "rubro" VARCHAR(55) NOT NULL,
    "sitioWeb" VARCHAR(300),
    "descripcion" VARCHAR(1000),
    "telefonoWhatsapp" VARCHAR(45) NOT NULL,
    "correoCorporativo" VARCHAR(105) NOT NULL,
    "urlFotoPerfil" VARCHAR(500),
    "urlPdf" VARCHAR(500),
    "codigo" VARCHAR(20),
    "oferta" VARCHAR(500),
    "demanda" VARCHAR(500),
    "interesesBusqueda" VARCHAR(600),
    "estaActivo" INTEGER NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_modificado_fecha" TIMESTAMP(6),

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresa_usuario" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "empresaevento_id" INTEGER NOT NULL,
    "cargo" VARCHAR(55) NOT NULL,
    "esResponsable" SMALLINT NOT NULL,
    "urlCredencialQR" VARCHAR(500),
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,

    CONSTRAINT "empresa_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresaevento" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "paquete_id" INTEGER,
    "tipoParticipacion" VARCHAR(75) NOT NULL,
    "estadoHabilitacionAcceso" VARCHAR(45) NOT NULL,
    "motivoRechazoAcceso" VARCHAR(500),
    "montoPagado" DECIMAL(10,2),
    "estadoVerificacionPago" VARCHAR(45) NOT NULL,
    "fechaHoraEnvioComprobante" TIMESTAMP(6),
    "fechaHoraVerificacionPago" TIMESTAMP(6),
    "observacionSobreComprobante" VARCHAR(505),
    "numeroParticipantes" SMALLINT NOT NULL,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoModificadoFecha" TIMESTAMP(6),

    CONSTRAINT "empresaevento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresa_bloqueo" (
    "id" SERIAL NOT NULL,
    "empresaevento_id" INTEGER NOT NULL,
    "inicio" TIMESTAMP(6) NOT NULL,
    "fin" TIMESTAMP(6) NOT NULL,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,

    CONSTRAINT "empresa_bloqueo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresa_horario" (
    "id" SERIAL NOT NULL,
    "empresaevento_id" INTEGER NOT NULL,
    "desde_hora" VARCHAR(5) NOT NULL,
    "hasta_hora" VARCHAR(5) NOT NULL,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,

    CONSTRAINT "empresa_horario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresaeventocomprobantes" (
    "id" SERIAL NOT NULL,
    "empresaEvento_id" INTEGER NOT NULL,
    "urlComprobantePagoInscripcion" VARCHAR(505) NOT NULL,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoModificadoFecha" TIMESTAMP(6),
    "tipoPago" VARCHAR(20) NOT NULL DEFAULT 'INICIAL',
    "cantidadParticipantes" SMALLINT NOT NULL DEFAULT 0,
    "montoPago" DECIMAL(10,2),
    "estadoPago" VARCHAR(45) NOT NULL DEFAULT 'PENDIENTE',
    "observacion" VARCHAR(505),

    CONSTRAINT "empresaeventocomprobantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evento" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(205) NOT NULL,
    "edicion" VARCHAR(45) NOT NULL,
    "descripcion" VARCHAR(505),
    "fechaInicioEvento" TIMESTAMP(6) NOT NULL,
    "fechaFinEvento" TIMESTAMP(6) NOT NULL,
    "fechaInicioSolicitudes" TIMESTAMP(6),
    "fechaFinSolicitudes" TIMESTAMP(6),
    "duracionReunion" SMALLINT NOT NULL,
    "tiempoEntreReuniones" SMALLINT NOT NULL,
    "cantidadTotalMesasEvento" SMALLINT NOT NULL,
    "capacidadPersonasPorMesa" SMALLINT NOT NULL,
    "montoBaseIncripcionBolivianos" DECIMAL(10,2) NOT NULL,
    "cantidadParticipantesIncluidos" SMALLINT NOT NULL,
    "costoParticipanteExtra" SMALLINT NOT NULL,
    "maxParticipantesPorEmpresa" SMALLINT NOT NULL DEFAULT 5,
    "urlImagenMapaRecinto" VARCHAR(505),
    "urlImagenCronogramaCharlas" VARCHAR(505),
    "urlLogoEvento" VARCHAR(505),
    "sobreElEvento" VARCHAR(2000),
    "urlVideoEvento" VARCHAR(505),
    "pilaresEvento" VARCHAR(1000),
    "correoContacto" VARCHAR(105),
    "telefonoContacto" VARCHAR(45),
    "enlaceFacebook" VARCHAR(505),
    "enlaceInstagram" VARCHAR(505),
    "enlaceTwitterX" VARCHAR(505),
    "enlaceLinkedIn" VARCHAR(505),
    "enlaceTiktok" VARCHAR(505),
    "ciudadEvento" VARCHAR(205),
    "paisEvento" VARCHAR(105),
    "estaActivo" SMALLINT NOT NULL,
    "esPrincipal" SMALLINT NOT NULL DEFAULT 0,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoModificadoFecha" TIMESTAMP(6),

    CONSTRAINT "evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventoreglaqr" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "rangoDesde" SMALLINT NOT NULL,
    "rangoHasta" SMALLINT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "urlQR" VARCHAR(500) NOT NULL,
    "estadoActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaModificacion" TIMESTAMP(6),

    CONSTRAINT "eventoreglaqr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mesa" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "numeroMesa" SMALLINT NOT NULL,
    "capacidadPersonas" SMALLINT NOT NULL,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "estaHabilitada" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoModificadoFecha" TIMESTAMP(6),

    CONSTRAINT "mesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mesabloque" (
    "id" SERIAL NOT NULL,
    "mesa_id" INTEGER NOT NULL,
    "reunion_id" INTEGER,
    "fechaHoraInicio" TIMESTAMP(6) NOT NULL,
    "fechaHoraFin" TIMESTAMP(6),
    "estaOcupado" SMALLINT NOT NULL,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoModificadoFecha" TIMESTAMP(6),

    CONSTRAINT "mesabloque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "noticia" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "tituloNoticia" VARCHAR(105) NOT NULL,
    "contenidoNoticia" VARCHAR(500) NOT NULL,
    "urlImagenNoticia" VARCHAR(500),
    "tipoNoticia" VARCHAR(45) NOT NULL,
    "estadoPublicacion" VARCHAR(45) NOT NULL,
    "fechaHoraPublicacion" TIMESTAMP(6) NOT NULL,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoModificadoFecha" TIMESTAMP(6),

    CONSTRAINT "noticia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacion" (
    "id" SERIAL NOT NULL,
    "empresaevento_id" INTEGER NOT NULL,
    "tituloNotificacion" VARCHAR(300) NOT NULL,
    "mensajeNotificacion" VARCHAR(500) NOT NULL,
    "tipoNotificacion" VARCHAR(45) NOT NULL,
    "referenciaId" INTEGER NOT NULL,
    "referenciaNombreTabla" VARCHAR(65) NOT NULL,
    "haSidoLeida" SMALLINT NOT NULL,
    "estaActivo" SMALLINT NOT NULL,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoModificadoFecha" TIMESTAMP(6),

    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suscripcionactividad" (
    "id" SERIAL NOT NULL,
    "actividad_id" INTEGER NOT NULL,
    "empresaevento_id" INTEGER NOT NULL,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suscripcionactividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anuncioactividad" (
    "id" SERIAL NOT NULL,
    "actividad_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "mensaje" VARCHAR(500) NOT NULL,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anuncioactividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajeempresa" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "emisorEe_id" INTEGER NOT NULL,
    "receptorEe_id" INTEGER NOT NULL,
    "empresa_usuario_id" INTEGER,
    "remitenteRol" VARCHAR(20),
    "remitenteNombre" VARCHAR(150),
    "contenido" VARCHAR(1000) NOT NULL,
    "haSidoLeido" SMALLINT NOT NULL DEFAULT 0,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoModificadoFecha" TIMESTAMP(6),

    CONSTRAINT "mensajeempresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pais" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(45) NOT NULL,

    CONSTRAINT "pais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resultadoreunion" (
    "id" SERIAL NOT NULL,
    "reunion_id" INTEGER NOT NULL,
    "empresaeventoCalificadora_id" INTEGER NOT NULL,
    "empresaeventoCalificada_id" INTEGER NOT NULL,
    "empresa_usuario_id" INTEGER NOT NULL,
    "calificacionReunion" SMALLINT NOT NULL,
    "rangoAcuerdoComercial" VARCHAR(45) NOT NULL,
    "observacionesPuntosTratados" VARCHAR(505) NOT NULL,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoModificadoFecha" TIMESTAMP(6),

    CONSTRAINT "resultadoreunion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reunion" (
    "id" SERIAL NOT NULL,
    "solicitudReunion_id" INTEGER NOT NULL,
    "mesa_id" INTEGER NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "tipoReunion" VARCHAR(45) NOT NULL,
    "fechaHoraInicioReunion" TIMESTAMP(6) NOT NULL,
    "fechaHoraFinReunion" TIMESTAMP(6) NOT NULL,
    "estadoReunion" VARCHAR(45) NOT NULL,
    "observacionesReunion" VARCHAR(505),
    "seEnvioNotificacionDeRetraso" SMALLINT NOT NULL,
    "inicioAnticipadoPor" INTEGER,
    "cantidadAsistentesRegistrados" SMALLINT NOT NULL,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoModificadoFecha" TIMESTAMP(6),

    CONSTRAINT "reunion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cambioreunion" (
    "id" SERIAL NOT NULL,
    "reunion_id" INTEGER NOT NULL,
    "solicitadoPorEe_id" INTEGER NOT NULL,
    "tipoReunion" VARCHAR(45) NOT NULL,
    "fechaHoraInicio" TIMESTAMP(6) NOT NULL,
    "fechaHoraFin" TIMESTAMP(6) NOT NULL,
    "mesa_id" INTEGER,
    "enlaceReunionVirtual" VARCHAR(500),
    "mensaje" VARCHAR(505),
    "estado" VARCHAR(45) NOT NULL DEFAULT 'PENDIENTE',
    "motivoRechazo" VARCHAR(505),
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoModificadoFecha" TIMESTAMP(6),

    CONSTRAINT "cambioreunion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudreunion" (
    "id" SERIAL NOT NULL,
    "empresaEvento_id" INTEGER NOT NULL,
    "empresaEventorReceptora_id" INTEGER NOT NULL,
    "empresa_usuarioResponsableSolicitud" INTEGER NOT NULL,
    "tipoReunion" VARCHAR(55) NOT NULL,
    "enlaceReunionVirtual" VARCHAR(500),
    "ubicacionGoogleMapsReunion" VARCHAR(500),
    "latitudPresencial" DECIMAL(10,8),
    "longitudPresencial" DECIMAL(11,8),
    "direccionTexto" VARCHAR(205),
    "fechaHoraInicioPropuesta" TIMESTAMP(6) NOT NULL,
    "fechaHoraFinPropuesta" TIMESTAMP(6) NOT NULL,
    "mensajeParaEmpresaReceptora" VARCHAR(505),
    "estadoSolicitud" VARCHAR(45) NOT NULL,
    "motivoRechazoSolicitud" VARCHAR(505),
    "mesa_id" INTEGER,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "creadoModificadoFecha" TIMESTAMP(6),

    CONSTRAINT "solicitudreunion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER,
    "nombres" VARCHAR(105) NOT NULL,
    "apellidoPaterno" VARCHAR(65) NOT NULL,
    "apellidoMaterno" VARCHAR(65),
    "correo" VARCHAR(105) NOT NULL,
    "contrasenia" VARCHAR(105) NOT NULL,
    "telefono" VARCHAR(45) NOT NULL,
    "urlFotoPerfil" VARCHAR(505) NOT NULL,
    "rolEvento" VARCHAR(45) NOT NULL,
    "estaActivo" INTEGER NOT NULL DEFAULT 1,
    "fechaCreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoModificadoFecha" TIMESTAMP(6),
    "resetToken" VARCHAR(255),
    "resetTokenExpiry" TIMESTAMP(6),

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistenciaevento" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "empresa_usuario_id" INTEGER NOT NULL,
    "tecnico_id" INTEGER NOT NULL,
    "fechaHoraAsistencia" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estaActivo" SMALLINT NOT NULL DEFAULT 1,

    CONSTRAINT "asistenciaevento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fk_actividadprograma_evento1_idx" ON "actividadprograma"("evento_id");

-- CreateIndex
CREATE INDEX "actividadprograma_evento_id_estadoEnVivo_idx" ON "actividadprograma"("evento_id", "estadoEnVivo");

-- CreateIndex
CREATE INDEX "paquete_evento_id_idx" ON "paquete"("evento_id");

-- CreateIndex
CREATE INDEX "auspiciador_evento_id_idx" ON "auspiciador"("evento_id");

-- CreateIndex
CREATE INDEX "auspiciador_paquete_id_idx" ON "auspiciador"("paquete_id");

-- CreateIndex
CREATE INDEX "auspiciadorpersona_auspiciador_id_idx" ON "auspiciadorpersona"("auspiciador_id");

-- CreateIndex
CREATE INDEX "fotoevento_evento_id_estaActivo_idx" ON "fotoevento"("evento_id", "estaActivo");

-- CreateIndex
CREATE INDEX "fotoevento_empresa_usuario_id_idx" ON "fotoevento"("empresa_usuario_id");

-- CreateIndex
CREATE INDEX "fk_ciudad_pais1_idx" ON "ciudad"("pais_id");

-- CreateIndex
CREATE UNIQUE INDEX "empresa_codigo_key" ON "empresa"("codigo");

-- CreateIndex
CREATE INDEX "fk_empresa_ciudad1_idx" ON "empresa"("ciudad_id");

-- CreateIndex
CREATE INDEX "fk_empresa_usuario_empresa_idx" ON "empresa_usuario"("empresa_id");

-- CreateIndex
CREATE INDEX "fk_empresa_usuario_empresaevento1_idx" ON "empresa_usuario"("empresaevento_id");

-- CreateIndex
CREATE INDEX "fk_empresa_usuario_usuario1_idx" ON "empresa_usuario"("usuario_id");

-- CreateIndex
CREATE INDEX "fk_empresaevento_empresa1_idx" ON "empresaevento"("empresa_id");

-- CreateIndex
CREATE INDEX "fk_empresaevento_evento1_idx" ON "empresaevento"("evento_id");

-- CreateIndex
CREATE INDEX "empresa_bloqueo_empresaevento_id_idx" ON "empresa_bloqueo"("empresaevento_id");

-- CreateIndex
CREATE INDEX "empresa_horario_empresaevento_id_idx" ON "empresa_horario"("empresaevento_id");

-- CreateIndex
CREATE INDEX "fk_empresaeventocomprobantes_empresaevento1_idx" ON "empresaeventocomprobantes"("empresaEvento_id");

-- CreateIndex
CREATE INDEX "fk_eventoreglaqr_evento1_idx" ON "eventoreglaqr"("evento_id");

-- CreateIndex
CREATE INDEX "fk_mesa_evento1_idx" ON "mesa"("evento_id");

-- CreateIndex
CREATE INDEX "fk_mesabloque_mesa1_idx" ON "mesabloque"("mesa_id");

-- CreateIndex
CREATE INDEX "fk_mesabloque_reunion1_idx" ON "mesabloque"("reunion_id");

-- CreateIndex
CREATE INDEX "fk_noticia_evento1_idx" ON "noticia"("evento_id");

-- CreateIndex
CREATE INDEX "fk_noticia_usuario1_idx" ON "noticia"("usuario_id");

-- CreateIndex
CREATE INDEX "fk_notificacion_empresaevento2_idx" ON "notificacion"("empresaevento_id");

-- CreateIndex
CREATE INDEX "suscripcionactividad_empresaevento_id_idx" ON "suscripcionactividad"("empresaevento_id");

-- CreateIndex
CREATE UNIQUE INDEX "suscripcionactividad_actividad_id_empresaevento_id_key" ON "suscripcionactividad"("actividad_id", "empresaevento_id");

-- CreateIndex
CREATE INDEX "anuncioactividad_actividad_id_fechaCreacion_idx" ON "anuncioactividad"("actividad_id", "fechaCreacion");

-- CreateIndex
CREATE INDEX "anuncioactividad_usuario_id_idx" ON "anuncioactividad"("usuario_id");

-- CreateIndex
CREATE INDEX "mensajeempresa_emisorEe_id_receptorEe_id_idx" ON "mensajeempresa"("emisorEe_id", "receptorEe_id");

-- CreateIndex
CREATE INDEX "mensajeempresa_receptorEe_id_haSidoLeido_idx" ON "mensajeempresa"("receptorEe_id", "haSidoLeido");

-- CreateIndex
CREATE INDEX "mensajeempresa_evento_id_idx" ON "mensajeempresa"("evento_id");

-- CreateIndex
CREATE INDEX "fk_resultadoreunion_empresa_usuario1_idx" ON "resultadoreunion"("empresa_usuario_id");

-- CreateIndex
CREATE INDEX "fk_resultadoreunion_empresaevento1_idx" ON "resultadoreunion"("empresaeventoCalificadora_id");

-- CreateIndex
CREATE INDEX "fk_resultadoreunion_empresaevento2_idx" ON "resultadoreunion"("empresaeventoCalificada_id");

-- CreateIndex
CREATE INDEX "fk_resultadoreunion_reunion1_idx" ON "resultadoreunion"("reunion_id");

-- CreateIndex
CREATE INDEX "fk_reunion_evento1_idx" ON "reunion"("evento_id");

-- CreateIndex
CREATE INDEX "fk_reunion_mesa1_idx" ON "reunion"("mesa_id");

-- CreateIndex
CREATE INDEX "fk_reunion_solicitudreunion1_idx" ON "reunion"("solicitudReunion_id");

-- CreateIndex
CREATE INDEX "cambioreunion_reunion_id_estado_idx" ON "cambioreunion"("reunion_id", "estado");

-- CreateIndex
CREATE INDEX "cambioreunion_solicitadoPorEe_id_idx" ON "cambioreunion"("solicitadoPorEe_id");

-- CreateIndex
CREATE INDEX "fk_solicitudreunion_empresa_usuario1_idx" ON "solicitudreunion"("empresa_usuarioResponsableSolicitud");

-- CreateIndex
CREATE INDEX "fk_solicitudreunion_empresaevento1_idx" ON "solicitudreunion"("empresaEvento_id");

-- CreateIndex
CREATE INDEX "fk_solicitudreunion_empresaevento2_idx" ON "solicitudreunion"("empresaEventorReceptora_id");

-- CreateIndex
CREATE INDEX "fk_usuario_evento1_idx" ON "usuario"("evento_id");

-- CreateIndex
CREATE INDEX "asistenciaevento_evento_id_fechaHoraAsistencia_idx" ON "asistenciaevento"("evento_id", "fechaHoraAsistencia");

-- CreateIndex
CREATE INDEX "asistenciaevento_tecnico_id_idx" ON "asistenciaevento"("tecnico_id");

-- CreateIndex
CREATE UNIQUE INDEX "asistenciaevento_evento_id_empresa_usuario_id_key" ON "asistenciaevento"("evento_id", "empresa_usuario_id");

-- AddForeignKey
ALTER TABLE "actividadprograma" ADD CONSTRAINT "fk_actividadprograma_evento1" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "paquete" ADD CONSTRAINT "paquete_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auspiciador" ADD CONSTRAINT "auspiciador_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auspiciador" ADD CONSTRAINT "auspiciador_paquete_id_fkey" FOREIGN KEY ("paquete_id") REFERENCES "paquete"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auspiciadorpersona" ADD CONSTRAINT "auspiciadorpersona_auspiciador_id_fkey" FOREIGN KEY ("auspiciador_id") REFERENCES "auspiciador"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fotoevento" ADD CONSTRAINT "fotoevento_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ciudad" ADD CONSTRAINT "fk_ciudad_pais1" FOREIGN KEY ("pais_id") REFERENCES "pais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "empresa" ADD CONSTRAINT "fk_empresa_ciudad1" FOREIGN KEY ("ciudad_id") REFERENCES "ciudad"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "empresa_usuario" ADD CONSTRAINT "fk_empresa_usuario_empresa" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "empresa_usuario" ADD CONSTRAINT "fk_empresa_usuario_empresaevento1" FOREIGN KEY ("empresaevento_id") REFERENCES "empresaevento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "empresa_usuario" ADD CONSTRAINT "fk_empresa_usuario_usuario1" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "empresaevento" ADD CONSTRAINT "fk_empresaevento_empresa1" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "empresaevento" ADD CONSTRAINT "fk_empresaevento_evento1" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "empresaevento" ADD CONSTRAINT "empresaevento_paquete_id_fkey" FOREIGN KEY ("paquete_id") REFERENCES "paquete"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "empresa_bloqueo" ADD CONSTRAINT "empresa_bloqueo_empresaevento_id_fkey" FOREIGN KEY ("empresaevento_id") REFERENCES "empresaevento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "empresa_horario" ADD CONSTRAINT "empresa_horario_empresaevento_id_fkey" FOREIGN KEY ("empresaevento_id") REFERENCES "empresaevento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "empresaeventocomprobantes" ADD CONSTRAINT "fk_empresaeventocomprobantes_empresaevento1" FOREIGN KEY ("empresaEvento_id") REFERENCES "empresaevento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "eventoreglaqr" ADD CONSTRAINT "fk_eventoreglaqr_evento1" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mesa" ADD CONSTRAINT "fk_mesa_evento1" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mesabloque" ADD CONSTRAINT "fk_mesabloque_mesa1" FOREIGN KEY ("mesa_id") REFERENCES "mesa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mesabloque" ADD CONSTRAINT "fk_mesabloque_reunion1" FOREIGN KEY ("reunion_id") REFERENCES "reunion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "noticia" ADD CONSTRAINT "fk_noticia_evento1" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "noticia" ADD CONSTRAINT "fk_noticia_usuario1" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "fk_notificacion_empresaevento2" FOREIGN KEY ("empresaevento_id") REFERENCES "empresaevento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "suscripcionactividad" ADD CONSTRAINT "suscripcionactividad_actividad_id_fkey" FOREIGN KEY ("actividad_id") REFERENCES "actividadprograma"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "suscripcionactividad" ADD CONSTRAINT "suscripcionactividad_empresaevento_id_fkey" FOREIGN KEY ("empresaevento_id") REFERENCES "empresaevento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "anuncioactividad" ADD CONSTRAINT "anuncioactividad_actividad_id_fkey" FOREIGN KEY ("actividad_id") REFERENCES "actividadprograma"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "anuncioactividad" ADD CONSTRAINT "anuncioactividad_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "resultadoreunion" ADD CONSTRAINT "fk_resultadoreunion_empresa_usuario1" FOREIGN KEY ("empresa_usuario_id") REFERENCES "empresa_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "resultadoreunion" ADD CONSTRAINT "fk_resultadoreunion_empresaevento1" FOREIGN KEY ("empresaeventoCalificadora_id") REFERENCES "empresaevento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "resultadoreunion" ADD CONSTRAINT "fk_resultadoreunion_empresaevento2" FOREIGN KEY ("empresaeventoCalificada_id") REFERENCES "empresaevento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "resultadoreunion" ADD CONSTRAINT "fk_resultadoreunion_reunion1" FOREIGN KEY ("reunion_id") REFERENCES "reunion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reunion" ADD CONSTRAINT "fk_reunion_evento1" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reunion" ADD CONSTRAINT "fk_reunion_mesa1" FOREIGN KEY ("mesa_id") REFERENCES "mesa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reunion" ADD CONSTRAINT "fk_reunion_solicitudreunion1" FOREIGN KEY ("solicitudReunion_id") REFERENCES "solicitudreunion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cambioreunion" ADD CONSTRAINT "cambioreunion_reunion_id_fkey" FOREIGN KEY ("reunion_id") REFERENCES "reunion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "solicitudreunion" ADD CONSTRAINT "fk_solicitudreunion_mesa1" FOREIGN KEY ("mesa_id") REFERENCES "mesa"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "solicitudreunion" ADD CONSTRAINT "fk_solicitudreunion_empresa_usuario1" FOREIGN KEY ("empresa_usuarioResponsableSolicitud") REFERENCES "empresa_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "solicitudreunion" ADD CONSTRAINT "fk_solicitudreunion_empresaevento1" FOREIGN KEY ("empresaEvento_id") REFERENCES "empresaevento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "solicitudreunion" ADD CONSTRAINT "fk_solicitudreunion_empresaevento2" FOREIGN KEY ("empresaEventorReceptora_id") REFERENCES "empresaevento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "fk_usuario_evento1" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "asistenciaevento" ADD CONSTRAINT "asistenciaevento_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "asistenciaevento" ADD CONSTRAINT "asistenciaevento_empresa_usuario_id_fkey" FOREIGN KEY ("empresa_usuario_id") REFERENCES "empresa_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "asistenciaevento" ADD CONSTRAINT "asistenciaevento_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
