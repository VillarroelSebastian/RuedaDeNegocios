import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { CheckCircle2, QrCode } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { API_URL, userStore } from "../../utils/userStore";
import { useModal } from "../../components/AppModal";

const GREEN = "#449D3A";

export default function TecnicoAsistenciaScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneando, setEscaneando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [pendiente, setPendiente] = useState<any>(null);
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { show, modal } = useModal();
  const tecnicoId = userStore.get()?.id;

  const cargar = useCallback(async () => {
    if (!tecnicoId) return;
    try {
      const [res, resAusp] = await Promise.all([
        fetch(`${API_URL}/tecnico/asistencias`),
        fetch(`${API_URL}/tecnico/asistencias-auspiciadores`),
      ]);
      const data = await res.json();
      const dataAusp = await resAusp.json();
      const normales = (Array.isArray(data) ? data : []).map((a: any) => ({
        ...a,
        tipo: "PARTICIPANTE",
      }));
      const auspiciadores = (Array.isArray(dataAusp) ? dataAusp : []).map(
        (a: any) => ({ ...a, tipo: "AUSPICIADOR" }),
      );
      setAsistencias(
        [...normales, ...auspiciadores].sort(
          (a, b) =>
            +new Date(b.fechaHoraAsistencia) - +new Date(a.fechaHoraAsistencia),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [tecnicoId]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const procesarQR = async (contenido: string) => {
    if (procesando) return;
    const match = contenido.match(/\/credencial\/(\d+)\?t=([a-zA-Z0-9]+)/);
    const matchAusp = contenido.match(
      /\/credencial\/auspiciador\/(\d+)\?t=([a-zA-Z0-9]+)/,
    );
    if (!match && !matchAusp) {
      setEscaneando(false);
      show({
        type: "error",
        title: "QR no valido",
        message: "Este codigo no corresponde a una credencial del evento.",
      });
      return;
    }
    setProcesando(true);
    try {
      const auspiciador = Boolean(matchAusp);
      const partes = matchAusp || match!;
      const url = auspiciador
        ? `${API_URL}/tecnico/credenciales-auspiciador/verificar?personaId=${partes[1]}&token=${partes[2]}`
        : `${API_URL}/tecnico/credenciales/verificar?euId=${partes[1]}&token=${partes[2]}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || "No se pudo verificar la credencial.");
      setEscaneando(false);
      setPendiente({
        ...(auspiciador
          ? { personaId: Number(partes[1]) }
          : { euId: Number(partes[1]) }),
        token: partes[2],
        tipo: auspiciador ? "AUSPICIADOR" : "PARTICIPANTE",
        ...data,
      });
    } catch (e: any) {
      setEscaneando(false);
      show({
        type: "error",
        title: "No se pudo registrar",
        message: e.message,
      });
    } finally {
      setProcesando(false);
    }
  };

  const registrarAsistencia = async () => {
    if (!pendiente || procesando) return;
    setProcesando(true);
    try {
      const esAuspiciador = pendiente.tipo === "AUSPICIADOR";
      const res = await fetch(
        `${API_URL}/${esAuspiciador ? "tecnico/asistencias-auspiciadores" : "tecnico/asistencias"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            esAuspiciador
              ? { personaId: pendiente.personaId, token: pendiente.token }
              : { euId: pendiente.euId, token: pendiente.token },
          ),
        },
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || "No se pudo registrar la asistencia.");
      setPendiente((actual: any) => ({
        ...actual,
        asistencia: { registrada: true, fechaHoraAsistencia: data.fechaHoraAsistencia },
      }));
      show({
        type: data.yaRegistrada ? "warning" : "success",
        title: data.yaRegistrada
          ? "Asistencia ya registrada"
          : "Asistencia registrada",
        message: `${data.participante.nombre} · ${data.participante.empresa}`,
      });
      cargar();
    } catch (e: any) {
      show({
        type: "error",
        title: "No se pudo registrar",
        message: e.message,
      });
    } finally {
      setProcesando(false);
    }
  };

  if (escaneando) {
    if (!permission?.granted)
      return (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <QrCode size={48} color={GREEN} />
          <Text
            style={{
              textAlign: "center",
              marginVertical: 16,
              color: "#475569",
            }}
          >
            Se necesita permiso de camara para escanear credenciales.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={{
              backgroundColor: GREEN,
              borderRadius: 12,
              paddingHorizontal: 20,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>
              Permitir camara
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setEscaneando(false)}
            style={{ padding: 16 }}
          >
            <Text style={{ color: "#64748b" }}>Volver</Text>
          </TouchableOpacity>
        </View>
      );
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView
          style={{ flex: 1 }}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={({ data }) => procesarQR(data)}
        />
        <View
          style={{
            position: "absolute",
            left: 20,
            right: 20,
            bottom: 30,
            gap: 10,
          }}
        >
          <Text
            style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}
          >
            {procesando ? "Registrando..." : "Apunta al QR de la credencial"}
          </Text>
          <TouchableOpacity
            onPress={() => setEscaneando(false)}
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 13,
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "800", color: "#111827" }}>
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
        {modal}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <View
        style={{
          padding: 18,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#0f172a" }}>
          Control de asistencia
        </Text>
        <Text style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
          Solo el personal técnico puede verificar y registrar asistencias.
        </Text>
        <TouchableOpacity
          onPress={() => setEscaneando(true)}
          style={{
            marginTop: 14,
            backgroundColor: GREEN,
            borderRadius: 14,
            padding: 14,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <QrCode size={20} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "800" }}>Escanear QR</Text>
        </TouchableOpacity>
      </View>
      {pendiente ? (
        <View
          style={{
            margin: 16,
            backgroundColor: "#fff",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#bbf7d0",
            padding: 18,
          }}
        >
          <CheckCircle2
            size={42}
            color={GREEN}
            style={{ alignSelf: "center" }}
          />
          <Text
            style={{
              color: "#15803d",
              textAlign: "center",
              fontSize: 11,
              fontWeight: "800",
              marginTop: 8,
            }}
          >
            {pendiente.asistencia?.registrada ? "ASISTENCIA YA REGISTRADA" : "CREDENCIAL VÁLIDA"}
          </Text>
          <Text
            style={{
              color: "#0f172a",
              textAlign: "center",
              fontSize: 20,
              fontWeight: "800",
              marginTop: 4,
            }}
          >
            {pendiente.participante?.nombre || pendiente.nombreCompleto}
          </Text>
          <View style={{ marginTop: 14, gap: 8 }}>
            {[
              ["Empresa", pendiente.empresa?.nombre || pendiente.empresa],
              ["Tipo", pendiente.tipo === "AUSPICIADOR" ? "Auspiciador" : pendiente.participante?.esResponsable ? "Encargado" : "Participante"],
              ["Cargo", pendiente.participante?.cargo || pendiente.cargo || "No indicado"],
              ["Lugar", pendiente.lugar || [pendiente.evento?.ciudad, pendiente.evento?.pais].filter(Boolean).join(", ") || "Lugar del evento"],
              ["Evento", pendiente.evento?.nombre || pendiente.evento || "Evento actual"],
            ].map(([etiqueta, valor]) => <View key={etiqueta} style={{ backgroundColor: "#f8fafc", borderRadius: 10, padding: 10 }}><Text style={{ color: "#94a3b8", fontSize: 10 }}>{etiqueta}</Text><Text style={{ color: "#334155", fontWeight: "700", fontSize: 13 }}>{valor}</Text></View>)}
          </View>
          {pendiente.asistencia?.registrada && <View style={{ marginTop: 12, padding: 11, borderRadius: 10, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" }}><Text style={{ color: "#166534", fontWeight: "700", textAlign: "center", fontSize: 12 }}>Registrada el {new Date(pendiente.asistencia.fechaHoraAsistencia).toLocaleString("es-BO")}</Text></View>}
          <View style={{ gap: 8, marginTop: 18 }}>
            {!pendiente.asistencia?.registrada && <TouchableOpacity
              onPress={registrarAsistencia}
              disabled={procesando}
              style={{ width: "100%", backgroundColor: GREEN, borderRadius: 12, padding: 14, alignItems: "center", opacity: procesando ? 0.5 : 1 }}
            >
              <Text style={{ fontWeight: "800", color: "#fff" }}>{procesando ? "Registrando..." : "Registrar asistencia"}</Text>
            </TouchableOpacity>}
            <TouchableOpacity
              onPress={() => setPendiente(null)}
              style={{
                width: "100%",
                borderWidth: 1,
                borderColor: "#cbd5e1",
                borderRadius: 12,
                padding: 13,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "800", color: "#475569" }}>
                {pendiente.asistencia?.registrada ? "Escanear otra credencial" : "Cancelar"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={GREEN} />
      ) : (
        <FlatList
          data={asistencias}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={
            <Text
              style={{ textAlign: "center", color: "#94a3b8", marginTop: 50 }}
            >
              Todavía no registraste asistencias.
            </Text>
          }
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                padding: 14,
                flexDirection: "row",
                gap: 10,
              }}
            >
              <CheckCircle2 size={20} color={GREEN} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: "#0f172a" }}>
                  {item.tipo === "AUSPICIADOR"
                    ? item.auspiciadorpersona?.nombreCompleto
                    : `${item.empresa_usuario?.usuario?.nombres || ""} ${item.empresa_usuario?.usuario?.apellidoPaterno || ""}`}
                </Text>
                <Text style={{ color: "#64748b", fontSize: 12 }}>
                  {item.tipo === "AUSPICIADOR" ? item.auspiciadorpersona?.auspiciador?.nombreEmpresa : item.empresa_usuario?.empresa?.nombre}
                </Text>
                <Text style={{ color: "#94a3b8", fontSize: 11, marginTop: 3 }}>
                  {new Date(item.fechaHoraAsistencia).toLocaleString("es-BO")} · {[item.evento?.ciudadEvento, item.evento?.paisEvento].filter(Boolean).join(", ") || "Lugar del evento"}
                </Text>
              </View>
            </View>
          )}
          refreshing={loading}
          onRefresh={cargar}
        />
      )}
      {modal}
    </View>
  );
}
