// BattleScreen — Session 11: core state machine + battle UI.
// Gesture controls (Session 11):
//   Attack  — drag active card upward ≥ 60px
//   Swap    — drag any hand card upward ≥ 40px
//   Draw    — tap the deck card back
// Session 12 adds full Reanimated lunge/shake/defeat animations.

import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Platform, PanResponder, Animated,
} from 'react-native';
import ReAnimated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, withSpring, Easing,
} from 'react-native-reanimated';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BattleStackParamList } from '../../App';
import { useBattle, BattlePhase } from '../hooks/useBattle';
import { BattleEvent, BattleCard, AttackWeight } from '../battle/battleEngine';
import { RC } from '../data/constants';
import { CardWrapper, CARD_W, CARD_H } from '../components/CardWrapper';
import { MiniCard } from '../components/MiniCard';

type Props = NativeStackScreenProps<BattleStackParamList, 'Battle'>;

const ACTIVE_SCALE = 0.36;
const HAND_SCALE   = 0.22;
const DECK_SCALE   = 0.22;
const HAND_OVERLAP = 10;

const ACTIVE_W = Math.round(CARD_W * ACTIVE_SCALE);
const ACTIVE_H = Math.round(CARD_H * ACTIVE_SCALE);
const HAND_W   = Math.round(CARD_W * HAND_SCALE);
const HAND_H   = Math.round(CARD_H * HAND_SCALE);
const DECK_W   = Math.round(CARD_W * DECK_SCALE);
const DECK_H   = Math.round(CARD_H * DECK_SCALE);

const CH_SIZE = 64;
const CH_SW   = 6;
const CH_OVAL = { x: CH_SW / 2, y: CH_SW / 2, width: CH_SIZE - CH_SW, height: CH_SIZE - CH_SW };
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
// ── Empty hand slot ────────────────────────────────────────────────────────────
function EmptySlot({ w, h }: { w: number; h: number }) {
  return <View style={[es.slot, { width: w, height: h, borderRadius: w * 0.08 }]} />;
}
const es = StyleSheet.create({
  slot: { borderWidth: 1, borderColor: '#1a1a30', borderStyle: 'dashed' },
});

const cb = StyleSheet.create({
  card:    { borderRadius: 6, backgroundColor: '#0e0e22', borderWidth: 1, borderColor: '#2a2a48', alignItems: 'center', justifyContent: 'center' },
  diamond: { borderWidth: 1, borderColor: '#3a3a5a', transform: [{ rotate: '45deg' }] },
});

// ── Circular HP ring ──────────────────────────────────────────────────────────
function CircleHp({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct   = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  const color = pct > 0.6 ? '#4caf50' : pct > 0.33 ? '#ffeb3b' : '#ef5350';

  const bgPath = useMemo(() => { const p = Skia.Path.Make(); p.addOval(CH_OVAL); return p; }, []);
  const fgPath = useMemo(() => {
    const p = Skia.Path.Make();
    if (pct >= 1) p.addOval(CH_OVAL);
    else if (pct > 0) p.addArc(CH_OVAL, -90, pct * 360);
    return p;
  }, [hp, maxHp]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ width: CH_SIZE, height: CH_SIZE }}>
      <Canvas style={{ width: CH_SIZE, height: CH_SIZE }}>
        <Path path={bgPath} color="#1a1a35" style="stroke" strokeWidth={CH_SW} />
        {pct > 0 && <Path path={fgPath} color={color} style="stroke" strokeWidth={CH_SW} />}
      </Canvas>
      <View style={ch.overlay}>
        <Text style={[ch.hpNum, { color }]}>{hp}</Text>
        <Text style={ch.hpDiv}>—</Text>
        <Text style={ch.hpMax}>{maxHp}</Text>
      </View>
    </View>
  );
}
const ch = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  hpNum:   { fontFamily: 'Orbitron_900Black', fontSize: 14, lineHeight: 16 },
  hpDiv:   { fontFamily: 'Orbitron_700Bold', fontSize: 7, color: '#40405a', lineHeight: 8 },
  hpMax:   { fontFamily: 'Orbitron_700Bold', fontSize: 8, color: '#606080', lineHeight: 9 },
});

// ── Stamina bar ───────────────────────────────────────────────────────────────
function StaminaBar({ stamina, maxStamina, compact }: { stamina: number; maxStamina: number; compact?: boolean }) {
  const pct   = maxStamina > 0 ? Math.max(0, Math.min(1, stamina / maxStamina)) : 0;
  const color = pct > 0.6 ? '#4fc3f7' : pct > 0.3 ? '#ffa726' : '#ef5350';
  return (
    <View style={[sb.row, compact && sb.rowCompact]}>
      <View style={[sb.track, compact ? sb.trackCompact : sb.trackFull]}>
        <View style={[sb.fill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[sb.label, { color }, compact && sb.labelCompact]}>{stamina}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  row:          { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  rowCompact:   { justifyContent: 'center', gap: 3 },
  track:        { height: 4, backgroundColor: '#1a1a35', borderRadius: 2, overflow: 'hidden' },
  trackFull:    { flex: 1 },
  trackCompact: { width: 30, height: 3 },
  fill:         { position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: 2 },
  label:        { fontFamily: 'Orbitron_700Bold', fontSize: 7, lineHeight: 10, minWidth: 14, textAlign: 'right' },
  labelCompact: { fontSize: 7, minWidth: 0 },
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
      <CardWrapper scale={ACTIVE_SCALE}><MiniCard card={card} /></CardWrapper>
    </ReAnimated.View>
  );
}
const da = StyleSheet.create({
  absolute: { position: 'absolute', top: 0, left: 0, zIndex: 10 },
});

// ── AI active section (no gesture) ───────────────────────────────────────────
function AIActiveSection({ card, revealed, deckCount, targeted, hitKey, attackKey, defeatingCard, onCardMeasure }: {
  card: BattleCard | null; revealed: boolean; deckCount: number;
  targeted: boolean; hitKey: number; attackKey: number; defeatingCard: BattleCard | null;
  onCardMeasure: (b: Bounds) => void;
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
      <CircleHp hp={card.hp} maxHp={card.maxHp} />
      <View style={{ width: HP_GAP }} />
      {/* Measure only the card itself — this is the precise attack drop-zone */}
      {/* lungeStyle moves the whole card+shake together toward the player */}
      <ReAnimated.View style={lungeStyle}>
        <ReAnimated.View style={shakeStyle}>
          <View
            ref={cardRef}
            style={{ position: 'relative' }}
            onLayout={() => cardRef.current?.measureInWindow((x, y, w, h) => onCardMeasure({ x, y, w, h }))}
          >
            <ReAnimated.View style={entryStyle}>
              <CardWrapper scale={ACTIVE_SCALE}><MiniCard card={card} /></CardWrapper>
            </ReAnimated.View>
            <ReAnimated.View style={[flashStyle, aas.flashOverlay]} pointerEvents="none" />
            {showDefeat && defeatingCard && <DefeatingCardAnim card={defeatingCard} absolute />}
          </View>
          <StaminaBar stamina={card.stamina} maxStamina={card.maxStamina} />
        </ReAnimated.View>
      </ReAnimated.View>
      <View style={{ width: HP_GAP }} />
      <View style={aas.deckCol}>
        {deckCount > 0 ? (
          <View style={aas.deckWrap}>
            <CardBack w={DECK_W} h={DECK_H} />
            <View style={aas.badge}><Text style={aas.badgeText}>{deckCount}</Text></View>
          </View>
        ) : (
          <View style={{ width: DECK_W, height: DECK_H }} />
        )}
        {card.ability && revealed && (
          <View style={aas.abilityBadge}><Text style={aas.abilityText}>{card.ability}</Text></View>
        )}
      </View>
    </View>
  );
}
const aas = StyleSheet.create({
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  empty:        { fontFamily: 'Orbitron_700Bold', fontSize: 18, color: '#252540' },
  deckCol:      { alignItems: 'center', gap: 4 },
  deckWrap:     { position: 'relative' },
  badge:        { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#12122e', borderWidth: 1, borderColor: '#3a2a6a', borderRadius: 4, paddingHorizontal: 3, minWidth: 16, alignItems: 'center' },
  badgeText:    { fontFamily: 'Orbitron_700Bold', fontSize: 8, color: '#9966ff', lineHeight: 14 },
  abilityBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: '#cc6dff44', backgroundColor: '#cc6dff11' },
  abilityText:  { fontFamily: 'Orbitron_700Bold', fontSize: 7, color: '#cc6dff', letterSpacing: 0.5, textAlign: 'center' },
  cardGlow:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8, borderWidth: 2, borderColor: '#ff5722dd', backgroundColor: '#ff572220' },
  flashOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8, backgroundColor: '#ef5350' },
});

// ── Player active section (tap deck to draw; hand cards drag-to-swap) ─────────
function PlayerActiveSection({ card, revealed, phase, deckCount, onDraw, canDraw,
  swapTargeted, hitKey, defeatingCard, onCardMeasure }: {
  card: BattleCard | null; revealed: boolean; phase: BattlePhase;
  deckCount: number; onDraw: () => void; canDraw: boolean;
  swapTargeted: boolean;
  hitKey: number;
  defeatingCard: BattleCard | null;
  onCardMeasure: (b: Bounds) => void;
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
            <CardBack w={DECK_W} h={DECK_H} />
            <View style={[aas.badge, canDraw && pas.deckBadgeActive]}>
              <Text style={[aas.badgeText, canDraw && pas.deckCountActive]}>{deckCount}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={{ width: DECK_W, height: DECK_H }} />
      )}
      {card?.ability && revealed && (
        <View style={aas.abilityBadge}><Text style={aas.abilityText}>{card.ability}</Text></View>
      )}
    </View>
  );

  if (!card) {
    return (
      <View style={pas.row}>
        {/* Spacer to match CircleHp width */}
        <View style={{ width: CH_SIZE, height: CH_SIZE }} />
        <View style={{ width: HP_GAP }} />
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
      <CircleHp hp={card.hp} maxHp={card.maxHp} />
      <View style={{ width: HP_GAP }} />

      {/* Measure only the card slot — this is the precise swap drop-zone */}
      <View
        ref={cardSlotRef}
        style={[pas.cardSlot, swapTargeted && pas.cardSlotTargeted]}
        onLayout={() => cardSlotRef.current?.measureInWindow((x, y, w, h) => onCardMeasureRef.current({ x, y, w, h }))}
      >
        <ReAnimated.View style={shakeStyle}>
          <ReAnimated.View style={entryStyle}>
            <CardWrapper scale={ACTIVE_SCALE}><MiniCard card={card} /></CardWrapper>
          </ReAnimated.View>
          <ReAnimated.View style={[flashStyle, pas.flashOverlay]} pointerEvents="none" />
        </ReAnimated.View>
        <StaminaBar stamina={card.stamina} maxStamina={card.maxStamina} />
      </View>

      <View style={{ width: HP_GAP }} />
      {deckSection}
    </View>
  );
}
const pas = StyleSheet.create({
  row:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  deckBadgeActive:   { borderColor: '#4fc3f755' },
  deckCountActive:   { color: '#4fc3f7' },
  cardSlot:          { borderRadius: 8, borderWidth: 2, borderColor: 'transparent', padding: 2 },
  cardSlotTargeted:  { borderColor: '#4fc3f7cc', backgroundColor: '#4fc3f712' },
  emptyActive:       { borderRadius: 8, borderWidth: 1.5, borderColor: '#4fc3f744', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  emptyActiveTargeted:{ borderColor: '#4fc3f7cc', backgroundColor: '#4fc3f718' },
  emptyActiveHint:   { fontFamily: 'Orbitron_700Bold', fontSize: 7, color: '#4fc3f766', letterSpacing: 0.5, textAlign: 'center', lineHeight: 11 },
  flashOverlay:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8, backgroundColor: '#ef5350' },
});

// ── Top zone — AI face-down hand only (deck moved beside active card) ─────────
function AIZone({ handCount }: { handCount: number }) {
  return (
    <View style={az.container}>
      {Array.from({ length: MAX_HAND }).map((_, i) => {
        const filled = i < handCount;
        return (
          <View key={i} style={{ marginLeft: i === 0 ? 0 : (filled ? -HAND_OVERLAP : 4), zIndex: filled ? 1 : 0 }}>
            {filled ? <CardBack w={HAND_W} h={HAND_H} /> : <EmptySlot w={HAND_W} h={HAND_H} />}
          </View>
        );
      })}
    </View>
  );
}
const az = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#080818', borderBottomWidth: 1, borderBottomColor: '#0f0f24' },
});

// ── Hand card — drag onto active slot to swap (or tap to play when selecting) ──
function HandCard({ card, phase, onSelect, onSwap, index, total,
  playerActiveBoundsRef, onSwapHover, isReturned }: {
  card: BattleCard; phase: BattlePhase;
  onSelect: (id: number) => void; onSwap: (id: number) => void;
  index: number; total: number;
  playerActiveBoundsRef: React.MutableRefObject<Bounds | null>;
  onSwapHover: (h: boolean) => void;
  isReturned: boolean;
}) {
  const dragX          = useRef(new Animated.Value(0)).current;
  const dragY          = useRef(new Animated.Value(0)).current;
  const phaseRef       = useRef(phase);
  const onSelectRef    = useRef(onSelect);
  const onSwapRef      = useRef(onSwap);
  const onSwapHoverRef = useRef(onSwapHover);
  const cardIdRef      = useRef(card.id);
  // Stable local ref so the PanResponder closure (created once) always reads
  // the latest prop value rather than the stale first-render value.
  const playerBoundsRef = useRef(playerActiveBoundsRef);
  phaseRef.current        = phase;
  onSelectRef.current     = onSelect;
  onSwapRef.current       = onSwap;
  onSwapHoverRef.current  = onSwapHover;
  cardIdRef.current       = card.id;
  playerBoundsRef.current = playerActiveBoundsRef;

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
    onMoveShouldSetPanResponder:  (_, gs) => (phaseRef.current === 'ready' || phaseRef.current === 'selecting') && (Math.abs(gs.dx) > 3 || Math.abs(gs.dy) > 3),
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
      const bounds     = playerBoundsRef.current?.current ?? null;
      const overTarget = isOver(bounds, gs.moveX, gs.moveY);
      onSwapHoverRef.current(false);
      springBack();
      if (p === 'selecting' && overTarget)  setTimeout(() => onSelectRef.current(id), 50);
      else if (p === 'ready' && overTarget) setTimeout(() => onSwapRef.current(id),   80);
    },
    onPanResponderTerminate: () => { onSwapHoverRef.current(false); springBack(); },
  })).current;

  const color = RC[card.rarity]?.color ?? '#808898';

  return (
    <ReAnimated.View style={[entryStyle, { marginLeft: index === 0 ? 0 : -HAND_OVERLAP, zIndex: total - index }]}>
      <Animated.View
        style={{ transform: [{ translateX: dragX }, { translateY: dragY }, { rotate }] }}
        {...pan.panHandlers}
      >
        <View style={hc.col}>
          <View style={[hc.frame, { borderColor: color + '33' }]}>
            <CardWrapper scale={HAND_SCALE}><MiniCard card={card} /></CardWrapper>
          </View>
          <View style={{ width: HAND_W, alignItems: 'center' }}>
            <StaminaBar stamina={card.stamina} maxStamina={card.maxStamina} compact />
          </View>
        </View>
      </Animated.View>
    </ReAnimated.View>
  );
}
const hc = StyleSheet.create({
  col:   { alignItems: 'flex-start' },
  frame: { borderWidth: 1, borderRadius: 6, overflow: 'hidden' },
});

// ── Bottom zone — player hand only (deck moved beside active card) ────────────
function PlayerZone({ hand, phase, onSelect, onSwap, playerActiveBoundsRef, onSwapHover, swapOutCardId }: {
  hand: BattleCard[]; phase: BattlePhase;
  onSelect: (id: number) => void; onSwap: (id: number) => void;
  playerActiveBoundsRef: React.MutableRefObject<Bounds | null>;
  onSwapHover: (h: boolean) => void;
  swapOutCardId: number | null;
}) {
  return (
    <View style={pz.container}>
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
          />
        ) : (
          <View key={`empty-${i}`} style={{ marginLeft: i === 0 ? 0 : 4, zIndex: 0 }}>
            <EmptySlot w={HAND_W} h={HAND_H} />
          </View>
        );
      })}
    </View>
  );
}
const pz = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#080818', borderTopWidth: 1, borderTopColor: '#0f0f24' },
});

// ── Event log (compact) ───────────────────────────────────────────────────────
function eventLine(ev: BattleEvent, idx: number): React.ReactNode {
  switch (ev.type) {
    case 'ATTACK':
      if (ev.missed) return <Text key={idx} style={evs.miss}>{ev.attacker} missed!</Text>;
      const mult = ev.typeMultiplier;
      const adv  = mult >= 2.0 ? ' (adv)' : mult <= 0.5 ? ' (weak)' : '';
      return <Text key={idx} style={[evs.base, { color: ev.attackerSide === 'player' ? '#4fc3f7' : '#ef5350' }]}>{ev.attacker} → {ev.defender}: {ev.damage}{adv}</Text>;
    case 'ABILITY':   return <Text key={idx} style={evs.ability}>{ev.ability}: {ev.effect}</Text>;
    case 'DEFEAT':    return <Text key={idx} style={evs.defeat}>{ev.card} defeated</Text>;
    case 'CARD_ENTER':return <Text key={idx} style={evs.enter}>{ev.side === 'player' ? 'Your' : 'AI'} {ev.card} enters</Text>;
    case 'AI_SWAP':   return <Text key={idx} style={evs.swap}>AI swaps to {ev.card}</Text>;
    case 'PLAYER_SWAP':return <Text key={idx} style={evs.swap}>You swap in {ev.card}</Text>;
    case 'PLAYER_DRAW':return <Text key={idx} style={evs.draw}>You draw {ev.card}</Text>;
    case 'FORCED_DRAW':return <Text key={idx} style={evs.draw}>{ev.side === 'player' ? 'You draw' : 'AI draws'} {ev.card}</Text>;
    case 'BATTLE_START':return <Text key={idx} style={evs.start}>{ev.playerActive.name} vs {ev.aiActive.name}</Text>;
    default: return null;
  }
}
const evs = StyleSheet.create({
  base:    { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, lineHeight: 16 },
  miss:    { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, color: '#606480', lineHeight: 16 },
  ability: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 11, color: '#cc6dff', lineHeight: 15 },
  defeat:  { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, color: '#ff4060', lineHeight: 16 },
  enter:   { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, color: '#4caf50', lineHeight: 16 },
  swap:    { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, color: '#ffeb3b', lineHeight: 16 },
  draw:    { fontFamily: 'Rajdhani_600SemiBold', fontSize: 11, color: '#8890b0', lineHeight: 15 },
  start:   { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, color: '#4fc3f7', lineHeight: 16 },
});

// ── Attack buttons ────────────────────────────────────────────────────────────
function AttackButtons({ phase, stamina, onAttack, onRest }: {
  phase: BattlePhase; stamina: number;
  onAttack: (weight: AttackWeight) => void; onRest: () => void;
}) {
  const ready = phase === 'ready';
  return (
    <View style={atb.row}>
      {([
        { weight: 'light'  as AttackWeight, label: 'LIGHT',  cost: '−1', mult: '×0.8', minSp: 1, color: '#4fc3f7' },
        { weight: 'medium' as AttackWeight, label: 'MEDIUM', cost: '−3', mult: '×1.0', minSp: 3, color: '#ffa726' },
        { weight: 'heavy'  as AttackWeight, label: 'HEAVY',  cost: '−5', mult: '×1.5', minSp: 5, color: '#ef5350' },
      ]).map(({ weight, label, cost, mult, minSp, color }) => {
        const canUse = stamina >= minSp;
        const dis    = !ready || !canUse;
        return (
          <TouchableOpacity
            key={weight}
            style={[atb.btn, { borderColor: dis ? '#1a1a35' : color + '66' }, dis && atb.btnDis]}
            onPress={() => onAttack(weight)}
            disabled={dis}
            activeOpacity={0.75}
          >
            <Text style={[atb.cost, { color: dis ? '#303050' : color }]}>{cost} SP</Text>
            <Text style={[atb.label, { color: dis ? '#303050' : '#e0e0f0' }]}>{label}</Text>
            <Text style={[atb.mult, { color: dis ? '#303050' : color + 'aa' }]}>{mult}</Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity
        style={[atb.btn, { borderColor: ready ? '#4caf5066' : '#1a1a35' }, !ready && atb.btnDis]}
        onPress={onRest}
        disabled={!ready}
        activeOpacity={0.75}
      >
        <Text style={[atb.cost, { color: ready ? '#4caf50' : '#303050' }]}>+5 SP</Text>
        <Text style={[atb.label, { color: ready ? '#e0e0f0' : '#303050' }]}>REST</Text>
        <Text style={[atb.mult, { color: ready ? '#4caf5088' : '#303050' }]}>skip</Text>
      </TouchableOpacity>
    </View>
  );
}
const atb = StyleSheet.create({
  row:    { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 6, gap: 6, backgroundColor: '#060610', borderTopWidth: 1, borderTopColor: '#10102a' },
  btn:    { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 6, alignItems: 'center', backgroundColor: '#0a0a1e' },
  btnDis: { backgroundColor: '#060610' },
  cost:   { fontFamily: 'Orbitron_700Bold', fontSize: 7, letterSpacing: 0.5, lineHeight: 11 },
  label:  { fontFamily: 'Orbitron_900Black', fontSize: 9, letterSpacing: 0.5, lineHeight: 13 },
  mult:   { fontFamily: 'Orbitron_700Bold', fontSize: 7, letterSpacing: 0.5, lineHeight: 11 },
});

// ── Result screen ─────────────────────────────────────────────────────────────
function ResultScreen({ winner, rewards, tierColor, tierName, onBack }: {
  winner: 'player' | 'ai';
  rewards: { credits: number; xp: number; streakBonus: boolean } | null;
  tierColor: string; tierName: string; onBack: () => void;
}) {
  const won = winner === 'player';
  return (
    <View style={rs.root}>
      <Text style={[rs.outcome, { color: won ? '#4caf50' : '#ef5350' }]}>{won ? 'VICTORY' : 'DEFEAT'}</Text>
      <Text style={[rs.tier, { color: tierColor }]}>{tierName.toUpperCase()}</Text>
      {rewards && (
        <View style={rs.rewardsBox}>
          <Text style={rs.rewardsTitle}>REWARDS</Text>
          <Text style={rs.rewardLine}>+{rewards.credits} Credits</Text>
          <Text style={rs.rewardLine}>+{rewards.xp} XP</Text>
          {rewards.streakBonus && <Text style={rs.streak}>WIN STREAK BONUS x2</Text>}
        </View>
      )}
      <TouchableOpacity style={[rs.backBtn, { borderColor: tierColor + '88' }]} onPress={onBack} activeOpacity={0.8}>
        <Text style={[rs.backText, { color: tierColor }]}>BACK TO LOBBY</Text>
      </TouchableOpacity>
    </View>
  );
}
const rs = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#060610', alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  outcome:      { fontFamily: 'Orbitron_900Black', fontSize: 36, letterSpacing: 4 },
  tier:         { fontFamily: 'Orbitron_700Bold', fontSize: 12, letterSpacing: 2, marginBottom: 8 },
  rewardsBox:   { backgroundColor: '#0a0a1e', borderRadius: 14, borderWidth: 1, borderColor: '#14142a', padding: 20, width: '100%', alignItems: 'center', gap: 6 },
  rewardsTitle: { fontFamily: 'Orbitron_700Bold', fontSize: 10, color: '#404458', letterSpacing: 2, marginBottom: 4 },
  rewardLine:   { fontFamily: 'Orbitron_900Black', fontSize: 18, color: '#4fc3f7' },
  streak:       { fontFamily: 'Orbitron_700Bold', fontSize: 10, color: '#ffa726', letterSpacing: 1, marginTop: 4 },
  backBtn:      { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  backText:     { fontFamily: 'Orbitron_700Bold', fontSize: 13, letterSpacing: 1.5 },
});

// ── BattleScreen ──────────────────────────────────────────────────────────────
export default function BattleScreen({ navigation, route }: Props) {
  const { playerDeck, tier } = route.params;
  const battle = useBattle(playerDeck, tier);

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
    <View style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backText}>LOBBY</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.tierName, { color: tc }]}>{battle.tierName.toUpperCase()}</Text>
          <Text style={s.roundNum}>Round {battle.round}</Text>
        </View>
        <View style={{ width: 48 }} />
      </View>

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
          />
        </View>

        <View style={s.vsRow}>
          <View style={s.vsDivider} />
          <Text style={s.vsText}>VS</Text>
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
          />
        </View>
      </View>

      {/* Attack buttons */}
      <AttackButtons
        phase={battle.phase}
        stamina={battle.playerActive?.stamina ?? 0}
        onAttack={battle.attack}
        onRest={battle.rest}
      />

      {/* Player zone — face-up hand only */}
      <PlayerZone
        hand={battle.playerHand}
        phase={battle.phase}
        onSelect={battle.selectCard}
        onSwap={battle.swapCard}
        playerActiveBoundsRef={playerActiveBounds}
        onSwapHover={onSwapHover}
        swapOutCardId={battle.swapOutCardId}
      />


    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060610' },

  header:       { paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingHorizontal: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#10102a', backgroundColor: '#060610' },
  backBtn:      { width: 48 },
  backText:     { fontFamily: 'Orbitron_700Bold', fontSize: 10, color: '#4fc3f7', letterSpacing: 1 },
  headerCenter: { alignItems: 'center' },
  tierName:     { fontFamily: 'Orbitron_900Black', fontSize: 14, letterSpacing: 1 },
  roundNum:     { fontFamily: 'Orbitron_700Bold', fontSize: 9, color: '#404458', letterSpacing: 1, marginTop: 1 },

  combatZone: { flex: 1, paddingVertical: 6 },
  cardSection:{ flex: 1, justifyContent: 'center' },
  vsRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 4 },
  vsDivider:  { flex: 1, height: 1, backgroundColor: '#14142a' },
  vsText:     { fontFamily: 'Orbitron_900Black', fontSize: 11, color: '#4fc3f744', letterSpacing: 4, paddingHorizontal: 10 },
  logBox:     { paddingHorizontal: 14, paddingBottom: 4, gap: 1 },

});
