import React, { createContext, useContext } from 'react';
import { View } from 'react-native';
import { ModalConfig, useModal } from './AppModal';

const FeedbackContext = createContext<((config: ModalConfig) => void) | null>(null);
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const { show, modal } = useModal();
  return <FeedbackContext.Provider value={show}><View style={{ flex: 1 }}>{children}{modal}</View></FeedbackContext.Provider>;
}
export function useFeedback() {
  const show = useContext(FeedbackContext);
  if (!show) throw new Error('FeedbackProvider requerido');
  return show;
}
