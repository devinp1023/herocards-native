// BattleLobbyScreen — placeholder, built out in Session 10.

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

export default function BattleLobbyScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>BATTLE</Text>
      <Text style={styles.sub}>Deck builder · Difficulty select · PvE</Text>
      <Text style={styles.session}>Coming in Session 10</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex:1, backgroundColor:'#060610', alignItems:'center', justifyContent:'center', paddingTop: Platform.OS === 'ios' ? 44 : 0 },
  title:   { fontFamily:'Orbitron_900Black', fontSize:28, color:'#ff4060', letterSpacing:3, marginBottom:8 },
  sub:     { fontFamily:'Rajdhani_600SemiBold', fontSize:16, color:'#506070', marginBottom:24 },
  session: { fontFamily:'Orbitron_700Bold', fontSize:10, color:'#303050', letterSpacing:1 },
});
