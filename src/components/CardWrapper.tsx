// CardWrapper — scales the fixed 300×433 Skia canvas to any display size.
// Usage: <CardWrapper scale={0.45}><HeroCard card={card} /></CardWrapper>
// Scale targets per spec:
//   Collection grid (2-col): ~0.45  →  135×195px
//   Detail page:              ~0.90  →  270×390px
//   Battle active:            ~0.85  →  255×368px
//   Battle hand:              ~0.40  →  120×173px
//   Pack opening:             ~1.00  →  300×433px

import React from 'react';
import { View, ViewStyle } from 'react-native';

export const CARD_W = 300;
export const CARD_H = 433;

interface CardWrapperProps {
  scale?: number;
  style?: ViewStyle;
  children: React.ReactNode;
}

export function CardWrapper({ scale = 1, style, children }: CardWrapperProps) {
  return (
    // Outer view occupies exactly the scaled footprint in layout
    <View style={[{ width: CARD_W * scale, height: CARD_H * scale, overflow: 'hidden' }, style]}>
      {/* Inner view is full 300×433 but visually scaled from the top-left corner.
          transformOrigin (RN 0.73+) pins the scale anchor to top-left so
          no manual translate math is needed. */}
      <View
        style={{
          width: CARD_W,
          height: CARD_H,
          // @ts-ignore — transformOrigin is valid in RN 0.73+ but not yet in all type defs
          transformOrigin: 'top left',
          transform: [{ scale }],
        }}
      >
        {children}
      </View>
    </View>
  );
}
