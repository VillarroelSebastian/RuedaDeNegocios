import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Camera, Images, X, Trash2, Star, Building2, Wrench } from "lucide-react-native";
import { API_URL, userStore } from "../../utils/userStore";
import { useModal } from "../../components/AppModal";

const GREEN = "#449D3A";
export default function TecnicoGaleriaScreen() {
  const { show, modal } = useModal();
  const [fotos, setFotos] = useState<any[]>([]),
    [selector, setSelector] = useState(false),
    [subiendo, setSubiendo] = useState(false),
    [refreshing, setRefreshing] = useState(false),
    [ampliada, setAmpliada] = useState<any | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [actualizandoLanding, setActualizandoLanding] = useState<number | null>(null);
  const actual = userStore.get();
  const esEmpresa = actual?.rolEvento === "EMPRESA";
  const esStaff = !esEmpresa;

  const grupos = useMemo(() => {
    if (!esStaff) return null;
    const map = new Map<string, { key: string; nombre: string; tipo: "EMPRESA" | "STAFF"; fotos: any[] }>();
    for (const f of fotos) {
      const key = f.empresa_usuario_id != null ? `eu-${f.empresa_usuario_id}` : `u-${f.usuario_id ?? "x"}`;
      if (!map.has(key)) map.set(key, { key, nombre: f.autorNombre, tipo: f.empresa_usuario_id != null ? "EMPRESA" : "STAFF", fotos: [] });
      map.get(key)!.fotos.push(f);
    }
    return Array.from(map.values()).sort((a, b) => b.fotos.length - a.fotos.length);
  }, [fotos, esStaff]);

  const fotosLanding = useMemo(() => fotos.filter((f) => !!f.visibleLanding), [fotos]);

  // Lista plana: encabezado de grupo + filas de a 2 fotos, para poder usar un
  // solo FlatList sin depender de un grid rígido de columnas fijas.
  const staffItems = useMemo(() => {
    if (!grupos) return [];
    const items: any[] = [];
    items.push({ _tipo: "landing-header", key: "landing-header", count: fotosLanding.length });
    if (fotosLanding.length === 0) {
      items.push({ _tipo: "landing-empty", key: "landing-empty" });
    } else {
      for (let i = 0; i < fotosLanding.length; i += 2) {
        items.push({ _tipo: "row", key: `landing-${i}`, fotos: fotosLanding.slice(i, i + 2) });
      }
    }
    items.push({ _tipo: "divider", key: "divider" });
    for (const g of grupos) {
      items.push({ _tipo: "header", key: `h-${g.key}`, nombre: g.nombre, tipoAutor: g.tipo, count: g.fotos.length });
      for (let i = 0; i < g.fotos.length; i += 2) {
        items.push({ _tipo: "row", key: `r-${g.key}-${i}`, fotos: g.fotos.slice(i, i + 2) });
      }
    }
    return items;
  }, [grupos, fotosLanding]);

  const toggleLanding = async (foto: any) => {
    setActualizandoLanding(foto.id);
    try {
      const nuevo = foto.visibleLanding ? 0 : 1;
      const r = await fetch(`${API_URL}/galeria/${foto.id}/landing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: nuevo }),
      });
      if (!r.ok) throw new Error((await r.json()).message || "No se pudo actualizar.");
      setFotos((prev) => prev.map((f) => (f.id === foto.id ? { ...f, visibleLanding: nuevo } : f)));
      setAmpliada((prev: any) => (prev && prev.id === foto.id ? { ...prev, visibleLanding: nuevo } : prev));
      show({
        type: "success",
        title: nuevo ? "Agregada al landing" : "Quitada del landing",
        message: nuevo ? "Esta foto ahora aparece en la página pública del evento." : "Esta foto ya no aparece en la página pública.",
      });
    } catch (e: any) {
      show({ type: "error", title: "No se pudo actualizar", message: e.message });
    } finally {
      setActualizandoLanding(null);
    }
  };

  const cargar = useCallback(async () => {
    try {
      // El filtro de fotos técnicas pertenece únicamente al landing público.
      // Dentro de la aplicación todos los roles ven el repositorio del evento.
      const r = await fetch(`${API_URL}/galeria`);
      setFotos(r.ok ? await r.json() : []);
    } finally {
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );
  const elegir = async (origen: "camara" | "galeria") => {
    setSelector(false);
    const permiso =
      origen === "camara"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted)
      return show({
        type: "warning",
        title: "Permiso requerido",
        message: `Autoriza el acceso a la ${origen}.`,
      });
    const r =
      origen === "camara"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
          });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    if (a.fileSize && a.fileSize > 5 * 1024 * 1024)
      return show({
        type: "warning",
        title: "Imagen muy grande",
        message: "La imagen no puede superar 5 MB.",
      });
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append("file", {
        uri: a.uri,
        name: a.fileName || "foto-evento.jpg",
        type: a.mimeType || "image/jpeg",
      } as any);
      const up = await fetch(`${API_URL}/${esEmpresa ? 'public' : 'admin'}/imagenes/upload`, {
        method: "POST",
        body: fd,
      });
      const ud = await up.json();
      if (!up.ok || !ud.url) throw new Error(ud.message || "No se pudo subir.");
      const u = userStore.get();
      const pub = await fetch(`${API_URL}/galeria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urlFoto: ud.url,
          ...(esEmpresa ? { empresa_usuario_id: u?.empresaUsuarioId } : { usuario_id: u?.id }),
          descripcion: descripcion.trim() || null,
          autorNombre: `${u?.nombres || (esEmpresa ? "Participante" : "Técnico")} ${u?.apellidoPaterno || ""}`.trim(),
        }),
      });
      if (!pub.ok)
        throw new Error((await pub.json()).message || "No se pudo publicar.");
      setDescripcion("");
      show({
        type: "success",
        title: "Foto publicada",
        message: "Ya aparece en la galería del evento.",
      });
      cargar();
    } catch (e: any) {
      show({
        type: "error",
        title: "Error",
        message: e.message || "No se pudo publicar.",
      });
    } finally {
      setSubiendo(false);
    }
  };
  const eliminar = async (id: number) => {
    try {
      const r = await fetch(`${API_URL}/galeria/${id}`, { method: "DELETE" });
      if (!r.ok)
        throw new Error((await r.json()).message || "No se pudo eliminar.");
      setFotos((v) => v.filter((f) => f.id !== id));
    } catch (e: any) {
      show({ type: "error", title: "No se pudo eliminar", message: e.message });
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {modal}
      <FlatList
        data={esStaff ? staffItems : fotos}
        numColumns={esStaff ? 1 : 2}
        keyExtractor={(x: any) => esStaff ? x.key : String(x.id)}
        contentContainerStyle={{ padding: 12 }}
        columnWrapperStyle={esStaff ? undefined : { gap: 10 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              cargar();
            }}
            tintColor={GREEN}
          />
        }
        ListHeaderComponent={
          <>
            <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 4 }}>
              Fotos del evento
            </Text>
            <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
              {esStaff
                ? "Agrupadas por quién las subió. Toca la estrella de una foto para mostrarla en el landing público."
                : "Comparte fotografías en el repositorio del evento."}
            </Text>
            <TextInput
              value={descripcion}
              onChangeText={setDescripcion}
              maxLength={305}
              placeholder="Descripción breve de la próxima foto"
              style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 12, marginBottom: 10 }}
            />
            <TouchableOpacity
              onPress={() => setSelector(true)}
              disabled={subiendo}
              style={{
                backgroundColor: GREEN,
                borderRadius: 12,
                padding: 13,
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              {subiendo ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "800" }}>
                  Subir foto
                </Text>
              )}
            </TouchableOpacity>
          </>
        }
        renderItem={({ item }: { item: any }) => {
          if (!esStaff) {
            return (
              <FotoCard f={item} esStaff={false}
                onPress={() => setAmpliada(item)}
                onEliminar={() => eliminar(item.id)}
              />
            );
          }
          if (item._tipo === "landing-header") {
            return (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 8 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#fef3c7" }}>
                  <Star color="#b45309" fill="#b45309" size={13} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: "800", color: "#0f172a", flex: 1 }}>En el landing ahora</Text>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#94a3b8" }}>{item.count} foto(s)</Text>
              </View>
            );
          }
          if (item._tipo === "landing-empty") {
            return (
              <View style={{ backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a", borderStyle: "dashed", borderRadius: 14, padding: 18, alignItems: "center", marginBottom: 10 }}>
                <Star color="#fcd34d" size={22} />
                <Text style={{ fontSize: 12, color: "#92400e", textAlign: "center", marginTop: 8 }}>
                  Ninguna foto seleccionada todavía. Toca la estrella de una foto para agregarla aquí.
                </Text>
              </View>
            );
          }
          if (item._tipo === "divider") {
            return (
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 14, marginBottom: 4 }}>
                Todas las fotos, por participante
              </Text>
            );
          }
          if (item._tipo === "header") {
            return (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, marginBottom: 8 }}>
                <View style={{
                  width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center",
                  backgroundColor: item.tipoAutor === "EMPRESA" ? "#dcfce7" : "#dbeafe",
                }}>
                  {item.tipoAutor === "EMPRESA"
                    ? <Building2 color="#15803d" size={13} />
                    : <Wrench color="#1d4ed8" size={13} />}
                </View>
                <Text style={{ fontSize: 13, fontWeight: "800", color: "#0f172a", flex: 1 }} numberOfLines={1}>{item.nombre}</Text>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#94a3b8" }}>{item.count} foto(s)</Text>
              </View>
            );
          }
          const fotosFila: any[] = item.fotos;
          return (
            <View style={{ flexDirection: "row", gap: 10 }}>
              {fotosFila.map((f) => (
                <FotoCard key={f.id} f={f} esStaff
                  onPress={() => setAmpliada(f)}
                  onEliminar={() => eliminar(f.id)}
                  onToggleLanding={() => toggleLanding(f)}
                  actualizando={actualizandoLanding === f.id}
                />
              ))}
              {fotosFila.length === 1 && <View style={{ flex: 1 }} />}
            </View>
          );
        }}
      />
      <Modal visible={selector} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,.5)",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{ backgroundColor: "#fff", borderRadius: 20, padding: 20 }}
          >
            <Text style={{ fontSize: 17, fontWeight: "800", marginBottom: 14 }}>
              Seleccionar origen
            </Text>
            <TouchableOpacity
              onPress={() => elegir("camara")}
              style={{
                flexDirection: "row",
                gap: 10,
                padding: 14,
                backgroundColor: "#f0fdf4",
                borderRadius: 12,
                marginBottom: 8,
              }}
            >
              <Camera color={GREEN} />
              <Text style={{ fontWeight: "700" }}>Abrir cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => elegir("galeria")}
              style={{
                flexDirection: "row",
                gap: 10,
                padding: 14,
                backgroundColor: "#eff6ff",
                borderRadius: 12,
              }}
            >
              <Images color="#2563eb" />
              <Text style={{ fontWeight: "700" }}>Elegir de galería</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelector(false)}
              style={{ padding: 12, alignItems: "center" }}
            >
              <Text style={{ color: "#64748b", fontWeight: "700" }}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={!!ampliada} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,.92)",
            justifyContent: "center",
            padding: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => setAmpliada(null)}
            style={{
              position: "absolute",
              right: 18,
              top: 45,
              zIndex: 2,
              padding: 10,
            }}
          >
            <X color="#fff" size={28} />
          </TouchableOpacity>
          {ampliada && (
            <>
              <Image
                source={{ uri: ampliada.urlFoto }}
                style={{ width: "100%", height: "80%", resizeMode: "contain" }}
              />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingTop: 12, gap: 10 }}>
                <Text numberOfLines={2} style={{ color: "#e5e7eb", fontSize: 12, flex: 1 }}>
                  {ampliada.autorNombre}{ampliada.descripcion ? ` · ${ampliada.descripcion}` : ''}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  {esStaff && (
                    <TouchableOpacity onPress={() => toggleLanding(ampliada)} disabled={actualizandoLanding === ampliada.id}
                      style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Star color={ampliada.visibleLanding ? "#fbbf24" : "#e5e7eb"} fill={ampliada.visibleLanding ? "#fbbf24" : "none"} size={16} />
                      <Text style={{ color: ampliada.visibleLanding ? "#fbbf24" : "#e5e7eb", fontWeight: "700", fontSize: 12 }}>
                        {ampliada.visibleLanding ? "En el landing" : "Mostrar en landing"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {esStaff && (
                    <TouchableOpacity onPress={() => { eliminar(ampliada.id); setAmpliada(null); }}>
                      <Trash2 color="#f87171" size={17} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

function FotoCard({
  f, esStaff, onPress, onEliminar, onToggleLanding, actualizando,
}: {
  f: any;
  esStaff: boolean;
  onPress: () => void;
  onEliminar: () => void;
  onToggleLanding?: () => void;
  actualizando?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 5,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#e2e8f0",
      }}
    >
      <View>
        <Image
          source={{ uri: f.urlFoto }}
          style={{ width: "100%", height: 145, resizeMode: "contain" }}
        />
        {!!f.visibleLanding && (
          <View style={{
            position: "absolute", top: 4, left: 4, flexDirection: "row", alignItems: "center", gap: 3,
            backgroundColor: "#fbbf24", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2,
          }}>
            <Star color="#78350f" fill="#78350f" size={9} />
            <Text style={{ fontSize: 8, fontWeight: "800", color: "#78350f" }}>Landing</Text>
          </View>
        )}
        {esStaff && onToggleLanding && (
          <TouchableOpacity
            onPress={onToggleLanding}
            disabled={actualizando}
            style={{
              position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: 12,
              alignItems: "center", justifyContent: "center",
              backgroundColor: f.visibleLanding ? "#fbbf24" : "rgba(255,255,255,0.9)",
            }}
          >
            <Star color={f.visibleLanding ? "#78350f" : "#94a3b8"} fill={f.visibleLanding ? "#78350f" : "none"} size={13} />
          </TouchableOpacity>
        )}
      </View>
      <Text numberOfLines={2} style={{ fontSize: 10, color: "#64748b", padding: 5 }}>
        {f.autorNombre}{f.descripcion ? ` · ${f.descripcion}` : ''}
      </Text>
      {esStaff && <TouchableOpacity onPress={onEliminar} style={{ alignSelf: "flex-end", padding: 7 }} accessibilityLabel="Eliminar foto"><Trash2 color="#dc2626" size={17} /></TouchableOpacity>}
    </TouchableOpacity>
  );
}
