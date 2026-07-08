import React, { useState } from "react";
import {
  TouchableOpacity,
  Image,
  Modal,
  View,
  Pressable,
  StyleSheet,
  Dimensions,
} from "react-native";
import { X } from "lucide-react-native";

interface Props {
  uri: string;
  style?: object;
  imgStyle?: object;
}

const { width: SW, height: SH } = Dimensions.get("window");

export default function ImagenLightbox({ uri, style, imgStyle }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity activeOpacity={0.85} onPress={() => setOpen(true)} style={style}>
        <Image
          source={{ uri }}
          style={[styles.thumb, imgStyle]}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
            <X size={20} color="#fff" />
          </TouchableOpacity>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Image
              source={{ uri }}
              style={styles.fullImg}
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
