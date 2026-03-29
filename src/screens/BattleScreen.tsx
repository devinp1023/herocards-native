// BattleScreen — Session 11: core state machine + battle UI.
// Gesture controls (Session 11):
//   Attack  — drag active card upward ≥ 60px
//   Swap    — drag any hand card upward ≥ 40px
//   Draw    — tap the deck card back
// Session 12 adds full Reanimated lunge/shake/defeat animations.

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  StyleSheet, Platform, PanResponder, Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmpEffectLabel } from '../components/AmpEffectLabel';
import ReAnimated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withSpring, withDelay, cancelAnimation, Easing, interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BattleStackParamList } from '../../App';
import { useBattle, BattlePhase } from '../hooks/useBattle';
import { BattleCard, AttackWeight, AmpEffectName } from '../battle/battleEngine';
import { RC, TYPE_COLORS } from '../data/constants';
import { AVATARS, LEVEL_AVATARS } from '../data/packs';
import { useGameStateContext } from '../context/GameStateContext';
import { useSession } from '../context/SessionContext';
import { CardWrapper, CARD_W, CARD_H } from '../components/CardWrapper';
import { MiniCard } from '../components/MiniCard';
import { HeroCard } from '../components/HeroCard';
import { MaterialSurface } from '../components/MaterialSurface';
import { ScreenBackground } from '../components/ScreenBackground';
import { SuccessBurst, SuccessBurstHandle } from '../components/SuccessBurst';
import { AmpParticleWrap } from '../components/AmpParticleWrap';
import { T, MOTION, TIMING, SPRING, EASE } from '../theme/theme';

type Props = NativeStackScreenProps<BattleStackParamList, 'Battle'>;

const ACTIVE_SCALE   = 0.52;
const HAND_SCALE     = 0.30;
const AI_HAND_SCALE  = 0.14;
const HAND_OVERLAP   = -18;

const DECK_SCALE = 0.22;

const ACTIVE_W    = Math.round(CARD_W * ACTIVE_SCALE);
const ACTIVE_H    = Math.round(CARD_H * ACTIVE_SCALE);
const HAND_W      = Math.round(CARD_W * HAND_SCALE);
const HAND_H      = Math.round(CARD_H * HAND_SCALE);
const AI_HAND_W   = Math.round(CARD_W * AI_HAND_SCALE);
const AI_HAND_H   = Math.round(CARD_H * AI_HAND_SCALE);
const DECK_W      = Math.round(CARD_W * DECK_SCALE);
const DECK_H      = Math.round(CARD_H * DECK_SCALE);

const HP_GAP  = 12;

const MAX_HAND = 5;

// Drop-zone hit testing — compare finger screen coords against measureInWindow bounds
type Bounds = { x: number; y: number; w: number; h: number };
function isOver(b: Bounds | null, mx: number, my: number): boolean {
  if (!b) return false;
  return mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
}

// ── Face-down card back ────────────────────────────────────────────────────────
function CardBack({ w, h }: { w: number; h: number }) {
  const inner = Math.round(Math.min(w, h) * 0.35);
  return (
    <View style={[cb.card, { width: w, height: h }]}>
      <View style={[cb.diamond, { width: inner, height: inner, borderRadius: inner * 0.15 }]} />
    </View>
  );
}
// ── Deck pile — stacked card backs for 3D depth ───────────────────────────────
const DECK_LAYER_OFFSET = 2; // px shift per layer (right + down)
function DeckPile({ w, h, count }: { w: number; h: number; count: number }) {
  // Show 1–4 layers based on cards remaining
  const layers = Math.min(count, 4);
  return (
    <View style={{ width: w + DECK_LAYER_OFFSET * 3, height: h + DECK_LAYER_OFFSET * 3 }}>
      {Array.from({ length: layers }).map((_, i) => {
        const offset = (layers - 1 - i) * DECK_LAYER_OFFSET;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: offset,
              top: offset,
              opacity: i === layers - 1 ? 1 : 0.5,
            }}
          >
            <CardBack w={w} h={h} />
          </View>
        );
      })}
    </View>
  );
}

// ── Card preview modal — full-size card over dark backdrop ─────────────────────
const PREVIEW_SCALE = 0.85;
function CardPreviewModal({ card, onClose }: { card: BattleCard; onClose: () => void }) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={pm.backdrop} activeOpacity={1} onPress={onClose}>
        <MaterialSurface material="frostedGlass" style={pm.cardWrap} borderRadius={16}>
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
        </MaterialSurface>
      </TouchableOpacity>
    </Modal>
  );
}
const pm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  cardWrap: { alignItems: 'center', padding: 12 },
});

// ── Empty hand slot ────────────────────────────────────────────────────────────
function EmptySlot({ w, h }: { w: number; h: number }) {
  return <View style={[es.slot, { width: w, height: h, borderRadius: w * 0.08 }]} />;
}
const es = StyleSheet.create({
  slot: { borderWidth: 1, borderColor: '#ffffff33', borderStyle: 'dashed', backgroundColor: T.bg.elevated },
});

const cb = StyleSheet.create({
  card:    { borderRadius: 6, backgroundColor: T.bg.elevated, borderWidth: 1, borderColor: '#ffffff44', alignItems: 'center', justifyContent: 'center' },
  diamond: { borderWidth: 1, borderColor: '#ffffff55', transform: [{ rotate: '45deg' }] },
});


// ── Defeat animation — card falls and fades ───────────────────────────────────
function DefeatingCardAnim({ card, absolute = false }: { card: BattleCard; absolute?: boolean }) {
  const translateY = useSharedValue(0);
  const opacity    = useSharedValue(1);
  useEffect(() => {
    translateY.value = withTiming(70, { duration: 500, easing: Easing.in(Easing.cubic) });
    opacity.value    = withTiming(0,  { duration: 420, easing: Easing.in(Easing.quad) });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));
  return (
    <ReAnimated.View
      style={[absolute && da.absolute, animStyle]}
      pointerEvents="none"
    >
      <CardWrapper scale={ACTIVE_SCALE}>
        <HeroCard
          card={card}
          currentHp={0}
          maxHp={card.maxHp}
          currentStamina={card.stamina}
          maxStamina={card.maxStamina}
          hpPct={0}
        />
      </CardWrapper>
    </ReAnimated.View>
  );
}
const da = StyleSheet.create({
  absolute: { position: 'absolute', top: 0, left: 0, zIndex: 10 },
});


// ── AI active section (no gesture) ───────────────────────────────────────────
function AIActiveSection({ card, revealed, deckCount, targeted, hitKey, attackKey, defeatingCard, aiAmp, onCardMeasure, onPreview }: {
  card: BattleCard | null; revealed: boolean; deckCount: number;
  targeted: boolean; hitKey: number; attackKey: number; defeatingCard: BattleCard | null;
  aiAmp: number;
  onCardMeasure: (b: Bounds) => void;
  onPreview: (c: BattleCard) => void;
}) {
  const cardRef = useRef<View>(null);

  // ── Shake + flash on hit ─────────────────────────────────────────────────────
  const shakeX   = useSharedValue(0);
  const flashOp  = useSharedValue(0);
  useEffect(() => {
    if (hitKey === 0) return;
    shakeX.value = withSequence(
      withTiming( 6, { duration: 40 }), withTiming(-6, { duration: 40 }),
      withTiming( 4, { duration: 35 }), withTiming(-4, { duration: 35 }),
      withTiming( 0, { duration: 30 }),
    );
    flashOp.value = withSequence(withTiming(0.45, { duration: 50 }), withTiming(0, { duration: 260 }));
  }, [hitKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOp.value }));

  // ── Lunge toward player when AI attacks ──────────────────────────────────────
  const lungeY = useSharedValue(0);
  useEffect(() => {
    if (attackKey === 0) return;
    // AI is at the top — positive Y moves toward player (downward)
    lungeY.value = withSequence(
      withTiming(28, { duration: 110, easing: Easing.out(Easing.quad) }),
      withSpring(0,  { damping: 8, stiffness: 220 }),
    );
  }, [attackKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const lungeStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lungeY.value }] }));

  // ── Card entrance on new card ────────────────────────────────────────────────
  const entryScale = useSharedValue(1);
  const prevCardIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (card && card.id !== prevCardIdRef.current) {
      prevCardIdRef.current = card.id;
      entryScale.value = 0.7;
      entryScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    }
  }, [card?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const entryStyle = useAnimatedStyle(() => ({ transform: [{ scale: entryScale.value }] }));

  // ── Defeat overlay ───────────────────────────────────────────────────────────
  const [showDefeat, setShowDefeat] = useState(false);
  const lastDefeatRef = useRef<BattleCard | null>(null);
  useEffect(() => {
    if (defeatingCard && defeatingCard !== lastDefeatRef.current) {
      lastDefeatRef.current = defeatingCard;
      setShowDefeat(true);
      const t = setTimeout(() => setShowDefeat(false), 620);
      return () => clearTimeout(t);
    }
  }, [defeatingCard]);

  if (!card) {
    return <View style={[aas.row, { height: ACTIVE_H, justifyContent: 'center' }]}><Text style={aas.empty}>—</Text></View>;
  }
  return (
    <View style={aas.row}>
      <View style={aas.deckCol}>
        {deckCount > 0 ? (
          <View style={aas.deckWrap}>
            <DeckPile w={DECK_W} h={DECK_H} count={deckCount} />
            <View style={aas.badge}><Text style={aas.badgeText}>{deckCount}</Text></View>
          </View>
        ) : (
          <View style={{ width: DECK_W, height: DECK_H }} />
        )}
      </View>
      {/* lungeStyle moves the whole card+shake together toward the player */}
      <ReAnimated.View style={lungeStyle}>
        <ReAnimated.View style={shakeStyle}>
          <View
            ref={cardRef}
            style={{ position: 'relative' }}
            onLayout={() => cardRef.current?.measureInWindow((x, y, w, h) => onCardMeasure({ x, y, w, h }))}
          >
            <TouchableOpacity activeOpacity={0.9} onPress={() => onPreview(card)}>
              <ReAnimated.View style={entryStyle}>
                <AmpParticleWrap ampPercent={aiAmp} ampColor="#B14EFF">
                  <CardWrapper scale={ACTIVE_SCALE}>
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
                </AmpParticleWrap>
              </ReAnimated.View>
            </TouchableOpacity>
            <ReAnimated.View style={[flashStyle, aas.flashOverlay]} pointerEvents="none" />
            {showDefeat && defeatingCard && <DefeatingCardAnim card={defeatingCard} absolute />}
          </View>
        </ReAnimated.View>
      </ReAnimated.View>
    </View>
  );
}
const aas = StyleSheet.create({
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, position: 'relative' as const },
  empty:        { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xl, color: T.bg.border },
  deckCol:      { position: 'absolute', left: 6, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', gap: 4 },
  deckWrap:     { position: 'relative' },
  badge:        { position: 'absolute', bottom: -4, right: -4, backgroundColor: T.bg.elevated, borderWidth: 1, borderColor: '#3a2a6a', borderRadius: 4, paddingHorizontal: 3, minWidth: 16, alignItems: 'center' },
  badgeText:    { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: '#9966ff', lineHeight: 14 },
  abilityBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: '#cc6dff44', backgroundColor: '#cc6dff11' },
  abilityText:  { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: '#cc6dff', letterSpacing: 0.5, textAlign: 'center' },
  cardGlow:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8, borderWidth: 2, borderColor: '#ff5722dd', backgroundColor: '#ff572220' },
  flashOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8, backgroundColor: T.status.danger },
});

// ── Player active section (tap deck to draw; hand cards drag-to-swap) ─────────
function PlayerActiveSection({ card, revealed, phase, deckCount, onDraw, canDraw,
  swapTargeted, hitKey, defeatingCard, playerAmp, onCardMeasure, onPreview }: {
  card: BattleCard | null; revealed: boolean; phase: BattlePhase;
  deckCount: number; onDraw: () => void; canDraw: boolean;
  swapTargeted: boolean;
  hitKey: number;
  defeatingCard: BattleCard | null;
  playerAmp: number;
  onCardMeasure: (b: Bounds) => void;
  onPreview: (c: BattleCard) => void;
}) {
  const cardSlotRef      = useRef<View>(null);
  const onCardMeasureRef = useRef(onCardMeasure);
  onCardMeasureRef.current = onCardMeasure;

  // ── Shake + flash on hit ─────────────────────────────────────────────────────
  const shakeX   = useSharedValue(0);
  const flashOp  = useSharedValue(0);
  useEffect(() => {
    if (hitKey === 0) return;
    shakeX.value = withSequence(
      withTiming( 6, { duration: 40 }), withTiming(-6, { duration: 40 }),
      withTiming( 4, { duration: 35 }), withTiming(-4, { duration: 35 }),
      withTiming( 0, { duration: 30 }),
    );
    flashOp.value = withSequence(withTiming(0.45, { duration: 50 }), withTiming(0, { duration: 260 }));
  }, [hitKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOp.value }));

  // ── Card entrance on new card ────────────────────────────────────────────────
  const entryScale = useSharedValue(1);
  const prevCardIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (card && card.id !== prevCardIdRef.current) {
      prevCardIdRef.current = card.id;
      entryScale.value = 0.7;
      entryScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    }
  }, [card?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const entryStyle = useAnimatedStyle(() => ({ transform: [{ scale: entryScale.value }] }));

  // ── Defeat overlay ───────────────────────────────────────────────────────────
  const [showDefeat, setShowDefeat] = useState(false);
  const lastDefeatRef = useRef<BattleCard | null>(null);
  useEffect(() => {
    if (defeatingCard && defeatingCard !== lastDefeatRef.current) {
      lastDefeatRef.current = defeatingCard;
      setShowDefeat(true);
      const t = setTimeout(() => setShowDefeat(false), 620);
      return () => clearTimeout(t);
    }
  }, [defeatingCard]);

  const deckSection = (
    <View style={aas.deckCol}>
      {deckCount > 0 ? (
        <TouchableOpacity onPress={onDraw} disabled={!canDraw} activeOpacity={canDraw ? 0.7 : 1}>
          <View style={aas.deckWrap}>
            <DeckPile w={DECK_W} h={DECK_H} count={deckCount} />
            <View style={[aas.badge, canDraw && pas.deckBadgeActive]}>
              <Text style={[aas.badgeText, canDraw && pas.deckCountActive]}>{deckCount}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={{ width: DECK_W, height: DECK_H }} />
      )}
    </View>
  );

  if (!card) {
    return (
      <View style={pas.row}>
        {deckSection}
        {/* Empty active slot — measured as the swap drop-zone for hand card drags */}
        <View
          ref={cardSlotRef}
          style={[pas.emptyActive, { width: ACTIVE_W, height: ACTIVE_H }, swapTargeted && pas.emptyActiveTargeted]}
          onLayout={() => cardSlotRef.current?.measureInWindow((x, y, w, h) => onCardMeasureRef.current({ x, y, w, h }))}
        >
          {showDefeat && defeatingCard
            ? <DefeatingCardAnim card={defeatingCard} />
            : <Text style={pas.emptyActiveHint}>drag card{'\n'}here</Text>
          }
        </View>
      </View>
    );
  }

  return (
    <View style={pas.row}>
      {deckSection}
      {/* Measure only the card slot — this is the precise swap drop-zone */}
      <View
        ref={cardSlotRef}
        style={[pas.cardSlot, swapTargeted && pas.cardSlotTargeted]}
        onLayout={() => cardSlotRef.current?.measureInWindow((x, y, w, h) => onCardMeasureRef.current({ x, y, w, h }))}
      >
        <ReAnimated.View style={shakeStyle}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => onPreview(card)}>
            <ReAnimated.View style={entryStyle}>
              <AmpParticleWrap ampPercent={playerAmp} ampColor="#00FFAA">
                <CardWrapper scale={ACTIVE_SCALE}>
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
              </AmpParticleWrap>
            </ReAnimated.View>
          </TouchableOpacity>
          <ReAnimated.View style={[flashStyle, pas.flashOverlay]} pointerEvents="none" />
        </ReAnimated.View>
      </View>
    </View>
  );
}
const pas = StyleSheet.create({
  row:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, position: 'relative' as const },
  deckBadgeActive:   { borderColor: T.accent.mint + '55' },
  deckCountActive:   { color: T.accent.mint },
  cardSlot:          { borderRadius: 8, borderWidth: 2, borderColor: 'transparent', padding: 2 },
  cardSlotTargeted:  { borderColor: T.accent.mint + 'cc', backgroundColor: T.accent.mint + '12' },
  emptyActive:       { borderRadius: 8, borderWidth: 1.5, borderColor: T.accent.mintMuted, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  emptyActiveTargeted:{ borderColor: T.accent.mint + 'cc', backgroundColor: T.accent.mint + '18' },
  emptyActiveHint:   { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.accent.mint + '66', letterSpacing: 0.5, textAlign: 'center', lineHeight: 11 },
  flashOverlay:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8, backgroundColor: T.status.danger },
});

// ── Top zone — AI face-down hand only (deck moved beside active card) ─────────
function AIZone({ handCount }: { handCount: number }) {
  return (
    <MaterialSurface material="brushedMetal" style={az.container} borderRadius={0}>
      {Array.from({ length: MAX_HAND }).map((_, i) => {
        const filled = i < handCount;
        return (
          <View key={i} style={{ marginLeft: i === 0 ? 0 : 3, zIndex: filled ? 1 : 0 }}>
            {filled ? <CardBack w={AI_HAND_W} h={AI_HAND_H} /> : <EmptySlot w={AI_HAND_W} h={AI_HAND_H} />}
          </View>
        );
      })}
    </MaterialSurface>
  );
}
const az = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 5 },
});

// ── Glow trail config ────────────────────────────────────────────────────────
const GHOST_COUNT = 4;
const GHOST_SPECS = [
  { size: 20, opacity: 0.4 },
  { size: 16, opacity: 0.3 },
  { size: 12, opacity: 0.2 },
  { size: 8,  opacity: 0.1 },
] as const;

// ── Hand card — drag onto active slot to swap (or tap to play when selecting) ──
function HandCard({ card, phase, onSelect, onSwap, index, total,
  playerActiveBoundsRef, onSwapHover, isReturned, playerKillCount, onPreview }: {
  card: BattleCard; phase: BattlePhase;
  onSelect: (id: number) => void; onSwap: (id: number) => void;
  index: number; total: number;
  playerActiveBoundsRef: React.MutableRefObject<Bounds | null>;
  onSwapHover: (h: boolean) => void;
  isReturned: boolean;
  playerKillCount: number;
  onPreview: (c: BattleCard) => void;
}) {
  const legendaryLock = card.rarity === 'Legendary' && playerKillCount < 3;
  const [dragging, setDragging] = useState(false);
  const dragX              = useRef(new Animated.Value(0)).current;
  const dragY              = useRef(new Animated.Value(0)).current;

  // ── Glow trail state ──────────────────────────────────────────────────────
  const ghostXs = useRef(Array.from({ length: GHOST_COUNT }, () => new Animated.Value(0))).current;
  const ghostYs = useRef(Array.from({ length: GHOST_COUNT }, () => new Animated.Value(0))).current;
  const ghostOpacities = useRef(Array.from({ length: GHOST_COUNT }, () => new Animated.Value(0))).current;
  // Circular position buffer — stores last GHOST_COUNT+1 positions so ghosts lag behind
  const posBuf = useRef<{ x: number; y: number }[]>(Array.from({ length: GHOST_COUNT + 1 }, () => ({ x: 0, y: 0 }))).current;
  const bufIdx = useRef(0);
  const isDragging = useRef(false);
  const phaseRef           = useRef(phase);
  const onSelectRef        = useRef(onSelect);
  const onSwapRef          = useRef(onSwap);
  const onSwapHoverRef     = useRef(onSwapHover);
  const cardIdRef          = useRef(card.id);
  const legendaryLockRef   = useRef(legendaryLock);
  // Stable local ref so the PanResponder closure (created once) always reads
  // the latest prop value rather than the stale first-render value.
  const playerBoundsRef = useRef(playerActiveBoundsRef);
  phaseRef.current         = phase;
  onSelectRef.current      = onSelect;
  onSwapRef.current        = onSwap;
  onSwapHoverRef.current   = onSwapHover;
  cardIdRef.current        = card.id;
  legendaryLockRef.current = legendaryLock;
  playerBoundsRef.current  = playerActiveBoundsRef;

  // ── Entrance animation on mount ──────────────────────────────────────────────
  const entryScale = useSharedValue(0.6);
  const entryY     = useSharedValue(isReturned ? -30 : 0);
  useEffect(() => {
    entryScale.value = withSpring(1, { damping: 14, stiffness: 200 });
    if (isReturned) entryY.value = withSpring(0, { damping: 14, stiffness: 200 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const entryStyle = useAnimatedStyle(() => ({
    transform: [{ scale: entryScale.value }, { translateY: entryY.value }],
  }));

  const rotate = dragX.interpolate({ inputRange: [-60, 60], outputRange: ['-10deg', '10deg'], extrapolate: 'clamp' });

  const fadeOutGhosts = () => {
    isDragging.current = false;
    ghostOpacities.forEach(op => {
      Animated.timing(op, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    });
  };

  const springBack = () => {
    fadeOutGhosts();
    Animated.parallel([
      Animated.spring(dragX, { toValue: 0, useNativeDriver: true, tension: 40, friction: 8 }),
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true, tension: 40, friction: 8 }),
    ]).start(() => setDragging(false));
  };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder:  (_, gs) => !legendaryLockRef.current && (phaseRef.current === 'ready' || phaseRef.current === 'selecting') && (Math.abs(gs.dx) > 3 || Math.abs(gs.dy) > 3),
    onPanResponderGrant: () => { setDragging(true); },
    onPanResponderMove: (_, gs) => {
      const cx = gs.dx * 0.7;
      const cy = gs.dy * 0.7;
      dragX.setValue(cx);
      dragY.setValue(cy);
      // ── Update glow trail ──────────────────────────────────────────────
      if (!isDragging.current) {
        isDragging.current = true;
        // Reset buffer on drag start
        for (let i = 0; i < posBuf.length; i++) { posBuf[i] = { x: cx, y: cy }; }
        bufIdx.current = 0;
      }
      // Push current position into circular buffer
      bufIdx.current = (bufIdx.current + 1) % posBuf.length;
      posBuf[bufIdx.current] = { x: cx, y: cy };
      // Assign ghost positions from buffer (oldest → newest lag)
      for (let g = 0; g < GHOST_COUNT; g++) {
        // Ghost 0 = most recent trailing pos, Ghost 3 = oldest
        const age = GHOST_COUNT - g; // 4,3,2,1
        const bi = (bufIdx.current - age + posBuf.length) % posBuf.length;
        ghostXs[g].setValue(posBuf[bi].x);
        ghostYs[g].setValue(posBuf[bi].y);
        ghostOpacities[g].setValue(GHOST_SPECS[g].opacity);
      }
      const p = phaseRef.current;
      if (p === 'ready' || p === 'selecting') {
        const bounds = playerBoundsRef.current?.current ?? null;
        onSwapHoverRef.current(isOver(bounds, gs.moveX, gs.moveY));
      }
    },
    onPanResponderRelease: (_, gs) => {
      const p          = phaseRef.current;
      const id         = cardIdRef.current;
      const locked     = legendaryLockRef.current;
      const bounds     = playerBoundsRef.current?.current ?? null;
      const overTarget = isOver(bounds, gs.moveX, gs.moveY);
      onSwapHoverRef.current(false);
      springBack();
      if (locked) return; // silently reject locked Legendary
      if (p === 'selecting' && overTarget)  setTimeout(() => onSelectRef.current(id), 50);
      else if (p === 'ready' && overTarget) setTimeout(() => onSwapRef.current(id),   80);
    },
    onPanResponderTerminate: () => { onSwapHoverRef.current(false); springBack(); },
  })).current;

  const color = RC[card.rarity]?.color ?? '#808898';
  const killsNeeded = 3 - playerKillCount;
  const trailColor = TYPE_COLORS[card.type] ?? '#00FFAA';

  return (
    <ReAnimated.View style={[entryStyle, { marginLeft: index === 0 ? 0 : HAND_OVERLAP, zIndex: dragging ? 100 : total - index }]}>
      {/* Glow trail ghosts — positioned relative to card origin, behind dragged card */}
      <View style={gt.container} pointerEvents="none">
        {ghostXs.map((_, g) => (
          <Animated.View
            key={g}
            style={[
              gt.ghost,
              {
                width: GHOST_SPECS[g].size,
                height: GHOST_SPECS[g].size,
                borderRadius: GHOST_SPECS[g].size / 2,
                backgroundColor: trailColor,
                shadowColor: trailColor,
                opacity: ghostOpacities[g],
                transform: [
                  { translateX: Animated.subtract(ghostXs[g], GHOST_SPECS[g].size / 2 - HAND_W / 2) },
                  { translateY: Animated.subtract(ghostYs[g], GHOST_SPECS[g].size / 2 - HAND_H / 2) },
                ],
              },
            ]}
          />
        ))}
      </View>
      <Animated.View
        style={{ transform: [{ translateX: dragX }, { translateY: dragY }, { rotate }] }}
        {...pan.panHandlers}
      >
        <TouchableOpacity activeOpacity={0.9} onPress={() => onPreview(card)}>
          <View style={hc.col}>
            <View style={[hc.frame, { borderColor: color + '33' }]}>
              <CardWrapper scale={HAND_SCALE}>
                <MiniCard
                  card={card}
                  currentHp={card.hp}
                  maxHp={card.maxHp}
                  currentStamina={card.stamina}
                  maxStamina={card.maxStamina}
                  hpPct={card.maxHp > 0 ? card.hp / card.maxHp : 1}
                />
              </CardWrapper>
              {legendaryLock && (
                <View style={hc.lockOverlay} pointerEvents="none">
                  <Text style={hc.lockText}>{killsNeeded} more{'\n'}kill{killsNeeded !== 1 ? 's' : ''}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </ReAnimated.View>
  );
}
const hc = StyleSheet.create({
  col:         { alignItems: 'flex-start' },
  frame:       { borderWidth: 1, borderRadius: 6, overflow: 'hidden' },
  lockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', borderRadius: 5 },
  lockText:    { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.domain.legendaryLock, textAlign: 'center', lineHeight: 10, letterSpacing: 0.3 },
});
// ── Glow trail styles ────────────────────────────────────────────────────────
const gt = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 },
  ghost:     { position: 'absolute', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6, elevation: 6 },
});

// ── Bottom zone — player hand only (deck moved beside active card) ────────────
function PlayerZone({ hand, phase, onSelect, onSwap, playerActiveBoundsRef, onSwapHover, swapOutCardId, playerKillCount, onPreview }: {
  hand: BattleCard[]; phase: BattlePhase;
  onSelect: (id: number) => void; onSwap: (id: number) => void;
  playerActiveBoundsRef: React.MutableRefObject<Bounds | null>;
  onSwapHover: (h: boolean) => void;
  swapOutCardId: number | null;
  playerKillCount: number;
  onPreview: (c: BattleCard) => void;
}) {
  return (
    <MaterialSurface material="brushedMetal" style={pz.container} borderRadius={0}>
      {Array.from({ length: MAX_HAND }).map((_, i) => {
        const card = hand[i];
        return card ? (
          <HandCard
            key={card.id} card={card} phase={phase}
            onSelect={onSelect} onSwap={onSwap}
            index={i} total={MAX_HAND}
            playerActiveBoundsRef={playerActiveBoundsRef}
            onSwapHover={onSwapHover}
            isReturned={card.id === swapOutCardId}
            playerKillCount={playerKillCount}
            onPreview={onPreview}
          />
        ) : (
          <View key={`empty-${i}`} style={{ marginLeft: i === 0 ? 0 : HAND_OVERLAP, zIndex: 0 }}>
            <EmptySlot w={HAND_W} h={HAND_H} />
          </View>
        );
      })}
    </MaterialSurface>
  );
}
const pz = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 10, zIndex: 5, overflow: 'visible' as const },
});

// ── Amp effect display constants (used by eventLine and AmpMeter) ─────────────
const AMP_EFFECT_COLORS: Record<AmpEffectName, string> = {
  Overcharge: '#ffa726', TypeFlip: '#9c27b0', Exhaustion: '#ef5350',
  FieldMedic: '#4caf50', LockOn: '#ffeb3b', Equaliser: T.accent.mint,
};
const AMP_EFFECT_LABELS: Record<AmpEffectName, string> = {
  Overcharge: 'OVERCHARGE', TypeFlip: 'TYPE FLIP', Exhaustion: 'EXHAUSTION',
  FieldMedic: 'FIELD MEDIC', LockOn: 'LOCK ON', Equaliser: 'EQUALISER',
};
const AMP_EFFECT_DESCRIPTIONS: Record<AmpEffectName, { duration: string; desc: string }> = {
  Overcharge:  { duration: '2 rounds', desc: 'Your active card deals double damage.' },
  TypeFlip:    { duration: '2 rounds', desc: 'Your type disadvantage becomes an advantage. No effect if neutral or already advantaged.' },
  Exhaustion:  { duration: '2 rounds', desc: "Opponent's active card pays double stamina for all attacks." },
  FieldMedic:  { duration: 'Instant',  desc: 'Restores 40% of your active card\'s max HP immediately.' },
  LockOn:      { duration: '3 rounds', desc: 'Opponent cannot swap or draw cards.' },
  Equaliser:   { duration: '2 rounds', desc: 'Both cards\' Power and Defense are averaged together.' },
};

// ── Amp effect info modal ─────────────────────────────────────────────────────
function AmpEffectInfoModal({ effect, onClose }: { effect: AmpEffectName; onClose: () => void }) {
  const color = AMP_EFFECT_COLORS[effect];
  const label = AMP_EFFECT_LABELS[effect];
  const info = AMP_EFFECT_DESCRIPTIONS[effect];

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={aei.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={aei.barWrap} onStartShouldSetResponder={() => true}>
          <View style={[aei.bar, { borderColor: color + '66' }]}>
            <View style={aei.header}>
              <Text style={[aei.title, { color }]}>{label}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={aei.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={aei.duration}>{info.duration}</Text>
            <Text style={aei.desc}>{info.desc}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
const aei = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
  },
  barWrap: {
    paddingHorizontal: 16,
  },
  bar: {
    backgroundColor: T.bg.elevated,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: T.font.xl,
    letterSpacing: 2,
  },
  close: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 20,
    color: T.text.muted,
  },
  duration: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: T.font.xs,
    color: T.text.muted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  desc: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: T.font.lg,
    color: T.text.body,
    lineHeight: 22,
  },
});


// ── Attack buttons ────────────────────────────────────────────────────────────
// ── Skewed gradient button ─────────────────────────────────────────────────────
const SKEW = '-6deg';
const COUNTER_SKEW = '6deg';
function SkewButton({ onPress, disabled, colors, borderColor, label, sub, opacity = 0.75 }: {
  onPress: () => void; disabled: boolean;
  colors: [string, string]; borderColor: string;
  label: string; sub?: string; opacity?: number;
}) {
  const disColors: [string, string] = [T.bg.surface, T.bg.elevated];
  return (
    <TouchableOpacity
      style={atb.btnOuter}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={opacity}
    >
      <LinearGradient
        colors={disabled ? disColors : colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[atb.btnGrad, { borderColor: disabled ? '#1a1a35' : borderColor }]}
      >
        <View style={atb.btnContent}>
          <Text style={[atb.label, disabled && atb.labelDis]}>{label}</Text>
          <Text style={[atb.sub, disabled && atb.subDis]}>{sub || ' '}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Staggered attack menu button ─────────────────────────────────────────────
function AttackMenuButton({ index, menuProgress, weight, label, cost, minSp, colors, border, stamina, ready, onAttack, setShowMenu }: {
  index: number; menuProgress: { value: number };
  weight: AttackWeight; label: string; cost: string; minSp: number;
  colors: [string, string]; border: string; stamina: number; ready: boolean;
  onAttack: (w: AttackWeight) => void; setShowMenu: (v: boolean) => void;
}) {
  const canUse = stamina >= minSp;
  const dis = !ready || !canUse;
  const stagger = index * 0.15;
  const animStyle = useAnimatedStyle(() => {
    const raw = menuProgress.value;
    const p = Math.max(0, Math.min(1, (raw - stagger) / (1 - stagger)));
    return {
      opacity: p,
      transform: [{ translateY: interpolate(p, [0, 1], [12, 0]) }],
    };
  });
  return (
    <ReAnimated.View style={[{ flex: 1 }, animStyle]}>
      <SkewButton
        onPress={() => { onAttack(weight); setShowMenu(false); }}
        disabled={dis}
        colors={colors}
        borderColor={border}
        label={label}
        sub={cost}
      />
    </ReAnimated.View>
  );
}

// ── Action bar — Rest (left) + Attack (right) with animated submenu ──────────
function ActionBar({ phase, stamina, onAttack, onRest, showMenu, setShowMenu }: {
  phase: BattlePhase; stamina: number;
  onAttack: (weight: AttackWeight) => void; onRest: () => void;
  showMenu: boolean; setShowMenu: (v: boolean) => void;
}) {
  const ready = phase === 'ready';
  const attacks: { weight: AttackWeight; label: string; cost: string; minSp: number; colors: [string, string]; border: string }[] = [
    { weight: 'light',  label: 'LIGHT',  cost: '−1 STA', minSp: 1, colors: ['#1a3a5a', '#0d2540'], border: T.accent.mint + '66' },
    { weight: 'medium', label: 'MEDIUM', cost: '−3 STA', minSp: 3, colors: ['#4a3000', '#2a1a00'], border: '#ffa72666' },
    { weight: 'heavy',  label: 'HEAVY',  cost: '−5 STA', minSp: 5, colors: ['#5a1520', '#3a0a10'], border: T.status.danger + '66' },
  ];

  // ── Animated menu progress (0 = closed, 1 = open) ─────────────────────────
  const menuProgress = useSharedValue(0);
  const attackScale = useSharedValue(1);

  useEffect(() => {
    if (showMenu) {
      menuProgress.value = withSpring(1, SPRING.snappy);
      attackScale.value = withSequence(
        withTiming(1.05, { duration: 100, easing: EASE.enter }),
        withSpring(1, SPRING.snappy),
      );
    } else {
      menuProgress.value = withTiming(0, { duration: TIMING.quick, easing: EASE.exit });
    }
  }, [showMenu]); // eslint-disable-line react-hooks/exhaustive-deps

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(menuProgress.value, [0, 1], [0, 0.6]),
  }));

  const menuRowStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(menuProgress.value, [0, 1], [50, 0]) },
      { scaleY: interpolate(menuProgress.value, [0, 1], [0.3, 1]) },
    ],
    opacity: menuProgress.value,
  }));

  const attackBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: attackScale.value }],
  }));

  return (
    <View style={atb.wrap}>
      {/* Dimming overlay */}
      <ReAnimated.View style={[atb.menuBackdrop, overlayStyle]} pointerEvents={showMenu ? 'auto' : 'none'}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowMenu(false)} />
      </ReAnimated.View>

      {/* Attack submenu — animated upward from button */}
      <ReAnimated.View style={[atb.menuRow, menuRowStyle]} pointerEvents={showMenu ? 'auto' : 'none'}>
        {attacks.map(({ weight, label, cost, minSp, colors, border }, i) => (
          <AttackMenuButton
            key={weight}
            index={i}
            menuProgress={menuProgress}
            weight={weight} label={label} cost={cost} minSp={minSp}
            colors={colors} border={border} stamina={stamina} ready={ready}
            onAttack={onAttack} setShowMenu={setShowMenu}
          />
        ))}
      </ReAnimated.View>

      {/* Main two-button bar */}
      <View style={atb.row}>
        <SkewButton
          onPress={() => { onRest(); setShowMenu(false); }}
          disabled={!ready}
          colors={['#1a4a2a', '#0a2a14']}
          borderColor={T.status.vitality + '66'}
          label="REST"
          sub="+5 STA"
        />
        <ReAnimated.View style={[{ flex: 1 }, attackBtnStyle]}>
          <SkewButton
            onPress={() => setShowMenu(!showMenu)}
            disabled={!ready || stamina < 1}
            colors={showMenu ? ['#6a1a28', '#4a0e18'] : ['#5a1520', '#3a0a10']}
            borderColor={showMenu ? T.status.danger + 'aa' : T.status.danger + '66'}
            label="ATTACK"
            sub={undefined}
          />
        </ReAnimated.View>
      </View>
    </View>
  );
}
const atb = StyleSheet.create({
  wrap:       { position: 'relative', zIndex: 10 },
  row:        { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 6, gap: 8, backgroundColor: T.bg.root },
  btnOuter:   { flex: 1 },
  btnGrad:    { borderWidth: 1.5, borderRadius: 4, paddingVertical: 10, alignItems: 'center', transform: [{ skewX: SKEW }], overflow: 'hidden' },
  btnContent: { transform: [{ skewX: COUNTER_SKEW }], alignItems: 'center' },
  label:      { fontFamily: 'Orbitron_900Black', fontSize: T.font.lg, letterSpacing: T.letterSpacing.lg, color: T.text.primary },
  labelDis:   { color: T.bg.border },
  sub:        { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, letterSpacing: 0.5, marginTop: 2, color: '#ffffffaa' },
  subDis:     { color: T.bg.border },
  // Submenu
  menuBackdrop: { position: 'absolute', top: -500, left: 0, right: 0, bottom: 0, zIndex: 1, backgroundColor: '#000000' },
  menuRow:    { position: 'absolute', bottom: '100%', left: 10, right: 10, flexDirection: 'row', gap: 6, paddingBottom: 6, zIndex: 2 },
});

// ── Result screen ─────────────────────────────────────────────────────────────
function ResultScreen({ winner, rewards, tierColor, tierName, onBack, levelUpInfo, onClearLevelUp }: {
  winner: 'player' | 'ai' | 'tie';
  rewards: { credits: number; xp: number; streakBonus: boolean } | null;
  tierColor: string; tierName: string; onBack: () => void;
  levelUpInfo: { oldLevel: number; newLevel: number } | null;
  onClearLevelUp: () => void;
}) {
  const outcomeText  = winner === 'player' ? 'VICTORY' : winner === 'tie' ? 'TIE' : 'DEFEAT';
  const outcomeColor = winner === 'player' ? T.status.vitality : winner === 'tie' ? T.domain.winStreak : T.status.danger;
  const isVictory = winner === 'player';

  // ── Panel entrance animation ────────────────────────────────────────────
  const panelY       = useSharedValue(300);
  const panelOpacity = useSharedValue(0);
  const titleScale   = useSharedValue(0);
  const reward1Op    = useSharedValue(0);
  const reward1X     = useSharedValue(30);
  const reward2Op    = useSharedValue(0);
  const reward2X     = useSharedValue(30);
  const reward3Op    = useSharedValue(0);
  const reward3X     = useSharedValue(30);
  const burstRef     = React.useRef<SuccessBurstHandle>(null);

  // ── Level-up overlay ────────────────────────────────────────────────────
  const [showLevelUp, setShowLevelUp] = React.useState(false);
  const luOverlay  = useSharedValue(0);
  const luScale    = useSharedValue(0);
  const luNumOp    = useSharedValue(0);
  const luBurstRef = React.useRef<SuccessBurstHandle>(null);

  React.useEffect(() => {
    // Panel slides up
    panelY.value = withSpring(0, { damping: 16, stiffness: 120 });
    panelOpacity.value = withTiming(1, { duration: 300 });
    // Title slam after 200ms
    titleScale.value = withDelay(200, withSequence(
      withTiming(1.3, { duration: MOTION.slam.duration * 0.6, easing: MOTION.slam.easing }),
      withTiming(1.0, { duration: MOTION.slam.duration * 0.4, easing: MOTION.slam.easing }),
    ));
    // Reward lines stagger
    if (rewards) {
      reward1Op.value = withDelay(500, withTiming(1, { duration: 200 }));
      reward1X.value  = withDelay(500, withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) }));
      reward2Op.value = withDelay(650, withTiming(1, { duration: 200 }));
      reward2X.value  = withDelay(650, withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) }));
      if (rewards.streakBonus) {
        reward3Op.value = withDelay(800, withTiming(1, { duration: 200 }));
        reward3X.value  = withDelay(800, withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) }));
      }
    }
    // Victory burst
    if (isVictory) {
      setTimeout(() => burstRef.current?.fire(), 300);
    }
    // Level-up overlay after 1.5s
    if (levelUpInfo) {
      setTimeout(() => {
        setShowLevelUp(true);
        luOverlay.value = withTiming(0.8, { duration: 300, easing: Easing.out(Easing.cubic) });
        luScale.value = withSequence(
          withTiming(1.3, { duration: MOTION.slam.duration * 0.6, easing: MOTION.slam.easing }),
          withTiming(1.0, { duration: MOTION.slam.duration * 0.4, easing: MOTION.slam.easing }),
        );
        luNumOp.value = withDelay(300, withTiming(1, { duration: 200 }));
        luBurstRef.current?.fire();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Auto-dismiss after 2.5s
        setTimeout(() => {
          luOverlay.value = withTiming(0, { duration: 300 });
          luScale.value = withTiming(0, { duration: 300 });
          luNumOp.value = withTiming(0, { duration: 200 });
          setTimeout(() => { setShowLevelUp(false); onClearLevelUp(); }, 300);
        }, 2500);
      }, 1500);
    }
  }, []);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: panelY.value }],
    opacity: panelOpacity.value,
  }));
  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
  }));
  const r1Style = useAnimatedStyle(() => ({ opacity: reward1Op.value, transform: [{ translateX: reward1X.value }] }));
  const r2Style = useAnimatedStyle(() => ({ opacity: reward2Op.value, transform: [{ translateX: reward2X.value }] }));
  const r3Style = useAnimatedStyle(() => ({ opacity: reward3Op.value, transform: [{ translateX: reward3X.value }] }));
  const luOverlayStyle = useAnimatedStyle(() => ({ opacity: luOverlay.value }));
  const luTextStyle = useAnimatedStyle(() => ({ transform: [{ scale: luScale.value }] }));
  const luNumStyle = useAnimatedStyle(() => ({ opacity: luNumOp.value }));

  return (
    <View style={rs.root}>
      {/* Victory burst behind panel */}
      {isVictory && <SuccessBurst ref={burstRef} color={T.accent.gold} particleCount={36} />}

      <ReAnimated.View style={[rs.panel, panelStyle]}>
        <ReAnimated.Text style={[rs.outcome, { color: outcomeColor }, titleStyle]}>{outcomeText}</ReAnimated.Text>
        {winner === 'tie' && <Text style={rs.tieNote}>Last Effort — both last cards fell simultaneously</Text>}
        <Text style={[rs.tier, { color: tierColor }]}>{tierName.toUpperCase()}</Text>
        {rewards && (
          <MaterialSurface material="brushedMetal" style={rs.rewardsBox}>
            <Text style={rs.rewardsTitle}>REWARDS</Text>
            <ReAnimated.Text style={[rs.rewardLine, r1Style]}>+{rewards.credits} Credits</ReAnimated.Text>
            <ReAnimated.Text style={[rs.rewardLine, r2Style]}>+{rewards.xp} XP</ReAnimated.Text>
            {rewards.streakBonus && <ReAnimated.Text style={[rs.streak, r3Style]}>WIN STREAK BONUS x2</ReAnimated.Text>}
          </MaterialSurface>
        )}
        <TouchableOpacity style={[rs.backBtn, { borderColor: tierColor + '88' }]} onPress={onBack} activeOpacity={0.8}>
          <Text style={[rs.backText, { color: tierColor }]}>BACK TO LOBBY</Text>
        </TouchableOpacity>
      </ReAnimated.View>

      {/* Level-up overlay */}
      {showLevelUp && levelUpInfo && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ReAnimated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, luOverlayStyle]} />
          <View style={rs.luCenter}>
            <SuccessBurst ref={luBurstRef} color={T.accent.violet} particleCount={36} />
            <ReAnimated.Text style={[rs.luTitle, luTextStyle]}>LEVEL UP</ReAnimated.Text>
            <ReAnimated.Text style={[rs.luNumber, luNumStyle]}>{levelUpInfo.newLevel}</ReAnimated.Text>
          </View>
        </View>
      )}
    </View>
  );
}
const rs = StyleSheet.create({
  root:         { flex: 1, backgroundColor: T.bg.root, alignItems: 'center', justifyContent: 'center' },
  panel:        { alignItems: 'center', gap: 16, paddingHorizontal: 32, width: '100%' },
  outcome:      { fontFamily: 'Orbitron_900Black', fontSize: T.font.xxl, letterSpacing: T.letterSpacing.xxl },
  tier:         { fontFamily: 'Orbitron_700Bold', fontSize: T.font.md, letterSpacing: T.letterSpacing.lg, marginBottom: 8 },
  rewardsBox:   { borderRadius: 14, padding: 20, width: '100%', alignItems: 'center', gap: 6 },
  rewardsTitle: { fontFamily: 'Orbitron_700Bold', fontSize: T.font.sm, color: T.text.muted, letterSpacing: T.letterSpacing.lg, marginBottom: 4 },
  rewardLine:   { fontFamily: 'Orbitron_900Black', fontSize: T.font.xl, color: T.accent.mint },
  streak:       { fontFamily: 'Orbitron_700Bold', fontSize: T.font.sm, color: T.domain.winStreak, letterSpacing: T.letterSpacing.md, marginTop: 4 },
  backBtn:      { paddingHorizontal: T.button.secondary.paddingH, paddingVertical: T.button.secondary.paddingV, borderRadius: T.button.secondary.radius, borderWidth: 1, marginTop: 8, transform: [{ skewX: '-3deg' }] },
  backText:     { fontFamily: T.button.secondary.fontFamily, fontSize: T.button.secondary.fontSize, letterSpacing: T.button.secondary.letterSpacing, transform: [{ skewX: '3deg' }] },
  tieNote:      { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.md, color: T.text.muted, textAlign: 'center', marginTop: -8 },
  luCenter:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  luTitle:      { fontFamily: 'Orbitron_900Black', fontSize: 36, color: T.accent.violet, letterSpacing: T.letterSpacing.xxl },
  luNumber:     { fontFamily: 'Orbitron_900Black', fontSize: 72, color: T.accent.gold, letterSpacing: T.letterSpacing.xl, marginTop: 8 },
});

// ── BattleScreen ──────────────────────────────────────────────────────────────
export default function BattleScreen({ navigation, route }: Props) {
  const { playerDeck, tier, resume } = route.params;
  const battle = useBattle(playerDeck, tier, resume);
  const gs = useGameStateContext();
  const { username } = useSession();
  const playerAvatar =
    AVATARS.find(a => a.id === gs.activeAvatar) ??
    LEVEL_AVATARS.find(a => a.id === gs.activeAvatar);

  // ── Card preview modal ───────────────────────────────────────────────────
  const [previewCard, setPreviewCard] = useState<BattleCard | null>(null);
  const onPreview = useCallback((c: BattleCard) => setPreviewCard(c), []);

  // ── Amp effect info modal ──────────────────────────────────────────────────
  const [showEffectInfo, setShowEffectInfo] = useState(false);

  // ── Attack submenu ──────────────────────────────────────────────────────
  const [showAttackMenu, setShowAttackMenu] = useState(false);
  // Close menu when phase leaves 'ready'
  useEffect(() => {
    if (battle.phase !== 'ready') setShowAttackMenu(false);
  }, [battle.phase]);

  // ── Drop-zone measurement (card-level, not section-level) ─────────────────
  const aiActiveBounds     = useRef<Bounds | null>(null);
  const playerActiveBounds = useRef<Bounds | null>(null);

  const onAiCardMeasure     = useCallback((b: Bounds) => { aiActiveBounds.current = b; }, []);
  const onPlayerCardMeasure = useCallback((b: Bounds) => { playerActiveBounds.current = b; }, []);

  // ── Hover state (drives visual indicators) ────────────────────────────────
  const [swapTargeted,   setSwapTargeted]   = useState(false);
  const swapTargetedRef   = useRef(false);

  const onSwapHover = useCallback((h: boolean) => {
    if (h !== swapTargetedRef.current) { swapTargetedRef.current = h; setSwapTargeted(h); }
  }, []);

  // ── Amp trigger burst signal ───────────────────────────────────────────────
  const [isAmpTriggered, setIsAmpTriggered] = useState(false);
  const prevAmpRef = useRef({ player: 0, ai: 0 });
  useEffect(() => {
    const wasMaxed = prevAmpRef.current.player >= 100 || prevAmpRef.current.ai >= 100;
    const nowMaxed = battle.playerAmp >= 100 || battle.aiAmp >= 100;
    if (!wasMaxed && nowMaxed) {
      setIsAmpTriggered(true);
      const t = setTimeout(() => setIsAmpTriggered(false), 800);
      prevAmpRef.current = { player: battle.playerAmp, ai: battle.aiAmp };
      return () => clearTimeout(t);
    }
    prevAmpRef.current = { player: battle.playerAmp, ai: battle.aiAmp };
  }, [battle.playerAmp, battle.aiAmp]);

  const handleAmpReroll  = useCallback(() => battle.spendAmp(),   [battle]);
  const handleAmpTrigger = useCallback(() => battle.triggerAmp(), [battle]);

  if (battle.phase === 'done' && battle.winner) {
    return (
      <ResultScreen
        winner={battle.winner} rewards={battle.rewards}
        tierColor={battle.tierColor} tierName={battle.tierName}
        onBack={() => navigation.goBack()}
        levelUpInfo={gs.levelUpInfo}
        onClearLevelUp={gs.clearLevelUp}
      />
    );
  }

  const tc = battle.tierColor;

  // No footer needed — the empty active slot in PlayerActiveSection guides the user


  return (
    <ScreenBackground theme="battle">

      {/* Header */}
      <MaterialSurface material="brushedMetal" style={s.header} borderRadius={0}>
        {/* Player side */}
        <View style={s.headerSide}>
          <View style={[s.avatarCircle, { borderColor: playerAvatar?.color ?? T.accent.mint }]}>
            <Text style={[s.avatarSymbol, { color: playerAvatar?.color ?? T.accent.mint }]}>
              {playerAvatar?.symbol ?? 'θ'}
            </Text>
          </View>
          <Text style={s.playerName} numberOfLines={1}>{username || 'YOU'}</Text>
        </View>

        {/* Center — round + forfeit */}
        <View style={s.headerCenter}>
          <Text style={s.roundNum}>ROUND</Text>
          <Text style={[s.roundBig, { color: tc }]}>{battle.round}</Text>
          <TouchableOpacity onPress={() => { battle.forfeit(); navigation.goBack(); }} style={s.forfeitBtn} activeOpacity={0.7}>
            <Text style={s.forfeitText}>FORFEIT</Text>
          </TouchableOpacity>
        </View>

        {/* AI side */}
        <View style={[s.headerSide, { alignItems: 'flex-end' }]}>
          <View style={[s.avatarCircle, { borderColor: tc }]}>
            <Text style={[s.avatarSymbol, { color: tc }]}>{battle.tierSymbol}</Text>
          </View>
          <Text style={[s.playerName, { color: tc }]} numberOfLines={1}>{battle.tierName.toUpperCase()}</Text>
        </View>
      </MaterialSurface>

      {/* AI zone — face-down hand only */}
      <AIZone handCount={battle.aiHandCount} />

      {/* Combat zone */}
      <View style={s.combatZone}>
        <View style={s.cardColumn}>
          <View style={s.cardSection}>
            <AIActiveSection
              card={battle.aiActive} revealed={battle.typeRevealed}
              deckCount={battle.aiDeckCount} targeted={false}
              hitKey={battle.aiHitKey}
              attackKey={battle.aiAttackKey}
              defeatingCard={battle.lastDefeatedAiCard}
              aiAmp={battle.aiAmp}
              onCardMeasure={onAiCardMeasure}
              onPreview={onPreview}
            />
          </View>

          <View style={s.cardSection}>
            <PlayerActiveSection
              card={battle.playerActive}
              revealed={battle.typeRevealed}
              phase={battle.phase}
              deckCount={battle.playerDeckCount}
              onDraw={battle.draw}
              canDraw={battle.canDraw}
              swapTargeted={swapTargeted}
              hitKey={battle.playerHitKey}
              defeatingCard={battle.lastDefeatedPlayerCard}
              playerAmp={battle.playerAmp}
              onCardMeasure={onPlayerCardMeasure}
              onPreview={onPreview}
            />
          </View>
        </View>

        <View style={s.ampOverlay}>
          <AmpEffectLabel
            effectName={AMP_EFFECT_LABELS[battle.ampActiveEffect ?? battle.ampPoolEffect]}
            playerAmp={battle.playerAmp}
            aiAmp={battle.aiAmp}
            isTriggered={isAmpTriggered}
            onReroll={handleAmpReroll}
            onTrigger={handleAmpTrigger}
            canInteract={battle.phase === 'ready'}
            onEffectPress={() => setShowEffectInfo(true)}
          />
        </View>
      </View>

      {/* Player zone — face-up hand (above action bar) */}
      <PlayerZone
        hand={battle.playerHand}
        phase={battle.phase}
        onSelect={battle.selectCard}
        onSwap={battle.swapCard}
        playerActiveBoundsRef={playerActiveBounds}
        onSwapHover={onSwapHover}
        swapOutCardId={battle.swapOutCardId}
        playerKillCount={battle.playerKillCount}
        onPreview={onPreview}
      />

      {/* Action bar — Rest + Attack */}
      <ActionBar
        phase={battle.phase}
        stamina={battle.playerActive?.stamina ?? 0}
        onAttack={battle.attack}
        onRest={battle.rest}
        showMenu={showAttackMenu}
        setShowMenu={setShowAttackMenu}
      />

      {/* Card preview modal */}
      {previewCard && (
        <CardPreviewModal card={previewCard} onClose={() => setPreviewCard(null)} />
      )}

      {/* Amp effect info modal */}
      {showEffectInfo && (
        <AmpEffectInfoModal
          effect={battle.ampActiveEffect ?? battle.ampPoolEffect}
          onClose={() => setShowEffectInfo(false)}
        />
      )}

    </ScreenBackground>
  );
}

const s = StyleSheet.create({

  header:       { paddingTop: Platform.OS === 'ios' ? 52 : 12, paddingHorizontal: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSide:   { flex: 1, alignItems: 'flex-start', gap: 2 },
  avatarCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg.surface },
  avatarSymbol: { fontSize: T.font.lg, fontWeight: '700' },
  playerName:   { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.text.body, letterSpacing: T.letterSpacing.md },
  headerCenter: { alignItems: 'center', paddingHorizontal: 8 },
  roundNum:     { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.text.primary, letterSpacing: T.letterSpacing.lg },
  roundBig:     { fontFamily: 'Orbitron_900Black', fontSize: T.font.xl, letterSpacing: T.letterSpacing.md, marginTop: -2 },
  forfeitBtn:   { marginTop: 4, paddingHorizontal: T.button.secondary.paddingH, paddingVertical: T.button.secondary.paddingV, borderRadius: T.button.secondary.radius, borderWidth: 1, borderColor: T.status.danger + '66', backgroundColor: T.status.danger + '18', transform: [{ skewX: '-3deg' }] },
  forfeitText:  { fontFamily: T.button.secondary.fontFamily, fontSize: T.button.secondary.fontSize, color: T.button.secondary.text, letterSpacing: T.button.secondary.letterSpacing, transform: [{ skewX: '3deg' }] },

  combatZone: { flex: 1, flexDirection: 'row', paddingVertical: 6, position: 'relative' as const },
  cardColumn: { flex: 1 },
  ampOverlay: { position: 'absolute' as const, right: 6, top: 6, bottom: 6 },
  cardSection:{ flex: 1, justifyContent: 'center' },
  vsText:     { fontFamily: 'Orbitron_900Black', fontSize: T.font.sm, color: T.accent.mintMuted, letterSpacing: T.letterSpacing.xxl, paddingHorizontal: 10 },

});
