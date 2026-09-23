/** @jsxImportSource react */
// Ver la explicación completa en AppModal.tsx: el `<Text>` nativo de React
// Native dentro de botones (TouchableOpacity con fondo sólido) puede
// renderizarse en blanco/roto en Android pese a que el resto del componente
// es correcto. El ícono SVG siempre se pinta bien, así que la etiqueta del
// botón se dibuja como texto SVG en vez de como `<Text>` nativo.
import React, { useState } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';

export default function ButtonLabel({ text, color, size = 15 }: { text: string; color: string; size?: number }) {
  const [width, setWidth] = useState(0);
  const height = Math.round(size * 1.5);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  return (
    <View onLayout={onLayout} style={{ width: '100%', height, alignItems: 'center', justifyContent: 'center' }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <SvgText
            x={width / 2}
            y={height / 2 + size * 0.35}
            fontSize={size}
            fontWeight="bold"
            fill={color}
            textAnchor="middle"
          >
            {String(text)}
          </SvgText>
        </Svg>
      )}
    </View>
  );
}
