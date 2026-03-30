// useBattleChoreography — owns all battle animation shared values and trigger functions.
// useBattle decides WHAT happens and WHEN. This hook decides HOW it looks.

import { useState, useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import {
  useSharedValue, withTiming, withSpring, withDelay, withSequence,
  Easing, runOnJS,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { SLAM_CONFIG } from '../data/constants';
import type { BattleCard } from '../battle/battleEngine';

export interface ActionLabelEvent {
  text: string;
  side: 'player' | 'ai';
  key: number;
}

export interface StaminaPopupEvent {
  amount: number;
  side: 'player' | 'ai';
  key: number;
}

export interface DrawEvent {
  side: 'player' | 'ai';
  card: BattleCard | null;   // card being drawn (for player reveal render)
  key: number;
}

export interface DamagePopupEvent {
  damage: number;
  side: 'player' | 'ai';          // which card RECEIVED the hit
  weight: 'LIGHT' | 'MEDIUM' | 'HEAVY';
  typeMultiplier: number;          // 2.0 = super-effective, 0.5 = resisted, 1.0 = neutral
  key: number;
}

export interface BattleChoreography {
  // ── Slam ──
  triggerPlayerSlam: (weight: 'LIGHT' | 'MEDIUM' | 'HEAVY') => void;
  triggerAiSlam:     (weight: 'LIGHT' | 'MEDIUM' | 'HEAVY') => void;

  // ── Round transition ──
  showRoundBanner: (round: number) => void;

  // ── Damage popup ──
  fireDamagePopup: (damage: number, side: 'player' | 'ai', weight: 'LIGHT' | 'MEDIUM' | 'HEAVY', typeMultiplier: number) => void;

  // ── Stamina popup ──
  fireStaminaPopup: (amount: number, side: 'player' | 'ai') => void;

  // ── Card draw ──
  fireDrawAnimation: (side: 'player' | 'ai', card?: BattleCard | null) => void;
  clearDrawEvent: () => void;

  // ── Defeat ──
  showDefeat: (side: 'player' | 'ai') => void;
  clearDefeat: () => void;

  // ── Announcements ──
  showActionLabel: (text: string, side: 'player' | 'ai') => void;
  clearActionLabel: () => void;

  // ── Player slam shared values ──
  playerSlamKey:      SharedValue<number>;
  playerSlamType:     SharedValue<'LIGHT' | 'MEDIUM' | 'HEAVY'>;
  slamProgress:       SharedValue<number>;
  shockwaveActive:    SharedValue<number>;
  shockwave2Active:   SharedValue<number>;
  flashOpacity:       SharedValue<number>;

  // ── AI slam shared values ──
  aiSlamKey:          SharedValue<number>;
  aiSlamType:         SharedValue<'LIGHT' | 'MEDIUM' | 'HEAVY'>;
  aiSlamProgress:     SharedValue<number>;
  aiShockwaveActive:  SharedValue<number>;
  aiShockwave2Active: SharedValue<number>;

  // ── React state signals ──
  roundBannerKey:     number;
  bannerRound:        number;
  actionLabel:        ActionLabelEvent | null;
  damagePopup:        DamagePopupEvent | null;
  staminaPopup:       StaminaPopupEvent | null;
  drawEvent:          DrawEvent | null;
  defeatSide:         'player' | 'ai' | null;
}

export function useBattleChoreography(): BattleChoreography {
  // ── Player slam signals ─────────────────────────────────────────────────
  const playerSlamKey    = useSharedValue(0);
  const playerSlamType   = useSharedValue<'LIGHT' | 'MEDIUM' | 'HEAVY'>('MEDIUM');
  const slamProgress     = useSharedValue(0);
  const shockwaveActive  = useSharedValue(0);
  const shockwave2Active = useSharedValue(0);
  const flashOpacity     = useSharedValue(0);

  // ── AI slam signals ─────────────────────────────────────────────────────
  const aiSlamKey         = useSharedValue(0);
  const aiSlamType        = useSharedValue<'LIGHT' | 'MEDIUM' | 'HEAVY'>('MEDIUM');
  const aiSlamProgress    = useSharedValue(0);
  const aiShockwaveActive = useSharedValue(0);
  const aiShockwave2Active = useSharedValue(0);

  // ── Round banner ────────────────────────────────────────────────────────
  const [roundBannerKey, setRoundBannerKey] = useState(0);
  const [bannerRound, setBannerRound] = useState(0);

  // ── Damage popup ────────────────────────────────────────────────────────
  const [damagePopup, setDamagePopup] = useState<DamagePopupEvent | null>(null);
  const damagePopupKeyRef = useRef(0);

  // ── Stamina popup ─────────────────────────────────────────────────────
  const [staminaPopup, setStaminaPopup] = useState<StaminaPopupEvent | null>(null);
  const staminaPopupKeyRef = useRef(0);

  // ── Draw event ─────────────────────────────────────────────────────────
  const [drawEvent, setDrawEvent] = useState<DrawEvent | null>(null);
  const drawEventKeyRef = useRef(0);

  // ── Defeat ────────────────────────────────────────────────────────────
  const [defeatSide, setDefeatSide] = useState<'player' | 'ai' | null>(null);

  // ── Action label ("REST", "DREW A CARD", "AI SWAPPED", etc.) ──────────
  const [actionLabel, setActionLabel] = useState<ActionLabelEvent | null>(null);
  const actionLabelKeyRef = useRef(0);

  // ── Haptic helpers (called from UI thread via runOnJS) ──────────────────
  const fireImpactHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);
  const fireHeavySecondHaptic = useCallback(() => {
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 120);
  }, []);

  // ── Shared slam animation sequence ──────────────────────────────────────
  // Both player and AI use the same animation; only the shared values differ.
  // Direction (positive/negative Y) is handled by BattleScreen derived values.
  const triggerSlam = useCallback((
    progress: SharedValue<number>,
    slamKey: SharedValue<number>,
    type: SharedValue<'LIGHT' | 'MEDIUM' | 'HEAVY'>,
    shockwave: SharedValue<number>,
    shockwave2: SharedValue<number>,
    flash: SharedValue<number>,
    weight: 'LIGHT' | 'MEDIUM' | 'HEAVY',
  ) => {
    const cfg = SLAM_CONFIG[weight];
    type.value = weight;

    // Haptic at lift
    Haptics.impactAsync(
      cfg.hapticLift === 'Light'
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium
    );

    // Lift phase
    progress.value = withTiming(1, {
      duration: cfg.liftDuration,
      easing: Easing.out(Easing.quad),
    }, () => {
      // Slam phase
      progress.value = withTiming(2, {
        duration: cfg.slamDuration,
        easing: Easing.in(Easing.cubic),
      }, () => {
        // Impact frame
        progress.value = 2.05;

        // Shockwave + flash at impact
        shockwave.value += 1;
        flash.value = withSequence(
          withTiming(cfg.flashOpacity, { duration: 35, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 110, easing: Easing.in(Easing.quad) })
        );

        // Haptic at impact (UI thread → runOnJS)
        runOnJS(fireImpactHaptic)();

        // Heavy: second shockwave ring + second haptic pulse
        if (weight === 'HEAVY') {
          shockwave2.value += 1;
          runOnJS(fireHeavySecondHaptic)();
        }

        // Hold at impact, then spring return
        progress.value = withDelay(
          cfg.holdDuration,
          withSpring(0, {
            damping: cfg.returnDamping,
            stiffness: cfg.returnStiffness,
            mass: weight === 'HEAVY' ? 1.4 : 1.0,
          })
        );
      });
    });

    slamKey.value += 1;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Player slam trigger ─────────────────────────────────────────────────
  const triggerPlayerSlam = useCallback((weight: 'LIGHT' | 'MEDIUM' | 'HEAVY') => {
    triggerSlam(slamProgress, playerSlamKey, playerSlamType, shockwaveActive, shockwave2Active, flashOpacity, weight);
  }, [triggerSlam]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AI slam trigger ─────────────────────────────────────────────────────
  const triggerAiSlam = useCallback((weight: 'LIGHT' | 'MEDIUM' | 'HEAVY') => {
    triggerSlam(aiSlamProgress, aiSlamKey, aiSlamType, aiShockwaveActive, aiShockwave2Active, flashOpacity, weight);
  }, [triggerSlam]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Round banner trigger ────────────────────────────────────────────────
  const showRoundBanner = useCallback((round: number) => {
    setBannerRound(round);
    setRoundBannerKey(k => k + 1);
  }, []);

  // ── Damage popup trigger ─────────────────────────────────────────────
  const fireDamagePopup = useCallback((
    damage: number,
    side: 'player' | 'ai',
    weight: 'LIGHT' | 'MEDIUM' | 'HEAVY',
    typeMultiplier: number,
  ) => {
    damagePopupKeyRef.current += 1;
    setDamagePopup({ damage, side, weight, typeMultiplier, key: damagePopupKeyRef.current });
  }, []);

  // ── Stamina popup trigger ────────────────────────────────────────────
  const fireStaminaPopup = useCallback((amount: number, side: 'player' | 'ai') => {
    staminaPopupKeyRef.current += 1;
    setStaminaPopup({ amount, side, key: staminaPopupKeyRef.current });
  }, []);

  // ── Draw animation triggers ──────────────────────────────────────────
  const fireDrawAnimation = useCallback((side: 'player' | 'ai', card?: BattleCard | null) => {
    drawEventKeyRef.current += 1;
    setDrawEvent({ side, card: card ?? null, key: drawEventKeyRef.current });
  }, []);

  const clearDrawEvent = useCallback(() => {
    setDrawEvent(null);
  }, []);

  // ── Defeat triggers ──────────────────────────────────────────────────
  const showDefeat = useCallback((side: 'player' | 'ai') => {
    setDefeatSide(side);
  }, []);
  const clearDefeat = useCallback(() => {
    setDefeatSide(null);
  }, []);

  // ── Action label triggers ─────────────────────────────────────────────
  const showActionLabel = useCallback((text: string, side: 'player' | 'ai') => {
    actionLabelKeyRef.current += 1;
    setActionLabel({ text, side, key: actionLabelKeyRef.current });
  }, []);

  const clearActionLabel = useCallback(() => {
    setActionLabel(null);
  }, []);

  return {
    triggerPlayerSlam,
    triggerAiSlam,
    showRoundBanner,
    fireDamagePopup,
    fireStaminaPopup,
    fireDrawAnimation,
    clearDrawEvent,
    showDefeat,
    clearDefeat,
    showActionLabel,
    clearActionLabel,
    playerSlamKey,
    playerSlamType,
    slamProgress,
    shockwaveActive,
    shockwave2Active,
    flashOpacity,
    aiSlamKey,
    aiSlamType,
    aiSlamProgress,
    aiShockwaveActive,
    aiShockwave2Active,
    roundBannerKey,
    bannerRound,
    actionLabel,
    damagePopup,
    staminaPopup,
    drawEvent,
    defeatSide,
  };
}
