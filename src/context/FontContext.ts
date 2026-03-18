// Placeholder — implemented in Session 2 alongside React Native Skia setup.
// Will provide pre-loaded Skia font objects (via useFont()) to HeroCard
// without redundant loading across the 200-card collection grid.

import { createContext, useContext } from 'react';

export interface FontContextValue {
  // Skia SkFont objects loaded at app root and passed down to HeroCard
  // orbitronBold: SkFont | null;
  // rajdhaniSemiBold: SkFont | null;
}

export const FontContext = createContext<FontContextValue>({});
export const useFontContext = () => useContext(FontContext);
