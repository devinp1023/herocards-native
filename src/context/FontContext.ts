// Skia font objects loaded once at app root, passed down to HeroCard/FaceDownCard.
// Avoids redundant useFont() calls across the 200-card collection grid.
// Native Text components (AuthScreen, HomeScreen, etc.) use expo-font separately.

import { createContext, useContext } from 'react';
import { SkFont } from '@shopify/react-native-skia';

export interface FontContextValue {
  fontName: SkFont | null;       // Orbitron 700 @ 17px — card name
  fontNumber: SkFont | null;     // Orbitron 700 @ 10px — card #id
  fontStatLabel: SkFont | null;  // Orbitron 700 @ 10px — ATK / DEF / SPD labels
  fontStatValue: SkFont | null;  // Orbitron 700 @ 11px — stat numbers
  fontTotal: SkFont | null;      // Orbitron 900 @ 15px — total power value
  fontSmall: SkFont | null;      // Rajdhani 600 @ 11px — alliance, type label
  fontCardTitle: SkFont | null;  // Orbitron 700 @ 13px — "HERO CARDS"
  fontCardSub: SkFont | null;    // Orbitron 700 @ 10px — "TAP TO REVEAL"
}

export const FontContext = createContext<FontContextValue>({
  fontName: null,
  fontNumber: null,
  fontStatLabel: null,
  fontStatValue: null,
  fontTotal: null,
  fontSmall: null,
  fontCardTitle: null,
  fontCardSub: null,
});

export const useFontContext = () => useContext(FontContext);
