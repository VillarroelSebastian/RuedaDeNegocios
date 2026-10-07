ALTER TABLE mensajeempresa ADD COLUMN "remitenteUsuario_id" INTEGER, ADD COLUMN "fechaEdicion" TIMESTAMP(6);
ALTER TABLE mensajeinterno ADD COLUMN "fechaEdicion" TIMESTAMP(6);
ALTER TABLE pushsubscription ADD COLUMN "estaActivo" SMALLINT NOT NULL DEFAULT 1;
CREATE TABLE conversacionvista (
 id SERIAL PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuario(id), evento_id INTEGER NOT NULL REFERENCES evento(id),
 canal VARCHAR(20) NOT NULL, "propioEe_id" INTEGER NOT NULL, "otroEe_id" INTEGER NOT NULL,
 "hastaMensajeId" INTEGER NOT NULL DEFAULT 0, "estaActivo" SMALLINT NOT NULL DEFAULT 1,
 "creadoModificadoFecha" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "conversacionvista_usuario_evento_canal_key" ON conversacionvista(usuario_id,evento_id,canal,"propioEe_id","otroEe_id");
CREATE TABLE notificacionlectura (
 id SERIAL PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuario(id), evento_id INTEGER NOT NULL REFERENCES evento(id),
 clave VARCHAR(100) NOT NULL, "fechaLectura" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "notificacionlectura_usuario_id_evento_id_clave_key" ON notificacionlectura(usuario_id,evento_id,clave);
