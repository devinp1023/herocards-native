/**
 * HeroCards Design Tokens
 *
 * Single source of truth for all UI tokens: backgrounds, text, accents,
 * status colors, spacing, radii, glows, motion presets, and text effects.
 *
 * Game-specific colors (types, rarities, achievements) stay in src/data/constants.ts.
 * Font family strings stay in src/theme/fonts.ts.
 *
 * Reference: STYLE_GUIDE.html
 */

import { Easing } from 'react-native-reanimated';

// Re-export FONTS for convenient single import
export { FONTS } from './fonts';

// ---------------------------------------------------------------------------
// Design Tokens
// ---------------------------------------------------------------------------

export const T = {
  // Background layers
  bg: {
    root: '#050508',
    surface: '#0a0b10',
    elevated: '#111218',
    border: '#1e2030',
  },

  // Gradients (use with LinearGradient `colors` prop)
  grad: {
    root: ['#050508', '#07070c'] as const,
    surface: ['#0c0d14', '#0a0b10'] as const,
    elevated: ['#131420', '#111218'] as const,
    obsidian: ['#08060a', '#0d0810'] as const,
  },

  // Text hierarchy
  text: {
    primary: '#ffffff',
    body: '#c8cad0',
    muted: '#6e7191',
  },

  // Three accent system — mint (interaction), violet (power), gold (value)
  accent: {
    mint: '#00FFAA',
    mintMuted: '#00FFAA44',
    mintFaint: '#00FFAA11',
    violet: '#B14EFF',
    violetMuted: '#B14EFF44',
    violetFaint: '#B14EFF11',
    gold: '#FFB800',
    goldMuted: '#FFB80044',
    goldFaint: '#FFB80011',
  },

  // Status colors (custom-tuned for OLED, not stock Material palette)
  status: {
    danger: '#FF4757',   // was #ef5350
    vitality: '#2ED573', // was #4caf50
    caution: '#FFBE0B',  // was #ff9800
  },

  // Stat pill colors (ATK / DEF / SPD on card components)
  stat: {
    atk: '#e8445a',
    def: '#8b5cf6',
    spd: '#f59e0b',
  },

  // Font size scale — matches STYLE_GUIDE.html "Font Size Scale" section
  font: {
    xs: 10,      // Orbitron — chips, tags, badges, smallest readable labels
    sm: 12,      // Rajdhani — secondary body, quest descriptions, hints
    body: 14,    // Rajdhani — primary body text, descriptions
    md: 14,      // Orbitron — buttons, labels, card names
    lg: 18,      // Orbitron — section headers
    xl: 22,      // Orbitron — screen titles
    xxl: 32,     // Orbitron — hero numbers, level-up, splash
  },

  // Spacing (base unit 4px)
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 32,
  },

  // Border radii
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
  },

  // 4-layer glow presets: core (tight) → halo (ring) → bloom (atmosphere) → wash (environmental)
  glow: {
    mint:    { core: '#00FFAAaa', halo: '#00FFAA66', bloom: '#00FFAA22', wash: '#00FFAA11' },
    violet:  { core: '#B14EFFaa', halo: '#B14EFF66', bloom: '#B14EFF22', wash: '#B14EFF11' },
    gold:    { core: '#FFB800aa', halo: '#FFB80066', bloom: '#FFB80022', wash: '#FFB80011' },
    danger:  { core: '#FF4757aa', halo: '#FF475766', bloom: '#FF475722', wash: '#FF475711' },
    vital:   { core: '#2ED573aa', halo: '#2ED57366', bloom: '#2ED57322', wash: '#2ED57311' },
    caution: { core: '#FFBE0Baa', halo: '#FFBE0B66', bloom: '#FFBE0B22', wash: '#FFBE0B11' },
  },
} as const;

// ---------------------------------------------------------------------------
// Glow Helpers
// ---------------------------------------------------------------------------

type GlowKey = keyof typeof T.glow;

/**
 * Single-shadow approximation for RN Views (RN only supports one shadow).
 * Intensity 1–3 uses progressively larger radii. Intensity 4 adds environmental wash.
 * For true multi-layer glows, use nested Views (Option B) or skiaGlowLayers() inside Canvas.
 */
export function glowShadow(color: GlowKey, intensity: 1 | 2 | 3 | 4 = 2) {
  const g = T.glow[color];
  return {
    shadowColor: intensity <= 2 ? g.halo : g.core,
    shadowOffset: { width: 0, height: 0 } as const,
    shadowOpacity: 1,
    shadowRadius: intensity === 1 ? 4 : intensity === 2 ? 12 : intensity === 3 ? 20 : 30,
    elevation: intensity * 4, // Android fallback
  };
}

/**
 * Multi-layer glow specs for Skia elements (inside Canvas).
 * Returns an array of { blur, color } objects for Skia <Shadow> nodes.
 */
export function skiaGlowLayers(color: GlowKey, intensity: 1 | 2 | 3 | 4 = 3) {
  const g = T.glow[color];
  const layers = [
    { blur: 4, color: g.core },   // tight inner edge
    { blur: 16, color: g.halo },  // visible glow ring
    { blur: 40, color: g.bloom }, // ambient atmosphere
    { blur: 80, color: g.wash },  // environmental wash (max drama)
  ];
  return layers.slice(0, intensity);
}

// ---------------------------------------------------------------------------
// Motion Timing Tiers
// ---------------------------------------------------------------------------

export const TIMING = {
  quick: 250,     // 220–300ms — toggles, micro-interactions, button press
  standard: 400,  // 380–500ms — fade, scale, modal open/close
  long: 1000,     // 800–1200ms — pulse cycles, shimmer sweeps
  slow: 2000,     // 1400–3000ms — rarity shimmer, ambient breathing
} as const;

// ---------------------------------------------------------------------------
// Motion Personalities
// ---------------------------------------------------------------------------

export const MOTION = {
  /** Fast overshoot (1.15x) then settle — UI entering, panels, battle results */
  slam: {
    duration: TIMING.standard,
    easing: Easing.out(Easing.cubic),
    overshoot: 1.15,
  },
  /** Instant lock, no ease-out — cards into hand, grid layouts, tab switches */
  snap: {
    duration: TIMING.quick,
    easing: Easing.out(Easing.cubic),
  },
  /** Screen shake (2–4px, 150ms) + white flash (50ms) — damage, destruction */
  impact: {
    shakePx: 3,
    shakeDuration: 150,
    flashDuration: 50,
    flashColor: 'rgba(255,255,255,0.3)',
  },
  /** Gentle ease-in-out, continuous — idle bob, node pulse, ambient */
  float: {
    duration: TIMING.slow,
    easing: Easing.inOut(Easing.ease),
  },
  /** Rapid scale 0 → 1.2 → 1.0 (200ms) — number popups, rewards, badges */
  burst: {
    duration: 200,
    overshoot: 1.2,
    easing: Easing.out(Easing.cubic),
  },
  /** Slow build 0→0.9 (hold) → 1.3 snap (release) — long-press, amp fill */
  charge: {
    buildDuration: TIMING.long,
    holdScale: 0.9,
    releaseScale: 1.3,
    releaseDuration: TIMING.quick,
    easing: Easing.inOut(Easing.ease),
  },
} as const;

// ---------------------------------------------------------------------------
// Spring Configs (for Reanimated withSpring)
// ---------------------------------------------------------------------------

export const SPRING = {
  snappy: { damping: 16, stiffness: 220 },  // buttons, toggles
  bouncy: { damping: 8, stiffness: 120 },   // rewards, popups
  gentle: { damping: 20, stiffness: 80 },   // ambient, elevation
} as const;

// ---------------------------------------------------------------------------
// Easing Shorthands
// ---------------------------------------------------------------------------

export const EASE = {
  enter: Easing.out(Easing.cubic),    // slam, burst — enters fast, decels
  exit: Easing.in(Easing.quad),       // exits — slow start, fast end
  inOut: Easing.inOut(Easing.ease),   // general transitions
} as const;

// ---------------------------------------------------------------------------
// Text Impact Treatments
// ---------------------------------------------------------------------------

export const TEXT_FX = {
  /**
   * Glow text — active screen titles, section headers.
   * Applies a colored glow behind text via textShadow.
   */
  glow: (color: string = T.accent.mint) => ({
    textShadowColor: color + '44',
    textShadowOffset: { width: 0, height: 0 } as const,
    textShadowRadius: 8,
  }),

  /**
   * Embossed text — large stat values, level numbers.
   * Creates a stamped-into-metal effect with a hard drop shadow.
   * Note: RN supports only one textShadow. For the secondary glow,
   * wrap in a View with a separate Text overlay at 0.3 opacity offset.
   */
  embossed: (glowColor: string = T.accent.violet) => ({
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 } as const,
    textShadowRadius: 4,
  }),

  /**
   * Gradient text colors — legendary moments.
   * RN doesn't support background-clip:text natively.
   * Use with MaskedView (gradient as background, Text as mask)
   * or Skia <Text> with <LinearGradient> shader.
   */
  gradient: {
    colors: ['#ffc04a', '#ffffff', '#B14EFF'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
} as const;
