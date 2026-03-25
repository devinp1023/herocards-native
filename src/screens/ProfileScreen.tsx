// ProfileScreen — profile header, battle stats, collection progress, avatar gallery, logout.

import React, { useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Platform, TouchableOpacity,
} from 'react-native';
import { MaterialSurface } from '../components/MaterialSurface';
import { T } from '../theme/theme';
import { ScreenBackground } from '../components/ScreenBackground';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { useSession } from '../context/SessionContext';
import { totalUniqueOwned, isOwned } from '../hooks/useGameState';
import { useGameStateContext } from '../context/GameStateContext';
import {
  AVATARS, LEVEL_AVATARS, AVATAR_TIER_COLORS, PACKS,
  PurchasableAvatar, LevelAvatar,
} from '../data/packs';

const ALL_AVATARS: (PurchasableAvatar | LevelAvatar)[] = [...AVATARS, ...LEVEL_AVATARS];

// ── StatBox ──────────────────────────────────────────────────────────────────
function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <MaterialSurface style={bStyles.statBox} borderRadius={10}>
      <Text style={bStyles.statVal}>{value}</Text>
      <Text style={bStyles.statLbl}>{label}</Text>
    </MaterialSurface>
  );
}

const bStyles = StyleSheet.create({
  statBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 4,
  },
  statVal: { fontFamily: 'Orbitron_900Black', fontSize: T.font.xl, color: T.accent.mint },
  statLbl: { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.text.primary, letterSpacing: T.letterSpacing.xs },
});

// ── PackBar ──────────────────────────────────────────────────────────────────
function PackBar({ packId, collection, cardRoster }: {
  packId: number;
  collection: Record<number, number>;
  cardRoster: import('../data/cards').Card[];
}) {
  const pack = PACKS[packId];
  const packCards = cardRoster.filter(c => c.pack === packId);
  const owned = packCards.filter(c => isOwned(collection, c.id)).length;
  const pct = packCards.length > 0 ? Math.round(owned / packCards.length * 100) : 0;

  return (
    <View style={pStyles.row}>
      <View style={[pStyles.dot, { backgroundColor: pack.color }]} />
      <Text style={[pStyles.name, { color: pack.color }]} numberOfLines={1}>{pack.name.toUpperCase()}</Text>
      <Text style={pStyles.count}>{owned}/{packCards.length}</Text>
      <View style={pStyles.barTrack}>
        <View style={[pStyles.barFill, { width: `${pct}%` as any, backgroundColor: pack.color, shadowColor: pack.color, shadowOpacity: 0.5, shadowRadius: 3, shadowOffset: { width: 0, height: 0 } }]} />
      </View>
      <Text style={[pStyles.pct, { color: pack.color }]}>{pct}%</Text>
    </View>
  );
}

const pStyles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot:      { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  name:     { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, letterSpacing: 0.5, width: 100 },
  count:    { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.text.primary, width: 52, textAlign: 'right' },
  barTrack: { flex: 1, height: 5, backgroundColor: T.bg.elevated, borderRadius: 3, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 3 },
  pct:      { fontFamily: 'Orbitron_900Black', fontSize: T.font.sm, width: 40, textAlign: 'right' },
});

// ── AvatarItem ───────────────────────────────────────────────────────────────
const AvatarItem = React.memo(function AvatarItem({ avatar, isActive, onPress }: {
  avatar: PurchasableAvatar | LevelAvatar;
  isActive: boolean;
  onPress: () => void;
}) {
  const tierColors = AVATAR_TIER_COLORS[avatar.tier] ?? AVATAR_TIER_COLORS.Common;

  return (
    <TouchableOpacity
      style={[
        aStyles.item,
        { borderColor: isActive ? avatar.color : tierColors.border },
        isActive && { backgroundColor: avatar.color + '18' },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text style={[aStyles.symbol, { color: avatar.color }]}>{avatar.symbol}</Text>
      {isActive && <View style={[aStyles.activeDot, { backgroundColor: avatar.color }]} />}
    </TouchableOpacity>
  );
});

const aStyles = StyleSheet.create({
  item: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: T.bg.surface, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    margin: 5,
  },
  symbol:    { fontSize: T.font.xl, lineHeight: 26 },
  activeDot: { position: 'absolute', bottom: -2, width: 8, height: 8, borderRadius: 4 },
});

// ── ProfileScreen ────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const session = useSession();
  const { username } = session;
  const gs = useGameStateContext();

  // Avatar
  const avatarData =
    AVATARS.find(a => a.id === gs.activeAvatar) ??
    LEVEL_AVATARS.find(a => a.id === gs.activeAvatar);
  const avatarSymbol = avatarData?.symbol ?? username.charAt(0).toUpperCase();
  const avatarColor  = avatarData?.color  ?? T.accent.mint;

  // Battle stats
  const bs = gs.battleStats;
  const wins    = bs.battlesWon ?? 0;
  const played  = bs.battlesPlayed ?? 0;
  const losses  = played - wins;
  const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
  const bestStreak    = bs.maxWinStreak ?? 0;
  const currentStreak = gs.battleWinStreak;

  // Collection
  const uniqueOwned = totalUniqueOwned(gs.collection);
  const totalCards  = gs.cardRoster.length;
  const collPct     = totalCards > 0 ? Math.round((uniqueOwned / totalCards) * 100) : 0;

  // Avatars
  const ownedSet = useMemo(() => new Set(gs.ownedAvatars), [gs.ownedAvatars]);
  const ownedAvatars = useMemo(
    () => ALL_AVATARS.filter(a => ownedSet.has(a.id)),
    [ownedSet],
  );
  const handleEquip = useCallback((id: string) => {
    gs.equipAvatar(id);
  }, [gs.equipAvatar]);

  return (
    <ScreenBackground theme="profile">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Profile header ── */}
        <MaterialSurface style={styles.header} borderRadius={20}>
          <View style={[styles.avatarRing, { borderColor: avatarColor + '66' }]}>
            <Text style={[styles.avatarInitial, { color: avatarColor }]}>{avatarSymbol}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.username} numberOfLines={1}>{username.toUpperCase()}</Text>
            <View style={styles.statRow}>
              <View style={styles.hStatBox}>
                <Text style={styles.hStatVal} numberOfLines={1}>{gs.level}</Text>
                <Text style={styles.hStatLbl}>LEVEL</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.hStatBox}>
                <AnimatedNumber value={gs.xp} glowColor={T.accent.violet} style={styles.hStatVal} />
                <Text style={styles.hStatLbl}>XP</Text>
              </View>
              <View style={styles.hStatBox}>
                <Text style={styles.hStatVal} numberOfLines={1}>{uniqueOwned}</Text>
                <Text style={styles.hStatLbl}>CARDS</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.hStatBox}>
                <AnimatedNumber value={gs.coins} glowColor={T.accent.gold} style={styles.hStatVal} />
                <Text style={styles.hStatLbl}>CR</Text>
              </View>
            </View>
          </View>
        </MaterialSurface>

        {/* ── Battle Stats ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>— BATTLE STATS</Text>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statsGridRow}>
            <StatBox value={String(wins)} label="WINS" />
            <StatBox value={String(losses)} label="LOSSES" />
            <StatBox value={`${winRate}%`} label="WIN %" />
          </View>
          <View style={styles.statsGridRow}>
            <StatBox value={String(bestStreak)} label="HIGHEST STREAK" />
            <StatBox value={String(played)} label="TOTAL BATTLES" />
            <StatBox value={String(currentStreak)} label="CURRENT STREAK" />
          </View>
        </View>

        {/* ── Collection ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>— COLLECTION</Text>
          <Text style={[styles.sectionCount, { color: collPct === 100 ? T.status.vitality : T.text.muted }]}>
            {uniqueOwned}/{totalCards}
          </Text>
        </View>
        <MaterialSurface style={styles.collCard}>
          <View style={styles.collBarTrack}>
            <View style={[styles.collBarFill, { width: `${collPct}%` as any }]} />
          </View>
          <Text style={styles.collPct}>{collPct}% COMPLETE</Text>
          <View style={styles.dividerThin} />
          <PackBar packId={1} collection={gs.collection} cardRoster={gs.cardRoster} />
          <PackBar packId={2} collection={gs.collection} cardRoster={gs.cardRoster} />
        </MaterialSurface>

        {/* ── Avatars ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>— AVATARS</Text>
          <Text style={[styles.sectionCount, { color: ownedAvatars.length === ALL_AVATARS.length ? T.status.vitality : T.text.muted }]}>
            {ownedAvatars.length}/{ALL_AVATARS.length} COLLECTED
          </Text>
        </View>
        <View style={styles.avatarGrid}>
          {ownedAvatars.map(avatar => (
            <AvatarItem
              key={avatar.id}
              avatar={avatar}
              isActive={avatar.id === gs.activeAvatar}
              onPress={() => handleEquip(avatar.id)}
            />
          ))}
        </View>

        <View style={styles.divider} />

        {/* ── Log out ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={session.logout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>LOG OUT</Text>
        </TouchableOpacity>

      </ScrollView>
    </ScreenBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { },
  scroll: { padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 50 },

  // Header
  header: {
    flexDirection: 'row', gap: 16, alignItems: 'center',
    padding: 18, marginBottom: 20,
  },
  avatarRing: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: T.bg.elevated,
    borderWidth: 2, borderColor: T.accent.mintMuted,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarInitial: { fontFamily: 'Orbitron_900Black', fontSize: T.font.xl, color: T.accent.mint },
  username: {
    fontFamily: 'Orbitron_900Black', fontSize: T.font.xl,
    color: T.text.primary, letterSpacing: T.letterSpacing.md, marginBottom: 10,
  },
  statRow:     { flexDirection: 'row', alignItems: 'center' },
  hStatBox:    { alignItems: 'center', flex: 1 },
  hStatVal:    { fontFamily: 'Orbitron_900Black', fontSize: T.font.md, color: T.accent.mint },
  hStatLbl:    { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.text.primary, letterSpacing: T.letterSpacing.xs, marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: T.bg.border, marginHorizontal: 4 },

  // Sections
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:  { fontFamily: 'Orbitron_700Bold', fontSize: T.font.md, color: T.text.body, letterSpacing: T.letterSpacing.lg },
  sectionCount:  { fontFamily: 'Orbitron_700Bold', fontSize: T.font.xs, color: T.text.primary, letterSpacing: T.letterSpacing.xs },

  // Battle stats grid
  statsGrid:    { gap: 8, marginBottom: 24 },
  statsGridRow: { flexDirection: 'row', gap: 8 },

  // Collection
  collCard: {
    borderRadius: 14,
    padding: 16, marginBottom: 24,
  },
  collBarTrack: { height: 8, backgroundColor: T.bg.elevated, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  collBarFill:  { height: '100%', borderRadius: 4, backgroundColor: T.accent.mint, shadowColor: T.accent.mint, shadowOpacity: 0.6, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  collPct: {
    fontFamily: 'Orbitron_700Bold', fontSize: T.font.sm, color: T.accent.mint,
    letterSpacing: T.letterSpacing.md, marginBottom: 12, textAlign: 'center',
  },
  dividerThin: { height: 1, backgroundColor: T.bg.border, marginBottom: 12 },

  // Avatars
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },

  // Footer
  divider: { height: 1, backgroundColor: T.bg.border, marginVertical: 18 },

  logoutBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: T.button.destructive.paddingV, borderRadius: T.button.destructive.radius,
    borderWidth: 1, borderColor: T.status.danger + '33',
    backgroundColor: T.status.danger + '08', marginBottom: 8,
    transform: [{ skewX: '-3deg' }],
  },
  logoutText: { fontFamily: T.button.destructive.fontFamily, fontSize: T.button.destructive.fontSize, color: T.button.destructive.text, letterSpacing: T.button.destructive.letterSpacing, transform: [{ skewX: '3deg' }] },
});
