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
  waitForConfirm?: boolean;
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
  waitForConfirm = false,
}: ModalProps) {
  const [confirming, setConfirming] = React.useState(false);
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !confirming) onClose();
  }, [onClose, confirming]);

  useEffect(() => { setConfirming(false); }, [isOpen, type, title]);

  const handleConfirm = async () => {
    if (!waitForConfirm) {
      onClose();
      onConfirm?.();
      return;
    }
    setConfirming(true);
    try {
      await onConfirm?.();
    } finally {
      setConfirming(false);
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
  waitForConfirm?: boolean;
}

export function useModal() {
  const [modal, setModal] = React.useState<ModalState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showModal = (type: ModalType, title: string, message: string, onConfirm?: () => void | Promise<void>) => {
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
    waitForConfirm = false,
  ) => setModal({ isOpen: true, type: 'confirm', title, message, onConfirm, confirmTone, waitForConfirm });

  const ModalComponent = () => (
    <Modal
      isOpen={modal.isOpen}
      onClose={closeModal}
      type={modal.type}
      title={modal.title}
      message={modal.message}
      onConfirm={modal.onConfirm}
      confirmTone={modal.confirmTone}
      waitForConfirm={modal.waitForConfirm}
    />
  );

  return {
    modal,
    modalState: modal,
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
