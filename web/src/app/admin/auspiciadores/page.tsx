"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Handshake, Plus, Pencil, Trash2, X, Users, Package, Coins,
  Boxes, QrCode, Download, Search,
} from "lucide-react";
import { useModal } from "@/components/ui/Modal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

type Persona = { id?: number; nombreCompleto: string; cargo: string; correo: string; urlCredencialQR?: string | null };
type Paquete = { id: number; nombre: string; costo: number };
type Auspiciador = {
  id: number;
  nombreEmpresa: string;
  descripcion: string;
  tipoAporte: "DINERO" | "INSUMOS" | "AMBOS";
  detalleAporte: string | null;
  montoAporte: number | null;
  paquete_id: number | null;
  paquete: Paquete | null;
  cantidadIngresos: number;
  personas: Persona[];
};

const APORTES = [
  { val: "DINERO",  label: "Dinero",  icon: Coins,     desc: "Aporta un monto económico" },
  { val: "INSUMOS", label: "Insumos", icon: Boxes,     desc: "Aporta bienes o servicios" },
  { val: "AMBOS",   label: "Ambos",   icon: Handshake, desc: "Dinero e insumos" },
] as const;

const personaVacia = (): Persona => ({ nombreCompleto: "", cargo: "", correo: "" });

export default function AuspiciadoresPage() {
  const { showSuccess, showError, showConfirm, ModalComponent } = useModal();

  const [lista, setLista] = useState<Auspiciador[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [abierto, setAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    nombreEmpresa: "", descripcion: "", tipoAporte: "DINERO",
    montoAporte: "", detalleAporte: "", paquete_id: "", cantidadIngresos: 1,
  });
  const [personas, setPersonas] = useState<Persona[]>([personaVacia()]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, pRes] = await Promise.all([
        fetch(`${API}/admin/auspiciadores`),
        fetch(`${API}/admin/paquetes`),
      ]);
      setLista(aRes.ok ? await aRes.json() : []);
      setPaquetes(pRes.ok ? await pRes.json() : []);
    } catch {
      showError("Sin conexión", "No se pudo cargar la lista de auspiciadores.");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargar(); }, [cargar]);

  // La cantidad de ingresos manda: la lista de personas se ajusta sola para que
  // siempre haya exactamente un nombre por credencial a emitir.
  const setIngresos = (n: number) => {
    const cant = Math.max(1, Math.min(50, n));
    setForm((f) => ({ ...f, cantidadIngresos: cant }));
    setPersonas((prev) => {
      const copia = [...prev];
      while (copia.length < cant) copia.push(personaVacia());
      return copia.slice(0, cant);
    });
  };

  const abrirNuevo = () => {
    setEditandoId(null);
    setForm({ nombreEmpresa: "", descripcion: "", tipoAporte: "DINERO", montoAporte: "", detalleAporte: "", paquete_id: "", cantidadIngresos: 1 });
    setPersonas([personaVacia()]);
    setAbierto(true);
  };

  const abrirEdicion = (a: Auspiciador) => {
    setEditandoId(a.id);
    setForm({
      nombreEmpresa: a.nombreEmpresa,
      descripcion: a.descripcion ?? "",
      tipoAporte: a.tipoAporte,
      montoAporte: a.montoAporte != null ? String(a.montoAporte) : "",
      detalleAporte: a.detalleAporte ?? "",
      paquete_id: a.paquete_id ? String(a.paquete_id) : "",
      cantidadIngresos: a.cantidadIngresos,
    });
    setPersonas(a.personas.length
      ? a.personas.map((p) => ({ ...p, cargo: p.cargo ?? "", correo: p.correo ?? "" }))
      : [personaVacia()]);
    setAbierto(true);
  };

  const guardar = async () => {
    // Validación en cliente para dar el aviso antes de ir al servidor; el
    // backend vuelve a validar todo de todas formas.
    if (!form.nombreEmpresa.trim()) return showError("Falta un dato", "Escribe el nombre de la empresa auspiciadora.");
    if (!form.descripcion.trim())   return showError("Falta un dato", "Escribe la descripción de la empresa.");
    if (form.tipoAporte !== "INSUMOS" && !(Number(form.montoAporte) > 0))
      return showError("Falta un dato", "Indica el monto aportado (mayor a 0).");
    if (form.tipoAporte !== "DINERO" && !form.detalleAporte.trim())
      return showError("Falta un dato", "Describe qué insumos aporta al evento.");
    const sinNombre = personas.findIndex((p) => !p.nombreCompleto.trim());
    if (sinNombre >= 0)
      return showError("Falta un dato", `Escribe el nombre de la persona ${sinNombre + 1}.`);
    const sinCorreo = personas.findIndex((p) => !p.correo.trim());
    if (sinCorreo >= 0)
      return showError("Falta un dato", `Escribe el correo de la persona ${sinCorreo + 1}; ahí recibirá su credencial.`);
    const correoInvalido = personas.findIndex((p) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.correo.trim()));
    if (correoInvalido >= 0)
      return showError("Correo inválido", `Revisa el correo de la persona ${correoInvalido + 1}.`);

    setGuardando(true);
    try {
      const url = editandoId ? `${API}/admin/auspiciadores/${editandoId}` : `${API}/admin/auspiciadores`;
      const res = await fetch(url, {
        method: editandoId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          montoAporte: form.montoAporte ? Number(form.montoAporte) : null,
          paquete_id: form.paquete_id ? Number(form.paquete_id) : null,
          personas: personas.map((p) => ({
            nombreCompleto: p.nombreCompleto.trim(),
            cargo: p.cargo.trim() || null,
            correo: p.correo.trim(),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo guardar.");
      setAbierto(false);
      await cargar();
      const pendientes = [...(data.correosFallidos ?? []), ...(data.accesoPlataforma?.creado === false && data.accesoPlataforma?.motivo ? [data.accesoPlataforma.motivo] : [])];
      if (!editandoId && pendientes.length) {
        showError("Auspiciador registrado con envíos pendientes", pendientes.join(" · "));
        return;
      }
      showSuccess(
        editandoId ? "Auspiciador actualizado" : "Auspiciador registrado",
        editandoId
          ? "Los cambios se guardaron. Las personas que ya tenían credencial conservan su QR."
          : `Se emitieron y enviaron por correo ${form.cantidadIngresos} credencial(es) de acceso.`,
      );
    } catch (e: any) {
      showError("No se pudo guardar", e.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = (a: Auspiciador) =>
    showConfirm(
      "Eliminar auspiciador",
      `¿Eliminar a "${a.nombreEmpresa}"? Sus ${a.personas.length} credencial(es) dejarán de ser válidas.`,
      async () => {
        try {
          const res = await fetch(`${API}/admin/auspiciadores/${a.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error((await res.json())?.message || "No se pudo eliminar.");
          await cargar();
          showSuccess("Auspiciador eliminado", `"${a.nombreEmpresa}" se quitó de la lista.`);
        } catch (e: any) {
          showError("No se pudo eliminar", e.message);
        }
      },
    );

  const filtrados = lista.filter((a) =>
    a.nombreEmpresa.toLowerCase().includes(busqueda.trim().toLowerCase()));

  const totalIngresos = lista.reduce((s, a) => s + a.cantidadIngresos, 0);
  const totalDinero = lista.reduce((s, a) => s + Number(a.montoAporte ?? 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <ModalComponent />

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Handshake className="w-6 h-6 text-[#449D3A]" /> Auspiciadores
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Empresas que aportan al evento. Cada persona registrada recibe su credencial de acceso.
          </p>
        </div>
        <button onClick={abrirNuevo}
          className="inline-flex items-center justify-center gap-2 bg-[#449D3A] hover:bg-[#367d2e] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Nuevo auspiciador
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Auspiciadores", valor: lista.length, Icon: Handshake },
          { label: "Ingresos otorgados", valor: totalIngresos, Icon: Users },
          { label: "Aporte en dinero", valor: `Bs. ${totalDinero.toLocaleString("es-BO")}`, Icon: Coins },
        ].map(({ label, valor, Icon }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-[#449D3A]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-xl font-extrabold text-gray-900 truncate">{valor}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar auspiciador por nombre…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#449D3A]" />
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-center text-gray-400 py-12">Cargando auspiciadores…</p>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-gray-300 rounded-2xl">
          <Handshake className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">
            {busqueda ? "Sin resultados" : "Todavía no hay auspiciadores"}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {busqueda ? "Prueba con otro nombre." : "Registra el primero con el botón de arriba."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtrados.map((a) => (
            <div key={a.id} className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-extrabold text-gray-900 truncate">{a.nombreEmpresa}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.descripcion}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => abrirEdicion(a)} title="Editar"
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => eliminar(a)} title="Eliminar"
                    className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                  <Coins className="w-3 h-3" />
                  {a.tipoAporte === "DINERO" ? `Bs. ${Number(a.montoAporte).toLocaleString("es-BO")}`
                    : a.tipoAporte === "INSUMOS" ? "Insumos"
                    : `Bs. ${Number(a.montoAporte).toLocaleString("es-BO")} + insumos`}
                </span>
                {a.paquete && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                    <Package className="w-3 h-3" /> {a.paquete.nombre}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                  <Users className="w-3 h-3" /> {a.cantidadIngresos} ingreso{a.cantidadIngresos > 1 ? "s" : ""}
                </span>
              </div>

              {a.detalleAporte && (
                <p className="text-xs text-gray-500 mt-3 bg-gray-50 rounded-lg p-2.5">
                  <span className="font-semibold text-gray-600">Insumos:</span> {a.detalleAporte}
                </p>
              )}

              <div className="mt-4 border-t border-gray-100 pt-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Personas acreditadas
                </p>
                <ul className="space-y-1.5">
                  {a.personas.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-gray-700">
                        {p.nombreCompleto}
                        {p.cargo && <span className="text-gray-400"> · {p.cargo}</span>}
                      </span>
                      {p.urlCredencialQR ? (
                        <a href={p.urlCredencialQR} target="_blank" rel="noopener noreferrer" download
                          title="Descargar credencial QR"
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Formulario ── */}
      {abierto && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-extrabold text-gray-900">
                {editandoId ? "Editar auspiciador" : "Nuevo auspiciador"}
              </h2>
              <button onClick={() => setAbierto(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Nombre de la empresa <span className="text-red-500">*</span>
                </label>
                <input value={form.nombreEmpresa} maxLength={155}
                  onChange={(e) => setForm({ ...form, nombreEmpresa: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#449D3A]"
                  placeholder="Ej. Banco Ganadero S.A." />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Descripción de la empresa <span className="text-red-500">*</span>
                </label>
                <textarea value={form.descripcion} maxLength={1000} rows={3}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-[#449D3A]"
                  placeholder="A qué se dedica la empresa auspiciadora…" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  ¿Qué ofrece al evento? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {APORTES.map(({ val, label, icon: Icon, desc }) => (
                    <button key={val} type="button" onClick={() => setForm({ ...form, tipoAporte: val })}
                      className={`text-left p-3 rounded-xl border-2 transition-all ${
                        form.tipoAporte === val ? "border-[#449D3A] bg-green-50" : "border-gray-200 hover:border-gray-300"
                      }`}>
                      <Icon className={`w-4 h-4 mb-1 ${form.tipoAporte === val ? "text-[#449D3A]" : "text-gray-400"}`} />
                      <p className="text-sm font-semibold text-gray-800">{label}</p>
                      <p className="text-[11px] text-gray-400 leading-tight">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* El monto solo aplica si hay dinero de por medio */}
              {form.tipoAporte !== "INSUMOS" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Monto aportado (Bs.) <span className="text-red-500">*</span>
                  </label>
                  <input type="number" min={1} value={form.montoAporte}
                    onChange={(e) => setForm({ ...form, montoAporte: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#449D3A]"
                    placeholder="Ej. 5000" />
                </div>
              )}

              {/* El detalle solo aplica si aporta bienes */}
              {form.tipoAporte !== "DINERO" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    ¿Qué insumos aporta? <span className="text-red-500">*</span>
                  </label>
                  <textarea value={form.detalleAporte} maxLength={505} rows={2}
                    onChange={(e) => setForm({ ...form, detalleAporte: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-[#449D3A]"
                    placeholder="Ej. 200 bolsas de souvenirs, refrigerios para 2 días…" />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Paquete elegido</label>
                  <select value={form.paquete_id}
                    onChange={(e) => setForm({ ...form, paquete_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#449D3A]">
                    <option value="">Sin paquete</option>
                    {paquetes.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre} — Bs. {Number(p.costo)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Cantidad de ingresos <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setIngresos(form.cantidadIngresos - 1)}
                      className="w-10 h-10 rounded-xl border border-gray-200 font-bold text-lg text-gray-600 hover:bg-gray-50">−</button>
                    <span className="w-10 text-center text-xl font-bold text-gray-900">{form.cantidadIngresos}</span>
                    <button type="button" onClick={() => setIngresos(form.cantidadIngresos + 1)}
                      className="w-10 h-10 rounded-xl border border-gray-200 font-bold text-lg text-gray-600 hover:bg-gray-50">+</button>
                  </div>
                </div>
              </div>

              {/* Lista de personas: siempre una por ingreso */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Personas que ingresan <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-gray-400 mb-2">
                  Cada persona recibe su propia credencial QR en el correo indicado.
                </p>
                <div className="space-y-2">
                  {personas.map((p, i) => (
                    <div key={i} className="grid min-w-0 grid-cols-1 md:grid-cols-[1.4fr_1fr_1.4fr] gap-2 items-center">
                      <input value={p.nombreCompleto} maxLength={155}
                        onChange={(e) => setPersonas(personas.map((x, j) => j === i ? { ...x, nombreCompleto: e.target.value } : x))}
                        className="w-full min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#449D3A]"
                        placeholder={`Nombre completo ${i + 1} *`} />
                      <input value={p.cargo} maxLength={105}
                        onChange={(e) => setPersonas(personas.map((x, j) => j === i ? { ...x, cargo: e.target.value } : x))}
                        className="w-full min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#449D3A]"
                        placeholder="Cargo" />
                      <input value={p.correo} maxLength={105} type="email"
                        onChange={(e) => setPersonas(personas.map((x, j) => j === i ? { ...x, correo: e.target.value } : x))}
                        className="w-full min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#449D3A]"
                        placeholder="Correo para enviar credencial *" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setAbierto(false)} disabled={guardando}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                className="flex-1 py-2.5 bg-[#449D3A] hover:bg-[#367d2e] text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {guardando ? "Guardando…" : editandoId ? "Guardar cambios" : "Registrar auspiciador"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
