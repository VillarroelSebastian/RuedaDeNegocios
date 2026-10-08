import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, View, ViewProps, useWindowDimensions } from 'react-native';

// Measure the actual overlap: Android may already resize the window for us.
export default function KeyboardSafeView({ children, style, onLayout, ...props }: ViewProps) {
  const ref = useRef<View>(null);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const keyboardTop = useRef<number | null>(Keyboard.metrics()?.screenY ?? null);
  const [overlap, setOverlap] = useState(0);
  const [visible, setVisible] = useState(Keyboard.isVisible());
  const measure = useCallback(() => {
    const metrics = Keyboard.metrics();
    if (metrics) keyboardTop.current = metrics.screenY;
    ref.current?.measureInWindow((_x, y, _width, height) => {
      setOverlap(keyboardTop.current === null ? 0 : Math.max(0, y + height - keyboardTop.current));
    });
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow', event => {
      keyboardTop.current = event.endCoordinates.screenY;
      setVisible(true);
      measure();
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      keyboardTop.current = null;
      setVisible(false);
      setOverlap(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, [measure]);

  // Android resize and navigation-bar animations can finish after didShow.
  // Keep measuring the outer view while typing, including keyboard switches.
  useEffect(() => {
    const frame = requestAnimationFrame(measure);
    const timer = visible ? setInterval(measure, 120) : undefined;
    return () => { cancelAnimationFrame(frame); if (timer) clearInterval(timer); };
  }, [measure, visible, windowHeight, windowWidth]);

  return (
    <View {...props} ref={ref} collapsable={false} style={[{ flex: 1 }, style]}
      onLayout={event => { measure(); onLayout?.(event); }}>
      <View style={{ flex: 1, minHeight: 0, paddingBottom: overlap + (visible ? 24 : 12) }}>{children}</View>
    </View>
  );
}
