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
import { Canvas, Path as SkPath, Skia } from '@shopify/react-native-skia';
import ReAnimated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, withSpring, Easing,
} from 'react-native-reanimated';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BattleStackParamList } from '../../App';
import { useBattle, BattlePhase } from '../hooks/useBattle';
import { BattleEvent, BattleCard, AttackWeight, AmpEffectName } from '../battle/battleEngine';
import { RC } from '../data/constants';
import { AVATARS, LEVEL_AVATARS } from '../data/packs';
import { useGameStateContext } from '../context/GameStateContext';
import { useSession } from '../context/SessionContext';
import { CardWrapper, CARD_W, CARD_H } from '../components/CardWrapper';
import { MiniCard } from '../components/MiniCard';
import { HeroCard } from '../components/HeroCard';
import { MaterialSurface } from '../components/MaterialSurface';
import { ScreenBackground } from '../components/ScreenBackground';
import { T } from '../theme/theme';

type Props = NativeStackScreenProps<BattleStackParamList, 'Battle'>;

const ACTIVE_SCALE = 0.40;
const HAND_SCALE   = 0.20;
const HAND_OVERLAP = 0;

const DECK_SCALE = 0.22;

const ACTIVE_W = Math.round(CARD_W * ACTIVE_SCALE);
const ACTIVE_H = Math.round(CARD_H * ACTIVE_SCALE);
const HAND_W   = Math.round(CARD_W * HAND_SCALE);
const HAND_H   = Math.round(CARD_H * HAND_SCALE);
const DECK_W   = Math.round(CARD_W * DECK_SCALE);
const DECK_H   = Math.round(CARD_H * DECK_SCALE);

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
  slot: { borderWidth: 1, borderColor: '#ffffff33', borderStyle: 'dashed' },
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
function AIActiveSection({ card, revealed, deckCount, targeted, hitKey, attackKey, defeatingCard, onCardMeasure, onPreview, amp }: {
  card: BattleCard | null; revealed: boolean; deckCount: number;
  targeted: boolean; hitKey: number; attackKey: number; defeatingCard: BattleCard | null;
  onCardMeasure: (b: Bounds) => void;
  onPreview: (c: BattleCard) => void;
  amp: number;
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
      <AmpBar amp={amp} baseColor={T.status.danger} side="ai" />
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
                <CardWrapper scale={ACTIVE_SCALE}>
                  <HeroCard
                    card={card}
                    showShine={card.rarity === 'Legendary' || card.rarity === 'Epic'}
                    currentHp={card.hp}
                    maxHp={card.maxHp}
                    currentStamina={card.stamina}
                    isActive
                    hpPct={card.maxHp > 0 ? card.hp / card.maxHp : 1}
                  />
                </CardWrapper>
              </ReAnimated.View>
            </TouchableOpacity>
            <ReAnimated.View style={[flashStyle, aas.flashOverlay]} pointerEvents="none" />
            {showDefeat && defeatingCard && <DefeatingCardAnim card={defeatingCard} absolute />}
          </View>
        </ReAnimated.View>
      </ReAnimated.View>
      <View style={{ width: HP_GAP }} />
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
    </View>
  );
}
const aas = StyleSheet.create({
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  empty:        { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xl, color: T.bg.border },
  deckCol:      { alignItems: 'center', gap: 4 },
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
  swapTargeted, hitKey, defeatingCard, onCardMeasure, onPreview,
  amp, canTrigger, canSpend, onTrigger, onSpend }: {
  card: BattleCard | null; revealed: boolean; phase: BattlePhase;
  deckCount: number; onDraw: () => void; canDraw: boolean;
  swapTargeted: boolean;
  hitKey: number;
  defeatingCard: BattleCard | null;
  onCardMeasure: (b: Bounds) => void;
  onPreview: (c: BattleCard) => void;
  amp: number;
  canTrigger: boolean; canSpend: boolean;
  onTrigger: () => void; onSpend: () => void;
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
        <AmpBar amp={amp} baseColor={T.accent.mint} side="player" canTrigger={canTrigger} canSpend={canSpend} onTrigger={onTrigger} onSpend={onSpend} />
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
        <View style={{ width: HP_GAP }} />
        {deckSection}
      </View>
    );
  }

  return (
    <View style={pas.row}>
      <AmpBar amp={amp} baseColor={T.accent.mint} side="player" canTrigger={canTrigger} canSpend={canSpend} onTrigger={onTrigger} onSpend={onSpend} />
      {/* Measure only the card slot — this is the precise swap drop-zone */}
      <View
        ref={cardSlotRef}
        style={[pas.cardSlot, swapTargeted && pas.cardSlotTargeted]}
        onLayout={() => cardSlotRef.current?.measureInWindow((x, y, w, h) => onCardMeasureRef.current({ x, y, w, h }))}
      >
        <ReAnimated.View style={shakeStyle}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => onPreview(card)}>
            <ReAnimated.View style={entryStyle}>
              <CardWrapper scale={ACTIVE_SCALE}>
                <HeroCard
                  card={card}
                  showShine={card.rarity === 'Legendary' || card.rarity === 'Epic'}
                  currentHp={card.hp}
                  maxHp={card.maxHp}
                  currentStamina={card.stamina}
                  isActive
                  hpPct={card.maxHp > 0 ? card.hp / card.maxHp : 1}
                />
              </CardWrapper>
            </ReAnimated.View>
          </TouchableOpacity>
          <ReAnimated.View style={[flashStyle, pas.flashOverlay]} pointerEvents="none" />
        </ReAnimated.View>
      </View>

      <View style={{ width: HP_GAP }} />
      {deckSection}
    </View>
  );
}
const pas = StyleSheet.create({
  row:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
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
          <View key={i} style={{ marginLeft: i === 0 ? 0 : 4, zIndex: filled ? 1 : 0 }}>
            {filled ? <CardBack w={HAND_W} h={HAND_H} /> : <EmptySlot w={HAND_W} h={HAND_H} />}
          </View>
        );
      })}
    </MaterialSurface>
  );
}
const az = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8 },
});

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
  const dragX              = useRef(new Animated.Value(0)).current;
  const dragY              = useRef(new Animated.Value(0)).current;
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

  const springBack = () => Animated.parallel([
    Animated.spring(dragX, { toValue: 0, useNativeDriver: true, tension: 40, friction: 8 }),
    Animated.spring(dragY, { toValue: 0, useNativeDriver: true, tension: 40, friction: 8 }),
  ]).start();

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder:  (_, gs) => !legendaryLockRef.current && (phaseRef.current === 'ready' || phaseRef.current === 'selecting') && (Math.abs(gs.dx) > 3 || Math.abs(gs.dy) > 3),
    onPanResponderMove: (_, gs) => {
      dragX.setValue(gs.dx * 0.7);
      dragY.setValue(gs.dy * 0.7);
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

  return (
    <ReAnimated.View style={[entryStyle, { marginLeft: index === 0 ? 0 : 4, zIndex: total - index }]}>
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
          <View key={`empty-${i}`} style={{ marginLeft: i === 0 ? 0 : 4, zIndex: 0 }}>
            <EmptySlot w={HAND_W} h={HAND_H} />
          </View>
        );
      })}
    </MaterialSurface>
  );
}
const pz = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8 },
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

// ── Event log (compact) ───────────────────────────────────────────────────────
function eventLine(ev: BattleEvent, idx: number): React.ReactNode {
  switch (ev.type) {
    case 'ATTACK':
      if (ev.missed) return <Text key={idx} style={evs.miss}>{ev.attacker} missed!</Text>;
      const mult = ev.typeMultiplier;
      const adv  = mult >= 2.0 ? ' (adv)' : mult <= 0.5 ? ' (weak)' : '';
      return <Text key={idx} style={[evs.base, { color: ev.attackerSide === 'player' ? T.accent.mint : T.status.danger }]}>{ev.attacker} → {ev.defender}: {ev.damage}{adv}</Text>;
    case 'ABILITY':   return <Text key={idx} style={evs.ability}>{ev.ability}: {ev.effect}</Text>;
    case 'DEFEAT':    return <Text key={idx} style={evs.defeat}>{ev.card} defeated</Text>;
    case 'CARD_ENTER':return <Text key={idx} style={evs.enter}>{ev.side === 'player' ? 'Your' : 'AI'} {ev.card} enters</Text>;
    case 'AI_SWAP':   return <Text key={idx} style={evs.swap}>AI swaps to {ev.card}</Text>;
    case 'PLAYER_SWAP':return <Text key={idx} style={evs.swap}>You swap in {ev.card}</Text>;
    case 'PLAYER_DRAW':return <Text key={idx} style={evs.draw}>You draw {ev.card}</Text>;
    case 'FORCED_DRAW':return <Text key={idx} style={evs.draw}>{ev.side === 'player' ? 'You draw' : 'AI draws'} {ev.card}</Text>;
    case 'BATTLE_START':return <Text key={idx} style={evs.start}>{ev.playerActive.name} vs {ev.aiActive.name}</Text>;
    case 'AMP_TRIGGER': {
      const lbl = AMP_EFFECT_LABELS[ev.effect];
      const who = ev.side === 'player' ? 'You' : 'AI';
      const detail = ev.healAmount ? ` (+${ev.healAmount} HP)` : '';
      return <Text key={idx} style={evs.amp}>{who} triggers {lbl}{detail}</Text>;
    }
    case 'AMP_SPEND':   return <Text key={idx} style={evs.amp}>{ev.side === 'player' ? 'You' : 'AI'} switches effect → {AMP_EFFECT_LABELS[ev.newEffect]}</Text>;
    case 'AMP_EFFECT_END': return <Text key={idx} style={evs.ampEnd}>{AMP_EFFECT_LABELS[ev.effect]} fades</Text>;
    case 'AMP_BLOCKED': return <Text key={idx} style={evs.ampEnd}>Lock On: {ev.side === 'player' ? 'Your' : 'AI'} {ev.action} blocked</Text>;
    default: return null;
  }
}
const evs = StyleSheet.create({
  base:    { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.md, lineHeight: 16 },
  miss:    { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.md, color: T.text.muted, lineHeight: 16 },
  ability: { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.sm, color: '#cc6dff', lineHeight: 15 },
  defeat:  { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.md, color: '#ff4060', lineHeight: 16 },
  enter:   { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.md, color: T.status.vitality, lineHeight: 16 },
  swap:    { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.md, color: '#ffeb3b', lineHeight: 16 },
  draw:    { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.sm, color: T.text.muted, lineHeight: 15 },
  start:   { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.md, color: T.accent.mint, lineHeight: 16 },
  amp:     { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.md, color: T.domain.winStreak, lineHeight: 16 },
  ampEnd:  { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.sm, color: T.text.muted, lineHeight: 15 },
});

// ── Amp meter ─────────────────────────────────────────────────────────────────
// ── Arch amp bar — ∩ shape drawn with Skia path trimming ──────────────────────
const AMP_ARCH_W      = 58;  // canvas width
const AMP_ARCH_H      = 48;  // canvas height
const AMP_STROKE      = 5;
const AMP_LEG_H       = 18;  // how far the legs extend below the curve
// Build the ∩ path: starts bottom-left, goes up, arcs across the top, comes down right
function makeArchPath() {
  const p    = Skia.Path.Make();
  const pad  = AMP_STROKE / 2 + 1;
  const legB = AMP_ARCH_H - 1;           // bottom of legs
  const legT = AMP_ARCH_H - AMP_LEG_H;   // where the curve starts
  const cx   = AMP_ARCH_W / 2;
  const rx   = cx - pad;                  // horizontal radius
  const ry   = legT - pad;               // vertical radius (top of curve to pad)
  // Start at bottom-left leg
  p.moveTo(pad, legB);
  p.lineTo(pad, legT);
  // Arc across the top (semi-ellipse)
  p.cubicTo(pad, pad, AMP_ARCH_W - pad, pad, AMP_ARCH_W - pad, legT);
  // Down to bottom-right leg
  p.lineTo(AMP_ARCH_W - pad, legB);
  return p;
}
const archTrackPath = makeArchPath();

function AmpBar({ amp, baseColor, side, canTrigger, canSpend, onTrigger, onSpend }: {
  amp: number; baseColor: string; side: 'player' | 'ai';
  canTrigger?: boolean; canSpend?: boolean;
  onTrigger?: () => void; onSpend?: () => void;
}) {
  const pct   = Math.min(1, amp / 100);
  const color = pct >= 1 ? T.status.caution : baseColor;
  return (
    <View style={ab.wrap}>
      <Canvas style={{ width: AMP_ARCH_W, height: AMP_ARCH_H }}>
        {/* Background track */}
        <SkPath
          path={archTrackPath}
          color="#1a1a35"
          style="stroke"
          strokeWidth={AMP_STROKE}
          strokeCap="round"
        />
        {/* Fill — trims along the path from start */}
        {pct > 0 && (
          <SkPath
            path={archTrackPath}
            color={color}
            style="stroke"
            strokeWidth={AMP_STROKE}
            strokeCap="round"
            start={0}
            end={pct}
          />
        )}
      </Canvas>
      {/* Number underneath the curve */}
      <Text style={[ab.pct, { color }]}>{amp}</Text>
      {side === 'player' && canTrigger && onTrigger && (
        <TouchableOpacity style={[ab.ampBtn, { borderColor: T.status.caution + '88', backgroundColor: T.status.caution + '20' }]} onPress={onTrigger} activeOpacity={0.75}>
          <Text style={[ab.ampBtnText, { color: T.status.caution }]}>TRIGGER</Text>
        </TouchableOpacity>
      )}
      {side === 'player' && canSpend && !canTrigger && onSpend && (
        <TouchableOpacity style={[ab.ampBtn, { borderColor: T.accent.mint + '66', backgroundColor: T.accent.mint + '14' }]} onPress={onSpend} activeOpacity={0.75}>
          <Text style={ab.ampBtnText}>SPEND</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const ab = StyleSheet.create({
  wrap:       { position: 'absolute', left: 4, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  pct:        { fontFamily: 'Orbitron_900Black', fontSize: T.font.lg, marginTop: -4 },
  ampBtn:     { marginTop: 2, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  ampBtnText: { fontFamily: 'Orbitron_900Black', fontSize: T.font.xs, color: T.accent.mint, letterSpacing: 0.3 },
});

// ── Shared amp effect banner — displayed in VS row ────────────────────────────
function AmpEffectBanner({ poolEffect, activeEffect, roundsLeft, triggeredBy }: {
  poolEffect: AmpEffectName; activeEffect: AmpEffectName | null;
  roundsLeft: number; triggeredBy: 'player' | 'ai' | null;
}) {
  const effectColor = AMP_EFFECT_COLORS[activeEffect ?? poolEffect];
  const effectLabel = AMP_EFFECT_LABELS[activeEffect ?? poolEffect];
  const effectActive = !!activeEffect && roundsLeft > 0;
  return (
    <View style={[aeb.badge, { borderColor: effectColor + '66', backgroundColor: effectColor + '18' }]}>
      <Text style={[aeb.label, { color: effectColor }]}>{effectLabel}</Text>
      {effectActive && (
        <Text style={[aeb.rounds, { color: effectColor }]}>{roundsLeft}r {triggeredBy === 'player' ? '(YOU)' : '(AI)'}</Text>
      )}
    </View>
  );
}
const aeb = StyleSheet.create({
  badge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  label:  { fontFamily: 'Orbitron_900Black', fontSize: T.font.xs, letterSpacing: 0.5 },
  rounds: { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs },
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
          {sub ? <Text style={[atb.sub, disabled && atb.subDis]}>{sub}</Text> : null}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Action bar — Rest (left) + Attack (right) with popup submenu ──────────────
function ActionBar({ phase, stamina, onAttack, onRest, showMenu, setShowMenu }: {
  phase: BattlePhase; stamina: number;
  onAttack: (weight: AttackWeight) => void; onRest: () => void;
  showMenu: boolean; setShowMenu: (v: boolean) => void;
}) {
  const ready = phase === 'ready';
  const attacks: { weight: AttackWeight; label: string; cost: string; mult: string; minSp: number; colors: [string, string]; border: string }[] = [
    { weight: 'light',  label: 'LIGHT',  cost: '−1 SP', mult: '×0.8', minSp: 1, colors: ['#1a3a5a', '#0d2540'], border: T.accent.mint + '66' },
    { weight: 'medium', label: 'MEDIUM', cost: '−3 SP', mult: '×1.0', minSp: 3, colors: ['#4a3000', '#2a1a00'], border: '#ffa72666' },
    { weight: 'heavy',  label: 'HEAVY',  cost: '−5 SP', mult: '×1.5', minSp: 5, colors: ['#5a1520', '#3a0a10'], border: T.status.danger + '66' },
  ];
  return (
    <View style={atb.wrap}>
      {/* Attack submenu — floats above the bar */}
      {showMenu && (
        <>
          <TouchableOpacity style={atb.menuBackdrop} activeOpacity={1} onPress={() => setShowMenu(false)} />
          <View style={atb.menuRow}>
            {attacks.map(({ weight, label, cost, mult, minSp, colors, border }) => {
              const canUse = stamina >= minSp;
              const dis = !ready || !canUse;
              return (
                <SkewButton
                  key={weight}
                  onPress={() => { onAttack(weight); setShowMenu(false); }}
                  disabled={dis}
                  colors={colors}
                  borderColor={border}
                  label={label}
                  sub={`${cost}  ${mult}`}
                />
              );
            })}
          </View>
        </>
      )}

      {/* Main two-button bar */}
      <View style={atb.row}>
        <SkewButton
          onPress={() => { onRest(); setShowMenu(false); }}
          disabled={!ready}
          colors={['#1a4a2a', '#0a2a14']}
          borderColor={T.status.vitality + '66'}
          label="REST"
          sub="+5 SP"
        />
        <SkewButton
          onPress={() => setShowMenu(!showMenu)}
          disabled={!ready}
          colors={showMenu ? ['#6a1a28', '#4a0e18'] : ['#5a1520', '#3a0a10']}
          borderColor={showMenu ? T.status.danger + 'aa' : T.status.danger + '66'}
          label="ATTACK"
          sub={`${stamina} SP`}
        />
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
  menuBackdrop: { position: 'absolute', top: -500, left: 0, right: 0, bottom: 0, zIndex: 1 },
  menuRow:    { position: 'absolute', bottom: '100%', left: 10, right: 10, flexDirection: 'row', gap: 6, paddingBottom: 6, zIndex: 2 },
});

// ── Result screen ─────────────────────────────────────────────────────────────
function ResultScreen({ winner, rewards, tierColor, tierName, onBack }: {
  winner: 'player' | 'ai' | 'tie';
  rewards: { credits: number; xp: number; streakBonus: boolean } | null;
  tierColor: string; tierName: string; onBack: () => void;
}) {
  const outcomeText  = winner === 'player' ? 'VICTORY' : winner === 'tie' ? 'TIE' : 'DEFEAT';
  const outcomeColor = winner === 'player' ? T.status.vitality : winner === 'tie' ? T.domain.winStreak : T.status.danger;
  return (
    <View style={rs.root}>
      <Text style={[rs.outcome, { color: outcomeColor }]}>{outcomeText}</Text>
      {winner === 'tie' && <Text style={rs.tieNote}>Last Effort — both last cards fell simultaneously</Text>}
      <Text style={[rs.tier, { color: tierColor }]}>{tierName.toUpperCase()}</Text>
      {rewards && (
        <MaterialSurface material="brushedMetal" style={rs.rewardsBox}>
          <Text style={rs.rewardsTitle}>REWARDS</Text>
          <Text style={rs.rewardLine}>+{rewards.credits} Credits</Text>
          <Text style={rs.rewardLine}>+{rewards.xp} XP</Text>
          {rewards.streakBonus && <Text style={rs.streak}>WIN STREAK BONUS x2</Text>}
        </MaterialSurface>
      )}
      <TouchableOpacity style={[rs.backBtn, { borderColor: tierColor + '88' }]} onPress={onBack} activeOpacity={0.8}>
        <Text style={[rs.backText, { color: tierColor }]}>BACK TO LOBBY</Text>
      </TouchableOpacity>
    </View>
  );
}
const rs = StyleSheet.create({
  root:         { flex: 1, backgroundColor: T.bg.root, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  outcome:      { fontFamily: 'Orbitron_900Black', fontSize: T.font.xxl, letterSpacing: T.letterSpacing.xxl },
  tier:         { fontFamily: 'Orbitron_700Bold', fontSize: T.font.md, letterSpacing: T.letterSpacing.lg, marginBottom: 8 },
  rewardsBox:   { borderRadius: 14, padding: 20, width: '100%', alignItems: 'center', gap: 6 },
  rewardsTitle: { fontFamily: 'Orbitron_700Bold', fontSize: T.font.sm, color: T.text.muted, letterSpacing: T.letterSpacing.lg, marginBottom: 4 },
  rewardLine:   { fontFamily: 'Orbitron_900Black', fontSize: T.font.xl, color: T.accent.mint },
  streak:       { fontFamily: 'Orbitron_700Bold', fontSize: T.font.sm, color: T.domain.winStreak, letterSpacing: T.letterSpacing.md, marginTop: 4 },
  backBtn:      { paddingHorizontal: T.button.secondary.paddingH, paddingVertical: T.button.secondary.paddingV, borderRadius: T.button.secondary.radius, borderWidth: 1, marginTop: 8 },
  backText:     { fontFamily: T.button.secondary.fontFamily, fontSize: T.button.secondary.fontSize, letterSpacing: T.button.secondary.letterSpacing },
  tieNote:      { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.md, color: T.text.muted, textAlign: 'center', marginTop: -8 },
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

  if (battle.phase === 'done' && battle.winner) {
    return (
      <ResultScreen
        winner={battle.winner} rewards={battle.rewards}
        tierColor={battle.tierColor} tierName={battle.tierName}
        onBack={() => navigation.goBack()}
      />
    );
  }

  const tc = battle.tierColor;

  // No footer needed — the empty active slot in PlayerActiveSection guides the user

  const visibleEvents = battle.lastEvents
    .filter(e => e.type !== 'ROUND_START' && e.type !== 'BATTLE_START')
    .slice(-3);

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
        <View style={s.cardSection}>
          <AIActiveSection
            card={battle.aiActive} revealed={battle.typeRevealed}
            deckCount={battle.aiDeckCount} targeted={false}
            hitKey={battle.aiHitKey}
            attackKey={battle.aiAttackKey}
            defeatingCard={battle.lastDefeatedAiCard}
            onCardMeasure={onAiCardMeasure}
            onPreview={onPreview}
            amp={battle.aiAmp}
          />
        </View>

        <View style={s.vsRow}>
          <View style={s.vsDivider} />
          <AmpEffectBanner
            poolEffect={battle.ampPoolEffect}
            activeEffect={battle.ampActiveEffect}
            roundsLeft={battle.ampRoundsLeft}
            triggeredBy={battle.ampTriggeredBy}
          />
          <View style={s.vsDivider} />
        </View>

        {visibleEvents.length > 0 && (
          <View style={s.logBox}>
            {visibleEvents.map((ev, i) => eventLine(ev, i))}
          </View>
        )}

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
            onCardMeasure={onPlayerCardMeasure}
            onPreview={onPreview}
            amp={battle.playerAmp}
            canTrigger={battle.canTrigger}
            canSpend={battle.canSpend}
            onTrigger={battle.triggerAmp}
            onSpend={battle.spendAmp}
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
  forfeitBtn:   { marginTop: 4, paddingHorizontal: T.button.secondary.paddingH, paddingVertical: T.button.secondary.paddingV, borderRadius: T.button.secondary.radius, borderWidth: 1, borderColor: T.status.danger + '66', backgroundColor: T.status.danger + '18' },
  forfeitText:  { fontFamily: T.button.secondary.fontFamily, fontSize: T.button.secondary.fontSize, color: T.button.secondary.text, letterSpacing: T.button.secondary.letterSpacing },

  combatZone: { flex: 1, paddingVertical: 6 },
  cardSection:{ flex: 1, justifyContent: 'center' },
  vsRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 4 },
  vsDivider:  { flex: 1, height: 1, backgroundColor: T.bg.border },
  vsText:     { fontFamily: 'Orbitron_900Black', fontSize: T.font.sm, color: T.accent.mintMuted, letterSpacing: T.letterSpacing.xxl, paddingHorizontal: 10 },
  logBox:     { paddingHorizontal: 14, paddingBottom: 4, gap: 1 },

});
