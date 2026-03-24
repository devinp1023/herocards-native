// CardDetailScreen — Session 5.
// Layout: ScrollView → back button → card (85% scale) → info panel.
// Stat bars animate in on mount via Reanimated withTiming.
// Abilities placeholder — wired in Session 14.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CollectionStackParamList } from '../../App';
import { RC, TYPE_COLORS, RO } from '../data/constants';
import { useGameStateContext } from '../context/GameStateContext';
import { CardWrapper, CARD_W } from '../components/CardWrapper';
import { HeroCard } from '../components/HeroCard';
import { MissingCard } from '../components/MissingCard';

type Props = NativeStackScreenProps<CollectionStackParamList, 'CardDetail'>;

// ── Constants ────────────────────────────────────────────────────────────────
const SCALE      = 0.85;
const BAR_MAX_W  = Dimensions.get('window').width - 80; // full-width bars
const DESC_LIMIT = 120; // chars before "Read more" appears

const ALLIANCE_COLORS: Record<string, { color: string; border: string; bg: string }> = {
  Hero:      { color: '#4fc3f7', border: '#4fc3f744', bg: '#4fc3f711' },
  Villain:   { color: '#ff4060', border: '#ff406044', bg: '#ff406011' },
  'Anti-Hero': { color: '#ff9800', border: '#ff980044', bg: '#ff980011' },
};

const PACK_LABEL: Record<number, string> = { 1: '🌊 Pack 1', 2: '🌑 Pack 2' };

const STAT_ROWS = [
  { label: 'ATK', key: 'power',   color: '#ff6b40' },
  { label: 'DEF', key: 'defense', color: '#4db8ff' },
  { label: 'SPD', key: 'speed',   color: '#ffe040' },
] as const;

// ── AnimatedBar ───────────────────────────────────────────────────────────────
function AnimatedBar({ value, color, delay }: { value: number; color: string; delay: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(
      delay,
      withTiming((value / 100) * BAR_MAX_W, { duration: 650, easing: Easing.out(Easing.cubic) }),
    );
  }, [value]);

  const barStyle = useAnimatedStyle(() => ({ width: width.value }));

  return (
    <View style={[styles.barTrack, { width: BAR_MAX_W }]}>
      <Animated.View style={[styles.barFill, { backgroundColor: color, shadowColor: color }, barStyle]} />
    </View>
  );
}

// ── CardDetailScreen ──────────────────────────────────────────────────────────
export default function CardDetailScreen({ route, navigation }: Props) {
  const { cardId, owned, ownedCount } = route.params;
  const { cardRoster } = useGameStateContext();
  const card = cardRoster.find(c => c.id === cardId);
  const [descExpanded, setDescExpanded] = useState(false);

  if (!card) return null;

  const cfg        = RC[card.rarity] ?? RC.Common;
  const typeColor  = TYPE_COLORS[card.type] ?? '#888';
  const alliance   = ALLIANCE_COLORS[card.alliance] ?? ALLIANCE_COLORS.Hero;
  const isLongDesc = card.desc.length > DESC_LIMIT;
  const totalPwr   = card.power + card.defense + card.speed;

  return (
    <View style={styles.root}>
      {/* Back button — outside ScrollView so it's always visible */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backText}>← BACK</Text>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Card ── */}
        <View style={styles.cardArea}>
          <CardWrapper scale={SCALE} style={styles.cardCentered}>
            {owned
              ? <HeroCard card={card} showShine enableTilt />
              : <MissingCard card={card} />
            }
          </CardWrapper>
          {!owned && (
            <View style={styles.notOwnedBadge}>
              <Text style={styles.notOwnedText}>NOT IN COLLECTION</Text>
            </View>
          )}
        </View>

        {/* ── Info panel ── */}
        <View style={styles.panel}>

          {/* Name */}
          <Text style={styles.cardName}>{card.name.toUpperCase()}</Text>

          {/* Owned count badge */}
          {owned && (
            <View style={styles.ownedRow}>
              <View style={[styles.ownedBadge, ownedCount > 1 && styles.ownedBadgeMulti]}>
                <Text style={[styles.ownedText, ownedCount > 1 && styles.ownedTextMulti]}>
                  {ownedCount > 1 ? `YOU OWN x${ownedCount}` : 'IN COLLECTION'}
                </Text>
              </View>
            </View>
          )}

          {/* Top meta row: rarity · #id · pack */}
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: cfg.color + '22', borderColor: cfg.color + '66' }]}>
              <Text style={[styles.badgeText, { color: cfg.color }]}>{card.rarity.toUpperCase()}</Text>
            </View>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.cardId}>#{String(card.id).padStart(3, '0')}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.packLabel}>{PACK_LABEL[card.pack] ?? `Pack ${card.pack}`}</Text>
          </View>

          {/* Alliance + Type badges */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: alliance.bg, borderColor: alliance.border }]}>
              <Text style={[styles.badgeText, { color: alliance.color }]}>
                {card.alliance.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: typeColor + '18', borderColor: typeColor + '44' }]}>
              <Text style={[styles.badgeText, { color: typeColor }]}>
                {card.type.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>LORE</Text>
            <Text style={styles.desc} numberOfLines={descExpanded || !isLongDesc ? undefined : 3}>
              {card.desc}
            </Text>
            {isLongDesc && (
              <TouchableOpacity onPress={() => setDescExpanded(e => !e)} style={styles.readMoreBtn}>
                <Text style={styles.readMoreText}>
                  {descExpanded ? '▲ SHOW LESS' : '▼ READ MORE'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          {/* Stat bars */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>STATS</Text>
            {STAT_ROWS.map(({ label, key, color }, i) => (
              <View key={label} style={styles.statRow}>
                <View style={styles.statLabelRow}>
                  <Text style={[styles.statLabel, { color }]}>{label}</Text>
                  <Text style={[styles.statValue, { color }]}>{card[key]}</Text>
                </View>
                <AnimatedBar value={card[key]} color={color} delay={i * 80} />
              </View>
            ))}

            {/* Total power */}
            <View style={[styles.totalRow, { borderColor: cfg.color + '33' }]}>
              <Text style={styles.totalLabel}>TOTAL POWER</Text>
              <Text style={[styles.totalValue, { color: cfg.color }]}>{totalPwr}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Ability slot — populated in Session 14 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ABILITY</Text>
            <View style={styles.abilityPlaceholder}>
              <Text style={styles.abilityIcon}>⚡</Text>
              <View>
                <Text style={styles.abilityName}>Ability Assignment</Text>
                <Text style={styles.abilityDesc}>Coming in Session 14</Text>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#060610',
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
  },

  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backText: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 12,
    color: '#4fc3f7',
    letterSpacing: 1.5,
  },

  scroll: {
    paddingBottom: 60,
  },

  // Card area
  cardArea: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  cardCentered: {
    alignSelf: 'center',
  },
  notOwnedBadge: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ff406044',
    backgroundColor: '#ff406011',
  },
  notOwnedText: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 10,
    color: '#ff6080',
    letterSpacing: 1.5,
  },

  // Info panel
  panel: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  cardName: {
    fontFamily: 'Orbitron_900Black',
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 1,
    lineHeight: 34,
    marginBottom: 10,
  },

  ownedRow:        { marginBottom: 10 },
  ownedBadge:      { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 7, borderWidth: 1, backgroundColor: '#2ED57318', borderColor: '#2ED57355' },
  ownedBadgeMulti: { backgroundColor: '#4fc3f718', borderColor: '#4fc3f755' },
  ownedText:       { fontFamily: 'Orbitron_700Bold', fontSize: 9, color: '#2ED573', letterSpacing: 1 },
  ownedTextMulti:  { color: '#4fc3f7' },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  metaDot: {
    color: '#303050',
    fontSize: 16,
  },
  cardId: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 12,
    color: '#606480',
    letterSpacing: 1,
  },
  packLabel: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 11,
    color: '#606480',
    letterSpacing: 0.5,
  },

  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 10,
    letterSpacing: 1,
  },

  divider: {
    height: 1,
    backgroundColor: '#14142a',
    marginVertical: 18,
  },

  // Sections
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 9,
    color: '#404060',
    letterSpacing: 2.5,
  },

  // Description
  desc: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 17,
    color: '#c0c8dc',
    lineHeight: 26,
  },
  readMoreBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#252545',
  },
  readMoreText: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 9,
    color: '#4fc3f7',
    letterSpacing: 1,
  },

  // Stats
  statRow: {
    gap: 6,
  },
  statLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  statValue: {
    fontFamily: 'Orbitron_900Black',
    fontSize: 20,
  },
  barTrack: {
    height: 8,
    backgroundColor: '#0f0f24',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 11,
    color: '#505070',
    letterSpacing: 1.5,
  },
  totalValue: {
    fontFamily: 'Orbitron_900Black',
    fontSize: 28,
  },

  // Ability
  abilityPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e2040',
    backgroundColor: '#0c0c1e',
  },
  abilityIcon: {
    fontSize: 28,
  },
  abilityName: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 12,
    color: '#606480',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  abilityDesc: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 13,
    color: '#303050',
  },
});
