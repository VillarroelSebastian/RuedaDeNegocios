"use client";

import React, { useEffect, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import modalStyles from './Modal.module.css';

export type ModalType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: ModalType;
  title: string;
  message: string;
  onConfirm?: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  confirmTone?: 'danger' | 'success';
  generation: number;
}

const iconMap = {
  success: { Icon: CheckCircle,    className: modalStyles.iconSuccess },
  error:   { Icon: XCircle,        className: modalStyles.iconError },
  warning: { Icon: AlertTriangle,  className: modalStyles.iconWarning },
  info:    { Icon: Info,           className: modalStyles.iconInfo },
  confirm: { Icon: AlertTriangle,  className: modalStyles.iconWarning },
};

export default function Modal({
  isOpen,
  onClose,
  type = 'info',
  title,
  message,
  onConfirm,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmTone = 'danger',
  generation,
}: ModalProps) {
  const [confirming, setConfirming] = React.useState(false);
  // Guard sincrónico aparte del estado: un doble clic/doble tap puede invocar
  // handleConfirm dos veces antes de que React termine de re-renderizar con
  // confirming=true, y eso disparaba el onConfirm real (aprobar, reenviar
  // credenciales, etc.) dos veces. El ref se lee/escribe al instante, sin
  // esperar al ciclo de render, así la segunda invocación se descarta siempre.
  const confirmingRef = React.useRef(false);
  // Se actualiza en cada render (no en un efecto) para poder comparar, justo
  // después de esperar a onConfirm, si mientras tanto se abrió otro modal
  // encadenado (p. ej. un "¡Listo!" disparado desde el propio onConfirm) y
  // así evitar cerrar por encima de ese modal nuevo.
  const genRef = React.useRef(generation);
  genRef.current = generation;
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !confirming) onClose();
  }, [onClose, confirming]);

  useEffect(() => { setConfirming(false); confirmingRef.current = false; }, [isOpen, type, title]);

  const handleConfirm = async () => {
    if (confirmingRef.current) return;
    confirmingRef.current = true;
    const startGen = genRef.current;
    setConfirming(true);
    try {
      // No cerramos antes de esperar: si cerráramos ya y luego onConfirm
      // abre un modal de éxito/error, el usuario ve este modal cerrarse y
      // el otro abrirse de inmediato — un parpadeo que parece "el modal
      // salió 2 veces". En vez de eso dejamos este modal abierto (con
      // "Procesando…") mientras se resuelve.
      await onConfirm?.();
    } finally {
      confirmingRef.current = false;
      setConfirming(false);
      // Solo autocerramos si nadie más (dentro de onConfirm) ya mostró un
      // modal nuevo; si lo hizo, generation cambió y lo dejamos como está.
      if (genRef.current === startGen) onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const { Icon, className: iconClass } = iconMap[type];

  return (
    <div className={modalStyles.backdrop} onClick={confirming ? undefined : onClose}>
      <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={modalStyles.closeBtn} onClick={onClose} aria-label="Cerrar" disabled={confirming}>
          <X size={18} />
        </button>
        <div className={`${modalStyles.iconContainer} ${iconClass}`}>
          <Icon size={28} />
        </div>
        <h3 className={modalStyles.title}>{title}</h3>
        <p className={modalStyles.message}>{message}</p>
        <div className={modalStyles.actions}>
          {type === 'confirm' ? (
            <>
              <button className={modalStyles.btnCancel} onClick={onClose} disabled={confirming}>
                {cancelText}
              </button>
              <button
                className={confirmTone === 'success' ? modalStyles.btnSuccess : modalStyles.btnConfirm}
                onClick={handleConfirm}
                disabled={confirming}
              >
                {confirming ? 'Procesando…' : confirmText}
              </button>
            </>
          ) : (
            <button
              className={
                type === 'success' ? modalStyles.btnSuccess
                : type === 'error' ? modalStyles.btnError
                : modalStyles.btnPrimary
              }
              onClick={onClose}
            >
              Aceptar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface ModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  onConfirm?: () => void | Promise<void>;
  confirmTone?: 'danger' | 'success';
}

export function useModal() {
  const [modal, setModal] = React.useState<ModalState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });
  // Cada vez que se muestra un modal (incluyendo uno encadenado desde dentro
  // de un onConfirm) se incrementa esta generación; así Modal puede saber,
  // al terminar de esperar su propio onConfirm, si ya lo reemplazaron por
  // otro modal y evitar cerrarlo por encima.
  const generationRef = React.useRef(0);
  const [generation, setGeneration] = React.useState(0);

  const showModal = (type: ModalType, title: string, message: string, onConfirm?: () => void | Promise<void>) => {
    generationRef.current += 1;
    setGeneration(generationRef.current);
    setModal({ isOpen: true, type, title, message, onConfirm });
  };

  const closeModal = () => setModal((prev) => ({ ...prev, isOpen: false }));

  const showSuccess = (title: string, message: string) => showModal('success', title, message);
  const showError   = (title: string, message: string) => showModal('error',   title, message);
  const showWarning = (title: string, message: string) => showModal('warning', title, message);
  const showInfo    = (title: string, message: string) => showModal('info',    title, message);
  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    confirmTone: 'danger' | 'success' = 'danger',
  ) => {
    generationRef.current += 1;
    setGeneration(generationRef.current);
    setModal({ isOpen: true, type: 'confirm', title, message, onConfirm, confirmTone });
  };

  // Nota deliberada: esto es el elemento YA renderizado (`<Modal ... />`), no
  // una función componente. Antes `ModalComponent` era una función definida
  // aquí dentro, así que en cada render del que llama a useModal() se creaba
  // una función nueva con una identidad distinta; React la trata como un tipo
  // de componente diferente en cada render y desmonta/remonta el <Modal> de
  // verdad por debajo — lo que reproducía su animación de aparición cada vez,
  // incluso por cambios de estado ajenos al modal (p. ej. un sondeo en segundo
  // plano) o al encadenar confirm -> éxito/error. Con un elemento ya armado,
  // `Modal` conserva su identidad entre renders: solo cambian sus props.
  const ModalComponent = (
    <Modal
      isOpen={modal.isOpen}
      onClose={closeModal}
      type={modal.type}
      title={modal.title}
      message={modal.message}
      onConfirm={modal.onConfirm}
      confirmTone={modal.confirmTone}
      generation={generation}
    />
  );

  return {
    modal,
    modalState: modal,
    generation,
    showModal,
    closeModal,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    ModalComponent,
  };
}
