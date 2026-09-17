import React, { useRef, useState } from "react";
import {
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native";
import { X } from "lucide-react-native";

interface Props {
  uri: string;
  style?: object;
  imgStyle?: object;
}

const { width: SW, height: SH } = Dimensions.get("window");
const DOBLE_TAP_MS = 300;
const ESCALA_ZOOM = 2.5;

export default function ImagenLightbox({ uri, style, imgStyle }: Props) {
  const [open, setOpen] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const zoomedRef = useRef(false);
  const ultimoTapRef = useRef(0);

  const cerrar = () => {
    setOpen(false);
    zoomedRef.current = false;
    scale.setValue(1);
  };

  // Doble tap = zoom básico (alterna entre tamaño normal y ampliado).
  // Se detecta a mano en vez de con un gesture handler para mantenerlo simple.
  const onTapImagen = () => {
    const ahora = Date.now();
    if (ahora - ultimoTapRef.current < DOBLE_TAP_MS) {
      const nuevoZoom = !zoomedRef.current;
      zoomedRef.current = nuevoZoom;
      Animated.spring(scale, { toValue: nuevoZoom ? ESCALA_ZOOM : 1, useNativeDriver: true, friction: 6 }).start();
      ultimoTapRef.current = 0;
    } else {
      ultimoTapRef.current = ahora;
    }
  };

  return (
    <>
      <TouchableOpacity activeOpacity={0.85} onPress={() => setOpen(true)} style={style}>
        <Image
          source={{ uri }}
          style={[styles.thumb, imgStyle]}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={cerrar}>
        <Pressable style={styles.overlay} onPress={cerrar}>
          <TouchableOpacity style={styles.closeBtn} onPress={cerrar}>
            <X size={20} color="#fff" />
          </TouchableOpacity>
          <Pressable onPress={(e) => { e.stopPropagation(); onTapImagen(); }}>
            <Animated.Image
              source={{ uri }}
              style={[styles.fullImg, { transform: [{ scale }] }]}
              resizeMode="contain"
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 48,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  fullImg: {
    width: SW - 32,
    height: SH * 0.75,
  },
});
