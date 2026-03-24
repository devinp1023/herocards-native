/**
 * MaterialSurface — wraps children in a material treatment.
 *
 * Every panel, card, modal, and container in the app should use this
 * instead of a bare View with a flat backgroundColor.
 *
 * Materials:
 *   brushedMetal  — primary panels (gradient + noise + brush grain)
 *   frostedGlass  — overlay panels (dark tint + noise, blur on supported builds)
 *   obsidian      — battle screen only (dark warm gradient + noise + crack texture)
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
  Image,
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

// ── Texture assets ──────────────────────────────────────────────────────────
// 512x512 noise texture — used with resizeMode="cover".
// RN Image resizeMode="repeat" is broken on iOS, so we use a larger source
// that covers panels without visible blur at production opacity (0.04).
const noiseSource = require('../../assets/textures/noise-512.png');
const brushGrainSource = require('../../assets/textures/brush-grain-128x4.png');
const obsidianCracksSource = require('../../assets/textures/obsidian-cracks.png');

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
    // Shift the gradient by translating the View
    // The gradient itself is static; we move it horizontally to create the flow effect
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
  const gradientColors = material === 'obsidian' ? T.grad.obsidian : T.grad.surface;
  const noiseOpacity = material === 'obsidian' ? 0.05 : material === 'frostedGlass' ? 0.03 : 0.04;
  const borderColor = material === 'obsidian' ? '#2a1520' : T.bg.border;

  return (
    <View
      style={[
        styles.container,
        { borderRadius, borderColor },
        material === 'frostedGlass' && styles.frostedContainer,
        style,
      ]}
    >
      {/* Layer 1: Base gradient */}
      {material !== 'frostedGlass' && (
        <LinearGradient
          colors={gradientColors as unknown as [string, string]}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Layer 1 (frosted glass): dark tint overlay */}
      {material === 'frostedGlass' && (
        <View style={[StyleSheet.absoluteFill, styles.frostedTint]} />
      )}

      {/* Layer 2: Noise texture — cover mode (repeat is broken on iOS) */}
      <Image
        source={noiseSource}
        style={[StyleSheet.absoluteFill, { opacity: noiseOpacity }]}
        resizeMode="cover"
      />

      {/* Layer 3a: Brush grain (brushedMetal only) */}
      {/* grain is 128x4 — too small for cover. Use a thin absolute View with
          repeating horizontal lines as a fallback for iOS tiling bug */}
      {material === 'brushedMetal' && (
        <View style={[StyleSheet.absoluteFill, styles.brushGrain]} pointerEvents="none" />
      )}

      {/* Layer 3b: Obsidian crack lines (obsidian only) */}
      {material === 'obsidian' && (
        <Image
          source={obsidianCracksSource}
          style={[StyleSheet.absoluteFill, { opacity: 0.06 }]}
          resizeMode="cover"
        />
      )}

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
  frostedContainer: {
    backgroundColor: 'rgba(10, 11, 16, 0.85)',
  },
  frostedTint: {
    backgroundColor: 'rgba(10, 11, 16, 0.6)',
  },
  brushGrain: {
    // Simulates horizontal brush grain lines via a semi-transparent border pattern.
    // Extremely subtle — creates a directional texture feel.
    opacity: 0.03,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
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
    // Extra width so the gradient can scroll through
    left: -100,
    right: -100,
    height: 1,
  },
  energyGradient: {
    flex: 1,
  },
});
