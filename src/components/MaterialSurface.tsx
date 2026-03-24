/**
 * MaterialSurface — wraps children in a material treatment.
 *
 * Every panel, card, modal, and container in the app should use this
 * instead of a bare View with a flat backgroundColor.
 *
 * Materials:
 *   brushedMetal  — primary panels (multi-stop gradient + top-edge light catch + inner glow)
 *   frostedGlass  — overlay panels (dark tint + top-edge highlight)
 *   obsidian      — battle screen only (warm dark gradient + red-tinted inner glow)
 *
 * Depth is created through layered gradients and edge highlights — no image
 * textures (RN Image tiling is broken on iOS). This is pure Views + LinearGradient,
 * GPU-native and cheap.
 *
 * The energy border (animated mint→violet top-edge gradient) is opt-in via prop.
 * It renders as an isolated Animated.View to avoid breaking parent React.memo.
 *
 * WARNING (from PRD): This component must use PURE RN layers only — no Skia Canvas.
 * Skia usage is confined to HeroCard, the tab bar, and amp arcs.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { T } from '../theme/theme';

// ── Types ───────────────────────────────────────────────────────────────────
export type Material = 'brushedMetal' | 'frostedGlass' | 'obsidian';

interface Props {
  /** Surface material. Default: 'brushedMetal' */
  material?: Material;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Animated mint→violet gradient on top edge. Only enable on 1 primary panel per screen. */
  energyBorder?: boolean;
  /** Override border radius (default: T.radius.lg = 14) */
  borderRadius?: number;
}

// ── Material configs ────────────────────────────────────────────────────────
const MATERIALS = {
  brushedMetal: {
    // Multi-stop gradient: subtle lighter band near top creates curved-surface feel
    gradient: ['#0e0f16', '#0b0c12', '#0a0b10', '#090a0e'] as const,
    borderColor: T.bg.border,
    // Top-edge light catch: simulates overhead light hitting a metal surface
    topEdgeColor: 'rgba(255, 255, 255, 0.06)',
    // Inner glow: light falloff from top
    innerGlowColor: 'rgba(255, 255, 255, 0.025)',
    innerGlowHeight: 40,
  },
  frostedGlass: {
    gradient: ['rgba(16, 17, 24, 0.88)', 'rgba(10, 11, 16, 0.92)'] as const,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    topEdgeColor: 'rgba(255, 255, 255, 0.08)',
    innerGlowColor: 'rgba(255, 255, 255, 0.03)',
    innerGlowHeight: 30,
  },
  obsidian: {
    // Warm dark gradient with slight red undertone
    gradient: ['#0d080c', '#0b0710', '#09060a', '#080508'] as const,
    borderColor: '#2a1520',
    topEdgeColor: 'rgba(255, 71, 87, 0.06)',
    innerGlowColor: 'rgba(255, 71, 87, 0.02)',
    innerGlowHeight: 50,
  },
} as const;

// ── Energy Border (isolated animated layer) ─────────────────────────────────
// This is a separate component so its animation never re-renders the parent.
const EnergyBorder = React.memo(({ borderRadius }: { borderRadius: number }) => {
  const position = useSharedValue(0);

  React.useEffect(() => {
    position.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.linear }),
      -1, // infinite
      false, // no reverse — continuous loop
    );
  }, [position]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (position.value - 0.5) * 200 }],
  }));

  return (
    <View
      style={[
        styles.energyBorderContainer,
        { borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius },
      ]}
      pointerEvents="none"
    >
      <Animated.View style={[styles.energyBorderInner, animatedStyle]}>
        <LinearGradient
          colors={['transparent', T.accent.mintMuted, T.accent.violetMuted, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.energyGradient}
        />
      </Animated.View>
    </View>
  );
});
EnergyBorder.displayName = 'EnergyBorder';

// ── Main Component ──────────────────────────────────────────────────────────
function MaterialSurfaceInner({
  material = 'brushedMetal',
  children,
  style,
  energyBorder = false,
  borderRadius = T.radius.lg,
}: Props) {
  const m = MATERIALS[material];

  return (
    <View
      style={[
        styles.container,
        { borderRadius, borderColor: m.borderColor },
        style,
      ]}
    >
      {/* Layer 1: Multi-stop base gradient */}
      <LinearGradient
        colors={m.gradient as unknown as [string, string, ...string[]]}
        style={StyleSheet.absoluteFill}
      />

      {/* Layer 2: Top-edge light catch — 1px bright line at top simulating overhead light */}
      <View
        style={[
          styles.topEdge,
          { backgroundColor: m.topEdgeColor },
        ]}
        pointerEvents="none"
      />

      {/* Layer 3: Inner glow — soft light falloff from top edge */}
      <LinearGradient
        colors={[m.innerGlowColor, 'transparent']}
        style={[styles.innerGlow, { height: m.innerGlowHeight }]}
        pointerEvents="none"
      />

      {/* Layer 4: Energy border (opt-in, isolated animation) */}
      {energyBorder && <EnergyBorder borderRadius={borderRadius} />}

      {/* Layer 5: Content */}
      {children}
    </View>
  );
}

export const MaterialSurface = React.memo(MaterialSurfaceInner);

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  innerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  energyBorderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    overflow: 'hidden',
  },
  energyBorderInner: {
    position: 'absolute',
    top: 0,
    left: -100,
    right: -100,
    height: 1,
  },
  energyGradient: {
    flex: 1,
  },
});
