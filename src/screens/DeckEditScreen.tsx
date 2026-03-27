// DeckEditScreen — full deck editor with card grid, filters, search, and slots.
// Closely follows BattleLobbyScreen's deck-builder UI patterns.

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  TextInput, StyleSheet, Platform, Dimensions, Alert,
  ListRenderItemInfo, Pressable,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, runOnJS, Easing,
} from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DecksStackParamList } from '../../App';
import { useGameStateContext } from '../context/GameStateContext';
import { Card } from '../data/cards';
import { RC, RO, BATTLE_RARITY_LIMITS, DECK_SIZE } from '../data/constants';
import { isOwned } from '../hooks/useGameState';
import { CardWrapper, CARD_W, CARD_H } from '../components/CardWrapper';
import { MiniCard } from '../components/MiniCard';
import { ScreenBackground } from '../components/ScreenBackground';
import { GradientBorder, BORDER_COLORS } from '../components/GradientBorder';
import { T } from '../theme/theme';

type Props = NativeStackScreenProps<DecksStackParamList, 'DeckEdit'>;

const SCALE     = 0.38;
const NUM_COLS  = 3;
const SIDEBAR_W = 280;
const CARD_DISPLAY_W = CARD_W * SCALE;
const CARD_DISPLAY_H = CARD_H * SCALE;

const RARITY_ORDER = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'] as const;
const RARITIES     = ['All', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'] as const;
const PACK_OPTIONS = [
  { label: 'All Packs', value: 0 },
  { label: 'Pack 1',    value: 1 },
  { label: 'Pack 2',    value: 2 },
] as const;
const SORT_OPTIONS = [
  { key: 'rarity',  label: 'Rarity',      chipLabel: 'RARITY' },
  { key: 'name_az', label: 'Name A → Z',  chipLabel: 'NAME A-Z' },
  { key: 'name_za', label: 'Name Z → A',  chipLabel: 'NAME Z-A' },
  { key: 'power',   label: 'Total Power', chipLabel: 'POWER' },
] as const;
type SortKey = typeof SORT_OPTIONS[number]['key'];

// ── FilterSidebar ─────────────────────────────────────────────────────────────
interface SidebarProps {
  visible: boolean;
  rarity: string;
  typeFilter: string;
  packFilter: number;
  sortBy: SortKey;
  types: string[];
  onRarity: (v: string) => void;
  onType: (v: string) => void;
  onPack: (v: number) => void;
  onSort: (v: SortKey) => void;
  onClear: () => void;
  onClose: () => void;
}

function FilterSidebar({ visible, rarity, typeFilter, packFilter, sortBy, types, onRarity, onType, onPack, onSort, onClear, onClose }: SidebarProps) {
  const translateX = useSharedValue(SIDEBAR_W);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      translateX.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
    } else {
      translateX.value = withTiming(SIDEBAR_W, { duration: 220, easing: Easing.in(Easing.cubic) },
        (finished) => { if (finished) runOnJS(setRendered)(false); });
    }
  }, [visible]);

  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  if (!rendered) return null;

  return (
    <>
      <Pressable style={sb.backdrop} onPress={onClose} />
      <Animated.View style={[sb.panel, slideStyle]}>
        <View style={sb.header}>
          <Text style={sb.title}>FILTERS</Text>
          <TouchableOpacity onPress={onClose} style={sb.closeBtn}>
            <MaterialCommunityIcons name="close" size={18} color={T.text.muted} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sb.scroll}>
          <Text style={sb.sectionLabel}>RARITY</Text>
          {RARITIES.map(r => {
            const active = rarity === r;
            const color  = r === 'All' ? T.accent.mint : (RC[r]?.color ?? T.text.primary);
            return (
              <TouchableOpacity key={r} style={sb.radioRow} onPress={() => onRarity(r)}>
                <View style={[sb.radioOuter, { borderColor: active ? color : T.bg.border }]}>
                  {active && <View style={[sb.radioInner, { backgroundColor: color }]} />}
                </View>
                <Text style={[sb.radioLabel, { color: active ? color : T.text.muted }]}>{r}</Text>
              </TouchableOpacity>
            );
          })}

          <View style={sb.divider} />
          <Text style={sb.sectionLabel}>TYPE</Text>
          {types.map(t => {
            const active = typeFilter === t;
            return (
              <TouchableOpacity key={t} style={sb.radioRow} onPress={() => onType(t)}>
                <View style={[sb.radioOuter, { borderColor: active ? T.accent.mint : T.bg.border }]}>
                  {active && <View style={[sb.radioInner, { backgroundColor: T.accent.mint }]} />}
                </View>
                <Text style={[sb.radioLabel, { color: active ? T.accent.mint : T.text.muted }]}>{t}</Text>
              </TouchableOpacity>
            );
          })}

          <View style={sb.divider} />
          <Text style={sb.sectionLabel}>PACK</Text>
          {PACK_OPTIONS.map(p => {
            const active = packFilter === p.value;
            return (
              <TouchableOpacity key={p.value} style={sb.radioRow} onPress={() => onPack(p.value)}>
                <View style={[sb.radioOuter, { borderColor: active ? T.accent.mint : T.bg.border }]}>
                  {active && <View style={[sb.radioInner, { backgroundColor: T.accent.mint }]} />}
                </View>
                <Text style={[sb.radioLabel, { color: active ? T.accent.mint : T.text.muted }]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}

          <View style={sb.divider} />
          <Text style={sb.sectionLabel}>SORT BY</Text>
          {SORT_OPTIONS.map(opt => {
            const active = sortBy === opt.key;
            return (
              <TouchableOpacity key={opt.key} style={sb.radioRow} onPress={() => onSort(opt.key)}>
                <View style={[sb.radioOuter, { borderColor: active ? T.accent.violet : T.bg.border }]}>
                  {active && <View style={[sb.radioInner, { backgroundColor: T.accent.violet }]} />}
                </View>
                <Text style={[sb.radioLabel, { color: active ? T.accent.violet : T.text.muted }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}

          <View style={sb.divider} />
          <TouchableOpacity style={sb.clearBtn} onPress={onClear}>
            <Text style={sb.clearText}>CLEAR ALL FILTERS</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </>
  );
}

const sb = StyleSheet.create({
  backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 10 },
  panel:      { position: 'absolute', right: 0, top: 0, bottom: 0, width: SIDEBAR_W, backgroundColor: T.bg.surface, borderLeftWidth: 1, borderLeftColor: T.bg.border, zIndex: 11, paddingTop: Platform.OS === 'ios' ? 56 : 16 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: T.bg.border },
  title:      { fontFamily: 'Orbitron_700Bold', fontSize: T.font.lg, color: T.accent.mint, letterSpacing: T.letterSpacing.lg },
  closeBtn:   { padding: 4 },
  scroll:     { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  sectionLabel: { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.text.muted, letterSpacing: T.letterSpacing.lg, marginBottom: 8, marginTop: 4 },
  radioRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 8, height: 8, borderRadius: 4 },
  radioLabel: { fontFamily: 'Orbitron_700Bold', fontSize: T.font.sm, letterSpacing: 0.3 },
  divider:    { height: 1, backgroundColor: T.bg.border, marginVertical: 12 },
  clearBtn:   { marginTop: 8, paddingVertical: T.button.destructive.paddingV, borderRadius: T.button.destructive.radius, borderWidth: 1, borderColor: T.status.danger, alignItems: 'center', backgroundColor: T.status.danger + '11', transform: [{ skewX: '-3deg' }] },
  clearText:  { fontFamily: T.button.destructive.fontFamily, fontSize: T.button.destructive.fontSize, color: T.button.destructive.text, letterSpacing: T.button.destructive.letterSpacing, transform: [{ skewX: '3deg' }] },
});

// ── DeckSlot ──────────────────────────────────────────────────────────────────
function DeckSlot({ card, onRemove }: { card: Card | undefined; onRemove: () => void }) {
  if (!card) {
    return <View style={slot.empty}><Text style={slot.emptyText}>+</Text></View>;
  }
  const color = RC[card.rarity]?.color ?? '#808898';
  return (
    <TouchableOpacity style={[slot.filled, { borderColor: color + '55' }]} onPress={onRemove} activeOpacity={0.7}>
      <View style={[slot.rarityBar, { backgroundColor: color }]} />
      <Text style={[slot.cardNum, { color: color + 'aa' }]}>#{String(card.id).padStart(3, '0')}</Text>
      <Text style={slot.cardName} numberOfLines={2}>{card.name.toUpperCase()}</Text>
    </TouchableOpacity>
  );
}

const slot = StyleSheet.create({
  empty:     { width: 64, height: 88, borderRadius: 8, borderWidth: 1, borderColor: T.bg.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xl, color: '#2a2a48' },
  filled:    { width: 64, height: 88, borderRadius: 8, borderWidth: 1, backgroundColor: T.bg.surface, overflow: 'hidden' },
  rarityBar: { height: 3, width: '100%' },
  cardNum:   { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, letterSpacing: 0.5, marginTop: 4, marginHorizontal: 5 },
  cardName:  { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.text.body, letterSpacing: 0.2, marginHorizontal: 5, marginTop: 2, lineHeight: 10 },
});

// ── DeckCardCell ─────────────────────────────────────────────────────────────
interface CellProps {
  card: Card;
  inDeck: boolean;
  canAdd: boolean;
  onToggle: () => void;
}

const DeckCardCell = React.memo(function DeckCardCell({ card, inDeck, canAdd, onToggle }: CellProps) {
  const dimmed = !inDeck && !canAdd;

  return (
    <TouchableOpacity
      style={grid.cell}
      onPress={onToggle}
      activeOpacity={dimmed && !inDeck ? 1 : 0.85}
      disabled={dimmed && !inDeck}
    >
      <View style={{ opacity: dimmed ? 0.35 : 1 }}>
        <CardWrapper scale={SCALE}>
          <MiniCard card={card} />
        </CardWrapper>
      </View>

      {/* Selected overlay — green border + check badge */}
      {inDeck && (
        <View style={[grid.overlay, { borderColor: T.status.vitality, borderWidth: 2, borderRadius: 6 }]}>
          <View style={grid.checkBadge}>
            <Text style={grid.checkText}>✓</Text>
          </View>
        </View>
      )}

      {/* Rarity-limit overlay */}
      {!inDeck && !canAdd && (
        <View style={[grid.overlay, grid.limitOverlay]}>
          <Text style={grid.limitText}>MAX</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const grid = StyleSheet.create({
  cell:         { width: CARD_DISPLAY_W, alignItems: 'center' },
  overlay:      { position: 'absolute', top: 0, left: 0, width: CARD_DISPLAY_W, height: CARD_DISPLAY_H, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  checkBadge:   { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: T.status.vitality, alignItems: 'center', justifyContent: 'center' },
  checkText:    { fontFamily: 'Orbitron_700Bold', fontSize: T.font.sm, color: T.text.primary },
  limitOverlay: { backgroundColor: 'rgba(0,0,0,0.0)' },
  limitText:    { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.status.caution, letterSpacing: T.letterSpacing.md, backgroundColor: T.status.caution + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: T.status.caution + '55' },
});

// ── DeckNameInput — isolated to prevent re-renders from disrupting typing ────
const DeckNameInput = React.memo(function DeckNameInput({ initialName, nameRef }: { initialName: string; nameRef: React.MutableRefObject<string> }) {
  return (
    <View style={s.nameWrapper}>
      <View style={s.nameRow}>
        <TextInput
          style={s.nameInput}
          defaultValue={initialName}
          onChangeText={(t) => { nameRef.current = t; }}
          maxLength={15}
          autoCapitalize="characters"
          autoCorrect={false}
          selectTextOnFocus={false}
          returnKeyType="done"
          blurOnSubmit
        />
        <MaterialCommunityIcons name="pencil" size={14} color={T.text.primary} style={s.nameIcon} />
      </View>
    </View>
  );
});

// ── DeckEditScreen ───────────────────────────────────────────────────────────
export default function DeckEditScreen({ navigation, route }: Props) {
  const { deckId } = route.params;
  const gs = useGameStateContext();
  const deck = gs.savedDecks.find(d => d.id === deckId);

  const ALL_TYPES = useMemo(() => ['All', ...Array.from(new Set(gs.cardRoster.map(c => c.type))).sort()], [gs.cardRoster]);

  // Local state — synced to game state on save or back navigation
  const [localDeck, setLocalDeck] = useState<number[]>(() => deck?.cardIds ?? []);
  const localDeckRef = useRef(localDeck);
  localDeckRef.current = localDeck;
  // Deck name is uncontrolled — stored in ref only to avoid re-rendering the
  // entire card grid on every keystroke.
  const deckNameRef = useRef(deck?.name ?? 'Deck');

  // Filter state
  const [rarity, setRarity]             = useState<string>('All');
  const [typeFilter, setTypeFilter]     = useState<string>('All');
  const [packFilter, setPackFilter]     = useState<number>(0);
  const [sortBy, setSortBy]             = useState<SortKey>('rarity');
  const [search, setSearch]             = useState('');
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const activeFilterCount = [rarity !== 'All', typeFilter !== 'All', packFilter !== 0, sortBy !== 'rarity'].filter(Boolean).length;
  const clearFilters = useCallback(() => {
    setRarity('All'); setTypeFilter('All'); setPackFilter(0); setSortBy('rarity');
  }, []);

  // Auto-save on back navigation
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      const name = deckNameRef.current.trim() || 'Deck';
      gs.updateDeck(deckId, { name, cardIds: localDeckRef.current });
    });
    return unsubscribe;
  }, [navigation, deckId, gs.updateDeck]);

  // Owned cards
  const ownedCards = useMemo(() =>
    gs.cardRoster.filter(c => isOwned(gs.collection, c.id)),
    [gs.collection, gs.cardRoster],
  );

  // Filtered + sorted
  const filteredCards = useMemo(() => {
    let list = ownedCards;
    if (rarity !== 'All')      list = list.filter(c => c.rarity === rarity);
    if (typeFilter !== 'All')  list = list.filter(c => c.type === typeFilter);
    if (packFilter !== 0)      list = list.filter(c => c.pack === packFilter);
    if (search.trim())         list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'rarity':  return RO[a.rarity] - RO[b.rarity] || a.name.localeCompare(b.name);
        case 'name_az': return a.name.localeCompare(b.name);
        case 'name_za': return b.name.localeCompare(a.name);
        case 'power':   return (b.power + b.defense + b.speed) - (a.power + a.defense + a.speed);
        default:        return 0;
      }
    });
  }, [ownedCards, rarity, typeFilter, packFilter, search, sortBy]);

  // Grid data with null fillers
  const gridData = useMemo<(Card | null)[]>(() => {
    const rem = filteredCards.length % NUM_COLS;
    if (rem === 0) return filteredCards;
    return [...filteredCards, ...Array(NUM_COLS - rem).fill(null)];
  }, [filteredCards]);

  // Rarity counts
  const rarityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const id of localDeck) {
      const card = gs.cardRoster.find(c => c.id === id);
      if (card) counts[card.rarity] = (counts[card.rarity] ?? 0) + 1;
    }
    return counts;
  }, [localDeck, gs.cardRoster]);

  const canAdd = useCallback((card: Card): boolean => {
    if (localDeck.length >= DECK_SIZE) return false;
    if (localDeck.includes(card.id)) return false;
    if ((rarityCounts[card.rarity] ?? 0) >= (BATTLE_RARITY_LIMITS[card.rarity] ?? 10)) return false;
    return true;
  }, [localDeck, rarityCounts]);

  const toggleCard = useCallback((card: Card) => {
    if (localDeck.includes(card.id)) {
      setLocalDeck(prev => prev.filter(id => id !== card.id));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (canAdd(card)) {
      setLocalDeck(prev => [...prev, card.id]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [localDeck, canAdd]);

  const deckCards = useMemo(() =>
    localDeck.map(id => gs.cardRoster.find(c => c.id === id)),
    [localDeck, gs.cardRoster],
  );

  const handleSave = useCallback(() => {
    if (!deckNameRef.current.trim()) {
      Alert.alert('Name Required', 'Please enter a name for your deck.');
      return;
    }
    gs.updateDeck(deckId, { name: deckNameRef.current.trim(), cardIds: localDeck });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.goBack();
  }, [deckId, localDeck, gs.updateDeck, navigation]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Deck',
      `Are you sure you want to delete "${deckNameRef.current}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => {
            gs.deleteDeck(deckId);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.goBack();
          },
        },
      ],
    );
  }, [deckId, gs.deleteDeck, navigation]);

  const renderCard = useCallback(({ item }: ListRenderItemInfo<Card | null>) => {
    if (!item) return <View style={{ width: CARD_DISPLAY_W }} />;
    return (
      <DeckCardCell
        card={item}
        inDeck={localDeck.includes(item.id)}
        canAdd={canAdd(item)}
        onToggle={() => toggleCard(item)}
      />
    );
  }, [localDeck, canAdd, toggleCard]);

  const keyExtractor = useCallback((item: Card | null, idx: number) =>
    item ? String(item.id) : `filler-${idx}`, []);

  const deckFull = localDeck.length === DECK_SIZE;
  const remaining = DECK_SIZE - localDeck.length;

  return (
    <ScreenBackground theme="neutral">
      {/* Fixed header */}
      <View style={s.header}>
        {/* Back + deck name row */}
        <View style={s.backRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="chevron-left" size={18} color={T.accent.mint} />
            <Text style={s.backText}>BACK</Text>
          </TouchableOpacity>
          <Text style={[s.deckCount, { color: deckFull ? T.status.vitality : T.text.muted }]}>
            {localDeck.length}/{DECK_SIZE}
          </Text>
        </View>

        {/* Editable deck name */}
        <DeckNameInput initialName={deckNameRef.current} nameRef={deckNameRef} />

        {/* Rarity limits row */}
        <View style={s.limitsRow}>
          {RARITY_ORDER.map(r => {
            const limit = BATTLE_RARITY_LIMITS[r] ?? 10;
            const count = rarityCounts[r] ?? 0;
            const color = RC[r].color;
            const atLimit = count >= limit;
            return (
              <View key={r} style={[s.limitChip, { borderColor: atLimit ? color + '88' : T.bg.border }]}>
                <Text style={[s.limitRarity, { color: atLimit ? color : T.text.muted }]}>{r.slice(0, 3).toUpperCase()}</Text>
                <Text style={[s.limitCount, { color: atLimit ? color : T.text.muted }]}>{count}/{limit}</Text>
              </View>
            );
          })}
        </View>

        {/* Deck slots */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.slotsScroll}>
          {Array.from({ length: DECK_SIZE }).map((_, i) => (
            <DeckSlot
              key={i}
              card={deckCards[i]}
              onRemove={() => {
                const id = localDeck[i];
                if (id != null) {
                  setLocalDeck(prev => prev.filter(x => x !== id));
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
            />
          ))}
        </ScrollView>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <View style={s.chipRow}>
            {rarity !== 'All' && (
              <TouchableOpacity style={[s.chip, { borderColor: RC[rarity]?.color ?? T.accent.mint }]} onPress={() => setRarity('All')}>
                <Text style={[s.chipText, { color: RC[rarity]?.color ?? T.accent.mint }]}>{rarity}</Text>
                <MaterialCommunityIcons name="close" size={10} color={RC[rarity]?.color ?? T.accent.mint} />
              </TouchableOpacity>
            )}
            {typeFilter !== 'All' && (
              <TouchableOpacity style={s.chip} onPress={() => setTypeFilter('All')}>
                <Text style={s.chipText}>{typeFilter}</Text>
                <MaterialCommunityIcons name="close" size={10} color={T.accent.mint} />
              </TouchableOpacity>
            )}
            {packFilter !== 0 && (
              <TouchableOpacity style={s.chip} onPress={() => setPackFilter(0)}>
                <Text style={s.chipText}>Pack {packFilter}</Text>
                <MaterialCommunityIcons name="close" size={10} color={T.accent.mint} />
              </TouchableOpacity>
            )}
            {sortBy !== 'rarity' && (
              <TouchableOpacity style={[s.chip, { borderColor: T.accent.violet }]} onPress={() => setSortBy('rarity')}>
                <Text style={[s.chipText, { color: T.accent.violet }]}>{SORT_OPTIONS.find(o => o.key === sortBy)?.chipLabel}</Text>
                <MaterialCommunityIcons name="close" size={10} color={T.accent.violet} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Search + filter row */}
        <View style={s.searchAndFilter}>
          {searchFocused ? (
            <GradientBorder colors={BORDER_COLORS.mint} borderWidth={1} borderRadius={10} innerBackground={T.bg.elevated} style={{ flex: 1 }} innerStyle={{ flex: 1 }}>
              <View style={[s.searchRow, { borderWidth: 0 }]}>
                <MaterialCommunityIcons name="magnify" size={18} color={T.text.muted} style={{ marginRight: 4 }} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Search cards..."
                  placeholderTextColor={T.bg.border}
                  value={search}
                  onChangeText={setSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <MaterialCommunityIcons name="close-circle" size={16} color={T.text.muted} />
                  </TouchableOpacity>
                )}
              </View>
            </GradientBorder>
          ) : (
            <View style={s.searchRow}>
              <MaterialCommunityIcons name="magnify" size={18} color={T.text.muted} style={{ marginRight: 4 }} />
              <TextInput
                style={s.searchInput}
                placeholder="Search cards..."
                placeholderTextColor={T.bg.border}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={T.text.muted} />
                </TouchableOpacity>
              )}
            </View>
          )}
          <TouchableOpacity
            style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
            onPress={() => setSidebarOpen(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialCommunityIcons name="tune-variant" size={18} color={activeFilterCount > 0 ? T.accent.mint : T.text.muted} />
              {activeFilterCount > 0 && <Text style={[s.filterBtnText, { color: T.accent.mint }]}>({activeFilterCount})</Text>}
            </View>
          </TouchableOpacity>
        </View>

        <Text style={s.resultsText}>{filteredCards.length} cards</Text>
      </View>

      {/* Card grid */}
      <FlatList
        data={gridData}
        keyExtractor={keyExtractor}
        renderItem={renderCard}
        numColumns={NUM_COLS}
        columnWrapperStyle={s.columnWrapper}
        contentContainerStyle={s.listContent}
        removeClippedSubviews
        windowSize={5}
        maxToRenderPerBatch={9}
        initialNumToRender={12}
      />

      {/* Footer */}
      <View style={s.footer}>
        <Text style={s.footerStatus}>
          {deckFull ? 'READY FOR BATTLE' : `${remaining} MORE CARD${remaining !== 1 ? 'S' : ''} NEEDED`}
        </Text>
        <View style={s.footerButtons}>
          <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
            <Text style={s.deleteBtnText}>DELETE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.8}>
            <Text style={s.saveBtnText}>SAVE DECK</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter sidebar */}
      <FilterSidebar
        visible={sidebarOpen}
        rarity={rarity}
        typeFilter={typeFilter}
        packFilter={packFilter}
        sortBy={sortBy}
        types={ALL_TYPES}
        onRarity={setRarity}
        onType={setTypeFilter}
        onPack={setPackFilter}
        onSort={setSortBy}
        onClear={clearFilters}
        onClose={() => setSidebarOpen(false)}
      />
    </ScreenBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Header
  header:      { paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingHorizontal: 16, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: T.bg.border },
  backRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText:    { fontFamily: 'Orbitron_700Bold', fontSize: T.font.md, color: T.accent.mint, letterSpacing: T.letterSpacing.md },
  deckCount:   { fontFamily: 'Orbitron_900Black', fontSize: T.font.xl },

  nameWrapper: { marginBottom: 8, borderBottomWidth: 1, borderBottomColor: T.bg.border, paddingBottom: 4 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  nameInput:   { fontFamily: 'Orbitron_900Black', fontSize: T.font.xl, color: T.text.primary, letterSpacing: T.letterSpacing.xl },
  nameIcon:    { marginLeft: 6, opacity: 0.6 },

  limitsRow:   { flexDirection: 'row', gap: 6, marginBottom: 8 },
  limitChip:   { flex: 1, borderWidth: 1, borderRadius: 6, paddingVertical: 4, alignItems: 'center', gap: 1 },
  limitRarity: { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, letterSpacing: 0.5 },
  limitCount:  { fontFamily: 'Orbitron_900Black', fontSize: T.font.sm },

  slotsScroll: { gap: 8, paddingBottom: 8 },

  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: T.accent.mint, backgroundColor: T.accent.mintFaint },
  chipText:    { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.accent.mint, letterSpacing: 0.5 },

  searchAndFilter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  searchRow:   { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: T.bg.elevated, borderRadius: 10, borderWidth: 1, borderColor: T.bg.border, paddingHorizontal: 10 },
  searchInput: { flex: 1, height: 36, color: T.text.body, fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.lg },
  filterBtn:   { height: 36, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: T.bg.border, backgroundColor: T.bg.elevated },
  filterBtnActive: { borderColor: T.accent.mint, backgroundColor: T.accent.mintFaint },
  filterBtnText:   { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.text.muted, letterSpacing: 0.5 },
  resultsText: { fontFamily: 'monospace', fontSize: T.font.sm, color: T.text.muted, marginBottom: 2 },

  // Grid
  listContent:   { paddingHorizontal: 8, paddingBottom: 140 },
  columnWrapper: { justifyContent: 'space-evenly', marginBottom: 8 },

  // Footer
  footer:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(8,5,10,0.92)', borderTopWidth: 1, borderTopColor: T.bg.border, paddingHorizontal: 16, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  footerStatus:  { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.text.muted, letterSpacing: T.letterSpacing.md, textAlign: 'center', marginBottom: 8 },
  footerButtons: { flexDirection: 'row', gap: 12 },
  deleteBtn:     { flex: 1, borderRadius: T.button.destructive.radius, paddingVertical: T.button.destructive.paddingV, alignItems: 'center', borderWidth: 1, borderColor: T.status.danger + '66', backgroundColor: T.status.danger + '11', transform: [{ skewX: '-3deg' }] },
  deleteBtnText: { fontFamily: T.button.destructive.fontFamily, fontSize: T.button.destructive.fontSize, color: T.button.destructive.text, letterSpacing: T.button.destructive.letterSpacing, transform: [{ skewX: '3deg' }] },
  saveBtn:       { flex: 2, borderRadius: T.button.primary.radius, paddingVertical: T.button.primary.paddingV, alignItems: 'center', backgroundColor: T.accent.mint, transform: [{ skewX: '-3deg' }] },
  saveBtnText:   { fontFamily: T.button.primary.fontFamily, fontSize: T.button.primary.fontSize, color: T.button.primary.text, letterSpacing: T.button.primary.letterSpacing, transform: [{ skewX: '3deg' }] },
});
