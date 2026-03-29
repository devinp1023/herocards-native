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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { T } from '../theme/theme';

type Props = NativeStackScreenProps<CollectionStackParamList, 'CardDetail'>;

// ── Constants ────────────────────────────────────────────────────────────────
const SCALE      = 0.85;
const BAR_MAX_W  = Dimensions.get('window').width - 80; // full-width bars
const DESC_LIMIT = 120; // chars before "Read more" appears

const ALLIANCE_COLORS: Record<string, { color: string; border: string; bg: string }> = {
  Hero:      { color: T.accent.mint, border: T.accent.mintMuted, bg: T.accent.mintFaint },
  Villain:   { color: '#ff4060', border: '#ff406044', bg: '#ff406011' },
  'Anti-Hero': { color: '#ff9800', border: '#ff980044', bg: '#ff980011' },
};

const PACK_ICON: Record<number, { name: React.ComponentProps<typeof MaterialCommunityIcons>['name']; color: string; label: string }> = {
  1: { name: 'water', color: '#4fc3f7', label: 'Pack 1' },
  2: { name: 'moon-waning-crescent', color: '#cc6dff', label: 'Pack 2' },
};

const STAT_ROWS = [
  { label: 'ATK', key: 'power',   color: T.stat.atk },
  { label: 'DEF', key: 'defense', color: T.stat.def },
  { label: 'SPD', key: 'speed',   color: T.stat.spd },
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MaterialCommunityIcons name="chevron-left" size={18} color={T.accent.mint} />
          <Text style={styles.backText}>BACK</Text>
        </View>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              {PACK_ICON[card.pack] && <MaterialCommunityIcons name={PACK_ICON[card.pack].name} size={12} color={PACK_ICON[card.pack].color} />}
              <Text style={styles.packLabel}>{PACK_ICON[card.pack]?.label ?? `Pack ${card.pack}`}</Text>
            </View>
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
    backgroundColor: T.bg.root,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
  },

  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backText: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: T.font.md,
    color: T.accent.mint,
    letterSpacing: T.letterSpacing.md,
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
    fontSize: T.font.xs,
    color: '#ff6080',
    letterSpacing: T.letterSpacing.md,
  },

  // Info panel
  panel: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  cardName: {
    fontFamily: 'Orbitron_900Black',
    fontSize: T.font.xxl,
    color: T.text.primary,
    letterSpacing: T.letterSpacing.md,
    lineHeight: 34,
    marginBottom: 10,
  },

  ownedRow:        { marginBottom: 10 },
  ownedBadge:      { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 7, borderWidth: 1, backgroundColor: T.status.vitality + '18', borderColor: T.status.vitality + '55' },
  ownedBadgeMulti: { backgroundColor: T.accent.mint + '18', borderColor: T.accent.mint + '55' },
  ownedText:       { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.status.vitality, letterSpacing: T.letterSpacing.xs },
  ownedTextMulti:  { color: T.accent.mint },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  metaDot: {
    color: T.bg.border,
    fontSize: T.font.lg,
  },
  cardId: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: T.font.md,
    color: T.text.muted,
    letterSpacing: T.letterSpacing.md,
  },
  packLabel: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: T.font.sm,
    color: T.text.muted,
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
    fontSize: T.font.xs,
    letterSpacing: T.letterSpacing.xs,
  },

  divider: {
    height: 1,
    backgroundColor: T.bg.border,
    marginVertical: 18,
  },

  // Sections
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: T.font.xs,
    color: T.text.muted,
    letterSpacing: T.letterSpacing.lg,
  },

  // Description
  desc: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: T.font.xl,
    color: T.text.body,
    lineHeight: 26,
  },
  readMoreBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.bg.border,
  },
  readMoreText: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: T.font.xs,
    color: T.accent.mint,
    letterSpacing: T.letterSpacing.xs,
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
    fontSize: T.font.md,
    letterSpacing: T.letterSpacing.md,
  },
  statValue: {
    fontFamily: 'Orbitron_900Black',
    fontSize: T.font.xl,
  },
  barTrack: {
    height: 8,
    backgroundColor: T.bg.elevated,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
    fontSize: T.font.sm,
    color: T.text.muted,
    letterSpacing: T.letterSpacing.md,
  },
  totalValue: {
    fontFamily: 'Orbitron_900Black',
    fontSize: T.font.xxl,
  },

  // Ability
  abilityPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.bg.border,
    backgroundColor: T.bg.surface,
  },
  abilityIcon: {
    fontSize: T.font.xxl,
  },
  abilityName: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: T.font.md,
    color: T.text.muted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  abilityDesc: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: T.font.md,
    color: T.bg.border,
  },
});
