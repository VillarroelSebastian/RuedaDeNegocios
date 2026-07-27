"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Building2, Search, Check, CheckCircle2, AlertCircle, Users, Monitor,
  ChevronLeft, Table2, CalendarPlus, Send,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

type Paso = 1 | 2 | 3 | 4;

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
}
function fmtOnlyDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { weekday: "long", day: "2-digit", month: "long" });
}
function fechaISO(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Selector de empresa con buscador — usado para elegir Empresa A y Empresa B
function SelectorEmpresa({ titulo, empresas, seleccionada, excluirEeId, onSelect }: {
  titulo: string; empresas: any[]; seleccionada: any; excluirEeId?: number | null;
  onSelect: (e: any) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const filtradas = empresas.filter(
    (e) =>
      e.eeId !== excluirEeId &&
      [e.nombre, e.rubro, e.codigo].some((v) => v && String(v).toLowerCase().includes(busqueda.toLowerCase()))
  );
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col min-h-0">
      <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">{titulo}</p>
      {seleccionada ? (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-bold text-[#449D3A] shrink-0">
            {(seleccionada.nombre ?? "E")[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 truncate">{seleccionada.nombre}</p>
            {seleccionada.rubro && <p className="text-xs text-gray-500 truncate">{seleccionada.rubro}</p>}
          </div>
          <button onClick={() => onSelect(null)} className="text-xs font-bold text-gray-400 hover:text-red-500 shrink-0">
            Cambiar
          </button>
        </div>
      ) : (
        <>
          <div className="relative mb-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar empresa..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]"
            />
          </div>
          <div className="overflow-y-auto max-h-56 space-y-1">
            {filtradas.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Sin resultados.</p>
            ) : (
              filtradas.map((e) => (
                <button
                  key={e.eeId}
                  onClick={() => onSelect(e)}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-green-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center font-bold text-[#449D3A] text-sm shrink-0">
                    {(e.nombre ?? "E")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{e.nombre}</p>
                    {e.rubro && <p className="text-[11px] text-gray-400 truncate">{e.rubro}</p>}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function TecnicoAgendarPage() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);

  const [paso, setPaso] = useState<Paso>(1);
  const [empA, setEmpA] = useState<any>(null);
  const [empB, setEmpB] = useState<any>(null);
  const [tipo, setTipo] = useState<"PRESENCIAL" | "VIRTUAL">("PRESENCIAL");

  // Horario
  const [horarios, setHorarios] = useState<any[]>([]);
  const [duracionMin, setDuracionMin] = useState(0);
  const [cargandoH, setCargandoH] = useState(false);
  const [fechaSelec, setFechaSelec] = useState("");
  const [horaSelec, setHoraSelec] = useState("");
  const [minutosStr, setMinutosStr] = useState("");

  // Mesa
  const [mesas, setMesas] = useState<any[]>([]);
  const [mesa, setMesa] = useState<number | null>(null);
  const [cargandoM, setCargandoM] = useState(false);

  const [enlace, setEnlace] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/tecnico/empresas-habilitadas`)
      .then((r) => r.json())
      .then((d) => setEmpresas(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setCargandoEmpresas(false));
  }, []);

  // ── Derivados del horario (mismo patrón que NuevaSolicitudModal) ──
  const fechasDisponibles = useMemo(() =>
    [...new Set(horarios.map((h: any) => fechaISO(h.inicio)))].sort(), [horarios]);
  const horariosDelDia = useMemo(() =>
    fechaSelec ? horarios.filter((h: any) => fechaISO(h.inicio) === fechaSelec) : [], [horarios, fechaSelec]);
  const horasDisponibles = useMemo(() =>
    [...new Set(horariosDelDia.map((h: any) => new Date(h.inicio).getHours()))].sort((a, b) => a - b), [horariosDelDia]);
  const minutosParaHora = useMemo(() => {
    if (horaSelec === "") return [];
    return horariosDelDia
      .filter((h: any) => new Date(h.inicio).getHours() === parseInt(horaSelec))
      .map((h: any) => new Date(h.inicio).getMinutes())
      .sort((a, b) => a - b);
  }, [horariosDelDia, horaSelec]);
  const horario = useMemo(() => {
    if (horaSelec === "" || minutosStr === "") return null;
    const mins = parseInt(minutosStr);
    return horariosDelDia.find((h: any) => {
      const d = new Date(h.inicio);
      return d.getHours() === parseInt(horaSelec) && d.getMinutes() === mins;
    }) ?? null;
  }, [horariosDelDia, horaSelec, minutosStr]);

  useEffect(() => {
    setMinutosStr(minutosParaHora.length > 0 ? String(minutosParaHora[0]).padStart(2, "0") : "");
  }, [horaSelec, minutosParaHora]);

  useEffect(() => {
    setHoraSelec("");
    if (horasDisponibles.length > 0) setHoraSelec(String(horasDisponibles[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaSelec]);

  const cargarHorarios = () => {
    if (!empA || !empB) return;
    setCargandoH(true);
    setHorarios([]); setFechaSelec(""); setHoraSelec(""); setMinutosStr("");
    fetch(`${API}/empresa/horarios?eeId=${empA.eeId}&eeReceptoraId=${empB.eeId}`)
      .then((r) => r.json())
      .then((data) => {
        const hrs: any[] = Array.isArray(data?.horarios) ? data.horarios : [];
        setHorarios(hrs);
        setDuracionMin(data?.duracionMinutos ?? 0);
        const fechas = [...new Set(hrs.map((h: any) => fechaISO(h.inicio)))].sort();
        const hoy = fechaISO(new Date().toISOString());
        setFechaSelec(fechas.find((f) => f >= hoy) ?? fechas[0] ?? "");
      })
      .catch(() => setHorarios([]))
      .finally(() => setCargandoH(false));
  };

  const cargarMesas = (h: any) => {
    setCargandoM(true);
    setMesas([]); setMesa(null);
    fetch(`${API}/empresa/mesas-disponibles?inicio=${encodeURIComponent(h.inicio)}&fin=${encodeURIComponent(h.fin)}`)
      .then((r) => r.json())
      .then((d) => setMesas(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setCargandoM(false));
  };

  const crear = async () => {
    if (!empA || !empB || !horario) return;
    setErr(null);
    setEnviando(true);
    try {
      const res = await fetch(`${API}/tecnico/reuniones/crear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eeAId: empA.eeId, eeBId: empB.eeId, tipo,
          inicio: horario.inicio,
          mesaId: tipo === "PRESENCIAL" ? mesa ?? undefined : undefined,
          enlace: tipo === "VIRTUAL" ? enlace || undefined : undefined,
          mensaje: mensaje || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Error al crear la reunión");
      setExito(`Reunión creada entre ${empA.nombre} y ${empB.nombre} para el ${fmtOnlyDate(horario.inicio)} a las ${fmtTime(horario.inicio)}. Ambas empresas fueron notificadas.`);
    } catch (e: any) { setErr(e.message); }
    finally { setEnviando(false); }
  };

  const reiniciar = () => {
    setExito(null); setErr(null); setPaso(1);
    setEmpA(null); setEmpB(null); setTipo("PRESENCIAL");
    setHorarios([]); setFechaSelec(""); setHoraSelec(""); setMinutosStr("");
    setMesas([]); setMesa(null); setEnlace(""); setMensaje("");
  };

  const pasos = [
    { n: 1, label: "Empresas" },
    { n: 2, label: "Modalidad" },
    { n: 3, label: "Horario" },
    { n: 4, label: tipo === "PRESENCIAL" ? "Mesa y confirmar" : "Confirmar" },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Modal de éxito */}
      {exito && (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#449D3A]" />
            </div>
            <h3 className="font-extrabold text-gray-900 mb-1">¡Reunión agendada!</h3>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">{exito}</p>
            <button onClick={reiniciar}
              className="w-full py-2.5 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold transition-colors">
              Agendar otra reunión
            </button>
          </div>
        </div>
      )}

      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <CalendarPlus className="w-6 h-6 text-[#449D3A]" />
          Agendar reunión
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Crea una reunión confirmada entre dos empresas en 4 pasos. Ambas serán notificadas automáticamente.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-6">
        {pasos.map((p, i) => (
          <React.Fragment key={p.n}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold ${
                paso > p.n ? "bg-[#449D3A] text-white" : paso === p.n ? "bg-[#449D3A] text-white ring-4 ring-green-100" : "bg-gray-100 text-gray-400"
              }`}>
                {paso > p.n ? <Check className="w-4 h-4" /> : p.n}
              </div>
              <span className={`text-xs font-bold hidden sm:block ${paso >= p.n ? "text-gray-800" : "text-gray-400"}`}>{p.label}</span>
            </div>
            {i < pasos.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${paso > p.n ? "bg-[#449D3A]" : "bg-gray-200"}`} />}
          </React.Fragment>
        ))}
      </div>

      {err && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />{err}
        </div>
      )}

      {/* ── Paso 1: elegir empresas ── */}
      {paso === 1 && (
        <div className="space-y-4">
          {cargandoEmpresas ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectorEmpresa titulo="Empresa 1" empresas={empresas} seleccionada={empA} excluirEeId={empB?.eeId} onSelect={setEmpA} />
              <SelectorEmpresa titulo="Empresa 2" empresas={empresas} seleccionada={empB} excluirEeId={empA?.eeId} onSelect={setEmpB} />
            </div>
          )}
          <button
            onClick={() => setPaso(2)}
            disabled={!empA || !empB}
            className="w-full py-3 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente: Modalidad
          </button>
        </div>
      )}

      {/* ── Paso 2: modalidad ── */}
      {paso === 2 && (
        <div className="space-y-4">
          <button onClick={() => setPaso(1)} className="flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-gray-700">
            <ChevronLeft className="w-4 h-4" />Atrás
          </button>
          <div className="grid grid-cols-2 gap-3">
            {(["PRESENCIAL", "VIRTUAL"] as const).map((t) => (
              <button key={t} onClick={() => setTipo(t)}
                className={`flex flex-col items-center gap-2 p-6 rounded-2xl border-2 text-sm font-bold transition-all ${
                  tipo === t ? "border-[#449D3A] bg-green-50 text-[#449D3A]" : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
                }`}>
                {t === "PRESENCIAL" ? <Users className="w-7 h-7" /> : <Monitor className="w-7 h-7" />}
                {t === "PRESENCIAL" ? "Presencial" : "Virtual"}
                <span className="text-[11px] font-normal text-gray-400">
                  {t === "PRESENCIAL" ? "En el evento, en una mesa" : "Por videollamada"}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => { setPaso(3); cargarHorarios(); }}
            className="w-full py-3 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold transition-colors"
          >
            Siguiente: Elegir horario
          </button>
        </div>
      )}

      {/* ── Paso 3: horario ── */}
      {paso === 3 && (
        <div className="space-y-4">
          <button onClick={() => setPaso(2)} className="flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-gray-700">
            <ChevronLeft className="w-4 h-4" />Atrás
          </button>

          {cargandoH ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
              <div className="w-4 h-4 border-2 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
              Buscando horarios en que ambas empresas están libres...
            </div>
          ) : horarios.length === 0 ? (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-xl p-4">
              No hay horarios en que ambas empresas estén disponibles. Prueba con otras empresas.
            </p>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              {duracionMin > 0 && (
                <p className="text-xs text-[#449D3A] font-semibold bg-green-50 px-3 py-1.5 rounded-lg inline-block">
                  Las reuniones duran {duracionMin} minutos
                </p>
              )}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Fecha</label>
                <select value={fechaSelec} onChange={(e) => setFechaSelec(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] bg-white">
                  {fechasDisponibles.map((f) => (
                    <option key={f} value={f}>
                      {new Date(f + "T00:00:00").toLocaleDateString("es-BO", { weekday: "long", day: "2-digit", month: "long" })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Hora</label>
                  <select value={horaSelec} onChange={(e) => setHoraSelec(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] bg-white">
                    <option value="">-- Hora --</option>
                    {horasDisponibles.map((h) => (
                      <option key={h} value={String(h)}>{String(h).padStart(2, "0")}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Minutos</label>
                  <select value={minutosStr} onChange={(e) => setMinutosStr(e.target.value)}
                    disabled={!horaSelec || minutosParaHora.length === 0}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] disabled:opacity-40 bg-white">
                    {minutosParaHora.map((m) => (
                      <option key={m} value={String(m).padStart(2, "0")}>{String(m).padStart(2, "0")}</option>
                    ))}
                  </select>
                </div>
              </div>
              {horario && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl p-2.5 text-xs text-green-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  Ambas empresas libres: {fmtOnlyDate(horario.inicio)} a las {fmtTime(horario.inicio)}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => { if (horario) { setPaso(4); if (tipo === "PRESENCIAL") cargarMesas(horario); } }}
            disabled={!horario}
            className="w-full py-3 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente: {tipo === "PRESENCIAL" ? "Elegir mesa" : "Confirmar"}
          </button>
        </div>
      )}

      {/* ── Paso 4: mesa (presencial) + confirmar ── */}
      {paso === 4 && (
        <div className="space-y-4">
          <button onClick={() => setPaso(3)} className="flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-gray-700">
            <ChevronLeft className="w-4 h-4" />Atrás
          </button>

          {/* Resumen */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">Resumen</p>
            <div className="flex items-center gap-2 text-sm"><Building2 className="w-4 h-4 text-[#449D3A]" /><span className="font-bold">{empA?.nombre}</span><span className="text-gray-400">con</span><span className="font-bold">{empB?.nombre}</span></div>
            <div className="flex items-center gap-2 text-sm">
              {tipo === "PRESENCIAL" ? <Users className="w-4 h-4 text-blue-500" /> : <Monitor className="w-4 h-4 text-purple-500" />}
              <span>{tipo === "PRESENCIAL" ? "Presencial" : "Virtual"}</span>
            </div>
            {horario && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-[#449D3A]" />
                {fmtOnlyDate(horario.inicio)} · {fmtTime(horario.inicio)} – {fmtTime(horario.fin)}
              </div>
            )}
          </div>

          {tipo === "PRESENCIAL" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                Mesa (opcional — si no eliges, se asigna automáticamente)
              </label>
              {cargandoM ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                  <div className="w-4 h-4 border-2 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
                  Verificando mesas...
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setMesa(null)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                      mesa === null ? "border-[#449D3A] bg-green-50 text-[#449D3A]" : "border-gray-200 text-gray-600 hover:border-green-300"
                    }`}>
                    Automática
                  </button>
                  {mesas.map((m: any) => (
                    <button key={m.id} onClick={() => setMesa(m.id)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                        mesa === m.id ? "border-[#449D3A] bg-green-50 text-[#449D3A]" : "border-gray-200 text-gray-600 hover:border-green-300"
                      }`}>
                      <Table2 className="w-3 h-3" />Mesa {m.numeroMesa}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tipo === "VIRTUAL" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Enlace de reunión (opcional)</label>
              <input type="url" value={enlace} onChange={(e) => setEnlace(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]" />
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Mensaje para las empresas (opcional)</label>
            <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={2}
              placeholder="Ej: Reunión coordinada por el equipo del evento..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] resize-none" />
          </div>

          <button
            onClick={crear}
            disabled={enviando}
            className="w-full py-3 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {enviando ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            Crear reunión confirmada
          </button>
        </div>
      )}
    </div>
  );
}
