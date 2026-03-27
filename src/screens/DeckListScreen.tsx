// DeckListScreen — deck management hub (list of saved decks + create/empty state).

import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DecksStackParamList } from '../../App';
import { useGameStateContext } from '../context/GameStateContext';
import { RC, BATTLE_RARITY_LIMITS, DECK_SIZE, MAX_SAVED_DECKS } from '../data/constants';
import { isDeckComplete } from '../data/decks';
import { ScreenBackground } from '../components/ScreenBackground';
import { MaterialSurface } from '../components/MaterialSurface';
import { ShimmerTitle } from '../components/ShimmerTitle';
import { T } from '../theme/theme';

type Props = NativeStackScreenProps<DecksStackParamList, 'DeckList'>;

const RARITY_ORDER = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'] as const;

export default function DeckListScreen({ navigation }: Props) {
  const gs = useGameStateContext();
  const { savedDecks, createDeck } = gs;

  const handleCreate = useCallback(() => {
    const n = savedDecks.length + 1;
    const id = createDeck(`Deck ${n}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('DeckEdit', { deckId: id });
  }, [savedDecks.length, createDeck, navigation]);

  // Build rarity counts for a deck
  const getRarityCounts = useCallback((cardIds: number[]) => {
    const counts: Record<string, number> = {};
    for (const id of cardIds) {
      const card = gs.cardRoster.find(c => c.id === id);
      if (card) counts[card.rarity] = (counts[card.rarity] ?? 0) + 1;
    }
    return counts;
  }, [gs.cardRoster]);

  // ── Empty state ────────────────────────────────────────────────────────────
  if (savedDecks.length === 0) {
    return (
      <ScreenBackground theme="neutral">
        <View style={s.emptyContainer}>
          <MaterialCommunityIcons name="cards-outline" size={64} color={T.accent.mintMuted} />
          <Text style={s.emptyTitle}>BUILD YOUR FIRST DECK</Text>
          <Text style={s.emptySub}>
            Create a deck of {DECK_SIZE} cards to use in battle
          </Text>
          <TouchableOpacity style={s.createBtnPrimary} onPress={handleCreate} activeOpacity={0.8}>
            <Text style={s.createBtnPrimaryText}>CREATE DECK</Text>
          </TouchableOpacity>
        </View>
      </ScreenBackground>
    );
  }

  // ── Deck list ──────────────────────────────────────────────────────────────
  return (
    <ScreenBackground theme="neutral">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.headerBlock}>
          <ShimmerTitle style={s.headerTitle}>BUILD YOUR DECKS</ShimmerTitle>
          <Text style={s.headerSub}>{savedDecks.length} / {MAX_SAVED_DECKS} decks</Text>
        </View>

        {savedDecks.map(deck => {
          const complete = isDeckComplete(deck);
          const rarityCounts = getRarityCounts(deck.cardIds);
          return (
            <TouchableOpacity
              key={deck.id}
              onPress={() => navigation.navigate('DeckEdit', { deckId: deck.id })}
              activeOpacity={0.8}
            >
              <MaterialSurface style={s.deckCard} borderRadius={14}>
                <View style={s.deckHeader}>
                  <Text style={s.deckName}>{deck.name.toUpperCase()}</Text>
                  <Text style={[s.deckCount, { color: complete ? T.status.vitality : T.text.muted }]}>
                    {deck.cardIds.length}/{DECK_SIZE}
                  </Text>
                </View>

                {/* Rarity breakdown chips */}
                <View style={s.chipRow}>
                  {RARITY_ORDER.filter(r => (rarityCounts[r] ?? 0) > 0).map(r => (
                    <View key={r} style={[s.rarityChip, { borderColor: RC[r].color + '55', backgroundColor: RC[r].color + '14' }]}>
                      <Text style={[s.rarityChipText, { color: RC[r].color }]}>
                        {rarityCounts[r]}× {r.slice(0, 3).toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Status row */}
                <View style={s.statusRow}>
                  {!complete && (
                    <View style={s.incompleteBadge}>
                      <Text style={s.incompleteBadgeText}>INCOMPLETE</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }} />
                  <MaterialCommunityIcons name="chevron-right" size={20} color={T.text.muted} />
                </View>
              </MaterialSurface>
            </TouchableOpacity>
          );
        })}

        {/* Create button */}
        {savedDecks.length < MAX_SAVED_DECKS && (
          <TouchableOpacity style={s.createBtn} onPress={handleCreate} activeOpacity={0.8}>
            <MaterialCommunityIcons name="plus" size={20} color={T.accent.mint} />
            <Text style={s.createBtnText}>CREATE NEW DECK</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  // Empty state
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyTitle:     { fontFamily: 'Orbitron_700Bold', fontSize: T.font.lg, color: T.text.primary, letterSpacing: T.letterSpacing.lg, textAlign: 'center' },
  emptySub:       { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.lg, color: T.text.muted, textAlign: 'center', lineHeight: 22 },
  createBtnPrimary: {
    marginTop: 8,
    backgroundColor: T.accent.mint,
    borderRadius: T.button.primary.radius,
    paddingVertical: T.button.primary.paddingV,
    paddingHorizontal: 32,
    transform: [{ skewX: '-3deg' }],
  },
  createBtnPrimaryText: {
    fontFamily: T.button.primary.fontFamily,
    fontSize: T.button.primary.fontSize,
    color: T.button.primary.text,
    letterSpacing: T.button.primary.letterSpacing,
    transform: [{ skewX: '3deg' }],
  },

  // List
  scroll:      { paddingHorizontal: 16, paddingBottom: 48 },
  headerBlock: { paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 10, marginBottom: 6 },
  headerTitle: { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xl, color: T.accent.mint, letterSpacing: T.letterSpacing.xl },
  headerSub:   { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.text.muted, letterSpacing: T.letterSpacing.xs, marginTop: 2 },

  deckCard:   { marginBottom: 12, padding: 14, gap: 10 },
  deckHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deckName:   { fontFamily: 'Orbitron_700Bold', fontSize: T.font.md, color: T.text.primary, letterSpacing: 0.5, flex: 1 },
  deckCount:  { fontFamily: 'Orbitron_900Black', fontSize: T.font.md },

  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rarityChip:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
  rarityChipText: { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, letterSpacing: 0.5 },

  statusRow:       { flexDirection: 'row', alignItems: 'center' },
  incompleteBadge: { backgroundColor: T.status.caution + '22', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: T.status.caution + '55' },
  incompleteBadgeText: { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.status.caution, letterSpacing: T.letterSpacing.md },

  createBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: T.accent.mint + '44', borderStyle: 'dashed', backgroundColor: T.accent.mintFaint },
  createBtnText: { fontFamily: 'Orbitron_700Bold', fontSize: T.font.sm, color: T.accent.mint, letterSpacing: T.letterSpacing.md },
});
