/** @jsxImportSource react */
// La línea de arriba es intencional y debe ser la primera del archivo: el
// proyecto configura `jsxImportSource: "nativewind"` de forma GLOBAL en
// babel.config.js, así que TODO archivo .tsx (use o no className/Tailwind)
// pasa su JSX por el runtime de NativeWind (react-native-css-interop), que
// ya demostró tener bugs de aplicación de estilos en esta versión de RN/JSX.
// Este pragma saca a este componente puntual de esa transformación y lo
// deja en el runtime de JSX normal de React, para los botones del modal
// nunca dependan de NativeWind en absoluto.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text,
  StyleSheet, Pressable, ActivityIndicator, BackHandler,
} from 'react-native';
import { CheckCircle, XCircle, AlertTriangle, HelpCircle, Info } from 'lucide-react-native';
import ButtonLabel from './ButtonLabel';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type ModalType = 'success' | 'error' | 'warning' | 'confirm' | 'info';

export interface ModalConfig {
  type: ModalType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  confirmColor?: string;
  waitForConfirm?: boolean;
}

interface AppModalProps extends ModalConfig {
  visible: boolean;
  onClose: () => void;
  generation: number;
}

// ─── Config visual por tipo ───────────────────────────────────────────────────
const TYPE_CONFIG: Record<ModalType, {
  icon: React.ComponentType<any>;
  iconColor: string;
  iconBg: string;
  accentColor: string;
  confirmBg: string;
}> = {
  success: {
    icon: CheckCircle,
    iconColor: '#16a34a',
    iconBg:    '#dcfce7',
    accentColor: '#16a34a',
    confirmBg: '#16a34a',
  },
  error: {
    icon: XCircle,
    iconColor: '#dc2626',
    iconBg:    '#fee2e2',
    accentColor: '#dc2626',
    confirmBg: '#dc2626',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: '#d97706',
    iconBg:    '#fef3c7',
    accentColor: '#d97706',
    confirmBg: '#d97706',
  },
  confirm: {
    icon: HelpCircle,
    iconColor: '#2563eb',
    iconBg:    '#dbeafe',
    accentColor: '#2563eb',
    confirmBg: '#2563eb',
  },
  info: {
    icon: Info,
    iconColor: '#0891b2',
    iconBg:    '#cffafe',
    accentColor: '#0891b2',
    confirmBg: '#0891b2',
  },
};

// ─── Componente ───────────────────────────────────────────────────────────────
// Nota deliberada: este componente NO usa el `Modal` nativo de React Native.
// `Modal` en Android renderiza su contenido en una ventana/Dialog nativa
// separada de la Activity principal — y en esa ventana separada, un botón
// con fondo de color (View/Pressable + backgroundColor + borderRadius)
// perdía el texto de su `Text` hijo pese a que la lógica, los estilos y el
// bundle servido eran correctos (verificado). Los botones fuera de un
// `Modal`, en la jerarquía normal de la pantalla, nunca tuvieron este
// problema. Por eso este "modal" es en realidad una superposición: una
// `View` a pantalla completa con posición absoluta, en la misma jerarquía
// de vistas que el resto de la pantalla — sin ventana nativa aparte.
export function AppModal({
  visible, type, title, message,
  confirmText, cancelText, onConfirm, onCancel, confirmColor, waitForConfirm = false, onClose, generation,
}: AppModalProps) {
  const cfg   = TYPE_CONFIG[type];
  const Icon  = cfg.icon;
  const [confirming, setConfirming] = useState(false);

  // Se actualiza en cada render (no en un efecto) para poder comparar,
  // justo después de esperar a onConfirm, si mientras tanto se abrió
  // otro modal encadenado (p. ej. un "¡Listo!" disparado desde el propio
  // onConfirm) y así evitar cerrar por encima de ese modal nuevo.
  const genRef = useRef(generation);
  genRef.current = generation;

  useEffect(() => { setConfirming(false); }, [visible, type, title]);

  const handleConfirm = async () => {
    const startGen = genRef.current;
    if (waitForConfirm) setConfirming(true);
    try {
      await onConfirm?.();
    } finally {
      setConfirming(false);
      // Solo autocerrar si nadie más (dentro de onConfirm) ya mostró
      // un modal nuevo; si lo hizo, generation cambió y lo dejamos como está.
      if (genRef.current === startGen) onClose();
    }
  };
  const handleCancel  = () => { onClose(); onCancel?.();  };

  // Sin `Modal` nativo ya no hay `onRequestClose`: replicamos a mano el
  // botón físico de "atrás" en Android para que siga cerrando el diálogo
  // (o no hacer nada si es de tipo 'confirm', igual que antes con el backdrop).
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (type !== 'confirm') handleCancel();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, type]);

  if (!visible) return null;

  return (
    <View style={s.overlay} pointerEvents="box-none">
      <Pressable style={s.backdrop} onPress={type === 'confirm' ? undefined : handleCancel}>
        <View style={s.cardShadow}>
          <View style={s.card}>
            {/* Borde superior de color */}
            <View style={[s.topAccent, { backgroundColor: cfg.accentColor }]} />

            {/* Ícono */}
            <View style={[s.iconWrap, { backgroundColor: cfg.iconBg }]}>
              <Icon size={32} color={cfg.iconColor} />
            </View>

            {/* Texto */}
            <Text style={s.title}>{typeof title === 'string' ? title : JSON.stringify(title)}</Text>
            <Text style={s.message}>{typeof message === 'string' ? message : JSON.stringify(message)}</Text>

            {/* Botones */}
            <View style={[s.btns, type === 'confirm' && s.btnsRow]}>
              {type === 'confirm' && (
                <Pressable
                  style={[s.btn, s.btnOutline]}
                  onPress={handleCancel}
                  disabled={confirming}
                >
                  <ButtonLabel text={cancelText || 'Cancelar'} color="#374151" />
                </Pressable>
              )}
              <Pressable
                style={[s.btn, { backgroundColor: confirmColor || cfg.confirmBg }]}
                onPress={handleConfirm}
                disabled={type === 'confirm' && confirming}
              >
                {type === 'confirm' && confirming
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <ButtonLabel text={confirmText || 'Entendido'} color="#fff" />}
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useModal() {
  const [state, setState] = useState<{ visible: boolean } & Partial<ModalConfig>>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });
  const generationRef = useRef(0);
  const [generation, setGeneration] = useState(0);

  const show = (config: ModalConfig) => {
    generationRef.current += 1;
    setGeneration(generationRef.current);
    setState({ visible: true, ...config });
  };
  const hide = () => setState(prev => ({ ...prev, visible: false }));

  const modal = (
    <AppModal
      visible={state.visible}
      type={state.type ?? 'info'}
      title={state.title ?? ''}
      message={state.message ?? ''}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      onConfirm={state.onConfirm}
      onCancel={state.onCancel}
      confirmColor={state.confirmColor}
      waitForConfirm={state.waitForConfirm}
      onClose={hide}
      generation={generation}
    />
  );

  return { show, hide, modal };
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  cardShadow: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  topAccent: { width: '100%', height: 4, marginBottom: 28 },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 26,
  },
  btns:    { width: '100%' },
  btnsRow: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutline: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  btnOutlineText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  btnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
