// DecksScreen — coming soon placeholder.

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { T } from '../theme/theme';

export default function DecksScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <MaterialCommunityIcons name="cards-outline" size={64} color={T.accent.mintMuted} />
        <Text style={styles.title}>DECKS</Text>
        <Text style={styles.sub}>Coming Soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg.root, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', gap: 12 },
  title: { fontFamily: 'Orbitron_900Black', fontSize: 24, color: T.text.primary, letterSpacing: 3 },
  sub: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 16, color: T.text.primary },
});
