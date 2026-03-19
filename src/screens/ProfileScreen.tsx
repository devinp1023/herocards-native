// ProfileScreen — user profile header + daily quests + achievements placeholder.
// Full quest progress wired in Session 9.

import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, Platform, TouchableOpacity,
} from 'react-native';
import { useSession } from '../context/SessionContext';
import { totalUniqueOwned } from '../hooks/useGameState';
import { useGameStateContext } from '../context/GameStateContext';
import { getTodaysQuests, DIFF_COLOR, Quest } from '../data/quests';
import { AVATARS, LEVEL_AVATARS } from '../data/packs';
import { auth } from '../firebase/config';

// ── QuestCard ─────────────────────────────────────────────────────────────────
function QuestCard({ quest, progress }: { quest: Quest; progress: number }) {
  const target   = quest.req.n;
  const done     = progress >= target;
  const pct      = Math.min(progress / target, 1);
  const diffColor = DIFF_COLOR[quest.diff] ?? '#4fc3f7';

  return (
    <View style={[qStyles.card, done && qStyles.cardDone]}>
      <View style={qStyles.top}>
        <View style={[qStyles.iconDot, { backgroundColor: diffColor }]} />
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
          : <Text style={qStyles.progress}>{progress}/{target}</Text>
        }
      </View>
      {/* Progress bar */}
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
  card:      { backgroundColor:'#0a0a1e', borderRadius:12, borderWidth:1, borderColor:'#14142a', padding:14, marginBottom:10 },
  cardDone:  { borderColor:'#4caf5033', backgroundColor:'#4caf5008' },
  top:       { flexDirection:'row', alignItems:'flex-start', gap:12, marginBottom:10 },
  iconDot:   { width:10, height:10, borderRadius:5, marginTop:4, flexShrink:0 },
  task:      { fontFamily:'Orbitron_700Bold', fontSize:11, color:'#c0c8dc', letterSpacing:0.3, lineHeight:16 },
  metaRow:   { flexDirection:'row', alignItems:'center', gap:8, marginTop:5 },
  diffBadge: { paddingHorizontal:7, paddingVertical:2, borderRadius:5, borderWidth:1 },
  diffText:  { fontFamily:'Orbitron_700Bold', fontSize:8, letterSpacing:1 },
  reward:    { fontFamily:'Rajdhani_600SemiBold', fontSize:12, color:'#506070' },
  checkBox:  { backgroundColor:'#4caf5022', borderRadius:6, paddingHorizontal:6, paddingVertical:3, borderWidth:1, borderColor:'#4caf5066' },
  checkmark: { fontFamily:'Orbitron_700Bold', fontSize:8, color:'#4caf50', letterSpacing:1 },
  progress:  { fontFamily:'Orbitron_700Bold', fontSize:11, color:'#606480' },
  barTrack:  { height:4, backgroundColor:'#0d0d20', borderRadius:2, overflow:'hidden' },
  barFill:   { height:'100%', borderRadius:2 },
});

// ── ProfileScreen ─────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { username } = useSession();
  const gs = useGameStateContext();
  const todaysQuests = getTodaysQuests();

  // Mock progress — real tracking in Session 9
  const questProgress: Record<string, number> = {};

  const doneCount = todaysQuests.filter(q => (questProgress[q.id] ?? 0) >= q.req.n).length;

  // Resolve active avatar symbol + color
  const avatarData =
    AVATARS.find(a => a.id === gs.activeAvatar) ??
    LEVEL_AVATARS.find(a => a.id === gs.activeAvatar);
  const avatarSymbol = avatarData?.symbol ?? username.charAt(0).toUpperCase();
  const avatarColor  = avatarData?.color  ?? '#4fc3f7';

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Profile header ── */}
        <View style={styles.header}>
          {/* Active avatar ring — symbol + accent color */}
          <View style={[styles.avatarRing, { borderColor: avatarColor + '66' }]}>
            <Text style={[styles.avatarInitial, { color: avatarColor }]}>{avatarSymbol}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.username} numberOfLines={1}>{username.toUpperCase()}</Text>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{gs.level}</Text>
                <Text style={styles.statLbl}>LEVEL</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{gs.xp.toLocaleString()}</Text>
                <Text style={styles.statLbl}>TOTAL XP</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{totalUniqueOwned(gs.collection)}</Text>
                <Text style={styles.statLbl}>CARDS</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{gs.coins.toLocaleString()}</Text>
                <Text style={styles.statLbl}>CR</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Daily Quests ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>— DAILY QUESTS</Text>
          <Text style={[styles.doneLabel, { color: doneCount >= 3 ? '#4caf50' : '#606480' }]}>
            {doneCount}/3 COMPLETE
          </Text>
        </View>
        <Text style={styles.sectionSub}>Resets at midnight · Same quests for all players</Text>

        {todaysQuests.map(quest => (
          <QuestCard key={quest.id} quest={quest} progress={questProgress[quest.id] ?? 0} />
        ))}

        <View style={styles.divider} />

        {/* ── Achievements placeholder ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>— ACHIEVEMENTS</Text>
        </View>
        <View style={styles.achPlaceholder}>
          <View style={styles.achIconBox}><Text style={styles.achIconText}>ACH</Text></View>
          <Text style={styles.achTitle}>Coming in Session 9</Text>
          <Text style={styles.achSub}>Achievements, tiers, and unlock rewards</Text>
        </View>

        <View style={styles.divider} />

        {/* ── Log out ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => auth.signOut()}
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
  root:   { flex:1, backgroundColor:'#060610' },
  scroll: { padding:20, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom:50 },

  // Header
  header: {
    flexDirection:'row', gap:16, alignItems:'center',
    backgroundColor:'#0a0a1e', borderRadius:20,
    padding:18, marginBottom:16,
    borderWidth:1, borderColor:'#12122a',
  },
  avatarRing: {
    width:70, height:70, borderRadius:35,
    backgroundColor:'#12122e',
    borderWidth:2, borderColor:'#4fc3f744',
    alignItems:'center', justifyContent:'center', flexShrink:0,
  },
  avatarInitial: { fontFamily:'Orbitron_900Black', fontSize:26, color:'#4fc3f7' },
  username: {
    fontFamily:'Orbitron_900Black', fontSize:18,
    color:'#ffffff', letterSpacing:1, marginBottom:10,
  },
  statRow:     { flexDirection:'row', alignItems:'center' },
  statBox:     { alignItems:'center', flex:1 },
  statVal:     { fontFamily:'Orbitron_900Black', fontSize:14, color:'#4fc3f7' },
  statLbl:     { fontFamily:'Orbitron_700Bold', fontSize:7, color:'#404458', letterSpacing:1, marginTop:2 },
  statDivider: { width:1, height:24, backgroundColor:'#1a1a30', marginHorizontal:4 },

  divider: { height:1, backgroundColor:'#12122a', marginVertical:18 },

  // Section headers
  sectionHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  sectionTitle:  { fontFamily:'Orbitron_700Bold', fontSize:12, color:'#c0c8dc', letterSpacing:1.5 },
  doneLabel:     { fontFamily:'Orbitron_700Bold', fontSize:9, letterSpacing:1 },
  sectionSub:    { fontFamily:'Rajdhani_600SemiBold', fontSize:12, color:'#404458', marginBottom:14 },

  // Achievement placeholder
  achPlaceholder: {
    alignItems:'center', padding:32,
    backgroundColor:'#0a0a1e', borderRadius:14,
    borderWidth:1, borderColor:'#14142a', gap:8,
  },
  achIconBox:  { width:48, height:48, borderRadius:12, backgroundColor:'#14142a', alignItems:'center', justifyContent:'center' },
  achIconText: { fontFamily:'Orbitron_700Bold', fontSize:10, color:'#404458', letterSpacing:1 },
  achTitle:    { fontFamily:'Orbitron_700Bold', fontSize:12, color:'#606480', letterSpacing:0.5 },
  achSub:      { fontFamily:'Rajdhani_600SemiBold', fontSize:13, color:'#303050', textAlign:'center' },

  // Log out
  logoutBtn: {
    alignItems:'center', justifyContent:'center',
    paddingVertical:14, borderRadius:12,
    borderWidth:1, borderColor:'#ef535033',
    backgroundColor:'#ef535008', marginBottom:8,
  },
  logoutText: { fontFamily:'Orbitron_700Bold', fontSize:11, color:'#ef5350', letterSpacing:2 },
});
