/**
 * AmbientParticles — drifting particle overlay for screen atmosphere.
 *
 * Pre-allocates a fixed pool of Animated.Views that float upward continuously.
 * Each particle has randomized size, opacity, horizontal offset, and speed.
 * Pauses automatically when the screen is not focused (useIsFocused).
 *
 * Usage:
 *   <AmbientParticles color={T.accent.mint} count={6} />
 *   <AmbientParticles color={T.accent.gold} count={4} area="top" />
 */

import React, { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  /** Particle color (hex string, e.g. '#00FFAA') */
  color: string;
  /** Number of particles in the pool (default 6) */
  count?: number;
  /** Vertical region: 'full' = entire screen, 'top' = top 40%, 'bottom' = bottom 40% */
  area?: 'full' | 'top' | 'bottom';
  /** Override opacity ceiling (default 0.55) */
  maxOpacity?: number;
}

// ---------------------------------------------------------------------------
// Seed helpers — deterministic per-particle randomness
// ---------------------------------------------------------------------------

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function particleSeed(index: number, prop: number): number {
  return seededRandom(index * 7 + prop * 13);
}

// ---------------------------------------------------------------------------
// Single Particle
// ---------------------------------------------------------------------------

interface ParticleProps {
  index: number;
  color: string;
  screenWidth: number;
  screenHeight: number;
  areaTop: number;
  areaHeight: number;
  maxOpacity: number;
  focused: boolean;
}

const Particle = memo(function Particle({
  index,
  color,
  screenWidth,
  areaTop,
  areaHeight,
  maxOpacity,
  focused,
}: ParticleProps) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const started = useRef(false);

  // Deterministic per-particle properties
  const size = 3 + particleSeed(index, 0) * 5; // 3–8px
  const startX = particleSeed(index, 1) * (screenWidth - 20) + 10;
  const drift = (particleSeed(index, 2) - 0.5) * 60; // ±30px horizontal drift
  const particleOpacity = 0.25 + particleSeed(index, 3) * (maxOpacity - 0.25);
  const duration = 6000 + particleSeed(index, 4) * 6000; // 6–12s per cycle
  const delay = particleSeed(index, 5) * 3000; // stagger 0–3s

  useEffect(() => {
    if (focused && !started.current) {
      started.current = true;

      // Float upward: start from bottom of area, drift up full height
      translateY.value = 0;
      translateY.value = withDelay(
        delay,
        withRepeat(
          withTiming(-areaHeight, {
            duration,
            easing: Easing.linear,
          }),
          -1, // infinite
          false,
        ),
      );

      // Fade in, hold, fade out — synced to travel
      opacity.value = 0;
      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(particleOpacity, {
              duration: duration * 0.2,
              easing: Easing.out(Easing.ease),
            }),
            withTiming(particleOpacity, {
              duration: duration * 0.5,
              easing: Easing.linear,
            }),
            withTiming(0, {
              duration: duration * 0.3,
              easing: Easing.in(Easing.ease),
            }),
          ),
          -1,
          false,
        ),
      );
    }

    if (!focused && started.current) {
      cancelAnimation(translateY);
      cancelAnimation(opacity);
      opacity.value = withTiming(0, { duration: 300 });
      started.current = false;
    }
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: drift },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          bottom: areaTop,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: size * 2,
        },
        animatedStyle,
      ]}
    />
  );
});

// ---------------------------------------------------------------------------
// AmbientParticles
// ---------------------------------------------------------------------------

function AmbientParticles({
  color,
  count = 6,
  area = 'full',
  maxOpacity = 0.55,
}: Props) {
  const focused = useIsFocused();
  const { width, height } = useWindowDimensions();

  const areaTop = area === 'top' ? height * 0.6 : 0;
  const areaHeight =
    area === 'full' ? height : area === 'top' ? height * 0.4 : height * 0.4;

  const particles = useMemo(
    () => Array.from({ length: count }, (_, i) => i),
    [count],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((i) => (
        <Particle
          key={i}
          index={i}
          color={color}
          screenWidth={width}
          screenHeight={height}
          areaTop={areaTop}
          areaHeight={areaHeight}
          maxOpacity={maxOpacity}
          focused={focused}
        />
      ))}
    </View>
  );
}

export default memo(AmbientParticles);
