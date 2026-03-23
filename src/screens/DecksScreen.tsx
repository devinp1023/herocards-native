// DecksScreen — coming soon placeholder.

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DecksScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <MaterialCommunityIcons name="cards-outline" size={64} color="#4fc3f744" />
        <Text style={styles.title}>DECKS</Text>
        <Text style={styles.sub}>Coming Soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060610', alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', gap: 12 },
  title: { fontFamily: 'Orbitron_900Black', fontSize: 24, color: '#ffffff', letterSpacing: 3 },
  sub: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 16, color: '#ffffff' },
});
