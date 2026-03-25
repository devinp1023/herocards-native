/**
 * LightningStrike — ambient lightning crack effect for screen backgrounds.
 *
 * Renders random multi-segment zigzag bolts that flash and fade.
 * Each bolt: 3–5 segments at varying angles, optional fork branches,
 * instant flash (50ms) → afterglow fade (400ms).
 *
 * Focus-aware — only fires when screen is visible.
 * Pure RN Views + Reanimated — no Skia Canvas.
 *
 * Usage:
 *   <LightningStrike color={T.accent.mint} />
 */

import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  /** Bolt color (hex string) */
  color?: string;
  /** Secondary bolt color for variety */
  secondaryColor?: string;
  /** Min ms between bolts */
  minInterval?: number;
  /** Max ms between bolts */
  maxInterval?: number;
  /** Max simultaneous bolts */
  maxBolts?: number;
}

interface Segment {
  x: number;
  y: number;
  length: number;
  angle: number;
  width: number;
  opacity: number;
  isFork: boolean;
}

interface Bolt {
  id: number;
  segments: Segment[];
  color: string;
  intensity: number; // 0.3–1.0
}

// ---------------------------------------------------------------------------
// Bolt generation
// ---------------------------------------------------------------------------

function generateFork(
  startX: number,
  startY: number,
  baseAngle: number,
  intensity: number,
  depth: number,
): Segment[] {
  if (depth > 2) return []; // max 2 levels of sub-forks
  const segments: Segment[] = [];
  const numSegs = 2 + Math.floor(Math.random() * 2); // 2–3 segments per fork
  let x = startX;
  let y = startY;
  let angle = baseAngle + (Math.random() > 0.5 ? 1 : -1) * (25 + Math.random() * 35);

  for (let i = 0; i < numSegs; i++) {
    const length = 8 + Math.random() * 18; // shorter than main: 8–26px
    const segAngle = angle + (Math.random() - 0.5) * 40;
    const taper = 1 - (i / numSegs) * 0.5; // thin out

    segments.push({
      x, y,
      length,
      angle: segAngle,
      width: Math.max(0.5, taper * 0.8),
      opacity: intensity * 0.4 * taper,
      isFork: true,
    });

    const rad = (segAngle * Math.PI) / 180;
    x += Math.cos(rad) * length;
    y += Math.sin(rad) * length;
    angle = segAngle;

    // Sub-forks: 40% chance at depth < 2
    if (Math.random() < 0.4 && depth < 2) {
      segments.push(...generateFork(x, y, segAngle, intensity * 0.6, depth + 1));
    }
  }
  return segments;
}

function generateBolt(
  screenWidth: number,
  screenHeight: number,
  color: string,
  secondaryColor?: string,
): Bolt {
  const segments: Segment[] = [];
  const numSegments = 5 + Math.floor(Math.random() * 4); // 5–8 (more segments, shorter each)
  const intensity = 0.4 + Math.random() * 0.6;
  const boltColor = secondaryColor && Math.random() < 0.2 ? secondaryColor : color;

  // Start at a random position
  let x = Math.random() * screenWidth;
  let y = Math.random() * screenHeight;
  let angle = -90 + (Math.random() - 0.5) * 50; // mostly downward

  for (let i = 0; i < numSegments; i++) {
    const progress = i / numSegments;
    const length = 10 + Math.random() * 25; // short sharp segments: 10–35px
    const taper = 1 - progress * 0.6; // thicker at top, thins toward tip
    const width = (intensity > 0.7 ? 2.5 : 1.8) * taper;
    const segAngle = angle + (Math.random() - 0.5) * 70; // aggressive zigzag: ±35°

    // Main segment — white-hot core
    segments.push({
      x, y,
      length,
      angle: segAngle,
      width,
      opacity: intensity,
      isFork: false,
    });

    const rad = (segAngle * Math.PI) / 180;
    x += Math.cos(rad) * length;
    y += Math.sin(rad) * length;
    angle = segAngle;

    // 100% fork chance on every segment after the first
    if (i > 0) {
      segments.push(...generateFork(x, y, segAngle, intensity, 0));
    }
  }

  return {
    id: Date.now() + Math.random(),
    segments,
    color: boltColor,
    intensity,
  };
}

// ---------------------------------------------------------------------------
// Single Bolt Component
// ---------------------------------------------------------------------------

const BoltView = memo(({ bolt, onDone }: { bolt: Bolt; onDone: (id: number) => void }) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Double-flash: flash → dim → flash → afterglow hold → fade
    opacity.value = withSequence(
      withTiming(1, { duration: 40, easing: Easing.out(Easing.ease) }),    // first flash
      withTiming(0.2, { duration: 80, easing: Easing.linear }),            // dim
      withTiming(0.9, { duration: 40, easing: Easing.out(Easing.ease) }), // second flash
      withTiming(0.4, { duration: 300, easing: Easing.linear }),           // afterglow hold
      withTiming(0, { duration: 600, easing: Easing.in(Easing.ease) }),    // slow fade out
    );

    // Clean up after animation
    const timer = setTimeout(() => onDone(bolt.id), 1200);
    return () => clearTimeout(timer);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle]} pointerEvents="none">
      {bolt.segments.map((seg, i) => {
        const rad = (seg.angle * Math.PI) / 180;
        const endX = seg.x + Math.cos(rad) * seg.length;
        const endY = seg.y + Math.sin(rad) * seg.length;
        const centerX = (seg.x + endX) / 2;
        const centerY = (seg.y + endY) / 2;

        // White-hot core with colored glow — main segments brighter than forks
        const coreColor = seg.isFork ? bolt.color : '#ffffffee';
        const glowRadius = seg.isFork ? 3 : 10;

        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: centerX - seg.length / 2,
              top: centerY - seg.width / 2,
              width: seg.length,
              height: seg.width,
              backgroundColor: coreColor,
              borderRadius: seg.width / 2,
              transform: [{ rotate: `${seg.angle}deg` }],
              opacity: seg.opacity,
              shadowColor: bolt.color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: bolt.intensity,
              shadowRadius: glowRadius,
            }}
          />
        );
      })}
    </Animated.View>
  );
});

// ---------------------------------------------------------------------------
// LightningStrike Controller
// ---------------------------------------------------------------------------

function LightningStrike({
  color = '#00FFAA',
  secondaryColor,
  minInterval = 2000,
  maxInterval = 5000,
  maxBolts = 3,
}: Props) {
  const focused = useIsFocused();
  const { width, height } = useWindowDimensions();
  const [bolts, setBolts] = useState<Bolt[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const removeBolt = useCallback((id: number) => {
    setBolts(prev => prev.filter(b => b.id !== id));
  }, []);

  const spawnBolt = useCallback(() => {
    setBolts(prev => {
      if (prev.length >= maxBolts) return prev;
      const bolt = generateBolt(width, height, color, secondaryColor);
      return [...prev, bolt];
    });
  }, [width, height, color, secondaryColor, maxBolts]);

  useEffect(() => {
    if (!focused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setBolts([]);
      return;
    }

    const scheduleNext = () => {
      const delay = minInterval + Math.random() * (maxInterval - minInterval);
      timerRef.current = setTimeout(() => {
        spawnBolt();
        scheduleNext();
      }, delay);
    };

    // First bolt after a short delay
    timerRef.current = setTimeout(() => {
      spawnBolt();
      scheduleNext();
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [focused, spawnBolt, minInterval, maxInterval]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {bolts.map(bolt => (
        <BoltView key={bolt.id} bolt={bolt} onDone={removeBolt} />
      ))}
    </View>
  );
}

export default memo(LightningStrike);
