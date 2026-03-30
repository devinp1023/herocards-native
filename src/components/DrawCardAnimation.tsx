// DrawCardAnimation — cinematic card draw overlay for BattleScreen.
//
// Player draw (3 phases):
//   1. Card-back slides down off screen from deck
//   2. Card front slides up to center with dark overlay (big reveal)
//   3. Card shrinks and slots into hand
//
// AI draw: simple card-back flight from deck to hand.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import ReAnimated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withSpring,
  Easing, runOnJS,
} from 'react-native-reanimated';
import { CHOREO } from '../battle/choreography';
import { T } from '../theme/theme';
import { HeroCard } from './HeroCard';
import { CardWrapper, CARD_W, CARD_H } from './CardWrapper';
import type { DrawEvent } from '../hooks/useBattleChoreography';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Card-back visual (matches BattleScreen CardBack) ──────────────────────────
function CardBack({ w, h }: { w: number; h: number }) {
  const inner = Math.round(Math.min(w, h) * 0.35);
  return (
    <View style={[cb.card, { width: w, height: h }]}>
      <View style={[cb.diamond, { width: inner, height: inner, borderRadius: inner * 0.15 }]} />
    </View>
  );
}
const cb = StyleSheet.create({
  card:    { borderRadius: 6, backgroundColor: T.bg.elevated, borderWidth: 1, borderColor: '#ffffff44', alignItems: 'center', justifyContent: 'center' },
  diamond: { borderWidth: 1, borderColor: '#ffffff55', transform: [{ rotate: '45deg' }] },
});

// ── Scale constants (same as BattleScreen) ────────────────────────────────────
const DECK_SCALE    = 0.22;
const HAND_SCALE    = 0.30;
const AI_HAND_SCALE = 0.14;
const PREVIEW_SCALE = 0.85;

const DECK_W = Math.round(CARD_W * DECK_SCALE);
const DECK_H = Math.round(CARD_H * DECK_SCALE);

const PREVIEW_W = Math.round(CARD_W * PREVIEW_SCALE);
const PREVIEW_H = Math.round(CARD_H * PREVIEW_SCALE);

export interface DrawAnimBounds {
  x: number; y: number; w: number; h: number;
}

interface Props {
  event: DrawEvent | null;
  playerDeckBounds: React.RefObject<DrawAnimBounds | null>;
  playerHandBounds: React.RefObject<DrawAnimBounds | null>;
  aiDeckBounds:     React.RefObject<DrawAnimBounds | null>;
  aiHandBounds:     React.RefObject<DrawAnimBounds | null>;
}

type AnimPhase = 'idle' | 'exit' | 'reveal' | 'settle' | 'ai';

export const DrawCardAnimation = React.memo(function DrawCardAnimation({
  event, playerDeckBounds, playerHandBounds, aiDeckBounds, aiHandBounds,
}: Props) {
  const lastKeyRef = useRef(0);
  const [phase, setPhase] = useState<AnimPhase>('idle');
  const [currentEvent, setCurrentEvent] = useState<DrawEvent | null>(null);

  // ── Shared values ───────────────────────────────────────────────────────────
  // Card-back (phase 1 exit + AI flight)
  const backX       = useSharedValue(0);
  const backY       = useSharedValue(0);
  const backScale   = useSharedValue(1);
  const backOpacity = useSharedValue(0);

  // Dark overlay backdrop
  const overlayOpacity = useSharedValue(0);

  // Reveal card (phase 2 + 3)
  const revealX       = useSharedValue(0);
  const revealY       = useSharedValue(0);
  const revealScale   = useSharedValue(1);
  const revealOpacity = useSharedValue(0);

  // ── Phase transition callbacks (called from UI thread via runOnJS) ──────────
  const startRevealPhase = useCallback(() => {
    setPhase('reveal');

    // Dark overlay fades in
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });

    // Card slides up from below to screen center
    const centerX = (SCREEN_W - PREVIEW_W) / 2;
    const centerY = (SCREEN_H - PREVIEW_H) / 2;

    revealX.value = centerX;
    revealY.value = SCREEN_H; // start below screen
    revealScale.value = 1;
    revealOpacity.value = 1;

    revealY.value = withSpring(centerY, {
      damping: 18,
      stiffness: 180,
      mass: 1,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startSettlePhase = useCallback(() => {
    setPhase('settle');

    const handB = playerHandBounds.current;
    if (!handB) {
      // Fallback: just fade out
      revealOpacity.value = withTiming(0, { duration: 200 });
      overlayOpacity.value = withTiming(0, { duration: 200 });
      return;
    }

    // Target: rightmost area of hand
    const endX = handB.x + handB.w * 0.75;
    const endY = handB.y + handB.h / 2;

    // Scale ratio: from preview to hand
    const targetScale = HAND_SCALE / PREVIEW_SCALE;

    // Animate card to hand position
    revealX.value = withTiming(endX - PREVIEW_W / 2, {
      duration: CHOREO.drawRevealOut,
      easing: Easing.inOut(Easing.cubic),
    });
    revealY.value = withTiming(endY - PREVIEW_H / 2, {
      duration: CHOREO.drawRevealOut,
      easing: Easing.inOut(Easing.cubic),
    });
    revealScale.value = withTiming(targetScale, {
      duration: CHOREO.drawRevealOut,
      easing: Easing.inOut(Easing.cubic),
    });

    // Fade out card + overlay together
    revealOpacity.value = withDelay(
      CHOREO.drawRevealOut - 100,
      withTiming(0, { duration: 100 }),
    );
    overlayOpacity.value = withTiming(0, {
      duration: CHOREO.drawRevealOut,
      easing: Easing.in(Easing.quad),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const finishAnimation = useCallback(() => {
    setPhase('idle');
    setCurrentEvent(null);
  }, []);

  // ── Main trigger ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!event || event.key === lastKeyRef.current) return;
    lastKeyRef.current = event.key;
    setCurrentEvent(event);

    if (event.side === 'player') {
      // ── PLAYER: 3-phase cinematic draw ─────────────────────────────────
      const deckB = playerDeckBounds.current;
      if (!deckB) return;

      setPhase('exit');

      // Phase 1: Card-back at deck, slides down off screen
      const startX = deckB.x + deckB.w / 2 - DECK_W / 2;
      const startY = deckB.y + deckB.h / 2 - DECK_H / 2;
      backX.value = startX;
      backY.value = startY;
      backScale.value = 1;
      backOpacity.value = 1;

      // Slide down off screen
      backY.value = withTiming(SCREEN_H + 20, {
        duration: CHOREO.drawExit,
        easing: Easing.in(Easing.cubic),
      });
      backOpacity.value = withDelay(
        CHOREO.drawExit - 50,
        withTiming(0, { duration: 50 }),
      );

      // After exit completes → reveal phase
      setTimeout(() => {
        runOnJS(startRevealPhase)();
      }, CHOREO.drawExit);

      // After reveal hold → settle phase
      setTimeout(() => {
        runOnJS(startSettlePhase)();
      }, CHOREO.drawExit + CHOREO.drawRevealIn + CHOREO.drawRevealHold);

      // After settle → done
      setTimeout(() => {
        runOnJS(finishAnimation)();
      }, CHOREO.drawExit + CHOREO.drawRevealIn + CHOREO.drawRevealHold + CHOREO.drawRevealOut);

    } else {
      // ── AI: simple card-back flight ────────────────────────────────────
      const deckB = aiDeckBounds.current;
      const handB = aiHandBounds.current;
      if (!deckB || !handB) return;

      setPhase('ai');

      const startX = deckB.x + deckB.w / 2 - DECK_W / 2;
      const startY = deckB.y + deckB.h / 2 - DECK_H / 2;
      const endX   = handB.x + handB.w * 0.75 - DECK_W / 2;
      const endY   = handB.y + handB.h / 2 - DECK_H / 2;
      const targetScale = AI_HAND_SCALE / DECK_SCALE;

      backX.value = startX;
      backY.value = startY;
      backScale.value = 1;
      backOpacity.value = 1;

      backX.value = withTiming(endX, { duration: CHOREO.aiDrawTravel, easing: Easing.inOut(Easing.cubic) });
      backY.value = withTiming(endY, { duration: CHOREO.aiDrawTravel, easing: Easing.inOut(Easing.cubic) });
      backScale.value = withTiming(targetScale, { duration: CHOREO.aiDrawTravel, easing: Easing.inOut(Easing.cubic) });

      backOpacity.value = withDelay(
        CHOREO.aiDrawTravel - 100,
        withTiming(0, { duration: 100 }),
      );

      setTimeout(() => {
        runOnJS(finishAnimation)();
      }, CHOREO.aiDrawTravel);
    }
  }, [event?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Animated styles ─────────────────────────────────────────────────────────
  const backStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: 0,
    top: 0,
    zIndex: 901,
    transform: [
      { translateX: backX.value },
      { translateY: backY.value },
      { scale: backScale.value },
    ],
    opacity: backOpacity.value,
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 900,
    opacity: overlayOpacity.value,
  }));

  const revealStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: 0,
    top: 0,
    zIndex: 902,
    transform: [
      { translateX: revealX.value },
      { translateY: revealY.value },
      { scale: revealScale.value },
    ],
    opacity: revealOpacity.value,
  }));

  if (phase === 'idle') return null;

  const card = currentEvent?.card;
  const showBack = phase === 'exit' || phase === 'ai';
  const showReveal = (phase === 'reveal' || phase === 'settle') && card;
  const showOverlay = phase === 'reveal' || phase === 'settle';

  return (
    <>
      {/* Dark backdrop overlay */}
      {showOverlay && (
        <ReAnimated.View style={overlayStyle} pointerEvents="none" />
      )}

      {/* Card-back (exit phase + AI flight) */}
      {showBack && (
        <ReAnimated.View style={backStyle} pointerEvents="none">
          <CardBack w={DECK_W} h={DECK_H} />
        </ReAnimated.View>
      )}

      {/* Card reveal (hero card at preview scale) */}
      {showReveal && (
        <ReAnimated.View style={revealStyle} pointerEvents="none">
          <CardWrapper scale={PREVIEW_SCALE}>
            <HeroCard
              card={card}
              showShine={card.rarity === 'Legendary' || card.rarity === 'Epic'}
              currentHp={card.hp}
              maxHp={card.maxHp}
              currentStamina={card.stamina}
              maxStamina={card.maxStamina}
              isActive
              hpPct={card.maxHp > 0 ? card.hp / card.maxHp : 1}
            />
          </CardWrapper>
        </ReAnimated.View>
      )}
    </>
  );
});
