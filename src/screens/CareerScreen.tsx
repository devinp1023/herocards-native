// CareerScreen — achievements display.

import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Platform,
} from 'react-native';
import { useGameStateContext } from '../context/GameStateContext';
import { ACHIEVEMENTS, ACHIEVEMENT_FAMILIES } from '../data/achievements';

// ── AchievementFamilyRow ──────────────────────────────────────────────────────
const TIER_LABELS = ['I', 'II', 'III', 'IV', 'V'] as const;

function AchievementFamilyRow({
  family,
  earnedSet,
}: {
  family: string;
  earnedSet: Set<string>;
}) {
  const tiers = ACHIEVEMENTS.filter(a => a.family === family);
  if (tiers.length === 0) return null;

  const { symbol, color } = tiers[0];
  const earnedCount = tiers.filter(a => earnedSet.has(a.id)).length;
  const allDone     = earnedCount === tiers.length;

  return (
    <View style={[achStyles.familyRow, allDone && achStyles.familyRowDone]}>
      {/* Symbol */}
      <View style={[achStyles.symbolBox, { borderColor: color + '55', backgroundColor: color + '14' }]}>
        <Text style={[achStyles.symbolText, { color }]}>{symbol}</Text>
      </View>

      {/* Family name + tier pips */}
      <View style={{ flex: 1 }}>
        <Text style={[achStyles.familyName, allDone && { color: color }]} numberOfLines={1}>
          {family.toUpperCase()}
        </Text>
        <View style={achStyles.pipsRow}>
          {tiers.map((a, i) => {
            const earned = earnedSet.has(a.id);
            return (
              <View
                key={a.id}
                style={[
                  achStyles.pip,
                  earned
                    ? { backgroundColor: color, borderColor: color }
                    : { backgroundColor: 'transparent', borderColor: '#1e1e3a' },
                ]}
              >
                <Text style={[achStyles.pipText, { color: earned ? '#000' : '#303050' }]}>
                  {TIER_LABELS[i] ?? a.tier}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Count */}
      <Text style={[achStyles.count, allDone && { color }]}>
        {earnedCount}/{tiers.length}
      </Text>
    </View>
  );
}

const achStyles = StyleSheet.create({
  familyRow:     { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:'#0a0a1e', borderRadius:12, borderWidth:1, borderColor:'#14142a', padding:12, marginBottom:8 },
  familyRowDone: { borderColor:'#4caf5022', backgroundColor:'#4caf5006' },
  symbolBox:     { width:36, height:36, borderRadius:9, borderWidth:1, alignItems:'center', justifyContent:'center', flexShrink:0 },
  symbolText:    { fontSize:18, lineHeight:22 },
  familyName:    { fontFamily:'Orbitron_700Bold', fontSize:10, color:'#808898', letterSpacing:0.5, marginBottom:6 },
  pipsRow:       { flexDirection:'row', gap:4 },
  pip:           { width:22, height:18, borderRadius:4, borderWidth:1, alignItems:'center', justifyContent:'center' },
  pipText:       { fontFamily:'Orbitron_700Bold', fontSize:7, letterSpacing:0.3 },
  count:         { fontFamily:'Orbitron_700Bold', fontSize:11, color:'#404458', minWidth:28, textAlign:'right' },
});

// ── CareerScreen ─────────────────────────────────────────────────────────────
export default function CareerScreen() {
  const gs = useGameStateContext();

  const earnedSet = useMemo(() => new Set(gs.earnedAchievements), [gs.earnedAchievements]);
  const totalEarned = gs.earnedAchievements.length;
  const totalAch    = ACHIEVEMENTS.length;

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <Text style={styles.screenTitle}>CAREER</Text>

        {/* ── Achievements ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>— ACHIEVEMENTS</Text>
          <Text style={[styles.doneLabel, { color: totalEarned === totalAch ? '#4caf50' : '#606480' }]}>
            {totalEarned}/{totalAch}
          </Text>
        </View>
        <Text style={styles.sectionSub}>Unlock tiers to earn XP and credits</Text>

        {ACHIEVEMENT_FAMILIES.map(family => (
          <AchievementFamilyRow key={family} family={family} earnedSet={earnedSet} />
        ))}

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex:1, backgroundColor:'#060610' },
  scroll: { padding:20, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom:50 },

  screenTitle: {
    fontFamily:'Orbitron_900Black', fontSize:22,
    color:'#ffffff', letterSpacing:2, marginBottom:20,
  },

  sectionHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  sectionTitle:  { fontFamily:'Orbitron_700Bold', fontSize:12, color:'#c0c8dc', letterSpacing:1.5 },
  doneLabel:     { fontFamily:'Orbitron_700Bold', fontSize:9, letterSpacing:1 },
  sectionSub:    { fontFamily:'Rajdhani_600SemiBold', fontSize:12, color:'#404458', marginBottom:14 },
});
