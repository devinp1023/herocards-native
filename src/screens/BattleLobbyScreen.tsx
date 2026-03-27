// BattleLobbyScreen — deck picker + opponent selector.
// Phase 'deck': choose a premade deck from the Decks tab.
// Phase 'opponent': difficulty tier selector with rewards preview.

import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { BattleStackParamList } from '../../App';
import { useGameStateContext } from '../context/GameStateContext';
import {
  RC, DECK_SIZE,
  BATTLE_REWARDS, TIER_INFO,
} from '../data/constants';
import { isDeckComplete } from '../data/decks';
import { MaterialSurface } from '../components/MaterialSurface';
import { ScreenBackground } from '../components/ScreenBackground';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { T } from '../theme/theme';

type Props = NativeStackScreenProps<BattleStackParamList, 'BattleLobby'>;
type Phase = 'deck' | 'opponent';

const RARITY_ORDER = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'] as const;

// ── OpponentCard ──────────────────────────────────────────────────────────────
const OpponentCard = React.memo(function OpponentCard({ tier, onPress }: { tier: typeof TIER_INFO[0]; onPress: () => void }) {
  const rewards = BATTLE_REWARDS[tier.tier];
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={opp.cardOuter}>
      <MaterialSurface style={opp.card}>
        <View style={[opp.badge, { borderColor: tier.color + '55', backgroundColor: tier.color + '18' }]}>
          <Text style={[opp.symbol, { color: tier.color }]}>{tier.symbol}</Text>
        </View>
        <View style={opp.info}>
          <View style={opp.nameRow}>
            <Text style={[opp.name, { color: tier.color }]}>{tier.name.toUpperCase()}</Text>
            <View style={opp.dots}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={[opp.dot, { backgroundColor: i < tier.difficulty ? tier.color : tier.color + '28' }]} />
              ))}
            </View>
          </View>
          <Text style={opp.desc} numberOfLines={2}>{tier.description}</Text>
          <View style={opp.rewards}>
            <Text style={opp.win}>Win  +{rewards.winCredits} CR  +{rewards.winXp} XP</Text>
            <Text style={opp.loss}>Loss  +{rewards.lossCredits} CR  +{rewards.lossXp} XP</Text>
          </View>
        </View>
        <TouchableOpacity style={[opp.arrow, { borderColor: tier.color + '66' }]} onPress={onPress}>
          <MaterialCommunityIcons name="chevron-right" size={20} color={tier.color} />
        </TouchableOpacity>
      </MaterialSurface>
    </TouchableOpacity>
  );
});

const opp = StyleSheet.create({
  cardOuter: { marginBottom: 10 },
  card:      { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, gap: 12 },
  badge:     { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  symbol:    { fontSize: T.font.xl, lineHeight: 24 },
  info:      { flex: 1, gap: 4 },
  nameRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name:      { fontFamily: 'Orbitron_700Bold', fontSize: T.font.md, letterSpacing: 0.5 },
  dots:      { flexDirection: 'row', gap: 3 },
  dot:       { width: 6, height: 6, borderRadius: 3 },
  desc:      { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.md, color: T.text.muted, lineHeight: 16 },
  rewards:   { flexDirection: 'row', gap: 12 },
  win:       { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.sm, color: T.accent.mint },
  loss:      { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.sm, color: T.text.muted },
  arrow:     { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});

// ── BattleLobbyScreen ─────────────────────────────────────────────────────────
export default function BattleLobbyScreen({ navigation }: Props) {
  const gs = useGameStateContext();
  const rootNav = useNavigation<any>();

  const [phase, setPhase]           = useState<Phase>('deck');
  const [battleDeck, setBattleDeck] = useState<number[]>([]);

  // Rarity counts for the selected deck (used in opponent phase summary)
  const rarityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const id of battleDeck) {
      const card = gs.cardRoster.find(c => c.id === id);
      if (card) counts[card.rarity] = (counts[card.rarity] ?? 0) + 1;
    }
    return counts;
  }, [battleDeck, gs.cardRoster]);

  // Separate complete and incomplete decks
  const completeDecks = useMemo(() => gs.savedDecks.filter(isDeckComplete), [gs.savedDecks]);
  const incompleteDecks = useMemo(() => gs.savedDecks.filter(d => !isDeckComplete(d)), [gs.savedDecks]);

  // Build rarity counts for a deck's card IDs
  const getDeckRarityCounts = (cardIds: number[]) => {
    const counts: Record<string, number> = {};
    for (const id of cardIds) {
      const card = gs.cardRoster.find(c => c.id === id);
      if (card) counts[card.rarity] = (counts[card.rarity] ?? 0) + 1;
    }
    return counts;
  };

  // ── Opponent select ───────────────────────────────────────────────────────
  if (phase === 'opponent') {
    return (
      <ScreenBackground theme="battle">
        <ScrollView contentContainerStyle={s.oppScroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => setPhase('deck')} style={s.backBtn} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialCommunityIcons name="chevron-left" size={18} color={T.accent.mint} />
              <Text style={s.backText}>CHANGE DECK</Text>
            </View>
          </TouchableOpacity>
          <Text style={s.screenTitle}>CHOOSE OPPONENT</Text>
          <Text style={s.oppSub}>Higher tiers mean tougher opponents and bigger rewards.</Text>

          {/* Deck summary */}
          <MaterialSurface style={s.deckSummary} borderRadius={12}>
            <Text style={s.deckSummaryLabel}>YOUR DECK  ·  {DECK_SIZE} CARDS</Text>
            <View style={s.deckSummaryChips}>
              {RARITY_ORDER.filter(r => (rarityCounts[r] ?? 0) > 0).map(r => (
                <View key={r} style={[s.summaryChip, { borderColor: RC[r].color + '55', backgroundColor: RC[r].color + '14' }]}>
                  <Text style={[s.summaryChipText, { color: RC[r].color }]}>
                    {rarityCounts[r]}× {r.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </MaterialSurface>

          {TIER_INFO.map(tier => (
            <OpponentCard key={tier.tier} tier={tier} onPress={() => navigation.navigate('Battle', { playerDeck: battleDeck, tier: tier.tier })} />
          ))}
        </ScrollView>
      </ScreenBackground>
    );
  }

  // ── Deck picker ─────────────────────────────────────────────────────────────
  const hasNoDecks = gs.savedDecks.length === 0;
  const hasNoCompleteDecks = completeDecks.length === 0 && !hasNoDecks;

  return (
    <ScreenBackground theme="battle">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MaterialCommunityIcons name="chevron-left" size={18} color={T.accent.mint} />
            <Text style={s.backText}>BACK</Text>
          </View>
        </TouchableOpacity>
        <Text style={s.screenTitle}>CHOOSE YOUR DECK</Text>

        {/* Empty state — no decks at all */}
        {hasNoDecks && (
          <View style={s.emptyState}>
            <MaterialCommunityIcons name="cards-outline" size={56} color={T.accent.mintMuted} />
            <Text style={s.emptyTitle}>NO DECKS BUILT</Text>
            <Text style={s.emptySub}>
              Build a deck of {DECK_SIZE} cards on the Decks tab to start battling
            </Text>
            <TouchableOpacity
              style={s.emptyBtn}
              activeOpacity={0.8}
              onPress={() => {
                navigation.goBack();
                rootNav.navigate('DecksTab');
              }}
            >
              <Text style={s.emptyBtnText}>BUILD A DECK</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state — decks exist but none are complete */}
        {hasNoCompleteDecks && (
          <View style={s.emptyState}>
            <MaterialCommunityIcons name="cards-outline" size={56} color={T.accent.mintMuted} />
            <Text style={s.emptyTitle}>NO DECKS READY</Text>
            <Text style={s.emptySub}>
              Your decks need {DECK_SIZE} cards each. Finish a deck on the Decks tab to battle.
            </Text>
            <TouchableOpacity
              style={s.emptyBtn}
              activeOpacity={0.8}
              onPress={() => {
                navigation.goBack();
                rootNav.navigate('DecksTab');
              }}
            >
              <Text style={s.emptyBtnText}>FINISH A DECK</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Complete decks */}
        {completeDecks.length > 0 && (
          <>
            <Text style={s.sectionLabel}>READY FOR BATTLE</Text>
            {completeDecks.map(deck => {
              const rc = getDeckRarityCounts(deck.cardIds);
              return (
                <TouchableOpacity
                  key={deck.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    setBattleDeck(deck.cardIds);
                    setPhase('opponent');
                  }}
                >
                  <MaterialSurface style={s.deckCard} borderRadius={14}>
                    <View style={s.deckHeader}>
                      <Text style={s.deckName}>{deck.name.toUpperCase()}</Text>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={T.accent.mint} />
                    </View>
                    <View style={s.chipRow}>
                      {RARITY_ORDER.filter(r => (rc[r] ?? 0) > 0).map(r => (
                        <View key={r} style={[s.summaryChip, { borderColor: RC[r].color + '55', backgroundColor: RC[r].color + '14' }]}>
                          <Text style={[s.summaryChipText, { color: RC[r].color }]}>
                            {rc[r]}× {r.slice(0, 3).toUpperCase()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </MaterialSurface>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Incomplete decks */}
        {incompleteDecks.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { marginTop: 16 }]}>INCOMPLETE</Text>
            {incompleteDecks.map(deck => (
              <View key={deck.id} style={{ opacity: 0.45 }}>
                <MaterialSurface style={s.deckCard} borderRadius={14}>
                  <View style={s.deckHeader}>
                    <Text style={s.deckName}>{deck.name.toUpperCase()}</Text>
                    <Text style={s.incompleteCount}>{deck.cardIds.length}/{DECK_SIZE}</Text>
                  </View>
                  <View style={s.incompleteBadge}>
                    <Text style={s.incompleteBadgeText}>INCOMPLETE</Text>
                  </View>
                </MaterialSurface>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Shared
  screenTitle:  { fontFamily: 'Orbitron_900Black', fontSize: T.font.xl, color: T.text.primary, letterSpacing: T.letterSpacing.xl },
  backBtn:      { paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 16 },
  backText:     { fontFamily: 'Orbitron_700Bold', fontSize: T.font.md, color: T.accent.mint, letterSpacing: T.letterSpacing.md },

  // Deck picker
  scroll:       { paddingHorizontal: 16, paddingBottom: 48 },
  sectionLabel: { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.text.muted, letterSpacing: T.letterSpacing.lg, marginBottom: 10, marginTop: 8 },

  deckCard:     { marginBottom: 12, padding: 14, gap: 10 },
  deckHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deckName:     { fontFamily: 'Orbitron_700Bold', fontSize: T.font.md, color: T.text.primary, letterSpacing: 0.5, flex: 1 },
  incompleteCount: { fontFamily: 'Orbitron_900Black', fontSize: T.font.md, color: T.text.muted },

  chipRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  summaryChip:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
  summaryChipText:  { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, letterSpacing: 0.5 },

  incompleteBadge:     { alignSelf: 'flex-start', backgroundColor: T.status.caution + '22', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: T.status.caution + '55' },
  incompleteBadgeText: { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.status.caution, letterSpacing: T.letterSpacing.md },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontFamily: 'Orbitron_700Bold', fontSize: T.font.lg, color: T.text.primary, letterSpacing: T.letterSpacing.md, textAlign: 'center' },
  emptySub:   { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.lg, color: T.text.muted, textAlign: 'center', lineHeight: 22 },
  emptyBtn:   { marginTop: 8, backgroundColor: T.accent.mint, borderRadius: T.button.primary.radius, paddingVertical: T.button.primary.paddingV, paddingHorizontal: 32, transform: [{ skewX: '-3deg' }] },
  emptyBtnText: { fontFamily: T.button.primary.fontFamily, fontSize: T.button.primary.fontSize, color: T.button.primary.text, letterSpacing: T.button.primary.letterSpacing, transform: [{ skewX: '3deg' }] },

  // Opponent select
  oppScroll:        { paddingHorizontal: 16, paddingBottom: 48 },
  oppSub:           { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.lg, color: T.text.muted, marginBottom: 16 },
  deckSummary:      { borderRadius: 12, padding: 12, marginBottom: 16, gap: 8 },
  deckSummaryLabel: { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.text.muted, letterSpacing: T.letterSpacing.md },
  deckSummaryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
