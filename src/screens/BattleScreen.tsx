// BattleScreen — Session 11: core state machine + battle UI.
// Gesture controls (Session 11):
//   Attack  — drag active card upward ≥ 60px
//   Swap    — drag any hand card upward ≥ 40px
//   Draw    — tap the deck card back
// Session 12 adds full Reanimated lunge/shake/defeat animations.

import React, { useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Platform, PanResponder, Animated,
} from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BattleStackParamList } from '../../App';
import { useBattle, BattlePhase } from '../hooks/useBattle';
import { BattleEvent, BattleCard } from '../battle/battleEngine';
import { RC } from '../data/constants';
import { CardWrapper, CARD_W, CARD_H } from '../components/CardWrapper';
import { MiniCard } from '../components/MiniCard';

type Props = NativeStackScreenProps<BattleStackParamList, 'Battle'>;

const ACTIVE_SCALE = 0.36;
const HAND_SCALE   = 0.22;
const DECK_SCALE   = 0.26;
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

// Drag thresholds (negative = upward)
const ATTACK_THRESHOLD = -60;
const SWAP_THRESHOLD   = -40;

// ── Face-down card back ────────────────────────────────────────────────────────
function CardBack({ w, h }: { w: number; h: number }) {
  const inner = Math.round(Math.min(w, h) * 0.35);
  return (
    <View style={[cb.card, { width: w, height: h }]}>
      <View style={[cb.diamond, { width: inner, height: inner, borderRadius: inner * 0.15 }]} />
    </View>
  );
}
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

// ── AI active section (no gesture) ───────────────────────────────────────────
function AIActiveSection({ card, revealed }: { card: BattleCard | null; revealed: boolean }) {
  if (!card) {
    return <View style={[aas.row, { height: ACTIVE_H, justifyContent: 'center' }]}><Text style={aas.empty}>—</Text></View>;
  }
  return (
    <View style={aas.row}>
      <CircleHp hp={card.hp} maxHp={card.maxHp} />
      <View style={{ width: HP_GAP }} />
      <CardWrapper scale={ACTIVE_SCALE}><MiniCard card={card} /></CardWrapper>
      <View style={{ width: HP_GAP }} />
      <View style={{ width: CH_SIZE, alignItems: 'center', justifyContent: 'center' }}>
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
  abilityBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: '#cc6dff44', backgroundColor: '#cc6dff11' },
  abilityText:  { fontFamily: 'Orbitron_700Bold', fontSize: 7, color: '#cc6dff', letterSpacing: 0.5, textAlign: 'center' },
});

// ── Player active section (drag up = attack) ──────────────────────────────────
function PlayerActiveSection({ card, revealed, phase, onAttack }: {
  card: BattleCard | null; revealed: boolean; phase: BattlePhase; onAttack: () => void;
}) {
  const dragY       = useRef(new Animated.Value(0)).current;
  const phaseRef    = useRef(phase);
  const onAttackRef = useRef(onAttack);
  phaseRef.current    = phase;
  onAttackRef.current = onAttack;

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder:  (_, gs) => phaseRef.current === 'ready' && gs.dy < -6,
    onPanResponderMove:   (_, gs) => { if (gs.dy < 0) dragY.setValue(gs.dy * 0.35); },
    onPanResponderRelease: (_, gs) => {
      const fired = phaseRef.current === 'ready' && gs.dy < ATTACK_THRESHOLD;
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true, tension: 40, friction: 8 }).start();
      if (fired) setTimeout(() => onAttackRef.current(), 80);
    },
    onPanResponderTerminate: () => {
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;

  if (!card) {
    return (
      <View style={[pas.row, { height: ACTIVE_H, justifyContent: 'center' }]}>
        <Text style={pas.empty}>—</Text>
      </View>
    );
  }

  return (
    <View style={pas.row}>
      <CircleHp hp={card.hp} maxHp={card.maxHp} />
      <View style={{ width: HP_GAP }} />

      <View {...pan.panHandlers}>
        <Animated.View style={{ transform: [{ translateY: dragY }] }}>
          <CardWrapper scale={ACTIVE_SCALE}><MiniCard card={card} /></CardWrapper>
        </Animated.View>
      </View>

      <View style={{ width: HP_GAP }} />
      <View style={{ width: CH_SIZE, alignItems: 'center', justifyContent: 'center' }}>
        {card.ability && revealed && (
          <View style={aas.abilityBadge}><Text style={aas.abilityText}>{card.ability}</Text></View>
        )}
      </View>
    </View>
  );
}
const pas = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  empty:    { fontFamily: 'Orbitron_700Bold', fontSize: 18, color: '#252540' },
});

// ── Top zone — AI face-down hand + deck ───────────────────────────────────────
function AIZone({ handCount, deckCount }: { handCount: number; deckCount: number }) {
  return (
    <View style={az.container}>
      <View style={az.handRow}>
        {Array.from({ length: handCount }).map((_, i) => (
          <View key={i} style={{ marginLeft: i === 0 ? 0 : -HAND_OVERLAP }}>
            <CardBack w={HAND_W} h={HAND_H} />
          </View>
        ))}
        {handCount === 0 && <Text style={az.empty}>No hand</Text>}
      </View>
      {deckCount > 0 ? (
        <View style={az.deckWrap}>
          <CardBack w={DECK_W} h={DECK_H} />
          <View style={az.badge}><Text style={az.badgeText}>{deckCount}</Text></View>
        </View>
      ) : (
        <View style={{ width: DECK_W }} />
      )}
    </View>
  );
}
const az = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 14, paddingVertical: 8, gap: 10, backgroundColor: '#080818', borderBottomWidth: 1, borderBottomColor: '#0f0f24' },
  handRow:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  empty:     { fontFamily: 'Rajdhani_600SemiBold', fontSize: 11, color: '#303050' },
  deckWrap:  { position: 'relative' },
  badge:     { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#12122e', borderWidth: 1, borderColor: '#3a2a6a', borderRadius: 4, paddingHorizontal: 3, minWidth: 16, alignItems: 'center' },
  badgeText: { fontFamily: 'Orbitron_700Bold', fontSize: 8, color: '#9966ff', lineHeight: 14 },
});

// ── Hand card — drag up to swap (or tap to play when selecting) ───────────────
function HandCard({ card, phase, onSelect, onSwap, index, total }: {
  card: BattleCard; phase: BattlePhase;
  onSelect: (id: number) => void; onSwap: (id: number) => void;
  index: number; total: number;
}) {
  const dragY       = useRef(new Animated.Value(0)).current;
  const phaseRef    = useRef(phase);
  const onSelectRef = useRef(onSelect);
  const onSwapRef   = useRef(onSwap);
  const cardIdRef   = useRef(card.id);
  phaseRef.current    = phase;
  onSelectRef.current = onSelect;
  onSwapRef.current   = onSwap;
  cardIdRef.current   = card.id;

  const pan = useRef(PanResponder.create({
    // Capture all touches when forced-selecting; only upward drags otherwise
    onStartShouldSetPanResponder: () => phaseRef.current === 'selecting',
    onMoveShouldSetPanResponder:  (_, gs) => gs.dy < -8,
    onPanResponderMove:   (_, gs) => { if (gs.dy < 0) dragY.setValue(gs.dy * 0.35); },
    onPanResponderRelease: (_, gs) => {
      const p  = phaseRef.current;
      const id = cardIdRef.current;
      const firedSwap   = p === 'ready' && gs.dy < SWAP_THRESHOLD;
      const firedSelect = p === 'selecting';
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true, tension: 40, friction: 8 }).start();
      if (firedSelect)    setTimeout(() => onSelectRef.current(id), 50);
      else if (firedSwap) setTimeout(() => onSwapRef.current(id),   80);
    },
    onPanResponderTerminate: () => {
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;

  const color = RC[card.rarity]?.color ?? '#808898';
  const selecting = phase === 'selecting';

  return (
    <Animated.View
      style={{ marginLeft: index === 0 ? 0 : -HAND_OVERLAP, zIndex: total - index, transform: [{ translateY: dragY }] }}
      {...pan.panHandlers}
    >
      <View style={[hc.frame, { borderColor: selecting ? color : color + '33' }, selecting && hc.frameActive]}>
        <CardWrapper scale={HAND_SCALE}><MiniCard card={card} /></CardWrapper>
        {selecting && (
          <View style={[hc.badge, { backgroundColor: color }]}>
            <Text style={hc.badgeText}>PLAY</Text>
          </View>
        )}
        {phase === 'ready' && (
          <View style={hc.swapHint}><Text style={[hc.swapHintText, { color: color + '99' }]}>swap</Text></View>
        )}
      </View>
    </Animated.View>
  );
}
const hc = StyleSheet.create({
  frame:       { borderWidth: 1, borderRadius: 6, overflow: 'hidden', position: 'relative' },
  frameActive: { borderWidth: 2 },
  badge:       { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingVertical: 2 },
  badgeText:   { fontFamily: 'Orbitron_700Bold', fontSize: 7, color: '#060610' },
  swapHint:    { position: 'absolute', bottom: 2, left: 0, right: 0, alignItems: 'center' },
  swapHintText:{ fontFamily: 'Orbitron_700Bold', fontSize: 6, letterSpacing: 0.5 },
});

// ── Bottom zone — player hand + tappable deck ────────────────────────────────
function PlayerZone({ hand, deckCount, phase, onSelect, onSwap, onDraw, canDraw }: {
  hand: BattleCard[]; deckCount: number; phase: BattlePhase;
  onSelect: (id: number) => void; onSwap: (id: number) => void;
  onDraw: () => void; canDraw: boolean;
}) {
  return (
    <View style={pz.container}>
      {/* Hand cards */}
      <View style={pz.handRow}>
        {hand.map((card, i) => (
          <HandCard
            key={card.id} card={card} phase={phase}
            onSelect={onSelect} onSwap={onSwap}
            index={i} total={hand.length}
          />
        ))}
        {hand.length === 0 && <Text style={pz.empty}>No cards in hand</Text>}
      </View>

      {/* Player deck — tap to draw */}
      {deckCount > 0 ? (
        <TouchableOpacity
          onPress={onDraw}
          disabled={!canDraw}
          activeOpacity={canDraw ? 0.7 : 1}
          style={pz.deckWrap}
        >
          <CardBack w={DECK_W} h={DECK_H} />
          <View style={[az.badge, canDraw && pz.deckBadgeActive]}>
            <Text style={[az.badgeText, canDraw && pz.deckCountActive]}>{deckCount}</Text>
          </View>
          {canDraw && (
            <View style={pz.drawHint}><Text style={pz.drawHintText}>tap</Text></View>
          )}
        </TouchableOpacity>
      ) : (
        <View style={{ width: DECK_W }} />
      )}
    </View>
  );
}
const pz = StyleSheet.create({
  container:      { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 14, paddingVertical: 8, gap: 10, backgroundColor: '#080818', borderTopWidth: 1, borderTopColor: '#0f0f24' },
  handRow:        { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  empty:          { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, color: '#303050' },
  deckWrap:       { position: 'relative' },
  deckBadgeActive:{ borderColor: '#4fc3f755' },
  deckCountActive:{ color: '#4fc3f7' },
  drawHint:       { position: 'absolute', top: -14, left: 0, right: 0, alignItems: 'center' },
  drawHintText:   { fontFamily: 'Orbitron_700Bold', fontSize: 7, color: '#4fc3f799', letterSpacing: 1 },
});

// ── Event log (compact) ───────────────────────────────────────────────────────
function eventLine(ev: BattleEvent, idx: number): React.ReactNode {
  switch (ev.type) {
    case 'ATTACK':
      if (ev.missed) return <Text key={idx} style={evs.miss}>{ev.attacker} missed!</Text>;
      const mult = ev.typeMultiplier;
      const adv  = mult === 1.5 ? ' (adv)' : mult >= 2.0 ? ' (x2)' : mult === 0.75 ? ' (weak)' : '';
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

  // Footer — only shown when player must pick a replacement card
  const footer = battle.phase === 'selecting' ? (
    <View style={[s.btn, { borderColor: '#ff406033' }]}>
      <Text style={[s.btnText, { color: '#ff6080' }]}>SELECT YOUR NEXT CARD</Text>
    </View>
  ) : null;

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

      {/* AI zone — face-down hand + deck */}
      <AIZone handCount={battle.aiHandCount} deckCount={battle.aiDeckCount} />

      {/* Combat zone */}
      <View style={s.combatZone}>
        <View style={s.cardSection}>
          <AIActiveSection card={battle.aiActive} revealed={battle.typeRevealed} />
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
            onAttack={battle.attack}
          />
        </View>
      </View>

      {/* Player zone — face-up hand + tappable deck */}
      <PlayerZone
        hand={battle.playerHand}
        deckCount={battle.playerDeckCount}
        phase={battle.phase}
        onSelect={battle.selectCard}
        onSwap={battle.swapCard}
        onDraw={battle.draw}
        canDraw={battle.canDraw}
      />

      {/* Footer — NEXT ROUND / hints only */}
      {footer && <View style={s.footer}>{footer}</View>}

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

  footer:  { paddingHorizontal: 14, paddingBottom: Platform.OS === 'ios' ? 28 : 12, paddingTop: 8, backgroundColor: '#060610', borderTopWidth: 1, borderTopColor: '#10102a' },
  btn:     { borderRadius: 12, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: '#0a0a1e' },
  btnText: { fontFamily: 'Orbitron_700Bold', fontSize: 13, letterSpacing: 2 },
});
