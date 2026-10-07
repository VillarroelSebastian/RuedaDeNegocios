import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, View, ViewProps } from 'react-native';

// Measure the actual overlap: Android may already resize the window for us.
export default function KeyboardSafeView({ children, style, onLayout, ...props }: ViewProps) {
  const ref = useRef<View>(null);
  const keyboardTop = useRef<number | null>(Keyboard.metrics()?.screenY ?? null);
  const [overlap, setOverlap] = useState(0);
  const measure = useCallback(() => {
    ref.current?.measureInWindow((_x, y, _width, height) => {
      setOverlap(keyboardTop.current === null ? 0 : Math.max(0, y + height - keyboardTop.current));
    });
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow', event => {
      keyboardTop.current = event.endCoordinates.screenY;
      measure();
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      keyboardTop.current = null;
      setOverlap(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, [measure]);

  return (
    <View {...props} ref={ref} collapsable={false} style={[{ flex: 1 }, style]}
      onLayout={event => { measure(); onLayout?.(event); }}>
      <View style={{ flex: 1, paddingBottom: overlap }}>{children}</View>
    </View>
  );
}
