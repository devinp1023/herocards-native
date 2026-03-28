/**
 * AmpRaceBar — Vertical amp meter on the right side of the combat zone.
 *
 * Opponent bar grows bottom→up toward center effect badge.
 * Player bar grows top→down toward center effect badge.
 * Both converge on the shared effect in the middle.
 *
 * Visual states:
 *   Idle      (both < 50)  — muted fill, dim text
 *   Building  (either ≥ 50) — bright fill, pulsing center
 *   NearFull  (either ≥ 80) — glow + fast pulse + haptic
 *   Triggered (either = 100) — burst + flash + tappable if player
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useIsFocused } from '@react-navigation/native';
import { T, glowShadow } from '../theme/theme';

// ── Props ────────────────────────────────────────────────────────────────────

interface AmpRaceBarProps {
  playerAmp: number;     // 0-100
  aiAmp: number;         // 0-100
  currentEffect: string; // e.g. 'TYPE FLIP'
  effectColor: string;   // color from AMP_EFFECT_COLORS
  onTrigger: () => void;
  onSpend: () => void;
  playerCanTrigger: boolean;
  playerCanSpend: boolean;
  activeEffectInfo?: {
    roundsLeft: number;
    triggeredBy: 'player' | 'ai' | null;
  } | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

const BUILDING_THRESHOLD = 50;
const NEAR_FULL_THRESHOLD = 80;
const FULL = 100;
const BAR_WIDTH = 6;
const BAR_RADIUS = 3;
const EFFECT_FONT_SIZE = T.font.md; // 14px
const EFFECT_LANE_W = 22; // width reserved for the rotated text lane

// ── Component ────────────────────────────────────────────────────────────────

function AmpRaceBarInner({
  playerAmp,
  aiAmp,
  currentEffect,
  effectColor,
  onTrigger,
  onSpend,
  playerCanTrigger,
  playerCanSpend,
  activeEffectInfo,
}: AmpRaceBarProps) {
  const focused = useIsFocused();

  // ── Shared values for smooth bar fill animation ─────────────────────────
  const playerFill = useSharedValue(playerAmp / FULL);
  const aiFill = useSharedValue(aiAmp / FULL);

  // ── Pulse shared values ─────────────────────────────────────────────────
  const centerPulse = useSharedValue(1);
  const triggerScale = useSharedValue(1);
  const playerFlash = useSharedValue(0);
  const aiFlash = useSharedValue(0);

  // ── Track previous amp for threshold haptics & trigger burst ────────────
  const prevPlayerAmp = useRef(playerAmp);
  const prevAiAmp = useRef(aiAmp);

  // ── Animate bar fills on amp change ─────────────────────────────────────
  useEffect(() => {
    playerFill.value = withTiming(playerAmp / FULL, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [playerAmp]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    aiFill.value = withTiming(aiAmp / FULL, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [aiAmp]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Haptic at 80 threshold crossing ─────────────────────────────────────
  useEffect(() => {
    if (prevPlayerAmp.current < NEAR_FULL_THRESHOLD && playerAmp >= NEAR_FULL_THRESHOLD) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    prevPlayerAmp.current = playerAmp;
  }, [playerAmp]);

  useEffect(() => {
    if (prevAiAmp.current < NEAR_FULL_THRESHOLD && aiAmp >= NEAR_FULL_THRESHOLD) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    prevAiAmp.current = aiAmp;
  }, [aiAmp]);

  // ── Trigger burst (either side hits 100) ────────────────────────────────
  useEffect(() => {
    if (
      (prevPlayerAmp.current < FULL && playerAmp >= FULL) ||
      (prevAiAmp.current < FULL && aiAmp >= FULL)
    ) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      triggerScale.value = withSequence(
        withTiming(1.4, { duration: 150, easing: Easing.out(Easing.cubic) }),
        withTiming(1.0, { duration: 150, easing: Easing.out(Easing.cubic) }),
      );
    }
    // Flash the bar that was just reset
    if (prevPlayerAmp.current >= FULL && playerAmp < FULL) {
      playerFlash.value = withSequence(
        withTiming(1, { duration: 50 }),
        withTiming(0, { duration: 200 }),
      );
    }
    if (prevAiAmp.current >= FULL && aiAmp < FULL) {
      aiFlash.value = withSequence(
        withTiming(1, { duration: 50 }),
        withTiming(0, { duration: 200 }),
      );
    }
  }, [playerAmp, aiAmp]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Center pulse animation (driven by state) ───────────────────────────
  const maxAmp = Math.max(playerAmp, aiAmp);
  const isBuilding = maxAmp >= BUILDING_THRESHOLD;
  const isNearFull = maxAmp >= NEAR_FULL_THRESHOLD;
  const isTriggered = playerAmp >= FULL || aiAmp >= FULL;

  useEffect(() => {
    if (!focused) {
      cancelAnimation(centerPulse);
      centerPulse.value = 1;
      return;
    }
    if (isTriggered || isNearFull) {
      centerPulse.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 300, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else if (isBuilding) {
      centerPulse.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 750, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(centerPulse);
      centerPulse.value = 1;
    }
  }, [focused, isBuilding, isNearFull, isTriggered]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pulsing border for trigger-ready state ──────────────────────────────
  const aiCanTrigger = aiAmp >= FULL;
  const anyCanTrigger = playerCanTrigger || aiCanTrigger;
  const bothCanTrigger = playerCanTrigger && aiCanTrigger;

  const borderAlpha = useSharedValue(0.4);
  const borderHue = useSharedValue(0);

  useEffect(() => {
    if (!focused || !anyCanTrigger) {
      cancelAnimation(borderAlpha);
      cancelAnimation(borderHue);
      borderAlpha.value = 0.4;
      borderHue.value = 0;
      return;
    }
    borderAlpha.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    if (bothCanTrigger) {
      borderHue.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(borderHue);
      borderHue.value = playerCanTrigger ? 0 : 1; // 0 = mint, 1 = violet
    }
  }, [focused, anyCanTrigger, bothCanTrigger, playerCanTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Animated styles ─────────────────────────────────────────────────────

  // AI bar: grows bottom-to-top (height % anchored to bottom)
  const aiBarStyle = useAnimatedStyle(() => ({
    height: `${Math.max(0, Math.min(100, aiFill.value * 100))}%` as any,
  }));

  const aiBarColor = aiAmp >= BUILDING_THRESHOLD
    ? T.accent.violet
    : T.accent.violetMuted;

  const aiGlowStyle = aiAmp >= NEAR_FULL_THRESHOLD
    ? glowShadow('violet', 2)
    : {};

  // Player bar: grows top-to-bottom (height % anchored to top)
  const playerBarStyle = useAnimatedStyle(() => ({
    height: `${Math.max(0, Math.min(100, playerFill.value * 100))}%` as any,
  }));

  const playerBarColor = playerAmp >= BUILDING_THRESHOLD
    ? T.accent.mint
    : T.accent.mintMuted;

  const playerGlowStyle = playerAmp >= NEAR_FULL_THRESHOLD
    ? glowShadow('mint', 2)
    : {};

  // Flash overlays
  const playerFlashStyle = useAnimatedStyle(() => ({
    opacity: playerFlash.value,
  }));
  const aiFlashStyle = useAnimatedStyle(() => ({
    opacity: aiFlash.value,
  }));

  // Center effect text color
  const centerTextColor = isNearFull || isTriggered
    ? T.accent.mint
    : isBuilding
      ? T.text.body
      : T.text.muted;

  const centerPulseStyle = useAnimatedStyle(() => ({
    opacity: centerPulse.value,
    transform: [{ scale: triggerScale.value }],
  }));

  // Trigger border — mint for player, violet for AI, alternating for both
  const triggerBorderStyle = useAnimatedStyle(() => {
    'worklet';
    const h = borderHue.value;
    const a = borderAlpha.value;
    const r = Math.round(0 + (177 - 0) * h);
    const g = Math.round(255 + (78 - 255) * h);
    const b = Math.round(170 + (255 - 170) * h);
    return {
      borderColor: `rgba(${r}, ${g}, ${b}, ${a})`,
    };
  });

  const centerGlow = isTriggered ? glowShadow('mint', 3) : {};

  // ── Render ──────────────────────────────────────────────────────────────

  const hasActiveEffect = activeEffectInfo && activeEffectInfo.roundsLeft > 0;

  // Split effect name into individual characters for vertical stacking
  // Spaces become gaps between words
  const effectChars = currentEffect.split('');
  const activeLabel = hasActiveEffect
    ? `${activeEffectInfo.roundsLeft}r${activeEffectInfo.triggeredBy === 'player' ? ' Y' : ' A'}`
    : null;

  return (
    <View style={styles.container}>
      {/* Left: bars column */}
      <View style={styles.barsColumn}>
        {/* AI amp number */}
        <Text style={[styles.ampNumber, { color: aiAmp >= FULL ? T.status.caution : T.accent.violet }]}>
          {aiAmp}
        </Text>

        {/* AI bar — fills top-to-bottom (toward center) */}
        <View style={styles.barSection}>
          <View style={styles.barTrack}>
            <ReAnimated.View
              style={[
                styles.barFill,
                styles.barFillTop,
                aiBarStyle,
                { backgroundColor: aiBarColor },
                aiGlowStyle,
              ]}
            />
            <ReAnimated.View
              style={[styles.barFlash, styles.barFillTop, aiBarStyle, aiFlashStyle]}
            />
          </View>
        </View>

        {/* Trigger / Spend button in center divider */}
        {playerCanTrigger ? (
          <TouchableOpacity onPress={onTrigger} activeOpacity={0.7}>
            <ReAnimated.View style={[styles.centerBtn, styles.triggerBorder, triggerBorderStyle, { backgroundColor: effectColor + '20' }]}>
              <Text style={[styles.centerBtnText, { color: effectColor }]}>⚡</Text>
            </ReAnimated.View>
          </TouchableOpacity>
        ) : playerCanSpend ? (
          <TouchableOpacity onPress={onSpend} activeOpacity={0.75}>
            <View style={[styles.centerBtn, { borderColor: T.accent.mint + '66', backgroundColor: T.accent.mint + '14' }]}>
              <Text style={[styles.centerBtnText, { color: T.accent.mint }]}>↻</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.centerDot}>
            {anyCanTrigger ? (
              <ReAnimated.View style={[styles.centerBtn, styles.triggerBorder, triggerBorderStyle, { backgroundColor: effectColor + '20' }]}>
                <Text style={[styles.centerBtnText, { color: effectColor }]}>⚡</Text>
              </ReAnimated.View>
            ) : (
              <View style={[styles.centerDotInner, { backgroundColor: effectColor + '44' }]} />
            )}
          </View>
        )}

        {/* Player bar — fills bottom-to-top (toward center) */}
        <View style={styles.barSection}>
          <View style={styles.barTrack}>
            <ReAnimated.View
              style={[
                styles.barFill,
                styles.barFillBottom,
                playerBarStyle,
                { backgroundColor: playerBarColor },
                playerGlowStyle,
              ]}
            />
            <ReAnimated.View
              style={[styles.barFlash, styles.barFillBottom, playerBarStyle, playerFlashStyle]}
            />
          </View>
        </View>

        {/* Player amp number */}
        <Text style={[styles.ampNumber, { color: playerAmp >= FULL ? T.status.caution : T.accent.mint }]}>
          {playerAmp}
        </Text>
      </View>

      {/* Right: vertically stacked effect text */}
      <ReAnimated.View style={[styles.effectLane, centerPulseStyle, centerGlow]}>
        {effectChars.map((ch, i) =>
          ch === ' ' ? (
            <View key={i} style={styles.wordGap} />
          ) : (
            <Text
              key={i}
              style={[styles.effectChar, { color: anyCanTrigger ? effectColor : centerTextColor }]}
            >
              {ch}
            </Text>
          )
        )}
        {activeLabel && (
          <Text style={[styles.activeInfo, { color: effectColor }]}>
            {activeLabel}
          </Text>
        )}
      </ReAnimated.View>
    </View>
  );
}

export const AmpRaceBar = React.memo(AmpRaceBarInner);

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 4,
  },

  // Left column: numbers + bars + center button
  barsColumn: {
    width: 28,
    flexDirection: 'column',
    alignItems: 'center',
  },

  // Top/bottom bar sections
  barSection: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingVertical: 2,
  },

  // Vertical track
  barTrack: {
    flex: 1,
    width: BAR_WIDTH,
    borderRadius: BAR_RADIUS,
    backgroundColor: '#1a1a35',
    overflow: 'hidden',
    position: 'relative',
  },

  barFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: BAR_RADIUS,
  },

  barFillBottom: {
    bottom: 0,
  },

  barFillTop: {
    top: 0,
  },

  barFlash: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: BAR_RADIUS,
    backgroundColor: '#ffffff',
  },

  ampNumber: {
    fontFamily: 'Orbitron_900Black',
    fontSize: 10,
    textAlign: 'center',
  },

  // Center divider button (trigger / spend / dot)
  centerBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.bg.border,
    marginVertical: 2,
  },

  triggerBorder: {
    borderWidth: 2,
  },

  centerBtnText: {
    fontSize: 12,
  },

  centerDot: {
    marginVertical: 2,
  },

  centerDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Right lane: vertically stacked characters
  effectLane: {
    width: EFFECT_LANE_W,
    justifyContent: 'center',
    alignItems: 'center',
  },

  effectChar: {
    fontFamily: 'Orbitron_900Black',
    fontSize: EFFECT_FONT_SIZE,
    lineHeight: EFFECT_FONT_SIZE + 2,
    textAlign: 'center',
  },

  wordGap: {
    height: 8,
  },

  activeInfo: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 8,
    marginTop: 4,
    textAlign: 'center',
  },
});
