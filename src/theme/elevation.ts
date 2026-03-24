/**
 * Elevation Drama System
 *
 * Four elevation states that combine scale, glow, border treatment, and timing.
 * Every interactive element should use one of these levels.
 *
 * States: resting → hovered → lifted → heroic
 *
 * Usage:
 *   const { animatedStyle } = useElevation(isPressed ? 'resting' : 'hovered');
 *   <Animated.View style={[baseStyle, animatedStyle]}> ... </Animated.View>
 */

import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { T, glowShadow, SPRING, TIMING } from './theme';

// ── Elevation state definitions ─────────────────────────────────────────────

export const ELEVATION = {
  /** Base state — no transform, no glow. Static and grounded. */
  resting: {
    scale: 1.0,
    shadowRadius: 0,
    shadowOpacity: 0,
    shadowColor: T.accent.mint,
    borderColor: T.bg.border,
  },

  /**
   * Subtle lift — faint accent glow, 200ms spring feel.
   * Used for: tappable cards, interactive list items, default button state.
   */
  hovered: {
    scale: 1.02,
    shadowRadius: 6,
    shadowOpacity: 0.5,
    shadowColor: T.accent.mint,
    borderColor: T.accent.mintMuted,
  },

  /**
   * Clearly elevated — strong glow, 300ms spring feel.
   * Used for: selected card, active element, card preview, focused input.
   */
  lifted: {
    scale: 1.05,
    shadowRadius: 12,
    shadowOpacity: 0.7,
    shadowColor: T.accent.mint,
    borderColor: T.accent.mint + '66',
  },

  /**
   * Maximum drama — full glow halo, 500ms dramatic ease.
   * Used for: legendary reveal, featured card, boss encounter, achievement collect.
   */
  heroic: {
    scale: 1.10,
    shadowRadius: 24,
    shadowOpacity: 1.0,
    shadowColor: T.accent.violet,
    borderColor: T.accent.violet + '88',
  },
} as const;

export type ElevationLevel = keyof typeof ELEVATION;

// ── Spring configs per level ────────────────────────────────────────────────

const LEVEL_SPRING: Record<ElevationLevel, { damping: number; stiffness: number } | null> = {
  resting: null,              // instant, no spring
  hovered: SPRING.snappy,     // 200ms feel
  lifted: SPRING.gentle,      // 300ms feel
  heroic: SPRING.bouncy,      // 500ms dramatic
};

// ── Hook ────────────────────────────────────────────────────────────────────

/**
 * Returns an animated style that transitions between elevation levels.
 *
 * @param level - current elevation state
 * @param glowColor - override the glow/shadow color (default: from ELEVATION config)
 *
 * Apply the returned `animatedStyle` to an `Animated.View`:
 * ```
 * const { animatedStyle } = useElevation(isActive ? 'lifted' : 'resting');
 * <Animated.View style={[styles.card, animatedStyle]} />
 * ```
 *
 * WARNING: Do not use on FlatList item components without testing.
 * The shared values persist per component instance — confirm that
 * React.memo is not broken by the animation updates.
 */
export function useElevation(level: ElevationLevel, glowColor?: string) {
  const e = ELEVATION[level];
  const spring = LEVEL_SPRING[level];

  const scale = useSharedValue(e.scale);
  const shadowRadius = useSharedValue(e.shadowRadius);
  const shadowOpacity = useSharedValue(e.shadowOpacity);

  useEffect(() => {
    const target = ELEVATION[level];
    if (spring) {
      scale.value = withSpring(target.scale, spring);
      shadowRadius.value = withSpring(target.shadowRadius, spring);
      shadowOpacity.value = withSpring(target.shadowOpacity, spring);
    } else {
      scale.value = withTiming(target.scale, { duration: TIMING.quick });
      shadowRadius.value = withTiming(target.shadowRadius, { duration: TIMING.quick });
      shadowOpacity.value = withTiming(target.shadowOpacity, { duration: TIMING.quick });
    }
  }, [level, spring, scale, shadowRadius, shadowOpacity]);

  const color = glowColor ?? e.shadowColor;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: shadowOpacity.value,
    shadowRadius: shadowRadius.value,
    elevation: shadowRadius.value, // Android fallback
  }));

  return { animatedStyle };
}
