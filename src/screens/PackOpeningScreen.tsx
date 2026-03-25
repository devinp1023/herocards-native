// PackOpeningScreen — Session 7.
// Phase 'select' → pick pack 1 or 2.
// Phase 'reveal' → tap each of 5 face-down cards to flip & reveal.
// Phase 'summary' → see all results, then COLLECT to save + go back.

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, ScrollView, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, withSequence, withDelay,
  Easing, runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../App';
import { isOwned } from '../hooks/useGameState';
import { useGameStateContext } from '../context/GameStateContext';
import { ALL_CARDS, Card } from '../data/cards';
import { RC, PACK_COST, XP_AWARDS } from '../data/constants';
import { PACKS } from '../data/packs';
import { CardWrapper, CARD_W, CARD_H } from '../components/CardWrapper';
import { HeroCard } from '../components/HeroCard';
import { MaterialSurface } from '../components/MaterialSurface';
import { ScreenBackground } from '../components/ScreenBackground';
import { T } from '../theme/theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'PackOpening'>;

// ── Card draw logic ───────────────────────────────────────────────────────────
const RARITY_ORDER = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'] as const;

function pickRarity(): string {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const r of RARITY_ORDER) {
    cumulative += RC[r].chance;
    if (roll < cumulative) return r;
  }
  return 'Common';
}

interface DrawnCard {
  card: Card;
  isDupe: boolean;
}

function drawPack(packId: number, collection: Record<number, number>, cardRoster: Card[]): DrawnCard[] {
  const packCards = cardRoster.filter(c => c.pack === packId);
  const drawn: DrawnCard[] = [];

  for (let i = 0; i < 5; i++) {
    let card: Card | undefined;
    let attempts = 0;
    while (!card && attempts < 30) {
      const rarity = pickRarity();
      const pool = packCards.filter(c => c.rarity === rarity);
      if (pool.length > 0) card = pool[Math.floor(Math.random() * pool.length)];
      attempts++;
    }
    if (!card) card = packCards[Math.floor(Math.random() * packCards.length)];

    const isDupe = isOwned(collection, card.id) || drawn.some(d => d.card.id === card!.id);
    drawn.push({ card, isDupe });
  }
  return drawn;
}

// ── CardBack ─────────────────────────────────────────────────────────────────
// Shown before card is flipped — branded face-down design.
function CardBack() {
  return (
    <View style={backStyles.outer}>
      <View style={backStyles.inner}>
        {/* Diamond accent */}
        <View style={backStyles.diamondOuter}>
          <View style={backStyles.diamond} />
        </View>
        <Text style={backStyles.brandTop}>AMP</Text>
        <Text style={backStyles.brandBot}>ARENA</Text>
      </View>
    </View>
  );
}

const backStyles = StyleSheet.create({
  outer: {
    width: CARD_W, height: CARD_H,
    borderRadius: 18,
    backgroundColor: '#060614',
    borderWidth: 2, borderColor: '#4a1fa0',
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  inner: {
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  diamondOuter: {
    width: 70, height: 70,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  diamond: {
    width: 48, height: 48,
    backgroundColor: '#1a0a30',
    borderWidth: 2, borderColor: '#7c3aed',
    transform: [{ rotate: '45deg' }],
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 12,
  },
  brandTop: {
    fontFamily: 'Orbitron_900Black', fontSize: T.font.xl,
    color: T.accent.mint, letterSpacing: T.letterSpacing.xxl,
  },
  brandBot: {
    fontFamily: 'Orbitron_700Bold', fontSize: T.font.md,
    color: '#7c3aed', letterSpacing: T.letterSpacing.xxl,
  },
});

// ── RevealSlot ────────────────────────────────────────────────────────────────
// Single card with flip-via-scaleX animation.
interface RevealSlotProps {
  drawn: DrawnCard;
  onRevealed: () => void;
  autoReveal?: boolean;
}

function RevealSlot({ drawn, onRevealed, autoReveal }: RevealSlotProps) {
  const [showFront, setShowFront] = useState(false);
  const [done, setDone]           = useState(false);
  const scaleX  = useSharedValue(1);
  const enterY  = useSharedValue(40);
  const opacity = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scaleX.value }, { translateY: enterY.value }],
    opacity: opacity.value,
  }));

  // Entrance animation on mount
  React.useEffect(() => {
    enterY.value  = withSpring(0, { damping: 16, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 300 });
  }, []);

  const triggerReveal = useCallback(() => {
    if (done) return;
    setDone(true);

    // Phase 1: collapse
    scaleX.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (!finished) return;
      // Switch face, then expand
      runOnJS(doMidpoint)();
    });
  }, [done]);

  const doMidpoint = () => {
    setShowFront(true);
    scaleX.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(afterReveal)();
    });

    // Haptics on reveal
    const r = drawn.card.rarity;
    if (r === 'Legendary') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (r === 'Epic') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (r === 'Rare') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const afterReveal = () => {
    onRevealed();
  };

  // Auto-reveal support (used when all are shown at once)
  React.useEffect(() => {
    if (autoReveal && !done) triggerReveal();
  }, [autoReveal]);

  const REVEAL_SCALE = 0.72;
  const cfg = RC[drawn.card.rarity] ?? RC.Common;

  return (
    <View style={slot.root}>
      <TouchableOpacity onPress={triggerReveal} activeOpacity={0.9} disabled={done}>
        <Animated.View style={[slot.cardWrap, cardStyle]}>
          <CardWrapper scale={REVEAL_SCALE}>
            {showFront
              ? <HeroCard card={drawn.card} showShine={drawn.card.rarity === 'Legendary' || drawn.card.rarity === 'Epic'} />
              : <CardBack />
            }
          </CardWrapper>
        </Animated.View>
      </TouchableOpacity>

      {/* Rarity + dupe badge (fades in after reveal) */}
      {showFront && (
        <View style={slot.badges}>
          <View style={[slot.rarityBadge, { backgroundColor: cfg.color + '22', borderColor: cfg.color + '66' }]}>
            <Text style={[slot.rarityText, { color: cfg.color }]}>{drawn.card.rarity.toUpperCase()}</Text>
          </View>
          <View style={[slot.statusBadge, drawn.isDupe ? slot.dupeBadge : slot.newBadge]}>
            <Text style={[slot.statusText, { color: drawn.isDupe ? T.status.caution : T.status.vitality }]}>
              {drawn.isDupe ? 'DUPE' : 'NEW'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const slot = StyleSheet.create({
  root:        { alignItems: 'center', gap: 12 },
  cardWrap:    { alignItems: 'center' },
  badges:      { alignItems: 'center', gap: 6 },
  rarityBadge: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  rarityText:  { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, letterSpacing: T.letterSpacing.xs },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  newBadge:    { backgroundColor: T.status.vitality + '22', borderColor: T.status.vitality + '66' },
  dupeBadge:   { backgroundColor: T.status.caution + '22', borderColor: T.status.caution + '66' },
  statusText:  { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, letterSpacing: T.letterSpacing.xs },
});

// ── SummaryCard ───────────────────────────────────────────────────────────────
function SummaryCard({ drawn }: { drawn: DrawnCard }) {
  const cfg   = RC[drawn.card.rarity] ?? RC.Common;
  const SCALE = 0.30;
  return (
    <View style={sum.item}>
      <CardWrapper scale={SCALE}>
        <HeroCard card={drawn.card} />
      </CardWrapper>
      <Text style={[sum.cardName, { color: cfg.color }]} numberOfLines={1}>
        {drawn.card.name.toUpperCase()}
      </Text>
      <View style={[sum.rarityBadge, { backgroundColor: cfg.color + '22', borderColor: cfg.color + '55' }]}>
        <Text style={[sum.rarityText, { color: cfg.color }]}>{drawn.card.rarity.toUpperCase()}</Text>
      </View>
      <View style={drawn.isDupe ? sum.dupeBadge : sum.newBadge}>
        <Text style={drawn.isDupe ? sum.dupeText : sum.newText}>
          {drawn.isDupe ? 'DUPE' : 'NEW'}
        </Text>
      </View>
    </View>
  );
}

const sum = StyleSheet.create({
  item:        { alignItems: 'center', gap: 5, flex: 1 },
  cardName:    { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, letterSpacing: 0.3, textAlign: 'center' },
  rarityBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  rarityText:  { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, letterSpacing: 0.8 },
  newBadge:    { backgroundColor: T.status.vitality + '22', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: T.status.vitality + '55' },
  newText:     { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.status.vitality, letterSpacing: T.letterSpacing.xs },
  dupeBadge:   { backgroundColor: T.status.caution + '18', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: T.status.caution + '55' },
  dupeText:    { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.status.caution, letterSpacing: T.letterSpacing.xs },
});

// ── PackOpeningScreen ─────────────────────────────────────────────────────────
const SCREEN_W = Dimensions.get('window').width;
type Phase = 'select' | 'reveal' | 'summary';

export default function PackOpeningScreen({ navigation }: Props) {
  const gs = useGameStateContext();
  const [phase, setPhase]  = useState<Phase>('select');
  const [packId, setPackId] = useState(1);
  const [drawn,  setDrawn] = useState<DrawnCard[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [currentCard, setCurrentCard]     = useState(0);

  // ── Pack select ──────────────────────────────────────────────────────────
  const openPack = (id: number) => {
    const ok = gs.spendCoins(PACK_COST);
    if (!ok) return; // not enough credits — button is disabled anyway
    const cards = drawPack(id, gs.collection, gs.cardRoster);
    setDrawn(cards);
    setPackId(id);
    setCurrentCard(0);
    setRevealedCount(0);
    setPhase('reveal');
  };

  // ── Reveal phase ─────────────────────────────────────────────────────────
  const onCardRevealed = () => {
    setRevealedCount(prev => prev + 1);
  };

  const goToNext = () => {
    if (currentCard < drawn.length - 1) {
      setCurrentCard(prev => prev + 1);
    } else {
      setPhase('summary');
    }
  };

  // ── Collect ──────────────────────────────────────────────────────────────
  const collect = () => {
    gs.addCards(drawn.map(d => d.card.id));
    gs.addXp(XP_AWARDS.pack);
    gs.incrementPacksOpened();
    gs.advanceQuest('packs');
    for (const { card, isDupe } of drawn) {
      if (!isDupe) gs.advanceQuest('newcards');
      gs.advanceQuest('rarity',   { rarity:   card.rarity });
      gs.advanceQuest('alliance', { alliance: card.alliance });
    }
    navigation.goBack();
  };

  // ── Totals for summary ───────────────────────────────────────────────────
  const newCount  = drawn.filter(d => !d.isDupe).length;
  const dupeCount = drawn.length - newCount;

  const pack = PACKS[packId];

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <ScreenBackground theme="home" style={{ paddingTop: Platform.OS === 'ios' ? 56 : 16 }}>

      {/* Back button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
        <Text style={s.backText}>← BACK</Text>
      </TouchableOpacity>

      {/* ── PHASE: SELECT ── */}
      {phase === 'select' && (
        <ScrollView contentContainerStyle={s.selectScroll} showsVerticalScrollIndicator={false}>
          <Text style={s.screenTitle}>OPEN A PACK</Text>
          <Text style={s.screenSub}>5 cards · {PACK_COST} credits each</Text>

          <MaterialSurface style={s.balanceRow} borderRadius={12}>
            <Text style={s.balanceLabel}>YOUR BALANCE</Text>
            <Text style={s.balanceVal}>{gs.coins.toLocaleString()} CR</Text>
          </MaterialSurface>

          {[1, 2].map(id => {
            const p = PACKS[id];
            const canAfford = gs.coins >= PACK_COST;
            return (
              <TouchableOpacity
                key={id}
                style={[s.packCardOuter, !canAfford && s.packCardDisabled]}
                onPress={() => openPack(id)}
                activeOpacity={0.8}
                disabled={!canAfford}
              >
                <MaterialSurface style={s.packCard} borderRadius={18}>
                  <View style={[s.packColorBar, { backgroundColor: p.color }]} />
                  <View style={s.packInfo}>
                    <Text style={[s.packName, { color: p.color }]}>{p.name.toUpperCase()}</Text>
                    <Text style={s.packSub}>{p.subtitle}</Text>
                    <View style={s.packMeta}>
                      <Text style={s.packCards}>5 CARDS</Text>
                      <View style={[s.costBadge, { borderColor: p.color + '55', backgroundColor: p.color + '18' }]}>
                        <Text style={[s.costText, { color: p.color }]}>{PACK_COST} CR</Text>
                      </View>
                    </View>
                  </View>
                  {!canAfford && (
                    <View style={s.insufficientBadge}>
                      <Text style={s.insufficientText}>NOT ENOUGH CR</Text>
                    </View>
                  )}
                </MaterialSurface>
              </TouchableOpacity>
            );
          })}

          <MaterialSurface style={s.oddsBox}>
            <Text style={s.oddsTitle}>PULL RATES</Text>
            {RARITY_ORDER.map(r => (
              <View key={r} style={s.oddsRow}>
                <View style={[s.oddsDot, { backgroundColor: RC[r].color }]} />
                <Text style={[s.oddsRarity, { color: RC[r].color }]}>{r}</Text>
                <Text style={s.oddsChance}>{RC[r].chance}%</Text>
              </View>
            ))}
          </MaterialSurface>
        </ScrollView>
      )}

      {/* ── PHASE: REVEAL ── */}
      {phase === 'reveal' && drawn.length > 0 && (
        <View style={s.revealRoot}>
          {/* Progress */}
          <View style={s.progressRow}>
            {drawn.map((_, i) => (
              <View
                key={i}
                style={[s.dot, i < revealedCount && s.dotDone, i === currentCard && s.dotCurrent]}
              />
            ))}
          </View>
          <Text style={s.revealCounter}>CARD {currentCard + 1} / {drawn.length}</Text>

          {/* Current card slot */}
          <View style={s.revealCardArea}>
            <RevealSlot
              key={currentCard}
              drawn={drawn[currentCard]}
              onRevealed={onCardRevealed}
            />
          </View>

          {/* Card name (shown once flipped) */}
          {revealedCount > currentCard && (
            <View style={s.revealNameBox}>
              <Text style={s.revealName} numberOfLines={1}>
                {drawn[currentCard].card.name.toUpperCase()}
              </Text>
            </View>
          )}

          {/* Hint / Next button */}
          <View style={s.revealFooter}>
            {revealedCount <= currentCard ? (
              <Text style={s.tapHint}>TAP CARD TO REVEAL</Text>
            ) : currentCard < drawn.length - 1 ? (
              <TouchableOpacity style={s.nextBtn} onPress={goToNext} activeOpacity={0.85}>
                <Text style={s.nextBtnText}>NEXT CARD →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[s.nextBtn, s.nextBtnGreen]} onPress={() => setPhase('summary')} activeOpacity={0.85}>
                <Text style={[s.nextBtnText, { color: T.bg.root }]}>SEE RESULTS</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ── PHASE: SUMMARY ── */}
      {phase === 'summary' && (
        <ScrollView contentContainerStyle={s.summaryScroll} showsVerticalScrollIndicator={false}>
          <Text style={s.screenTitle}>PACK RESULTS</Text>
          <Text style={s.screenSub}>{pack.name} · {newCount} new · {dupeCount} dupes</Text>

          {/* 3-card top row */}
          <View style={s.summaryRow}>
            {drawn.slice(0, 3).map((d, i) => (
              <SummaryCard key={i} drawn={d} />
            ))}
          </View>

          {/* 2-card bottom row (centered) */}
          <View style={[s.summaryRow, s.summaryRowCenter]}>
            {drawn.slice(3, 5).map((d, i) => (
              <SummaryCard key={i + 3} drawn={d} />
            ))}
          </View>

          {/* Totals */}
          <MaterialSurface style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>XP EARNED</Text>
              <Text style={s.totalVal}>+{XP_AWARDS.pack} XP</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>NEW CARDS</Text>
              <Text style={[s.totalVal, { color: T.status.vitality }]}>{newCount} / 5</Text>
            </View>
            {dupeCount > 0 && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>DUPES</Text>
                <Text style={[s.totalVal, { color: T.status.caution }]}>{dupeCount}</Text>
              </View>
            )}
          </MaterialSurface>

          <TouchableOpacity style={s.collectBtn} onPress={collect} activeOpacity={0.85}>
            <Text style={s.collectText}>COLLECT</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

    </ScreenBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  backBtn:  { paddingHorizontal: 20, paddingVertical: 10 },
  backText: { fontFamily: 'Orbitron_700Bold', fontSize: T.font.md, color: T.accent.mint, letterSpacing: T.letterSpacing.md },

  screenTitle: { fontFamily: 'Orbitron_900Black', fontSize: T.font.xl, color: T.text.primary, letterSpacing: T.letterSpacing.xl, textAlign: 'center', marginBottom: 6 },
  screenSub:   { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.lg, color: T.text.muted, textAlign: 'center', marginBottom: 24 },

  // ── Select ──
  selectScroll: { paddingHorizontal: 20, paddingBottom: 48 },

  balanceRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderRadius: 12, padding: 14 },
  balanceLabel:{ fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.text.muted, letterSpacing: T.letterSpacing.xs },
  balanceVal:  { fontFamily: 'Orbitron_900Black', fontSize: T.font.xl, color: T.accent.mint },

  packCardOuter:    { marginBottom: 14 },
  packCard:         { flexDirection: 'row', borderRadius: 18, overflow: 'hidden' },
  packCardDisabled: { opacity: 0.4 },
  packColorBar:     { width: 6 },
  packInfo:         { flex: 1, padding: 18, gap: 6 },
  packName:         { fontFamily: 'Orbitron_700Bold', fontSize: T.font.md, letterSpacing: T.letterSpacing.md },
  packSub:          { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.md, color: T.text.muted },
  packMeta:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  packCards:        { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.text.muted, letterSpacing: T.letterSpacing.xs },
  costBadge:        { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  costText:         { fontFamily: 'Orbitron_700Bold', fontSize: T.font.sm, letterSpacing: 0.5 },
  insufficientBadge:{ justifyContent: 'center', paddingRight: 16 },
  insufficientText: { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: '#ff4060', letterSpacing: 0.5 },

  oddsBox:    { marginTop: 12, borderRadius: 14, padding: 16, gap: 8 },
  oddsTitle:  { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.text.muted, letterSpacing: T.letterSpacing.lg, marginBottom: 4 },
  oddsRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  oddsDot:    { width: 8, height: 8, borderRadius: 4 },
  oddsRarity: { fontFamily: 'Orbitron_700Bold', fontSize: T.font.sm, flex: 1, letterSpacing: 0.5 },
  oddsChance: { fontFamily: 'Orbitron_900Black', fontSize: T.font.md, color: T.text.muted },

  // ── Reveal ──
  revealRoot:     { flex: 1, alignItems: 'center', paddingTop: 8 },
  progressRow:    { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: T.bg.border },
  dotDone:        { backgroundColor: T.accent.mint },
  dotCurrent:     { backgroundColor: T.accent.mint + '66', transform: [{ scale: 1.3 }] },
  revealCounter:  { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.text.muted, letterSpacing: T.letterSpacing.lg, marginBottom: 20 },
  revealCardArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  revealNameBox:  { paddingHorizontal: 24, marginBottom: 8 },
  revealName:     { fontFamily: 'Orbitron_900Black', fontSize: T.font.lg, color: T.text.primary, letterSpacing: T.letterSpacing.md, textAlign: 'center' },
  revealFooter:   { paddingBottom: 40, paddingHorizontal: 32, width: '100%', alignItems: 'center' },
  tapHint:        { fontFamily: 'Orbitron_700Bold', fontSize: T.font.sm, color: T.bg.border, letterSpacing: T.letterSpacing.lg },
  nextBtn:        { backgroundColor: T.accent.mint, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 48 },
  nextBtnGreen:   { backgroundColor: T.status.vitality },
  nextBtnText:    { fontFamily: 'Orbitron_700Bold', fontSize: T.font.md, color: T.bg.root, letterSpacing: T.letterSpacing.lg },

  // ── Summary ──
  summaryScroll:     { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48, alignItems: 'center' },
  summaryRow:        { flexDirection: 'row', gap: 8, marginBottom: 12, width: '100%' },
  summaryRowCenter:  { justifyContent: 'center' },
  totalsBox:         { borderRadius: 14, padding: 16, gap: 10, width: '100%', marginTop: 4 },
  totalRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel:        { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.text.muted, letterSpacing: T.letterSpacing.xs },
  totalVal:          { fontFamily: 'Orbitron_900Black', fontSize: T.font.lg, color: T.accent.mint },
  collectBtn:        { backgroundColor: T.accent.mint, borderRadius: 14, paddingVertical: 18, paddingHorizontal: 64, marginTop: 16 },
  collectText:       { fontFamily: 'Orbitron_900Black', fontSize: T.font.lg, color: T.bg.root, letterSpacing: T.letterSpacing.xxl },
});
