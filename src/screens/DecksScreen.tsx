// DecksScreen — coming soon placeholder.

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenBackground } from '../components/ScreenBackground';
import { T } from '../theme/theme';

export default function DecksScreen() {
  return (
    <ScreenBackground theme="neutral" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={styles.content}>
        <MaterialCommunityIcons name="cards-outline" size={64} color={T.accent.mintMuted} />
        <Text style={styles.title}>DECKS</Text>
        <Text style={styles.sub}>Coming Soon</Text>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: 12 },
  title: { fontFamily: 'Orbitron_900Black', fontSize: T.font.xl, color: T.text.primary, letterSpacing: 3 },
  sub: { fontFamily: 'Rajdhani_600SemiBold', fontSize: T.font.lg, color: T.text.primary },
});
