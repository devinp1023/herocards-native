// AmpParticleWrap — replaces AmpCardGlow with horizontal particle drift + card shake at 90%+.
// Particles and shake are pure RN layer — never inside the Skia canvas.

import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence,
  cancelAnimation, Easing, SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useIsFocused } from '@react-navigation/native';
import { FONTS } from '../theme/fonts';

// ── Helpers ─────────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function spawnRate(amp: number): number {
  if (amp < 5) return 0;
  if (amp < 25) return 1.5;
  if (amp < 50) return 3.0;
  if (amp < 75) return 5.0;
  if (amp < 90) return 7.0;
  return 10.0;
}

function numberChance(amp: number): number {
  if (amp < 5) return 0;
  if (amp < 25) return 0.35;
  if (amp < 50) return 0.28;
  if (amp < 70) return 0.22;
  if (amp < 90) return 0.28;
  return 0.35;
}

// ── Types ───────────────────────────────────────────────────────────────────────

const POOL_SIZE = 20;

/** JS-only mutable state per slot — never passed to worklets */
interface SlotState {
  active: boolean;
  gen: number; // increments each spawn — forces React.memo re-render
  isNumber: boolean;
  ampValue: number;
  size: number;
  fontSize: number;
  glowRadius: number;
  topPct: number;
  direction: 'left' | 'right';
}

// ── Single particle View ────────────────────────────────────────────────────────

const ParticleView = React.memo(function ParticleView({
  tx, ty, op, state, ampColor, gen,
}: {
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  op: SharedValue<number>;
  state: SlotState;
  ampColor: string;
  gen: number;
}) {
  const animStyle = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  if (state.isNumber) {
    return (
      <Animated.View style={[
        styles.particleBase,
        { top: `${state.topPct}%` as any },
        state.direction === 'left' ? { right: 0 } : { left: 0 },
        animStyle,
      ]}>
        <Text style={[
          styles.numberText,
          {
            fontSize: state.fontSize,
            color: ampColor,
            textShadowColor: ampColor,
            textShadowRadius: state.glowRadius,
          },
        ]}>{state.ampValue}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[
      styles.particleBase,
      {
        top: `${state.topPct}%` as any,
        width: state.size,
        height: state.size,
        borderRadius: 999,
        backgroundColor: ampColor,
        shadowColor: ampColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: state.glowRadius,
      },
      state.direction === 'left' ? { right: 0 } : { left: 0 },
      animStyle,
    ]} />
  );
});

// ── Particle zone hook ──────────────────────────────────────────────────────────

function useParticleZone(direction: 'left' | 'right') {
  // Shared values — passed to worklets (never mutated on JS side after init)
  const txArr = Array.from({ length: POOL_SIZE }, () => useSharedValue(0));
  const tyArr = Array.from({ length: POOL_SIZE }, () => useSharedValue(0));
  const opArr = Array.from({ length: POOL_SIZE }, () => useSharedValue(0));

  // JS-only mutable state — never passed to worklets
  const states = useRef<SlotState[]>(
    Array.from({ length: POOL_SIZE }, () => ({
      active: false,
      gen: 0,
      isNumber: false,
      ampValue: 0,
      size: 3,
      fontSize: 8,
      glowRadius: 4,
      topPct: 50,
      direction,
    })),
  ).current;

  return { txArr, tyArr, opArr, states };
}

// ── Main component ──────────────────────────────────────────────────────────────

const ZONE_WIDTH = 65;

export function AmpParticleWrap({ ampPercent, ampColor, children }: {
  ampPercent: number; ampColor: string; children: React.ReactNode;
}) {
  const focused = useIsFocused();
  const ampRef = useRef(ampPercent);
  ampRef.current = ampPercent;

  // ── Particle pools ────────────────────────────────────────────────────────────
  const leftZone = useParticleZone('left');
  const rightZone = useParticleZone('right');

  // Force re-render when particle visual config changes (isNumber, size, etc.)
  const [, forceUpdate] = React.useState(0);
  const bumpRender = useCallback(() => forceUpdate(v => v + 1), []);

  const spawnParticle = useCallback((
    zone: ReturnType<typeof useParticleZone>,
    dir: 'left' | 'right',
  ) => {
    const amp = ampRef.current;
    if (amp < 5) return;

    const { txArr, tyArr, opArr, states } = zone;

    // Find free slot or recycle first active
    let idx = states.findIndex(s => !s.active);
    if (idx === -1) {
      idx = 0;
      cancelAnimation(opArr[idx]);
      cancelAnimation(txArr[idx]);
      cancelAnimation(tyArr[idx]);
    }

    const st = states[idx];
    const t = amp / 100;
    const isNum = Math.random() < numberChance(amp);

    st.active = true;
    st.gen += 1;
    st.isNumber = isNum;
    st.ampValue = amp;
    st.direction = dir;
    st.topPct = 8 + Math.random() * 84;

    if (isNum) {
      st.fontSize = lerp(9, 16, t);
      st.glowRadius = lerp(6, 14, t);
      st.size = 0;
    } else {
      const minSz = lerp(2.5, 4, t);
      const maxSz = lerp(4, 8, t);
      st.size = minSz + Math.random() * (maxSz - minSz);
      st.glowRadius = lerp(5, 12, t);
      st.fontSize = 0;
    }

    const travel = lerp(15, 62, t);
    const duration = lerp(2200, 900, t);
    const peakOpacity = lerp(0.4, 1.0, t);
    const vertDrift = (Math.random() - 0.5) * 12;
    const translateTarget = dir === 'left' ? -travel : travel;

    // Reset shared values
    txArr[idx].value = 0;
    tyArr[idx].value = 0;
    opArr[idx].value = 0;

    // Animate drift
    txArr[idx].value = withTiming(translateTarget, { duration, easing: Easing.out(Easing.quad) });
    tyArr[idx].value = withTiming(vertDrift, { duration, easing: Easing.out(Easing.quad) });

    // Fade in → hold → fade out
    const fadeInDur = duration * 0.20;
    const holdDur = duration * 0.45;
    const fadeOutDur = duration * 0.35;

    opArr[idx].value = withSequence(
      withTiming(peakOpacity, { duration: fadeInDur }),
      withTiming(peakOpacity, { duration: holdDur }),
      withTiming(0, { duration: fadeOutDur, easing: Easing.in(Easing.quad) }),
    );

    // Mark inactive after animation completes
    const capturedIdx = idx;
    const capturedStates = states;
    setTimeout(() => {
      capturedStates[capturedIdx].active = false;
    }, duration + 50);

    bumpRender();
  }, [bumpRender]);

  // ── Spawn timers ──────────────────────────────────────────────────────────────
  const leftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSpawn = useCallback((
    zone: ReturnType<typeof useParticleZone>,
    dir: 'left' | 'right',
    timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  ) => {
    const loop = () => {
      const amp = ampRef.current;
      const rate = spawnRate(amp);

      if (rate === 0) {
        timerRef.current = setTimeout(loop, 400);
        return;
      }

      const delay = (1000 / rate) + (Math.random() - 0.5) * (600 / rate);

      timerRef.current = setTimeout(() => {
        spawnParticle(zone, dir);

        // Double spawn at amp > 70
        if (amp > 70 && Math.random() < 0.35) {
          setTimeout(() => spawnParticle(zone, dir), 80 + Math.random() * 40);
        }

        loop();
      }, delay);
    };
    loop();
  }, [spawnParticle]);

  useEffect(() => {
    if (!focused) return;

    scheduleSpawn(leftZone, 'left', leftTimerRef);
    scheduleSpawn(rightZone, 'right', rightTimerRef);

    return () => {
      if (leftTimerRef.current) clearTimeout(leftTimerRef.current);
      if (rightTimerRef.current) clearTimeout(rightTimerRef.current);
    };
  }, [focused, scheduleSpawn, leftZone, rightZone]);

  // ── Border glow ───────────────────────────────────────────────────────────────
  const glowStyle = React.useMemo(() => {
    const amp = ampPercent;
    if (amp < 25) {
      return { borderColor: ampColor + '22', shadowOpacity: 0 } as const;
    }
    if (amp < 50) {
      return {
        borderColor: ampColor + '44',
        shadowColor: ampColor,
        shadowOffset: { width: 0, height: 0 } as const,
        shadowOpacity: 0.3,
        shadowRadius: 8,
      };
    }
    if (amp < 75) {
      return {
        borderColor: ampColor + '66',
        shadowColor: ampColor,
        shadowOffset: { width: 0, height: 0 } as const,
        shadowOpacity: 0.5,
        shadowRadius: 16,
      };
    }
    if (amp < 100) {
      return {
        borderColor: ampColor + '99',
        shadowColor: ampColor,
        shadowOffset: { width: 0, height: 0 } as const,
        shadowOpacity: 0.7,
        shadowRadius: 28,
      };
    }
    return {
      borderColor: ampColor,
      shadowColor: ampColor,
      shadowOffset: { width: 0, height: 0 } as const,
      shadowOpacity: 0.9,
      shadowRadius: 32,
    };
  }, [ampPercent, ampColor]);

  // ── Card shake at 90%+ ────────────────────────────────────────────────────────
  const shakeX = useSharedValue(0);
  const shakeRot = useSharedValue(0);
  const shakingRef = useRef(false);
  const hasShakeHapticFired = useRef(false);

  useEffect(() => {
    if (!focused) {
      if (shakingRef.current) {
        cancelAnimation(shakeX);
        cancelAnimation(shakeRot);
        shakeX.value = 0;
        shakeRot.value = 0;
        shakingRef.current = false;
      }
      return;
    }

    if (ampPercent >= 90) {
      if (!hasShakeHapticFired.current) {
        hasShakeHapticFired.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const t = (ampPercent - 90) / 10;
      const amplitude = lerp(1.5, 4.5, t);
      const rotation = lerp(0.3, 1.2, t);
      const dur = lerp(160, 65, t);

      if (shakingRef.current) {
        cancelAnimation(shakeX);
        cancelAnimation(shakeRot);
      }
      shakingRef.current = true;

      shakeX.value = withRepeat(
        withSequence(
          withTiming(amplitude, { duration: dur / 5 }),
          withTiming(-amplitude * 0.8, { duration: dur / 5 }),
          withTiming(amplitude * 0.6, { duration: dur / 5 }),
          withTiming(-amplitude * 0.4, { duration: dur / 5 }),
          withTiming(0, { duration: dur / 5 }),
        ),
        -1,
        false,
      );
      shakeRot.value = withRepeat(
        withSequence(
          withTiming(rotation, { duration: dur / 5 }),
          withTiming(-rotation * 0.7, { duration: dur / 5 }),
          withTiming(rotation * 0.5, { duration: dur / 5 }),
          withTiming(-rotation * 0.3, { duration: dur / 5 }),
          withTiming(0, { duration: dur / 5 }),
        ),
        -1,
        false,
      );
    } else {
      if (shakingRef.current) {
        shakingRef.current = false;
        cancelAnimation(shakeX);
        cancelAnimation(shakeRot);
        shakeX.value = withTiming(0, { duration: 100 });
        shakeRot.value = withTiming(0, { duration: 100 });
      }
      hasShakeHapticFired.current = false;
    }
  }, [ampPercent, focused]); // eslint-disable-line react-hooks/exhaustive-deps

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { rotate: `${shakeRot.value}deg` },
    ],
  }));

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Animated.View style={[styles.wrap, glowStyle, shakeStyle]}>
      <View style={[styles.zone, styles.zoneLeft]} pointerEvents="none">
        {leftZone.states.map((state, i) => (
          <ParticleView
            key={i}
            tx={leftZone.txArr[i]}
            ty={leftZone.tyArr[i]}
            op={leftZone.opArr[i]}
            state={state}
            ampColor={ampColor}
            gen={state.gen}
          />
        ))}
      </View>

      {children}

      <View style={[styles.zone, styles.zoneRight]} pointerEvents="none">
        {rightZone.states.map((state, i) => (
          <ParticleView
            key={i}
            tx={rightZone.txArr[i]}
            ty={rightZone.tyArr[i]}
            op={rightZone.opArr[i]}
            state={state}
            ampColor={ampColor}
            gen={state.gen}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 8,
  },
  zone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: ZONE_WIDTH,
    overflow: 'hidden',
  },
  zoneLeft: {
    right: '100%',
  },
  zoneRight: {
    left: '100%',
  },
  particleBase: {
    position: 'absolute',
  },
  numberText: {
    fontFamily: FONTS.orbitronBold,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});
