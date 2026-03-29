// useBattleChoreography — owns all battle animation shared values and trigger functions.
// useBattle decides WHAT happens and WHEN. This hook decides HOW it looks.

import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import {
  useSharedValue, withTiming, withSpring, withDelay, withSequence,
  Easing, runOnJS,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { SLAM_CONFIG } from '../data/constants';

export interface BattleChoreography {
  // ── Slam ──
  triggerPlayerSlam: (weight: 'LIGHT' | 'MEDIUM' | 'HEAVY') => void;

  // ── Round transition ──
  showRoundBanner: () => void;

  // ── Raw shared values (for BattleScreen derived transforms) ──
  playerSlamKey:      SharedValue<number>;
  playerSlamType:     SharedValue<'LIGHT' | 'MEDIUM' | 'HEAVY'>;
  slamProgress:       SharedValue<number>;
  shockwaveActive:    SharedValue<number>;
  shockwave2Active:   SharedValue<number>;
  flashOpacity:       SharedValue<number>;
  aiShockwaveActive:  SharedValue<number>;

  // ── React state signals ──
  roundBannerKey:     number;
}

export function useBattleChoreography(): BattleChoreography {
  // ── Slam animation signals (Reanimated shared values) ───────────────────
  const playerSlamKey    = useSharedValue(0);
  const playerSlamType   = useSharedValue<'LIGHT' | 'MEDIUM' | 'HEAVY'>('MEDIUM');
  const slamProgress     = useSharedValue(0);
  const shockwaveActive  = useSharedValue(0);
  const shockwave2Active = useSharedValue(0);
  const flashOpacity     = useSharedValue(0);
  const aiShockwaveActive = useSharedValue(0);

  // ── Round banner ────────────────────────────────────────────────────────
  const [roundBannerKey, setRoundBannerKey] = useState(0);

  // ── Haptic helpers (called from UI thread via runOnJS) ──────────────────
  const fireImpactHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);
  const fireHeavySecondHaptic = useCallback(() => {
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 120);
  }, []);
  const fireHeavySecondShockwave = useCallback(() => {
    shockwave2Active.value += 1;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Player slam trigger ─────────────────────────────────────────────────
  const triggerPlayerSlam = useCallback((attackLabel: 'LIGHT' | 'MEDIUM' | 'HEAVY') => {
    const cfg = SLAM_CONFIG[attackLabel];

    playerSlamType.value = attackLabel;

    // Haptic at lift
    Haptics.impactAsync(
      cfg.hapticLift === 'Light'
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium
    );

    // Lift phase
    slamProgress.value = withTiming(1, {
      duration: cfg.liftDuration,
      easing: Easing.out(Easing.quad),
    }, () => {
      // Slam phase
      slamProgress.value = withTiming(2, {
        duration: cfg.slamDuration,
        easing: Easing.in(Easing.cubic),
      }, () => {
        // Impact frame
        slamProgress.value = 2.05;

        // Shockwave + flash at impact
        shockwaveActive.value += 1;
        flashOpacity.value = withSequence(
          withTiming(cfg.flashOpacity, { duration: 35, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 110, easing: Easing.in(Easing.quad) })
        );

        // Haptic at impact (UI thread → runOnJS)
        runOnJS(fireImpactHaptic)();

        // Heavy: second shockwave ring + second haptic pulse
        if (attackLabel === 'HEAVY') {
          runOnJS(fireHeavySecondShockwave)();
          runOnJS(fireHeavySecondHaptic)();
        }

        // Hold at impact, then spring return
        slamProgress.value = withDelay(
          cfg.holdDuration,
          withSpring(0, {
            damping: cfg.returnDamping,
            stiffness: cfg.returnStiffness,
            mass: attackLabel === 'HEAVY' ? 1.4 : 1.0,
          })
        );
      });
    });

    playerSlamKey.value += 1;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Round banner trigger ────────────────────────────────────────────────
  const showRoundBanner = useCallback(() => {
    setRoundBannerKey(k => k + 1);
  }, []);

  return {
    triggerPlayerSlam,
    showRoundBanner,
    playerSlamKey,
    playerSlamType,
    slamProgress,
    shockwaveActive,
    shockwave2Active,
    flashOpacity,
    aiShockwaveActive,
    roundBannerKey,
  };
}
