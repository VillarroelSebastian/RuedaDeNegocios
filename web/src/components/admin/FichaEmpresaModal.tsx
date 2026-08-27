"use client";

import React, { useEffect, useState } from "react";
import {
  Building2, X, Mail, Phone, Globe, MapPin, Package, Users, CreditCard,
  FileText, Download, QrCode, Tag, Armchair, Star, Handshake, Search,
  ExternalLink,
} from "lucide-react";
import ImagenLightbox from "@/components/ui/ImagenLightbox";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

const ETIQUETA_MESA: Record<string, string> = {
  NORMAL: "Mesa estándar",
  PREFERENCIAL: "Mesa preferencial",
  VIP: "Mesa VIP",
};

const COLOR_ESTADO: Record<string, string> = {
  COMPLETADO: "bg-green-100 text-green-700",
  APROBADO: "bg-green-100 text-green-700",
  HABILITADO: "bg-green-100 text-green-700",
  PENDIENTE: "bg-amber-100 text-amber-700",
  OBSERVADO: "bg-red-100 text-red-700",
  RECHAZADO: "bg-red-100 text-red-700",
  NO_HABILITADO: "bg-gray-100 text-gray-600",
  SIN_REGISTRO: "bg-gray-100 text-gray-500",
};

function Chip({ estado }: { estado: string }) {
  return (
    <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${COLOR_ESTADO[estado] ?? "bg-gray-100 text-gray-600"}`}>
      {estado.replace(/_/g, " ")}
    </span>
  );
}

/** Fila etiqueta/valor. Oculta el campo si viene vacío, para no mostrar huecos. */
function Dato({ Icon, label, valor, mono }: { Icon?: any; label: string; valor: any; mono?: boolean }) {
  if (valor === null || valor === undefined || valor === "") return null;
  return (
    <div className="flex gap-2.5 py-2 border-b border-gray-100 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className={`text-sm text-gray-800 break-words ${mono ? "font-mono" : ""}`}>{valor}</p>
      </div>
    </div>
  );
}

function Bloque({ titulo, Icon, children }: { titulo: string; Icon: any; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5">
      <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900 mb-3">
        <Icon className="w-4 h-4 text-[#449D3A]" /> {titulo}
      </h3>
      {children}
    </section>
  );
}

/**
 * Ficha completa de una empresa para el panel: todo lo capturado en el registro
 * más el paquete contratado, participantes y comprobantes de pago.
 */
export default function FichaEmpresaModal({
  empresaId,
  onClose,
}: {
  empresaId: number | null;
  onClose: () => void;
}) {
  const [datos, setDatos] = useState<any>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaId) { setDatos(null); return; }
    setCargando(true);
    setError(null);
    fetch(`${API}/admin/empresas/${empresaId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json())?.message || "No se pudo cargar la empresa.");
        return r.json();
      })
      .then(setDatos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [empresaId]);

  if (!empresaId) return null;

  const f = datos?.ficha;
  const paq = f?.paquete;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}>
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-3xl my-4" onClick={(e) => e.stopPropagation()}>

        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 p-5 bg-white rounded-t-2xl border-b border-gray-100 sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0 overflow-hidden">
              {datos?.urlFotoPerfil
                ? <ImagenLightbox src={datos.urlFotoPerfil} className="w-full h-full" />
                : <Building2 className="w-6 h-6 text-green-600" />}
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-gray-900 truncate">{datos?.nombre ?? "Cargando…"}</h2>
              {datos?.codigo && <p className="text-xs font-mono font-semibold text-[#449D3A]">{datos.codigo}</p>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar"
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {cargando && <p className="text-center text-gray-400 py-10">Cargando ficha…</p>}
          {error && <p className="text-center text-red-600 py-10">{error}</p>}

          {datos && !cargando && (
            <>
              {/* Estados de un vistazo */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-500">Pago:</span> <Chip estado={f.estadoVerificacionPago} />
                <span className="text-xs text-gray-500 ml-2">Acceso:</span> <Chip estado={f.estadoHabilitacionAcceso} />
              </div>
              {f.motivoRechazoAcceso && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                  <span className="font-semibold">Motivo de rechazo:</span> {f.motivoRechazoAcceso}
                </p>
              )}

              {/* Paquete contratado */}
              <Bloque titulo="Paquete de inscripción" Icon={Package}>
                {paq ? (
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-extrabold text-gray-900">{paq.nombre}</span>
                      <span className="text-sm font-bold text-gray-500">Bs. {paq.costo}</span>
                    </div>
                    {paq.objetivo && <p className="text-xs text-[#449D3A] font-semibold mt-0.5">{paq.objetivo}</p>}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                        <Users className="w-3 h-3" /> {paq.credencialesIncluidas} incluidas · máx {paq.maxParticipantes}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
                        <Armchair className="w-3 h-3" /> {ETIQUETA_MESA[paq.nivelMesa] ?? paq.nivelMesa}
                      </span>
                      {paq.destacadoEnListados === 1 && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                          <Star className="w-3 h-3" /> Destacada
                        </span>
                      )}
                      {paq.apareceEnCatalogo === 1 && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                          <Search className="w-3 h-3" /> En catálogo
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Se inscribió con la tarifa general del evento, sin paquete asignado.
                  </p>
                )}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-100 pt-3">
                  <Dato label="Modalidad" valor={f.tipoParticipacion} />
                  <Dato label="Participantes" valor={f.numeroParticipantes} />
                  <Dato label="Monto pagado" valor={f.montoPagado != null ? `Bs. ${f.montoPagado}` : null} />
                </div>
              </Bloque>

              {/* Datos del registro */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Bloque titulo="Datos de la empresa" Icon={Building2}>
                  <Dato Icon={Tag} label="Rubro" valor={datos.rubro} />
                  <Dato Icon={MapPin} label="Ubicación"
                    valor={[f.ciudad, f.pais].filter(Boolean).join(", ")} />
                  <Dato Icon={Mail} label="Correo corporativo" valor={datos.correoCorporativo} />
                  <Dato Icon={Phone} label="WhatsApp" valor={datos.telefonoWhatsapp} />
                  <Dato Icon={Globe} label="Sitio web" valor={datos.sitioWeb} />
                  <Dato label="Registrada el"
                    valor={datos.fechaCreacion ? new Date(datos.fechaCreacion).toLocaleDateString("es-BO", { day: "numeric", month: "long", year: "numeric" }) : null} />
                </Bloque>

                <Bloque titulo="Perfil comercial" Icon={Handshake}>
                  <Dato label="Descripción" valor={datos.descripcion} />
                  <Dato label="Qué ofrece" valor={datos.oferta} />
                  <Dato label="Qué busca" valor={datos.demanda} />
                  <Dato label="Sectores de interés" valor={datos.interesesBusqueda} />
                  {!datos.descripcion && !datos.oferta && !datos.demanda && !datos.interesesBusqueda && (
                    <p className="text-sm text-gray-400">La empresa aún no completó su perfil comercial.</p>
                  )}
                </Bloque>
              </div>

              {/* Participantes */}
              <Bloque titulo={`Participantes (${f.participantes.length})`} Icon={Users}>
                {f.participantes.length === 0 ? (
                  <p className="text-sm text-gray-400">Todavía no hay participantes registrados.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {f.participantes.map((p: any) => (
                      <li key={p.id} className="py-2.5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800">
                            {[p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(" ")}
                            {p.esResponsable && (
                              <span className="ml-2 text-[10px] font-bold bg-[#449D3A] text-white px-2 py-0.5 rounded-full">
                                ENCARGADO
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 break-words">
                            {[p.cargo, p.correo, p.telefono].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        {p.urlCredencialQR ? (
                          <a href={p.urlCredencialQR} target="_blank" rel="noopener noreferrer" download
                            title="Descargar credencial"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#449D3A] hover:underline flex-shrink-0">
                            <Download className="w-3 h-3" /> QR
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                            <QrCode className="w-3 h-3" /> sin QR
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Bloque>

              {/* Comprobantes */}
              <Bloque titulo={`Comprobantes de pago (${f.comprobantes.length})`} Icon={CreditCard}>
                {f.comprobantes.length === 0 ? (
                  <p className="text-sm text-gray-400">No se subió ningún comprobante.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {f.comprobantes.map((c: any) => (
                      <li key={c.id} className="flex items-center gap-3 border border-gray-100 rounded-xl p-2.5">
                        {c.url && (
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                            {c.url.toLowerCase().includes(".pdf") ? (
                              <a href={c.url} target="_blank" rel="noopener noreferrer" title="Abrir PDF"
                                className="w-full h-full flex items-center justify-center text-[#449D3A]">
                                <ExternalLink className="w-5 h-5" />
                              </a>
                            ) : (
                              <ImagenLightbox src={c.url} className="w-full h-full" />
                            )}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-800">
                            {c.tipoPago === "ADICIONAL" ? "Cupos adicionales" : "Inscripción"}
                            {c.montoPago != null && <span className="text-gray-500"> · Bs. {c.montoPago}</span>}
                          </p>
                          <p className="text-xs text-gray-500">
                            {c.cantidadParticipantes ? `${c.cantidadParticipantes} participante(s) · ` : ""}
                            {c.fechaCreacion ? new Date(c.fechaCreacion).toLocaleDateString("es-BO") : ""}
                          </p>
                          {c.observacion && <p className="text-xs text-red-600 mt-0.5">{c.observacion}</p>}
                        </div>
                        {c.estadoPago && <Chip estado={c.estadoPago} />}
                      </li>
                    ))}
                  </ul>
                )}
              </Bloque>

              {f.empresaEventoId && (
                <a href={`/admin/pagos/${f.empresaEventoId}`}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-[#449D3A] hover:bg-[#367d2e] text-white rounded-xl text-sm font-semibold transition-colors">
                  <FileText className="w-4 h-4" /> Ir a la gestión de pago y habilitación
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
