// BattleScreen — Session 11: core state machine + battle UI.
// Session 12 adds Reanimated animations (lunge, shake, swap slide, defeat fall).

import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BattleStackParamList } from '../../App';
import { useBattle, BattlePhase } from '../hooks/useBattle';
import { BattleEvent, BattleCard } from '../battle/battleEngine';
import { RC } from '../data/constants';
import { ABILITY_DESC } from '../data/abilities';
import { CardWrapper, CARD_W, CARD_H } from '../components/CardWrapper';
import { MiniCard } from '../components/MiniCard';

type Props = NativeStackScreenProps<BattleStackParamList, 'Battle'>;

const { width: SCREEN_W } = Dimensions.get('window');
const ACTIVE_SCALE = 0.50;
const HAND_SCALE   = 0.26;

// ── HP bar ────────────────────────────────────────────────────────────────────
function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const color = pct > 60 ? '#4caf50' : pct > 33 ? '#ffeb3b' : '#ef5350';
  return (
    <View style={bar.track}>
      <View style={[bar.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}
const bar = StyleSheet.create({
  track: { height: 6, backgroundColor: '#0a0a20', borderRadius: 3, overflow: 'hidden', flex: 1 },
  fill:  { height: '100%', borderRadius: 3 },
});

// ── Active card section ───────────────────────────────────────────────────────
function ActiveCardSection({ card, side, revealed }: { card: BattleCard | null; side: 'player' | 'ai'; revealed: boolean }) {
  if (!card) {
    return (
      <View style={ac.empty}>
        <Text style={ac.emptyText}>—</Text>
      </View>
    );
  }
  const rarityColor = RC[card.rarity]?.color ?? '#808898';
  const isPlayer = side === 'player';
  return (
    <View style={[ac.row, isPlayer && { flexDirection: 'row-reverse' }]}>
      <CardWrapper scale={ACTIVE_SCALE}>
        <MiniCard card={card} />
      </CardWrapper>
      <View style={ac.info}>
        <Text style={[ac.label, { color: isPlayer ? '#4fc3f7' : '#ef5350' }]}>
          {isPlayer ? 'YOUR CARD' : 'OPPONENT'}
        </Text>
        <Text style={[ac.name, { color: rarityColor }]} numberOfLines={2}>{card.name.toUpperCase()}</Text>
        <HpBar hp={card.hp} maxHp={card.maxHp} />
        <Text style={[ac.hp, { color: rarityColor }]}>{card.hp} / {card.maxHp} HP</Text>
        {card.ability && revealed && (
          <View style={ac.abilityBadge}>
            <Text style={ac.abilityText}>{card.ability}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
const ac = StyleSheet.create({
  row:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 8 },
  empty:        { height: CARD_H * ACTIVE_SCALE, alignItems: 'center', justifyContent: 'center' },
  emptyText:    { fontFamily: 'Orbitron_700Bold', fontSize: 20, color: '#303050' },
  info:         { flex: 1, gap: 6 },
  label:        { fontFamily: 'Orbitron_700Bold', fontSize: 8, letterSpacing: 1.5 },
  name:         { fontFamily: 'Orbitron_900Black', fontSize: 13, letterSpacing: 0.5, lineHeight: 17 },
  hp:           { fontFamily: 'Orbitron_700Bold', fontSize: 10, marginTop: 2 },
  abilityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: '#cc6dff44', backgroundColor: '#cc6dff11', alignSelf: 'flex-start', marginTop: 2 },
  abilityText:  { fontFamily: 'Orbitron_700Bold', fontSize: 8, color: '#cc6dff', letterSpacing: 0.5 },
});

// ── Event log ─────────────────────────────────────────────────────────────────
function eventLine(ev: BattleEvent, idx: number): React.ReactNode {
  switch (ev.type) {
    case 'ATTACK':
      if (ev.missed) return <Text key={idx} style={evs.miss}>⊘  {ev.attacker} missed!</Text>;
      const mult = ev.typeMultiplier;
      const advText = mult === 1.5 ? ' (advantage)' : mult >= 2.0 ? ' (×2 overwhelm)' : mult === 0.75 ? ' (weakness)' : '';
      return <Text key={idx} style={[evs.attack, { color: ev.attackerSide === 'player' ? '#4fc3f7' : '#ef5350' }]}>⚔  {ev.attacker} → {ev.defender}: {ev.damage} dmg{advText}</Text>;
    case 'ABILITY':
      return <Text key={idx} style={evs.ability}>✦  {ev.ability} ({ev.card}): {ev.effect}</Text>;
    case 'DEFEAT':
      return <Text key={idx} style={evs.defeat}>✕  {ev.card} defeated by {ev.byCard}</Text>;
    case 'CARD_ENTER':
      return <Text key={idx} style={evs.enter}>↑  {ev.side === 'player' ? 'Your' : 'AI'} {ev.card} enters ({ev.hp}/{ev.maxHp} HP)</Text>;
    case 'AI_SWAP':
      return <Text key={idx} style={evs.swap}>⟳  AI swaps to {ev.card}</Text>;
    case 'FORCED_DRAW':
      return <Text key={idx} style={evs.draw}>↓  {ev.side === 'player' ? 'You draw' : 'AI draws'}: {ev.card}</Text>;
    case 'BATTLE_START':
      return <Text key={idx} style={evs.start}>⚡  Battle begins! {ev.playerActive.name} vs {ev.aiActive.name}</Text>;
    default:
      return null;
  }
}
const evs = StyleSheet.create({
  attack:  { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, lineHeight: 18 },
  miss:    { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, color: '#606480', lineHeight: 18 },
  ability: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, color: '#cc6dff', lineHeight: 18 },
  defeat:  { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, color: '#ff4060', lineHeight: 18 },
  enter:   { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, color: '#4caf50', lineHeight: 18 },
  swap:    { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, color: '#ffeb3b', lineHeight: 18 },
  draw:    { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, color: '#8890b0', lineHeight: 18 },
  start:   { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, color: '#4fc3f7', lineHeight: 18 },
});

// ── Hand card strip ────────────────────────────────────────────────────────────
function HandStrip({ hand, onSelect, phase }: { hand: BattleCard[]; onSelect: (id: number) => void; phase: BattlePhase }) {
  const selecting = phase === 'selecting';
  return (
    <View style={hs.row}>
      <Text style={hs.label}>HAND</Text>
      <View style={hs.cards}>
        {hand.map(card => {
          const color = RC[card.rarity]?.color ?? '#808898';
          return (
            <TouchableOpacity
              key={card.id}
              style={[hs.cell, selecting && hs.cellSelectable, { borderColor: selecting ? color : color + '44' }]}
              onPress={() => selecting && onSelect(card.id)}
              activeOpacity={selecting ? 0.7 : 1}
            >
              <CardWrapper scale={HAND_SCALE}>
                <MiniCard card={card} />
              </CardWrapper>
              {selecting && (
                <View style={[hs.selectBadge, { backgroundColor: color }]}>
                  <Text style={hs.selectText}>PLAY</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        {hand.length === 0 && <Text style={hs.empty}>No cards in hand</Text>}
      </View>
    </View>
  );
}
const hs = StyleSheet.create({
  row:           { paddingHorizontal: 12, paddingVertical: 8 },
  label:         { fontFamily: 'Orbitron_700Bold', fontSize: 8, color: '#404458', letterSpacing: 1.5, marginBottom: 6 },
  cards:         { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  cell:          { borderWidth: 1, borderRadius: 6, overflow: 'hidden', position: 'relative' },
  cellSelectable:{ borderWidth: 2 },
  selectBadge:   { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingVertical: 2 },
  selectText:    { fontFamily: 'Orbitron_700Bold', fontSize: 7, color: '#060610' },
  empty:         { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, color: '#303050', paddingVertical: 8 },
});

// ── Result / reward screen ────────────────────────────────────────────────────
function ResultScreen({ winner, rewards, tierColor, tierName, onBack }: { winner: 'player' | 'ai'; rewards: { credits: number; xp: number; streakBonus: boolean } | null; tierColor: string; tierName: string; onBack: () => void }) {
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
          {rewards.streakBonus && <Text style={rs.streak}>WIN STREAK BONUS ×2</Text>}
        </View>
      )}
      <TouchableOpacity style={[rs.backBtn, { borderColor: tierColor + '88' }]} onPress={onBack} activeOpacity={0.8}>
        <Text style={[rs.backText, { color: tierColor }]}>← BACK TO LOBBY</Text>
      </TouchableOpacity>
    </View>
  );
}
const rs = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#060610', alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  outcome:      { fontFamily: 'Orbitron_900Black', fontSize: 36, letterSpacing: 4 },
  tier:         { fontFamily: 'Orbitron_700Bold',  fontSize: 12, letterSpacing: 2, marginBottom: 8 },
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

  // Done screen
  if (battle.phase === 'done' && battle.winner) {
    return (
      <ResultScreen
        winner={battle.winner}
        rewards={battle.rewards}
        tierColor={battle.tierColor}
        tierName={battle.tierName}
        onBack={() => navigation.goBack()}
      />
    );
  }

  // ── Selecting phase banner ────────────────────────────────────────────────
  const selectingBanner = battle.phase === 'selecting' ? (
    <View style={s.selectBanner}>
      <Text style={s.selectBannerText}>YOUR CARD WAS DEFEATED — CHOOSE YOUR NEXT CARD</Text>
    </View>
  ) : null;

  // ── Action button ─────────────────────────────────────────────────────────
  const actionBtn = (() => {
    if (battle.phase === 'selecting') return null; // hand strip is the selector
    const isReady   = battle.phase === 'ready';
    const isResult  = battle.phase === 'result';
    const isInit    = battle.phase === 'init';
    const label     = isReady  ? 'ATTACK  ⚔' : isResult ? 'NEXT ROUND  →' : '...';
    const onPress   = isReady  ? battle.attack : isResult ? battle.nextRound : undefined;
    const active    = isReady || isResult;
    return (
      <TouchableOpacity
        style={[s.actionBtn, active && s.actionBtnActive, { borderColor: battle.tierColor + (active ? 'aa' : '33') }]}
        onPress={onPress}
        activeOpacity={active ? 0.8 : 1}
        disabled={!active || isInit}
      >
        <Text style={[s.actionText, { color: active ? battle.tierColor : '#303050' }]}>{label}</Text>
      </TouchableOpacity>
    );
  })();

  return (
    <View style={s.root}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backText}>← LOBBY</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.tierName, { color: battle.tierColor }]}>{battle.tierName.toUpperCase()}</Text>
          <Text style={s.roundNum}>Round {battle.round}</Text>
        </View>
        <View style={s.handCounts}>
          <Text style={s.deckPip}>AI  ■{battle.aiHandCount}  ▪{battle.aiDeckCount}</Text>
          <Text style={s.deckPip}>YOU ■{battle.playerHand.length}  ▪{battle.playerDeckCount}</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* AI active card */}
        <ActiveCardSection card={battle.aiActive} side="ai" revealed={battle.typeRevealed} />

        {/* Divider + event log */}
        <View style={s.logBox}>
          <View style={s.logDivider} />
          <View style={s.logEvents}>
            {battle.lastEvents.filter(e => e.type !== 'ROUND_START').map((ev, i) => eventLine(ev, i))}
          </View>
          <View style={s.logDivider} />
        </View>

        {/* Player active card */}
        <ActiveCardSection card={battle.playerActive} side="player" revealed={battle.typeRevealed} />

        {/* Selecting banner */}
        {selectingBanner}

        {/* Hand strip */}
        <HandStrip hand={battle.playerHand} onSelect={battle.selectCard} phase={battle.phase} />

      </ScrollView>

      {/* Footer action button */}
      <View style={s.footer}>
        {actionBtn}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#060610' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Header
  header:       { backgroundColor: '#060610', paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingHorizontal: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#10102a' },
  backBtn:      { paddingRight: 12 },
  backText:     { fontFamily: 'Orbitron_700Bold', fontSize: 10, color: '#4fc3f7', letterSpacing: 1 },
  headerCenter: { alignItems: 'center' },
  tierName:     { fontFamily: 'Orbitron_900Black', fontSize: 14, letterSpacing: 1 },
  roundNum:     { fontFamily: 'Orbitron_700Bold',  fontSize: 9,  color: '#404458', letterSpacing: 1, marginTop: 1 },
  handCounts:   { alignItems: 'flex-end', gap: 2 },
  deckPip:      { fontFamily: 'monospace', fontSize: 9, color: '#404458' },

  // Event log
  logBox:    { paddingHorizontal: 12, paddingVertical: 6 },
  logDivider:{ height: 1, backgroundColor: '#14142a', marginVertical: 6 },
  logEvents: { gap: 3 },

  // Selecting banner
  selectBanner:     { marginHorizontal: 12, marginTop: 4, padding: 10, backgroundColor: '#ff406022', borderRadius: 8, borderWidth: 1, borderColor: '#ff406066', alignItems: 'center' },
  selectBannerText: { fontFamily: 'Orbitron_700Bold', fontSize: 9, color: '#ff6080', letterSpacing: 1, textAlign: 'center' },

  // Footer
  footer:         { paddingHorizontal: 14, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 32 : 14, borderTopWidth: 1, borderTopColor: '#10102a', backgroundColor: '#060610' },
  actionBtn:      { borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, backgroundColor: '#0a0a1e' },
  actionBtnActive:{ backgroundColor: '#0d0d22' },
  actionText:     { fontFamily: 'Orbitron_700Bold', fontSize: 14, letterSpacing: 2 },
});
