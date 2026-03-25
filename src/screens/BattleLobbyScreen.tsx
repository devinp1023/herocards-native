// BattleLobbyScreen — Session 10.
// Phase 'deck': 10-card deck builder — card grid + filter sidebar.
// Phase 'opponent': difficulty tier selector with rewards preview.

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  TextInput, StyleSheet, Platform, Dimensions,
  ListRenderItemInfo, Pressable,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, runOnJS, Easing,
} from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BattleStackParamList } from '../../App';
import { useGameStateContext } from '../context/GameStateContext';
import { ALL_CARDS, Card } from '../data/cards';
import {
  RC, RO, BATTLE_RARITY_LIMITS, DECK_SIZE,
  BATTLE_REWARDS, TIER_INFO,
  isCardOnCooldown, cooldownRemaining, formatCooldown,
} from '../data/constants';
import { isOwned } from '../hooks/useGameState';
import { CardWrapper, CARD_W, CARD_H } from '../components/CardWrapper';
import { MiniCard } from '../components/MiniCard';
import { MaterialSurface } from '../components/MaterialSurface';
import { ScreenBackground } from '../components/ScreenBackground';
import { T } from '../theme/theme';
import { GradientBorder, BORDER_COLORS } from '../components/GradientBorder';

type Props = NativeStackScreenProps<BattleStackParamList, 'BattleLobby'>;
type Phase = 'deck' | 'opponent';

const SCALE     = 0.38;
const NUM_COLS  = 3;
const SIDEBAR_W = 280;
const { width: SCREEN_W } = Dimensions.get('window');

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
            <Text style={sb.closeText}>✕</Text>
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
  backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.55)', zIndex:10 },
  panel:      { position:'absolute', right:0, top:0, bottom:0, width:SIDEBAR_W, backgroundColor:T.bg.surface, borderLeftWidth:1, borderLeftColor:T.bg.border, zIndex:11, paddingTop: Platform.OS === 'ios' ? 56 : 16 },
  header:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingBottom:12, borderBottomWidth:1, borderBottomColor:T.bg.border },
  title:      { fontFamily:'Orbitron_700Bold', fontSize:T.font.lg, color:T.accent.mint, letterSpacing:T.letterSpacing.lg },
  closeBtn:   { padding:4 },
  closeText:  { color:T.text.muted, fontSize:T.font.lg },
  scroll:     { paddingHorizontal:20, paddingBottom:40, paddingTop:8 },
  sectionLabel:{ fontFamily:'Orbitron_700Bold', fontSize:T.font.xs, color:T.text.muted, letterSpacing:T.letterSpacing.lg, marginBottom:8, marginTop:4 },
  radioRow:   { flexDirection:'row', alignItems:'center', paddingVertical:8, gap:12 },
  radioOuter: { width:18, height:18, borderRadius:9, borderWidth:2, alignItems:'center', justifyContent:'center' },
  radioInner: { width:8, height:8, borderRadius:4 },
  radioLabel: { fontFamily:'Orbitron_700Bold', fontSize:T.font.sm, letterSpacing:0.3 },
  divider:    { height:1, backgroundColor:T.bg.border, marginVertical:12 },
  clearBtn:   { marginTop:8, paddingVertical:12, borderRadius:8, borderWidth:1, borderColor:'#ff4040', alignItems:'center', backgroundColor:'#ff000011' },
  clearText:  { fontFamily:'Orbitron_700Bold', fontSize:T.font.sm, color:'#ff6060', letterSpacing:T.letterSpacing.md },
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
      <Text style={[slot.cardNum, { color: color + 'aa' }]}>#{String(card.id).padStart(3,'0')}</Text>
      <Text style={slot.cardName} numberOfLines={2}>{card.name.toUpperCase()}</Text>
    </TouchableOpacity>
  );
}

const slot = StyleSheet.create({
  empty:     { width:64, height:88, borderRadius:8, borderWidth:1, borderColor:T.bg.border, borderStyle:'dashed', alignItems:'center', justifyContent:'center' },
  emptyText: { fontFamily:'Orbitron_700Bold', fontSize:T.font.xl, color:'#2a2a48' },
  filled:    { width:64, height:88, borderRadius:8, borderWidth:1, backgroundColor:T.bg.surface, overflow:'hidden' },
  rarityBar: { height:3, width:'100%' },
  cardNum:   { fontFamily:'Orbitron_700Bold', fontSize:T.font.xs, letterSpacing:0.5, marginTop:4, marginHorizontal:5 },
  cardName:  { fontFamily:'Orbitron_700Bold', fontSize:T.font.xs, color:T.text.body, letterSpacing:0.2, marginHorizontal:5, marginTop:2, lineHeight:10 },
});

// ── DeckCardCell ─────────────────────────────────────────────────────────────
const CARD_DISPLAY_W = CARD_W * SCALE;
const CARD_DISPLAY_H = CARD_H * SCALE;

interface CellProps {
  card: Card;
  inDeck: boolean;
  canAdd: boolean;
  cooldowns: Record<number, number>;
  onToggle: () => void;
}

const DeckCardCell = React.memo(function DeckCardCell({ card, inDeck, canAdd, cooldowns, onToggle }: CellProps) {
  const onCd = isCardOnCooldown(card.id, cooldowns);
  const cdMs = cooldownRemaining(card.id, cooldowns);
  const dimmed = (!inDeck && !canAdd) || onCd;

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

      {/* Cooldown overlay */}
      {onCd && (
        <View style={[grid.overlay, grid.cdOverlay]}>
          <Text style={grid.cdTime}>{formatCooldown(cdMs)}</Text>
          <Text style={grid.cdLabel}>COOLDOWN</Text>
        </View>
      )}

      {/* Rarity-limit overlay */}
      {!inDeck && !canAdd && !onCd && (
        <View style={[grid.overlay, grid.limitOverlay]}>
          <Text style={grid.limitText}>MAX</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const grid = StyleSheet.create({
  cell:         { width: CARD_DISPLAY_W, alignItems: 'center' },
  overlay:      { position:'absolute', top:0, left:0, width:CARD_DISPLAY_W, height:CARD_DISPLAY_H, borderRadius:6, alignItems:'center', justifyContent:'center' },
  checkBadge:   { position:'absolute', top:6, right:6, width:22, height:22, borderRadius:11, backgroundColor:T.status.vitality, alignItems:'center', justifyContent:'center' },
  checkText:    { fontFamily:'Orbitron_700Bold', fontSize:T.font.sm, color:T.text.primary },
  cdOverlay:    { backgroundColor:'rgba(0,0,0,0.65)', flexDirection:'column', gap:4 },
  cdTime:       { fontFamily:'Orbitron_900Black', fontSize:T.font.lg, color:T.status.danger },
  cdLabel:      { fontFamily:'Orbitron_700Bold', fontSize:T.font.xs, color:T.status.danger + '88', letterSpacing:T.letterSpacing.md },
  limitOverlay: { backgroundColor:'rgba(0,0,0,0.0)' },
  limitText:    { fontFamily:'Orbitron_700Bold', fontSize:T.font.xs, color:T.status.caution, letterSpacing:T.letterSpacing.md, backgroundColor:T.status.caution + '22', paddingHorizontal:8, paddingVertical:3, borderRadius:4, borderWidth:1, borderColor:T.status.caution + '55' },
});

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
        {/* Compact battle arrow */}
        <TouchableOpacity style={[opp.arrow, { borderColor: tier.color + '66' }]} onPress={onPress}>
          <Text style={[opp.arrowText, { color: tier.color }]}>→</Text>
        </TouchableOpacity>
      </MaterialSurface>
    </TouchableOpacity>
  );
});

const opp = StyleSheet.create({
  cardOuter: { marginBottom:10 },
  card:      { flexDirection:'row', alignItems:'center', borderRadius:14, padding:14, gap:12 },
  badge:     { width:40, height:40, borderRadius:10, borderWidth:1, alignItems:'center', justifyContent:'center', flexShrink:0 },
  symbol:    { fontSize:T.font.xl, lineHeight:24 },
  info:      { flex:1, gap:4 },
  nameRow:   { flexDirection:'row', alignItems:'center', gap:10 },
  name:      { fontFamily:'Orbitron_700Bold', fontSize:T.font.md, letterSpacing:0.5 },
  dots:      { flexDirection:'row', gap:3 },
  dot:       { width:6, height:6, borderRadius:3 },
  desc:      { fontFamily:'Rajdhani_600SemiBold', fontSize:T.font.md, color:T.text.muted, lineHeight:16 },
  rewards:   { flexDirection:'row', gap:12 },
  win:       { fontFamily:'Rajdhani_600SemiBold', fontSize:T.font.sm, color:T.accent.mint },
  loss:      { fontFamily:'Rajdhani_600SemiBold', fontSize:T.font.sm, color:T.text.muted },
  arrow:     { width:32, height:32, borderRadius:16, borderWidth:1, alignItems:'center', justifyContent:'center', flexShrink:0 },
  arrowText: { fontFamily:'Orbitron_700Bold', fontSize:T.font.lg },
});

// ── BattleLobbyScreen ─────────────────────────────────────────────────────────
export default function BattleLobbyScreen({ navigation }: Props) {
  const gs = useGameStateContext();
  const ALL_TYPES = useMemo(() => ['All', ...Array.from(new Set(gs.cardRoster.map(c => c.type))).sort()], [gs.cardRoster]);

  const [phase, setPhase]               = useState<Phase>('deck');
  const [battleDeck, setBattleDeck]     = useState<number[]>([]);
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

  // Owned cards
  const ownedCards = useMemo(() =>
    gs.cardRoster.filter(c => isOwned(gs.collection, c.id)),
    [gs.collection, gs.cardRoster],
  );

  const notEnoughCards = ownedCards.length < DECK_SIZE;

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

  // Add null fillers for last row
  const gridData = useMemo<(Card | null)[]>(() => {
    const rem = filteredCards.length % NUM_COLS;
    if (rem === 0) return filteredCards;
    return [...filteredCards, ...Array(NUM_COLS - rem).fill(null)];
  }, [filteredCards]);

  // Rarity counts currently in deck
  const rarityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const id of battleDeck) {
      const card = gs.cardRoster.find(c => c.id === id);
      if (card) counts[card.rarity] = (counts[card.rarity] ?? 0) + 1;
    }
    return counts;
  }, [battleDeck]);

  const canAdd = useCallback((card: Card): boolean => {
    if (battleDeck.length >= DECK_SIZE) return false;
    if (battleDeck.includes(card.id)) return false;
    if ((rarityCounts[card.rarity] ?? 0) >= (BATTLE_RARITY_LIMITS[card.rarity] ?? 10)) return false;
    return true;
  }, [battleDeck, rarityCounts]);

  const toggleCard = useCallback((card: Card) => {
    if (battleDeck.includes(card.id)) {
      setBattleDeck(prev => prev.filter(id => id !== card.id));
    } else if (canAdd(card)) {
      setBattleDeck(prev => [...prev, card.id]);
    }
  }, [battleDeck, canAdd]);

  const deckFull       = battleDeck.length === DECK_SIZE;
  const anyOnCooldown  = battleDeck.some(id => isCardOnCooldown(id, gs.battleCooldowns));
  const canStartBattle = deckFull && !anyOnCooldown;

  const deckCards = useMemo(() =>
    battleDeck.map(id => gs.cardRoster.find(c => c.id === id)),
    [battleDeck, gs.cardRoster],
  );

  const renderCard = useCallback(({ item }: ListRenderItemInfo<Card | null>) => {
    if (!item) return <View style={{ width: CARD_DISPLAY_W }} />;
    return (
      <DeckCardCell
        card={item}
        inDeck={battleDeck.includes(item.id)}
        canAdd={canAdd(item)}
        cooldowns={gs.battleCooldowns}
        onToggle={() => toggleCard(item)}
      />
    );
  }, [battleDeck, canAdd, gs.battleCooldowns, toggleCard]);

  const keyExtractor = useCallback((item: Card | null, idx: number) =>
    item ? String(item.id) : `filler-${idx}`, []);

  // ── Opponent select ───────────────────────────────────────────────────────
  if (phase === 'opponent') {
    return (
      <ScreenBackground theme="battle">
        <ScrollView contentContainerStyle={s.oppScroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => setPhase('deck')} style={s.backBtn} activeOpacity={0.7}>
            <Text style={s.backText}>← CHANGE DECK</Text>
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

  // ── Deck builder ─────────────────────────────────────────────────────────
  return (
    <ScreenBackground theme="battle">
      {/* Fixed header */}
      <View style={s.header}>
        {/* Title row */}
        <View style={s.titleRow}>
          <Text style={s.screenTitle}>BUILD YOUR DECK</Text>
          <Text style={[s.deckCount, { color: deckFull ? T.status.vitality : T.text.muted }]}>
            {battleDeck.length}/{DECK_SIZE}
          </Text>
        </View>

        {/* Rarity limits row */}
        <View style={s.limitsRow}>
          {RARITY_ORDER.map(r => {
            const limit = BATTLE_RARITY_LIMITS[r] ?? 10;
            const count = rarityCounts[r] ?? 0;
            const color = RC[r].color;
            const atLimit = count >= limit;
            return (
              <View key={r} style={[s.limitChip, { borderColor: atLimit ? color + '88' : T.bg.border }]}>
                <Text style={[s.limitRarity, { color: atLimit ? color : T.text.muted }]}>{r.slice(0,3).toUpperCase()}</Text>
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
                const id = battleDeck[i];
                if (id != null) setBattleDeck(prev => prev.filter(x => x !== id));
              }}
            />
          ))}
        </ScrollView>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <View style={s.chipRow}>
            {rarity !== 'All' && (
              <TouchableOpacity style={[s.chip, { borderColor: RC[rarity]?.color ?? T.accent.mint }]} onPress={() => setRarity('All')}>
                <Text style={[s.chipText, { color: RC[rarity]?.color ?? T.accent.mint }]}>{rarity} ✕</Text>
              </TouchableOpacity>
            )}
            {typeFilter !== 'All' && (
              <TouchableOpacity style={s.chip} onPress={() => setTypeFilter('All')}>
                <Text style={s.chipText}>{typeFilter} ✕</Text>
              </TouchableOpacity>
            )}
            {packFilter !== 0 && (
              <TouchableOpacity style={s.chip} onPress={() => setPackFilter(0)}>
                <Text style={s.chipText}>Pack {packFilter} ✕</Text>
              </TouchableOpacity>
            )}
            {sortBy !== 'rarity' && (
              <TouchableOpacity style={[s.chip, { borderColor: T.accent.violet }]} onPress={() => setSortBy('rarity')}>
                <Text style={[s.chipText, { color: T.accent.violet }]}>{SORT_OPTIONS.find(o => o.key === sortBy)?.chipLabel} ✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Search + filter row */}
        <View style={s.searchAndFilter}>
          {searchFocused ? (
            <GradientBorder colors={BORDER_COLORS.mint} borderWidth={1} borderRadius={10} innerBackground={T.bg.elevated} style={{ flex: 1 }} innerStyle={{ flex: 1 }}>
              <View style={[s.searchRow, { borderWidth: 0 }]}>
                <Text style={s.searchIcon}>⌕</Text>
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
                    <Text style={s.searchClear}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </GradientBorder>
          ) : (
            <View style={s.searchRow}>
              <Text style={s.searchIcon}>⌕</Text>
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
                  <Text style={s.searchClear}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <TouchableOpacity
            style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
            onPress={() => setSidebarOpen(true)}
          >
            <Text style={[s.filterBtnText, activeFilterCount > 0 && { color: T.accent.mint }]}>
              ⚙{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={s.resultsText}>{filteredCards.length} cards</Text>
      </View>

      {/* Card grid */}
      {notEnoughCards ? (
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>NOT ENOUGH CARDS</Text>
          <Text style={s.emptySub}>You need at least {DECK_SIZE} cards to build a deck.{'\n'}Open packs to collect more!</Text>
        </View>
      ) : (
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
      )}

      {/* Bottom CTA */}
      <View style={s.footer}>
        {anyOnCooldown && (
          <Text style={s.cooldownWarning}>Some deck cards are on cooldown</Text>
        )}
        <TouchableOpacity
          style={[s.ctaBtn, canStartBattle && s.ctaBtnReady]}
          onPress={() => canStartBattle && setPhase('opponent')}
          activeOpacity={canStartBattle ? 0.85 : 1}
        >
          <Text style={[s.ctaText, canStartBattle && s.ctaTextReady]}>
            {anyOnCooldown
              ? 'CARDS ON COOLDOWN'
              : deckFull
                ? 'CHOOSE OPPONENT  →'
                : `SELECT ${DECK_SIZE - battleDeck.length} MORE CARD${DECK_SIZE - battleDeck.length !== 1 ? 'S' : ''}`}
          </Text>
        </TouchableOpacity>
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
  header:      { paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingHorizontal:16, paddingBottom:6, borderBottomWidth:1, borderBottomColor:T.bg.border },
  titleRow:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 },
  screenTitle: { fontFamily:'Orbitron_900Black', fontSize:T.font.xl, color:T.text.primary, letterSpacing:T.letterSpacing.xl },
  filterBtn:   { height:36, flexDirection:'row', alignItems:'center', paddingHorizontal:12, borderRadius:10, borderWidth:1, borderColor:T.bg.border, backgroundColor:T.bg.elevated },
  filterBtnActive: { borderColor:T.accent.mint, backgroundColor:T.accent.mintFaint },
  filterBtnText:   { fontFamily:'Orbitron_700Bold', fontSize:T.font.xs, color:T.text.muted, letterSpacing:0.5 },
  deckCount:   { fontFamily:'Orbitron_900Black', fontSize:T.font.xl },

  limitsRow:   { flexDirection:'row', gap:6, marginBottom:8 },
  limitChip:   { flex:1, borderWidth:1, borderRadius:6, paddingVertical:4, alignItems:'center', gap:1 },
  limitRarity: { fontFamily:'Orbitron_700Bold', fontSize:T.font.xs, letterSpacing:0.5 },
  limitCount:  { fontFamily:'Orbitron_900Black', fontSize:T.font.sm },

  slotsScroll: { gap:8, paddingBottom:8 },

  chipRow:     { flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:6 },
  chip:        { paddingHorizontal:10, paddingVertical:4, borderRadius:20, borderWidth:1, borderColor:T.accent.mint, backgroundColor:T.accent.mintFaint },
  chipText:    { fontFamily:'Orbitron_700Bold', fontSize:T.font.xs, color:T.accent.mint, letterSpacing:0.5 },

  searchAndFilter: { flexDirection:'row', alignItems:'center', gap:8, marginBottom:4 },
  searchRow:   { flex:1, flexDirection:'row', alignItems:'center', backgroundColor:T.bg.elevated, borderRadius:10, borderWidth:1, borderColor:T.bg.border, paddingHorizontal:10 },
  searchIcon:  { fontSize:T.font.lg, color:T.text.muted, marginRight:4 },
  searchInput: { flex:1, height:36, color:T.text.body, fontFamily:'Rajdhani_600SemiBold', fontSize:T.font.lg },
  searchClear: { color:T.text.muted, fontSize:T.font.lg, padding:4 },
  resultsText: { fontFamily:'monospace', fontSize:T.font.sm, color:T.text.muted, marginBottom:2 },

  // Grid
  listContent:   { paddingHorizontal:8, paddingBottom:120 },
  columnWrapper: { justifyContent:'space-evenly', marginBottom:8 },

  // Empty state
  emptyState: { flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:32, gap:10 },
  emptyTitle: { fontFamily:'Orbitron_700Bold', fontSize:T.font.lg, color:T.text.muted, letterSpacing:T.letterSpacing.md },
  emptySub:   { fontFamily:'Rajdhani_600SemiBold', fontSize:T.font.lg, color:T.bg.border, textAlign:'center', lineHeight:20 },

  // Footer CTA
  footer:          { position:'absolute', bottom:0, left:0, right:0, backgroundColor:'rgba(8,5,10,0.92)', borderTopWidth:1, borderTopColor:T.bg.border, paddingHorizontal:16, paddingTop:10, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  cooldownWarning: { fontFamily:'Orbitron_700Bold', fontSize:T.font.xs, color:T.status.danger, letterSpacing:0.5, marginBottom:6, textAlign:'center' },
  ctaBtn:          { borderRadius:14, paddingVertical:16, alignItems:'center', borderWidth:1, borderColor:T.bg.border, backgroundColor:T.bg.surface },
  ctaBtnReady:     { backgroundColor:T.accent.mint, borderColor:T.accent.mint },
  ctaText:         { fontFamily:'Orbitron_700Bold', fontSize:T.font.md, color:T.bg.border, letterSpacing:T.letterSpacing.md },
  ctaTextReady:    { color:T.bg.root },

  // Opponent select
  oppScroll:        { paddingHorizontal:16, paddingBottom:48 },
  backBtn:          { paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom:16 },
  backText:         { fontFamily:'Orbitron_700Bold', fontSize:T.font.md, color:T.accent.mint, letterSpacing:T.letterSpacing.md },
  oppSub:           { fontFamily:'Rajdhani_600SemiBold', fontSize:T.font.lg, color:T.text.muted, marginBottom:16 },
  deckSummary:      { borderRadius:12, padding:12, marginBottom:16, gap:8 },
  deckSummaryLabel: { fontFamily:'Orbitron_700Bold', fontSize:T.font.xs, color:T.text.muted, letterSpacing:T.letterSpacing.md },
  deckSummaryChips: { flexDirection:'row', flexWrap:'wrap', gap:6 },
  summaryChip:      { paddingHorizontal:8, paddingVertical:3, borderRadius:5, borderWidth:1 },
  summaryChipText:  { fontFamily:'Orbitron_700Bold', fontSize:T.font.xs, letterSpacing:0.5 },
});
