// HomeScreen — profile card, XP bar, credits, avatar, action buttons, pack stats.

import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, HomeStackParamList } from '../../App';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSession } from '../context/SessionContext';
import { isOwned, totalUniqueOwned } from '../hooks/useGameState';
import { useGameStateContext } from '../context/GameStateContext';
import { ALL_CARDS } from '../data/cards';
import { RC, PACK_COST } from '../data/constants';
import { PACKS, AVATARS, LEVEL_AVATARS } from '../data/packs';
import { getTodaysQuests, DIFF_COLOR, Quest } from '../data/quests';

type Props = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, 'Home'>,
  BottomTabScreenProps<MainTabParamList>
>;

const SCREEN_W = Dimensions.get('window').width;
const XP_BAR_W = SCREEN_W - 40 - 32; // panel padding

const RARITIES = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'] as const;

// ── XP bar component ──────────────────────────────────────────────────────────
function XpBar({ xpInLevel, xpNeeded }: { xpInLevel: number; xpNeeded: number }) {
  const fillW = useSharedValue(0);
  const pct   = xpNeeded > 0 ? Math.min(xpInLevel / xpNeeded, 1) : 1;

  useEffect(() => {
    fillW.value = withDelay(300, withTiming(pct * XP_BAR_W, {
      duration: 800, easing: Easing.out(Easing.cubic),
    }));
  }, [pct]);

  const barStyle = useAnimatedStyle(() => ({ width: fillW.value }));

  return (
    <View style={xpStyles.track}>
      <Animated.View style={[xpStyles.fill, barStyle]} />
    </View>
  );
}

const xpStyles = StyleSheet.create({
  track: { height: 6, backgroundColor: '#0d0d22', borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  fill:  { height: '100%', backgroundColor: '#4fc3f7', borderRadius: 3, shadowColor: '#4fc3f7', shadowOffset:{width:0,height:0}, shadowOpacity:0.8, shadowRadius:4 },
});

// ── PackStatCard ──────────────────────────────────────────────────────────────
function PackStatCard({ packId, collection, cardRoster }: { packId: number; collection: Record<number, number>; cardRoster: import('../data/cards').Card[] }) {
  const pack      = PACKS[packId];
  const packCards = cardRoster.filter(c => c.pack === packId);
  const owned     = packCards.filter(c => isOwned(collection, c.id));
  const pct       = packCards.length > 0 ? Math.round(owned.length / packCards.length * 100) : 0;

  const statsByRarity = RARITIES.map(r => ({
    r, color: RC[r]?.color ?? '#fff',
    count: owned.filter(c => c.rarity === r).length,
    total: packCards.filter(c => c.rarity === r).length,
  }));

  return (
    <View style={[packStyles.card, { borderColor: pack.color + '33' }]}>
      <View style={packStyles.header}>
        <View style={[packStyles.packDot, { backgroundColor: pack.color }]} />
        <View style={{ flex: 1 }}>
          <Text style={[packStyles.name, { color: pack.color }]}>{pack.name.toUpperCase()}</Text>
          <Text style={packStyles.sub}>{pack.subtitle}</Text>
        </View>
        <Text style={[packStyles.pct, { color: pack.color }]}>{pct}%</Text>
      </View>
      <View style={[packStyles.barTrack, { backgroundColor: pack.color + '18' }]}>
        <View style={[packStyles.barFill, { width: `${pct}%` as any, backgroundColor: pack.color }]} />
      </View>
      <View style={packStyles.rarityRow}>
        {statsByRarity.map(({ r, color, count, total }) => (
          <View key={r} style={packStyles.rarityItem}>
            <View style={[packStyles.rarityDot, { backgroundColor: color }]} />
            <Text style={[packStyles.rarityCount, { color }]}>{count}<Text style={packStyles.rarityTotal}>/{total}</Text></Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const packStyles = StyleSheet.create({
  card:       { backgroundColor:'#0a0a18', borderRadius:14, borderWidth:1, padding:16, marginBottom:12 },
  header:     { flexDirection:'row', alignItems:'center', gap:10, marginBottom:10 },
  packDot:    { width:12, height:12, borderRadius:6, flexShrink:0 },
  name:       { fontFamily:'Orbitron_700Bold', fontSize:11, letterSpacing:1 },
  sub:        { fontFamily:'Rajdhani_600SemiBold', fontSize:12, color:'#506070', marginTop:2 },
  pct:        { fontFamily:'Orbitron_900Black', fontSize:20 },
  barTrack:   { height:5, borderRadius:3, overflow:'hidden', marginBottom:10 },
  barFill:    { height:'100%', borderRadius:3 },
  rarityRow:  { flexDirection:'row', justifyContent:'space-between' },
  rarityItem: { alignItems:'center', gap:3 },
  rarityDot:  { width:6, height:6, borderRadius:3 },
  rarityCount:{ fontFamily:'Orbitron_700Bold', fontSize:10 },
  rarityTotal:{ color:'#303050', fontFamily:'Orbitron_700Bold', fontSize:8 },
});

// ── QuestCard ─────────────────────────────────────────────────────────────────
function QuestCard({ quest, progress }: { quest: Quest; progress: number }) {
  const target    = quest.req.n;
  const done      = progress >= target;
  const pct       = Math.min(progress / target, 1);
  const diffColor = DIFF_COLOR[quest.diff] ?? '#4fc3f7';

  return (
    <View style={[qStyles.card, done && qStyles.cardDone]}>
      <View style={qStyles.top}>
        <View style={[qStyles.iconBox, { borderColor: quest.color + '55', backgroundColor: quest.color + '14' }]}>
          <Text style={[qStyles.iconSymbol, { color: quest.color }]}>{quest.symbol}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[qStyles.task, done && { color: '#4caf5099' }]}>{quest.task}</Text>
          <View style={qStyles.metaRow}>
            <View style={[qStyles.diffBadge, { borderColor: diffColor + '66', backgroundColor: diffColor + '18' }]}>
              <Text style={[qStyles.diffText, { color: diffColor }]}>{quest.diff.toUpperCase()}</Text>
            </View>
            <Text style={qStyles.reward}>+{quest.xp} XP  +{quest.credits} CR</Text>
          </View>
        </View>
        {done
          ? <View style={qStyles.checkBox}><Text style={qStyles.checkmark}>DONE</Text></View>
          : <Text style={qStyles.progressText}>{progress}/{target}</Text>
        }
      </View>
      <View style={qStyles.barTrack}>
        <View style={[
          qStyles.barFill,
          { width: `${Math.round(pct * 100)}%` as any },
          { backgroundColor: done ? '#4caf50' : diffColor },
        ]} />
      </View>
    </View>
  );
}

const qStyles = StyleSheet.create({
  card:         { backgroundColor:'#0a0a1e', borderRadius:12, borderWidth:1, borderColor:'#14142a', padding:14, marginBottom:10 },
  cardDone:     { borderColor:'#4caf5033', backgroundColor:'#4caf5008' },
  top:          { flexDirection:'row', alignItems:'center', gap:12, marginBottom:10 },
  iconBox:      { width:34, height:34, borderRadius:8, borderWidth:1, alignItems:'center', justifyContent:'center', flexShrink:0 },
  iconSymbol:   { fontSize:16, lineHeight:20 },
  task:         { fontFamily:'Orbitron_700Bold', fontSize:11, color:'#c0c8dc', letterSpacing:0.3, lineHeight:16 },
  metaRow:      { flexDirection:'row', alignItems:'center', gap:8, marginTop:5 },
  diffBadge:    { paddingHorizontal:7, paddingVertical:2, borderRadius:5, borderWidth:1 },
  diffText:     { fontFamily:'Orbitron_700Bold', fontSize:8, letterSpacing:1 },
  reward:       { fontFamily:'Rajdhani_600SemiBold', fontSize:12, color:'#506070' },
  checkBox:     { backgroundColor:'#4caf5022', borderRadius:6, paddingHorizontal:6, paddingVertical:3, borderWidth:1, borderColor:'#4caf5066' },
  checkmark:    { fontFamily:'Orbitron_700Bold', fontSize:8, color:'#4caf50', letterSpacing:1 },
  progressText: { fontFamily:'Orbitron_700Bold', fontSize:11, color:'#606480' },
  barTrack:     { height:4, backgroundColor:'#0d0d20', borderRadius:2, overflow:'hidden' },
  barFill:      { height:'100%', borderRadius:2 },
});

// ── HomeScreen ────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: Props) {
  const { username } = useSession();
  const gs = useGameStateContext();
  const todaysQuests = getTodaysQuests();
  const questProgress = gs.questProgress;
  const doneCount = todaysQuests.filter(q => (questProgress[q.id] ?? 0) >= q.req.n).length;

  const isMaxLevel = gs.level >= 100;

  // Saved battle resume
  const saved = gs.savedBattle;
  const hasSavedBattle = saved && saved.version === 1 &&
    (Date.now() - (saved.savedAt ?? 0)) < 24 * 60 * 60 * 1000;

  useEffect(() => {
    if (hasSavedBattle) {
      navigation.navigate('Battle', {
        playerDeck: saved.playerDeckIds,
        tier: saved.tier,
        resume: saved,
      });
    }
  }, []); // run once on mount

  // Resolve active avatar symbol + color
  const avatarData =
    AVATARS.find(a => a.id === gs.activeAvatar) ??
    LEVEL_AVATARS.find(a => a.id === gs.activeAvatar);
  const avatarSymbol = avatarData?.symbol ?? username.charAt(0).toUpperCase();
  const avatarColor  = avatarData?.color  ?? '#4fc3f7';

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Profile card ── */}
        <TouchableOpacity
          style={styles.profileCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Profile')}
        >
          {/* Active avatar ring */}
          <View style={[styles.avatarRing, { borderColor: avatarColor + '66' }]}>
            <Text style={[styles.avatarInitial, { color: avatarColor }]}>{avatarSymbol}</Text>
          </View>

          {/* Username + level */}
          <View style={styles.profileInfo}>
            <Text style={styles.username} numberOfLines={1}>{username.toUpperCase()}</Text>
            <View style={styles.levelRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>LVL {gs.level}</Text>
              </View>
              <Text style={styles.cardCount}>{totalUniqueOwned(gs.collection)} CARDS</Text>
            </View>
            <XpBar xpInLevel={gs.xpInLevel} xpNeeded={gs.xpNeeded} />
            <View style={styles.xpLabelRow}>
              <Text style={styles.xpLabel}>{gs.xpInLevel.toLocaleString()} / {gs.xpNeeded.toLocaleString()} XP</Text>
              {!isMaxLevel
                ? <Text style={styles.xpNextLabel}>LVL {gs.level + 1}</Text>
                : <Text style={[styles.xpNextLabel, { color: '#ff9800' }]}>MAX</Text>
              }
            </View>
          </View>

          {/* Credits */}
          <View style={styles.creditsBox}>
            <Text style={styles.creditsAmount}>{gs.coins.toLocaleString()}</Text>
            <Text style={styles.creditsLabel}>CREDITS</Text>
          </View>
        </TouchableOpacity>

        {/* ── Battle button ── */}
        <TouchableOpacity
          style={styles.battleBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('BattleLobby')}
        >
          <MaterialCommunityIcons name="sword-cross" size={28} color="#fff" />
          <Text style={styles.battleBtnText}>BATTLE</Text>
        </TouchableOpacity>

        {/* ── Open Pack button ── */}
        <TouchableOpacity
          style={styles.packBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('PackOpening' as never)}
        >
          <MaterialCommunityIcons name="cards" size={28} color="#fff" />
          <Text style={styles.packBtnText}>OPEN PACK</Text>
          <Text style={styles.packBtnSub}>{PACK_COST} CR</Text>
        </TouchableOpacity>

        {/* ── Daily Quests ── */}
        <View style={styles.questSection}>
          <View style={styles.questHeader}>
            <Text style={styles.sectionTitle}>— DAILY QUESTS</Text>
            <Text style={[styles.questDoneLabel, { color: doneCount >= 3 ? '#4caf50' : '#606480' }]}>
              {doneCount}/3 COMPLETE
            </Text>
          </View>
          <Text style={styles.questSub}>Resets at midnight</Text>
          {todaysQuests.map(quest => (
            <QuestCard key={quest.id} quest={quest} progress={questProgress[quest.id] ?? 0} />
          ))}
        </View>

        {/* ── Pack completion stats ── */}
        <Text style={styles.sectionTitle}>PACK PROGRESS</Text>
        <PackStatCard packId={1} collection={gs.collection} cardRoster={gs.cardRoster} />
        <PackStatCard packId={2} collection={gs.collection} cardRoster={gs.cardRoster} />

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex:1, backgroundColor:'#060610' },
  scroll: { padding:20, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom:40 },

  // Profile card
  profileCard: {
    flexDirection:'row', alignItems:'flex-start', gap:14,
    backgroundColor:'#0a0a1e', borderRadius:20,
    padding:18, marginBottom:20,
    borderWidth:1, borderColor:'#12122a',
  },
  avatarRing: {
    width:64, height:64, borderRadius:32,
    backgroundColor:'#12122e',
    borderWidth:2, borderColor:'#4fc3f744',
    alignItems:'center', justifyContent:'center', flexShrink:0,
  },
  avatarInitial: { fontFamily:'Orbitron_900Black', fontSize:22, color:'#4fc3f7' },
  profileInfo: { flex:1, gap:2 },
  username: {
    fontFamily:'Orbitron_900Black', fontSize:16,
    color:'#ffffff', letterSpacing:1,
  },
  levelRow: { flexDirection:'row', alignItems:'center', gap:8, marginTop:4 },
  levelBadge: {
    backgroundColor:'#4fc3f722', borderRadius:6,
    paddingHorizontal:8, paddingVertical:2,
    borderWidth:1, borderColor:'#4fc3f744',
  },
  levelText: { fontFamily:'Orbitron_700Bold', fontSize:11, color:'#4fc3f7' },
  cardCount: { fontFamily:'Orbitron_700Bold', fontSize:11, color:'#506070' },
  xpLabelRow: { flexDirection:'row', justifyContent:'space-between', marginTop:3 },
  xpLabel:    { fontFamily:'monospace', fontSize:9, color:'#506070' },
  xpNextLabel:{ fontFamily:'Orbitron_700Bold', fontSize:9, color:'#4fc3f788' },
  creditsBox: { alignItems:'center', flexShrink:0 },
  creditsAmount: { fontFamily:'Orbitron_900Black', fontSize:20, color:'#4fc3f7', lineHeight:24 },
  creditsLabel:  { fontFamily:'Orbitron_700Bold', fontSize:8, color:'#404458', letterSpacing:1 },

  // Battle button
  battleBtn: {
    flexDirection:'row', alignItems:'center', justifyContent:'center',
    gap:12, marginBottom:16, paddingVertical:18,
    backgroundColor:'#e8445a', borderRadius:16,
    shadowColor:'#e8445a', shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:12,
  },
  battleBtnText: {
    fontFamily:'Orbitron_900Black', fontSize:20,
    color:'#ffffff', letterSpacing:3,
  },

  // Open pack button
  packBtn: {
    flexDirection:'row', alignItems:'center', justifyContent:'center',
    gap:12, marginBottom:20, paddingVertical:18,
    backgroundColor:'#4fc3f7', borderRadius:16,
    shadowColor:'#4fc3f7', shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:12,
  },
  packBtnText: {
    fontFamily:'Orbitron_900Black', fontSize:20,
    color:'#ffffff', letterSpacing:3,
  },
  packBtnSub: {
    fontFamily:'Orbitron_700Bold', fontSize:12,
    color:'#ffffffaa', letterSpacing:1,
  },

  // Daily quests
  questSection: { marginBottom:24 },
  questHeader:  { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  questDoneLabel: { fontFamily:'Orbitron_700Bold', fontSize:9, letterSpacing:1 },
  questSub:     { fontFamily:'Rajdhani_600SemiBold', fontSize:12, color:'#404458', marginBottom:14 },

  // Section title
  sectionTitle: {
    fontFamily:'Orbitron_700Bold', fontSize:9,
    color:'#404060', letterSpacing:2.5, marginBottom:12,
  },
});
