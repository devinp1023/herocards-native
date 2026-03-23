// ProfileScreen — profile header, battle stats, collection progress, avatar gallery, logout.

import React, { useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Platform, TouchableOpacity,
} from 'react-native';
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
    <View style={bStyles.statBox}>
      <Text style={bStyles.statVal}>{value}</Text>
      <Text style={bStyles.statLbl}>{label}</Text>
    </View>
  );
}

const bStyles = StyleSheet.create({
  statBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0a0a1e', borderRadius: 10, borderWidth: 1, borderColor: '#14142a',
    paddingVertical: 14, gap: 4,
  },
  statVal: { fontFamily: 'Orbitron_900Black', fontSize: 18, color: '#4fc3f7' },
  statLbl: { fontFamily: 'Orbitron_700Bold', fontSize: 7, color: '#ffffff', letterSpacing: 1 },
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
        <View style={[pStyles.barFill, { width: `${pct}%` as any, backgroundColor: pack.color }]} />
      </View>
      <Text style={[pStyles.pct, { color: pack.color }]}>{pct}%</Text>
    </View>
  );
}

const pStyles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot:      { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  name:     { fontFamily: 'Orbitron_700Bold', fontSize: 9, letterSpacing: 0.5, width: 100 },
  count:    { fontFamily: 'Orbitron_700Bold', fontSize: 9, color: '#ffffff', width: 52, textAlign: 'right' },
  barTrack: { flex: 1, height: 5, backgroundColor: '#0d0d20', borderRadius: 3, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 3 },
  pct:      { fontFamily: 'Orbitron_900Black', fontSize: 11, width: 40, textAlign: 'right' },
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
    backgroundColor: '#0a0a1e', borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    margin: 5,
  },
  symbol:    { fontSize: 22, lineHeight: 26 },
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
  const avatarColor  = avatarData?.color  ?? '#4fc3f7';

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
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Profile header ── */}
        <View style={styles.header}>
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
                <Text style={styles.hStatVal} numberOfLines={1}>{gs.xp.toLocaleString()}</Text>
                <Text style={styles.hStatLbl}>XP</Text>
              </View>
              <View style={styles.hStatBox}>
                <Text style={styles.hStatVal} numberOfLines={1}>{uniqueOwned}</Text>
                <Text style={styles.hStatLbl}>CARDS</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.hStatBox}>
                <Text style={styles.hStatVal} numberOfLines={1}>{gs.coins.toLocaleString()}</Text>
                <Text style={styles.hStatLbl}>CR</Text>
              </View>
            </View>
          </View>
        </View>

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
          <Text style={[styles.sectionCount, { color: collPct === 100 ? '#4caf50' : '#606480' }]}>
            {uniqueOwned}/{totalCards}
          </Text>
        </View>
        <View style={styles.collCard}>
          <View style={styles.collBarTrack}>
            <View style={[styles.collBarFill, { width: `${collPct}%` as any }]} />
          </View>
          <Text style={styles.collPct}>{collPct}% COMPLETE</Text>
          <View style={styles.dividerThin} />
          <PackBar packId={1} collection={gs.collection} cardRoster={gs.cardRoster} />
          <PackBar packId={2} collection={gs.collection} cardRoster={gs.cardRoster} />
        </View>

        {/* ── Avatars ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>— AVATARS</Text>
          <Text style={[styles.sectionCount, { color: ownedAvatars.length === ALL_AVATARS.length ? '#4caf50' : '#606480' }]}>
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
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#060610' },
  scroll: { padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 50 },

  // Header
  header: {
    flexDirection: 'row', gap: 16, alignItems: 'center',
    backgroundColor: '#0a0a1e', borderRadius: 20,
    padding: 18, marginBottom: 20,
    borderWidth: 1, borderColor: '#12122a',
  },
  avatarRing: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#12122e',
    borderWidth: 2, borderColor: '#4fc3f744',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarInitial: { fontFamily: 'Orbitron_900Black', fontSize: 26, color: '#4fc3f7' },
  username: {
    fontFamily: 'Orbitron_900Black', fontSize: 18,
    color: '#ffffff', letterSpacing: 1, marginBottom: 10,
  },
  statRow:     { flexDirection: 'row', alignItems: 'center' },
  hStatBox:    { alignItems: 'center', flex: 1 },
  hStatVal:    { fontFamily: 'Orbitron_900Black', fontSize: 12, color: '#4fc3f7' },
  hStatLbl:    { fontFamily: 'Orbitron_700Bold', fontSize: 7, color: '#ffffff', letterSpacing: 1, marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: '#1a1a30', marginHorizontal: 4 },

  // Sections
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:  { fontFamily: 'Orbitron_700Bold', fontSize: 12, color: '#c0c8dc', letterSpacing: 1.5 },
  sectionCount:  { fontFamily: 'Orbitron_700Bold', fontSize: 9, color: '#ffffff', letterSpacing: 1 },

  // Battle stats grid
  statsGrid:    { gap: 8, marginBottom: 24 },
  statsGridRow: { flexDirection: 'row', gap: 8 },

  // Collection
  collCard: {
    backgroundColor: '#0a0a1e', borderRadius: 14, borderWidth: 1, borderColor: '#14142a',
    padding: 16, marginBottom: 24,
  },
  collBarTrack: { height: 8, backgroundColor: '#0d0d20', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  collBarFill:  { height: '100%', borderRadius: 4, backgroundColor: '#4fc3f7' },
  collPct: {
    fontFamily: 'Orbitron_700Bold', fontSize: 10, color: '#4fc3f7',
    letterSpacing: 1, marginBottom: 12, textAlign: 'center',
  },
  dividerThin: { height: 1, backgroundColor: '#14142a', marginBottom: 12 },

  // Avatars
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },

  // Footer
  divider: { height: 1, backgroundColor: '#12122a', marginVertical: 18 },

  logoutBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#ef535033',
    backgroundColor: '#ef535008', marginBottom: 8,
  },
  logoutText: { fontFamily: 'Orbitron_700Bold', fontSize: 11, color: '#ef5350', letterSpacing: 2 },
});
