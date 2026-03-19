// BattleScreen — live battle UI, built in Sessions 11–12.

import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BattleStackParamList } from '../../App';

type Props = NativeStackScreenProps<BattleStackParamList, 'Battle'>;

export default function BattleScreen({ navigation, route }: Props) {
  const { playerDeck, tier } = route.params;
  return (
    <View style={styles.root}>
      <Text style={styles.title}>BATTLE</Text>
      <Text style={styles.sub}>Tier {tier} · {playerDeck.length} cards</Text>
      <Text style={styles.session}>Battle UI — Sessions 11–12</Text>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
        <Text style={styles.backText}>← BACK TO LOBBY</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root:     { flex:1, backgroundColor:'#060610', alignItems:'center', justifyContent:'center', paddingTop: Platform.OS === 'ios' ? 44 : 0 },
  title:    { fontFamily:'Orbitron_900Black', fontSize:28, color:'#ff4060', letterSpacing:3, marginBottom:8 },
  sub:      { fontFamily:'Rajdhani_600SemiBold', fontSize:16, color:'#506070', marginBottom:24 },
  session:  { fontFamily:'Orbitron_700Bold', fontSize:10, color:'#303050', letterSpacing:1, marginBottom:32 },
  backBtn:  { paddingHorizontal:24, paddingVertical:12, borderRadius:10, borderWidth:1, borderColor:'#4fc3f733' },
  backText: { fontFamily:'Orbitron_700Bold', fontSize:12, color:'#4fc3f7', letterSpacing:1.5 },
});
