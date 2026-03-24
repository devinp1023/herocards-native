// CollectionScreen — 2-col card grid + slide-in filter sidebar.
// Owned cards → HeroCard; unowned → MissingCard.
// Real owned-set comes from Firebase in Session 13; for now:
//   God Mode (uid === '__god__') → all 200 cards
//   Otherwise → first 40 cards as a mock collection

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ListRenderItemInfo,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CollectionStackParamList } from '../../App';
import { isOwned, cardCount, totalUniqueOwned } from '../hooks/useGameState';
import { useGameStateContext } from '../context/GameStateContext';
import { ALL_CARDS, Card } from '../data/cards';
import { RC, RO } from '../data/constants';
import { CardWrapper, CARD_W } from '../components/CardWrapper';
import { MiniCard } from '../components/MiniCard';
import { MissingCard } from '../components/MissingCard';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../theme/theme';
import { GradientBorder, BORDER_COLORS } from '../components/GradientBorder';
import { ScreenBackground } from '../components/ScreenBackground';


type Props = NativeStackScreenProps<CollectionStackParamList, 'Collection'>;

// ── Filter / sort config ──────────────────────────────────────────────────────
const RARITIES = ['All', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'] as const;
const PACKS    = [
  { label: 'All Packs', value: 0 },
  { label: 'Pack 1 🌊', value: 1 },
  { label: 'Pack 2 🌑', value: 2 },
] as const;
const SORT_OPTIONS = [
  { key: 'rarity',  label: 'Rarity',       chipLabel: 'RARITY' },
  { key: 'name_az', label: 'Name A → Z',   chipLabel: 'NAME A-Z' },
  { key: 'name_za', label: 'Name Z → A',   chipLabel: 'NAME Z-A' },
  { key: 'power',   label: 'Total Power',  chipLabel: 'POWER' },
  { key: 'owned',   label: 'Number Owned', chipLabel: '# OWNED' },
] as const;
type SortKey = typeof SORT_OPTIONS[number]['key'];


const SCALE      = 0.38;
const NUM_COLS   = 3;
const SIDEBAR_W  = 280;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

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

function FilterSidebar({
  visible, rarity, typeFilter, packFilter, sortBy, types,
  onRarity, onType, onPack, onSort, onClear, onClose,
}: SidebarProps) {
  const translateX = useSharedValue(SIDEBAR_W);
  // `rendered` tracks whether the sidebar is in the tree at all.
  // We keep it mounted during the slide-out animation, then unmount it via
  // runOnJS so the backdrop stops blocking touches.
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      translateX.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
    } else {
      translateX.value = withTiming(
        SIDEBAR_W,
        { duration: 220, easing: Easing.in(Easing.cubic) },
        (finished) => { if (finished) runOnJS(setRendered)(false); },
      );
    }
  }, [visible]);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!rendered) return null;

  return (
    <>
      {/* Dim backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Sidebar panel */}
      <Animated.View style={[styles.sidebar, slideStyle]}>
          {/* Left-edge light catch — 1px bright line on left border */}
          <View style={styles.sidebarLeftEdge} pointerEvents="none" />
          {/* Left-side inner glow — light falloff from left edge */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.03)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.sidebarInnerGlow}
            pointerEvents="none"
          />
          {/* Header */}
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>FILTERS</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarScroll}>

            {/* ── Rarity ── */}
            <Text style={styles.sectionLabel}>RARITY</Text>
            {RARITIES.map(r => {
              const active = rarity === r;
              const color  = r === 'All' ? T.accent.mint : RC[r]?.color ?? '#fff';
              return (
                <TouchableOpacity key={r} style={styles.radioRow} onPress={() => onRarity(r)}>
                  <View style={[styles.radioOuter, { borderColor: active ? color : T.bg.border }]}>
                    {active && <View style={[styles.radioInner, { backgroundColor: color }]} />}
                  </View>
                  <Text style={[styles.radioLabel, { color: active ? color : T.text.muted }]}>{r}</Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.divider} />

            {/* ── Type ── */}
            <Text style={styles.sectionLabel}>TYPE</Text>
            {types.map(t => {
              const active = typeFilter === t;
              return (
                <TouchableOpacity key={t} style={styles.radioRow} onPress={() => onType(t)}>
                  <View style={[styles.radioOuter, { borderColor: active ? T.accent.mint : T.bg.border }]}>
                    {active && <View style={[styles.radioInner, { backgroundColor: T.accent.mint }]} />}
                  </View>
                  <Text style={[styles.radioLabel, { color: active ? T.accent.mint : T.text.muted }]}>{t}</Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.divider} />

            {/* ── Pack ── */}
            <Text style={styles.sectionLabel}>PACK</Text>
            {PACKS.map(p => {
              const active = packFilter === p.value;
              return (
                <TouchableOpacity key={p.value} style={styles.radioRow} onPress={() => onPack(p.value)}>
                  <View style={[styles.radioOuter, { borderColor: active ? T.accent.mint : T.bg.border }]}>
                    {active && <View style={[styles.radioInner, { backgroundColor: T.accent.mint }]} />}
                  </View>
                  <Text style={[styles.radioLabel, { color: active ? T.accent.mint : T.text.muted }]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.divider} />

            {/* ── Sort ── */}
            <Text style={styles.sectionLabel}>SORT BY</Text>
            {SORT_OPTIONS.map(s => {
              const active = sortBy === s.key;
              return (
                <TouchableOpacity key={s.key} style={styles.radioRow} onPress={() => onSort(s.key)}>
                  <View style={[styles.radioOuter, { borderColor: active ? T.accent.violet : T.bg.border }]}>
                    {active && <View style={[styles.radioInner, { backgroundColor: T.accent.violet }]} />}
                  </View>
                  <Text style={[styles.radioLabel, { color: active ? T.accent.violet : T.text.muted }]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.divider} />

            {/* Clear all */}
            <TouchableOpacity style={styles.clearAllBtn} onPress={onClear}>
              <Text style={styles.clearAllText}>CLEAR ALL FILTERS</Text>
            </TouchableOpacity>

          </ScrollView>
      </Animated.View>
    </>
  );
}

// ── CollectionScreen ──────────────────────────────────────────────────────────
export default function CollectionScreen({ navigation }: Props) {
  const gs = useGameStateContext();
  const ALL_TYPES = useMemo(() => ['All', ...Array.from(new Set(gs.cardRoster.map(c => c.type))).sort()], [gs.cardRoster]);

  const [search,      setSearch]      = useState('');
  const [rarity,      setRarity]      = useState<string>('All');
  const [typeFilter,  setTypeFilter]  = useState<string>('All');
  const [packFilter,  setPackFilter]  = useState<number>(0);
  const [sortBy,      setSortBy]      = useState<SortKey>('rarity');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const activeFilterCount = [
    rarity !== 'All',
    typeFilter !== 'All',
    packFilter !== 0,
    sortBy !== 'rarity',
  ].filter(Boolean).length;

  const clearFilters = useCallback(() => {
    setRarity('All');
    setTypeFilter('All');
    setPackFilter(0);
    setSortBy('rarity');
  }, []);

  // Reset filters + search when leaving the Collection tab entirely.
  // Using the parent (tab) navigator's blur event means this does NOT fire
  // when navigating to CardDetail (same stack), only when switching tabs.
  useEffect(() => {
    const unsub = navigation.getParent()?.addListener('blur', () => {
      clearFilters();
      setSearch('');
    });
    return unsub;
  }, [navigation, clearFilters]);

  const cards = useMemo(() => {
    let list = gs.cardRoster;
    if (packFilter !== 0)     list = list.filter(c => c.pack === packFilter);
    if (rarity !== 'All')     list = list.filter(c => c.rarity === rarity);
    if (typeFilter !== 'All') list = list.filter(c => c.type === typeFilter);
    if (search.trim())        list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'rarity':  return (RO[a.rarity] ?? 4) - (RO[b.rarity] ?? 4) || a.name.localeCompare(b.name);
        case 'name_az': return a.name.localeCompare(b.name);
        case 'name_za': return b.name.localeCompare(a.name);
        case 'power':   return (b.power + b.defense + b.speed) - (a.power + a.defense + a.speed);
        case 'owned':   return cardCount(gs.collection, b.id) - cardCount(gs.collection, a.id);
        default:        return 0;
      }
    });
  }, [search, rarity, typeFilter, packFilter, sortBy]);

  const rows = useMemo<(Card | null)[]>(() => {
    const rem = cards.length % NUM_COLS;
    if (rem === 0) return cards;
    return [...cards, ...Array(NUM_COLS - rem).fill(null)];
  }, [cards]);

  const totalOwned = useMemo(
    () => totalUniqueOwned(gs.collection),
    [gs.collection],
  );

  const renderItem = useCallback(({ item }: ListRenderItemInfo<Card | null>) => {
    if (!item) return <View style={[styles.cardSlot, { width: CARD_W * SCALE }]} />;
    const owned = isOwned(gs.collection, item.id);
    const count = cardCount(gs.collection, item.id);
    return (
      <TouchableOpacity
        style={styles.cardSlot}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CardDetail', { cardId: item.id, owned, ownedCount: count } as never)}
      >
        <View>
          <CardWrapper scale={SCALE}>
            {owned ? <MiniCard card={item} /> : <MissingCard card={item} />}
          </CardWrapper>
          {count > 1 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>x{count}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [gs.collection, navigation]);

  const keyExtractor = useCallback((item: Card | null, idx: number) =>
    item ? String(item.id) : `filler-${idx}`, []);

  return (
    <ScreenBackground theme="collection">
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>COLLECTION</Text>
        <Text style={styles.headerSub}>{totalOwned} / {gs.cardRoster.length} owned</Text>
      </View>

      {/* ── Search + filter ── */}
      <View style={styles.searchAndFilter}>
        {searchFocused ? (
          <GradientBorder colors={BORDER_COLORS.mint} borderWidth={1} borderRadius={10} innerBackground={T.bg.elevated} style={{ flex: 1 }} innerStyle={{ flex: 1 }}>
            <View style={[styles.searchRow, { borderWidth: 0 }]}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search cards…"
                placeholderTextColor="#404458"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
                  <Text style={styles.clearText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </GradientBorder>
        ) : (
          <View style={styles.searchRow}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search cards…"
              placeholderTextColor="#404458"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
                <Text style={styles.clearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setSidebarOpen(true)}
        >
          <Text style={[styles.filterBtnIcon, activeFilterCount > 0 && { color: T.accent.mint }]}>
            ⚙{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Active filter chips ── */}
      {activeFilterCount > 0 && (
        <View style={styles.chipRow}>
          {rarity !== 'All' && (
            <TouchableOpacity style={[styles.chip, { borderColor: RC[rarity]?.color ?? T.accent.mint }]}
              onPress={() => setRarity('All')}>
              <Text style={[styles.chipText, { color: RC[rarity]?.color ?? T.accent.mint }]}>{rarity} ✕</Text>
            </TouchableOpacity>
          )}
          {typeFilter !== 'All' && (
            <TouchableOpacity style={styles.chip} onPress={() => setTypeFilter('All')}>
              <Text style={styles.chipText}>{typeFilter} ✕</Text>
            </TouchableOpacity>
          )}
          {packFilter !== 0 && (
            <TouchableOpacity style={styles.chip} onPress={() => setPackFilter(0)}>
              <Text style={styles.chipText}>Pack {packFilter} ✕</Text>
            </TouchableOpacity>
          )}
          {sortBy !== 'rarity' && (
            <TouchableOpacity style={[styles.chip, { borderColor: T.accent.violet }]} onPress={() => setSortBy('rarity')}>
              <Text style={[styles.chipText, { color: T.accent.violet }]}>
                {SORT_OPTIONS.find(s => s.key === sortBy)?.chipLabel} ✕
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Results count ── */}
      <Text style={styles.resultsText}>{cards.length} cards</Text>

      {/* ── Grid ── */}
      <FlatList
        data={rows}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={NUM_COLS}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews
        windowSize={5}
        maxToRenderPerBatch={8}
        initialNumToRender={10}
      />

      {/* ── Filter sidebar ── */}
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
const styles = StyleSheet.create({
  root: {
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 22,
    color: T.accent.mint,
    letterSpacing: 2,
  },
  headerSub: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 10,
    color: T.text.muted,
    letterSpacing: 1,
    marginTop: 2,
  },

  // Search + filter row
  searchAndFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 6,
    gap: 8,
  },
  filterBtn: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.bg.border,
    backgroundColor: T.bg.elevated,
  },
  filterBtnActive: {
    borderColor: T.accent.mint,
    backgroundColor: T.accent.mintFaint,
  },
  filterBtnIcon: {
    fontSize: 14,
    color: T.text.muted,
  },
  filterBtnText: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 10,
    color: T.text.muted,
    letterSpacing: 0.5,
  },

  // Search
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.bg.elevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.bg.border,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 18,
    color: T.text.muted,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: T.text.body,
    fontSize: 14,
  },
  clearBtn: { padding: 4 },
  clearText: { color: T.text.muted, fontSize: 14 },

  // Active filter chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 6, marginBottom: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.accent.mint,
    backgroundColor: T.accent.mintFaint,
  },
  chipText: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 9,
    color: T.accent.mint,
    letterSpacing: 0.5,
  },

  // Results
  resultsText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: T.text.muted,
    paddingHorizontal: 16,
    marginBottom: 6,
  },

  // Grid
  listContent:   { paddingHorizontal: 8, paddingBottom: 40 },
  columnWrapper: { justifyContent: 'space-evenly', marginBottom: 6 },
  cardSlot:      { alignItems: 'center' },
  countBadge: {
    position: 'absolute', bottom: 6, right: 2,
    backgroundColor: T.accent.mint, borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 2,
    borderWidth: 1, borderColor: T.bg.root,
  },
  countText: {
    fontFamily: 'Orbitron_700Bold', fontSize: 8,
    color: T.bg.root, letterSpacing: 0.5,
  },

  // Sidebar
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 10,
  },
  sidebar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_W,
    backgroundColor: T.bg.surface,
    borderLeftWidth: 1,
    borderLeftColor: T.bg.border,
    zIndex: 11,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    overflow: 'hidden',
  },
  sidebarLeftEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  sidebarInnerGlow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 40,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.bg.border,
  },
  sidebarTitle: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 14,
    color: T.accent.mint,
    letterSpacing: 2,
  },
  closeBtn: { padding: 4 },
  closeText: { color: T.text.muted, fontSize: 16 },

  sidebarScroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },

  sectionLabel: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 9,
    color: T.text.muted,
    letterSpacing: 2,
    marginBottom: 8,
    marginTop: 4,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  radioLabel: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 11,
    letterSpacing: 0.3,
  },

  divider: {
    height: 1,
    backgroundColor: T.bg.border,
    marginVertical: 12,
  },

  clearAllBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff4040',
    alignItems: 'center',
    backgroundColor: '#ff000011',
  },
  clearAllText: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 10,
    color: '#ff6060',
    letterSpacing: 1,
  },
});
