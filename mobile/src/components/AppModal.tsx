import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Animated, Pressable,
} from 'react-native';
import { CheckCircle, XCircle, AlertTriangle, HelpCircle, Info } from 'lucide-react-native';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type ModalType = 'success' | 'error' | 'warning' | 'confirm' | 'info';

export interface ModalConfig {
  type: ModalType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface AppModalProps extends ModalConfig {
  visible: boolean;
  onClose: () => void;
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
export function AppModal({
  visible, type, title, message,
  confirmText, cancelText, onConfirm, onCancel, onClose,
}: AppModalProps) {
  const cfg   = TYPE_CONFIG[type];
  const Icon  = cfg.icon;
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1,    useNativeDriver: true, tension: 120, friction: 8 }),
        Animated.timing(opacity, { toValue: 1,    useNativeDriver: true, duration: 180 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scale,   { toValue: 0.9, useNativeDriver: true, duration: 120 }),
        Animated.timing(opacity, { toValue: 0,   useNativeDriver: true, duration: 120 }),
      ]).start();
    }
  }, [visible]);

  const handleConfirm = () => { onClose(); onConfirm?.(); };
  const handleCancel  = () => { onClose(); onCancel?.();  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleCancel} statusBarTranslucent>
      <Pressable style={s.backdrop} onPress={type === 'confirm' ? undefined : handleCancel}>
        <Animated.View style={[s.card, { transform: [{ scale }], opacity }]}>
          {/* Borde superior de color */}
          <View style={[s.topAccent, { backgroundColor: cfg.accentColor }]} />

          {/* Ícono */}
          <View style={[s.iconWrap, { backgroundColor: cfg.iconBg }]}>
            <Icon size={32} color={cfg.iconColor} />
          </View>

          {/* Texto */}
          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>

          {/* Botones */}
          <View style={[s.btns, onConfirm && s.btnsRow]}>
            {onConfirm && (
              <TouchableOpacity
                style={[s.btn, s.btnOutline]}
                onPress={handleCancel}
                activeOpacity={0.8}
              >
                <Text style={s.btnOutlineText}>{cancelText || 'Cancelar'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.btn, { backgroundColor: cfg.confirmBg }]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={s.btnPrimaryText}>{confirmText || 'Entendido'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
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

  const show = (config: ModalConfig) => setState({ visible: true, ...config });
  const hide = ()                      => setState(prev => ({ ...prev, visible: false }));

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
      onClose={hide}
    />
  );

  return { show, hide, modal };
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
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
