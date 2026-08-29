import React, { useCallback, useState } from "react";
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
import { Camera, Images, X, Trash2 } from "lucide-react-native";
import { API_URL, userStore } from "../../utils/userStore";
import { useModal } from "../../components/AppModal";

const GREEN = "#449D3A";
export default function TecnicoGaleriaScreen() {
  const { show, modal } = useModal();
  const [fotos, setFotos] = useState<any[]>([]),
    [selector, setSelector] = useState(false),
    [subiendo, setSubiendo] = useState(false),
    [refreshing, setRefreshing] = useState(false),
    [ampliada, setAmpliada] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const actual = userStore.get();
  const esEmpresa = actual?.rolEvento === "EMPRESA";
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
        data={fotos}
        numColumns={2}
        keyExtractor={(x) => String(x.id)}
        contentContainerStyle={{ padding: 12 }}
        columnWrapperStyle={{ gap: 10 }}
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
              {actual?.rolEvento === "TECNICO"
                ? "Las fotos tomadas por técnicos se muestran también en el landing."
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
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setAmpliada(item.urlFoto)}
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
            <Image
              source={{ uri: item.urlFoto }}
              style={{ width: "100%", height: 145, resizeMode: "contain" }}
            />
            <Text numberOfLines={2} style={{ fontSize: 10, color: "#64748b", padding: 5 }}>
              {item.autorNombre}{item.descripcion ? ` · ${item.descripcion}` : ''}
            </Text>
            {!esEmpresa && <TouchableOpacity onPress={() => eliminar(item.id)} style={{ alignSelf: "flex-end", padding: 7 }} accessibilityLabel="Eliminar foto"><Trash2 color="#dc2626" size={17} /></TouchableOpacity>}
          </TouchableOpacity>
        )}
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
            <Image
              source={{ uri: ampliada }}
              style={{ width: "100%", height: "90%", resizeMode: "contain" }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
