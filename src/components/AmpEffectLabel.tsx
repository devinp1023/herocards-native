/**
 * AmpEffectLabel — Vertical effect name on the right side of the combat zone.
 *
 * Replaces AmpRaceBar. No bars or numbers — the active cards' surge glows
 * communicate amp level. This component shows only the effect name and
 * contextual action buttons.
 *
 * Color shifts mint (player leading) ↔ violet (AI leading), brightness
 * scales with intensity. Neck-and-neck oscillates between both colors.
 * Pulse at 75%+. Scale burst on isTriggered.
 *
 * Buttons:
 *   REROLL · 50  — visible when playerAmp >= 50
 *   TRIGGER · 100 — visible when playerAmp === 100
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  cancelAnimation,
  interpolate,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useIsFocused } from '@react-navigation/native';
import { T, MOTION, glowShadow, FONTS } from '../theme/theme';

// ── Props ─────────────────────────────────────────────────────────────────────

interface AmpEffectLabelProps {
  effectName: string;        // e.g. 'TYPE FLIP', 'EQUALISER'
  playerAmp: number;         // 0–100
  aiAmp: number;             // 0–100
  isTriggered?: boolean;     // brief eruption state when amp hits 100
  onReroll: () => void;      // spend 50 amp to change effect
  onTrigger: () => void;     // spend 100 amp to trigger effect
  canInteract?: boolean;     // false during AI turn processing
}

// ── Color constants ────────────────────────────────────────────────────────────

const MINT   = '#00FFAA';
const VIOLET = '#B14EFF';
const MUTED  = '#6e7191';

// ── Component ─────────────────────────────────────────────────────────────────

function AmpEffectLabelInner({
  effectName,
  playerAmp,
  aiAmp,
  isTriggered = false,
  onReroll,
  onTrigger,
  canInteract = true,
}: AmpEffectLabelProps) {
  const focused = useIsFocused();

  // ── Intensity: 0–1 based on max amp ────────────────────────────────────
  const intensitySv = useSharedValue(0);
  // ── Leader hue: 0 = player/mint, 1 = AI/violet ─────────────────────────
  const leaderHue = useSharedValue(0);
  // ── Pulse opacity (at 75%+ intensity) ──────────────────────────────────
  const textPulse = useSharedValue(1.0);
  // ── Trigger scale burst ─────────────────────────────────────────────────
  const triggerScale = useSharedValue(1.0);
  // ── Button opacities ───────────────────────────────────────────────────
  const rerollOpacity = useSharedValue(0);
  const triggerOpacity = useSharedValue(0);

  const pulsingRef  = useRef(false);
  const triggeredRef = useRef(false);

  // ── Drive intensity and leader from amp values ────────────────────────
  useEffect(() => {
    const maxAmp = Math.max(playerAmp, aiAmp);
    intensitySv.value = withTiming(maxAmp / 100, { duration: 300, easing: Easing.out(Easing.cubic) });
  }, [playerAmp, aiAmp]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Leader color — neck-and-neck oscillates, otherwise tracks leader ──
  useEffect(() => {
    if (!focused) return;
    const isNeckAndNeck = Math.abs(playerAmp - aiAmp) <= 10 && playerAmp > 40 && aiAmp > 40;
    if (isNeckAndNeck) {
      leaderHue.value = withRepeat(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(leaderHue);
      leaderHue.value = withTiming(playerAmp >= aiAmp ? 0 : 1, { duration: 300 });
    }
  }, [playerAmp, aiAmp, focused]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pulse at 75%+ ────────────────────────────────────────────────────
  useEffect(() => {
    if (!focused) {
      if (pulsingRef.current) {
        pulsingRef.current = false;
        cancelAnimation(textPulse);
        textPulse.value = 1.0;
      }
      return;
    }
    const maxAmp = Math.max(playerAmp, aiAmp);
    if (maxAmp >= 75 && !pulsingRef.current) {
      pulsingRef.current = true;
      textPulse.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 300, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else if (maxAmp < 75 && pulsingRef.current) {
      pulsingRef.current = false;
      cancelAnimation(textPulse);
      textPulse.value = withTiming(1.0, { duration: 200 });
    }
  }, [playerAmp, aiAmp, focused]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── isTriggered burst — fires once, returns to normal ────────────────
  useEffect(() => {
    if (isTriggered && !triggeredRef.current) {
      triggeredRef.current = true;
      triggerScale.value = withSequence(
        withTiming(1.4, { duration: 150, easing: Easing.out(Easing.cubic) }),
        withSpring(1.0, { damping: 10, stiffness: 200 }),
      );
    } else if (!isTriggered) {
      triggeredRef.current = false;
    }
  }, [isTriggered]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Button visibility ────────────────────────────────────────────────
  useEffect(() => {
    const showReroll  = canInteract && playerAmp >= 50;
    const showTrigger = canInteract && playerAmp >= 100;
    rerollOpacity.value  = withTiming(showReroll  ? 1 : 0, { duration: 300 });
    triggerOpacity.value = withTiming(showTrigger ? 1 : 0, { duration: 200 });
  }, [playerAmp, canInteract]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Trigger button pulse (when visible) ─────────────────────────────
  const triggerBtnPulse = useSharedValue(1.0);
  const triggerBtnPulsingRef = useRef(false);
  useEffect(() => {
    if (!focused) {
      cancelAnimation(triggerBtnPulse);
      triggerBtnPulse.value = 1.0;
      triggerBtnPulsingRef.current = false;
      return;
    }
    const active = canInteract && playerAmp >= 100;
    if (active && !triggerBtnPulsingRef.current) {
      triggerBtnPulsingRef.current = true;
      triggerBtnPulse.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else if (!active && triggerBtnPulsingRef.current) {
      triggerBtnPulsingRef.current = false;
      cancelAnimation(triggerBtnPulse);
      triggerBtnPulse.value = 1.0;
    }
  }, [playerAmp, canInteract, focused]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Animated styles ──────────────────────────────────────────────────

  const textContainerStyle = useAnimatedStyle(() => ({
    opacity: textPulse.value,
    transform: [{ scale: triggerScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => {
    'worklet';
    const t = intensitySv.value;
    const h = leaderHue.value;
    // Blend muted → mint path and muted → violet path, then mix by leader hue
    const mintPath   = interpolateColor(t, [0, 1], [MUTED, MINT]);
    const violetPath = interpolateColor(t, [0, 1], [MUTED, VIOLET]);
    const color      = interpolateColor(h, [0, 1], [mintPath, violetPath]);
    const shadowR    = interpolate(t, [0, 1], [0, 12]);
    const glowColor  = h < 0.5 ? MINT : VIOLET;
    return {
      color,
      textShadowColor: glowColor,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: shadowR,
    };
  });

  const rerollStyle = useAnimatedStyle(() => ({
    opacity: rerollOpacity.value,
  }));

  const triggerBtnStyle = useAnimatedStyle(() => ({
    opacity: triggerOpacity.value * triggerBtnPulse.value,
  }));

  // ── Button press handlers ────────────────────────────────────────────
  const handleReroll = () => {
    rerollOpacity.value = withTiming(0, { duration: 200 });
    onReroll();
  };

  const handleTrigger = () => {
    triggerBtnPulsingRef.current = false;
    cancelAnimation(triggerBtnPulse);
    triggerOpacity.value = withTiming(0, { duration: 150 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onTrigger();
  };

  // ── Render ────────────────────────────────────────────────────────────

  const letters = effectName.split('');

  return (
    <View style={styles.container}>
      {/* Vertical effect name */}
      <ReAnimated.View style={[styles.labelWrap, textContainerStyle]}>
        {letters.map((ch, i) =>
          ch === ' ' ? (
            <View key={i} style={styles.wordGap} />
          ) : (
            <ReAnimated.Text key={i} style={[styles.letter, textStyle]}>
              {ch}
            </ReAnimated.Text>
          )
        )}
      </ReAnimated.View>

      {/* Contextual buttons — no layout shift, fade in/out via opacity */}
      <View style={styles.btnCol}>
        {/* REROLL — appears at playerAmp >= 50 */}
        <ReAnimated.View style={[styles.btnWrap, rerollStyle]} pointerEvents={playerAmp >= 50 && canInteract ? 'auto' : 'none'}>
          <TouchableOpacity onPress={handleReroll} activeOpacity={0.75} style={styles.rerollBtn}>
            <Text style={styles.rerollLabel} numberOfLines={1}>REROLL</Text>
            <Text style={styles.rerollCost} numberOfLines={1}>·50</Text>
          </TouchableOpacity>
        </ReAnimated.View>

        {/* TRIGGER — appears at playerAmp >= 100 */}
        <ReAnimated.View style={[styles.btnWrap, triggerBtnStyle]} pointerEvents={playerAmp >= 100 && canInteract ? 'auto' : 'none'}>
          <TouchableOpacity onPress={handleTrigger} activeOpacity={0.7} style={[styles.triggerBtn, glowShadow('mint', 2)]}>
            <Text style={styles.triggerLabel} numberOfLines={1}>TRIGGER</Text>
            <Text style={styles.triggerCost} numberOfLines={1}>·100</Text>
          </TouchableOpacity>
        </ReAnimated.View>
      </View>
    </View>
  );
}

export const AmpEffectLabel = React.memo(AmpEffectLabelInner);

// ── Styles ────────────────────────────────────────────────────────────────────

const LABEL_W = 70;

const styles = StyleSheet.create({
  container: {
    width: LABEL_W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  labelWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontFamily: FONTS.orbitronBold,
    fontSize: T.font.lg,
    lineHeight: T.font.lg + 2,
    textAlign: 'center',
  },
  wordGap: {
    height: 8,
  },
  btnCol: {
    width: '100%',
    gap: 5,
    paddingBottom: 2,
  },
  btnWrap: {
    width: '100%',
  },
  rerollBtn: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: T.button.secondary.radius,
    borderWidth: 1,
    borderColor: T.accent.mintMuted,
    backgroundColor: T.accent.mintFaint,
  },
  rerollLabel: {
    fontFamily: FONTS.orbitronBold,
    fontSize: T.font.xs,
    color: T.text.muted,
    letterSpacing: T.letterSpacing.xs,
    textAlign: 'center',
  },
  rerollCost: {
    fontFamily: FONTS.orbitronBold,
    fontSize: T.font.xs,
    color: T.accent.mint,
    letterSpacing: T.letterSpacing.xs,
    textAlign: 'center',
    marginTop: 1,
  },
  triggerBtn: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: T.button.secondary.radius,
    borderWidth: 1.5,
    borderColor: T.accent.mint,
    backgroundColor: T.accent.mintFaint,
  },
  triggerLabel: {
    fontFamily: FONTS.orbitronBold,
    fontSize: T.font.xs,
    color: T.accent.mint,
    letterSpacing: T.letterSpacing.xs,
    textAlign: 'center',
  },
  triggerCost: {
    fontFamily: FONTS.orbitronBold,
    fontSize: T.font.xs,
    color: T.accent.mint,
    letterSpacing: T.letterSpacing.xs,
    textAlign: 'center',
    marginTop: 1,
  },
});
