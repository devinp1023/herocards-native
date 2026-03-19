// CardDetailScreen — placeholder, built out in Session 5.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { ALL_CARDS } from '../data/cards';
import { CardWrapper } from '../components/CardWrapper';
import { HeroCard } from '../components/HeroCard';
import { MissingCard } from '../components/MissingCard';

type Props = NativeStackScreenProps<RootStackParamList, 'CardDetail'>;

export default function CardDetailScreen({ route, navigation }: Props) {
  const { cardId, owned } = route.params;
  const card = ALL_CARDS.find(c => c.id === cardId);

  if (!card) return null;

  return (
    <View style={styles.root}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.cardArea}>
        <CardWrapper scale={0.90} style={styles.centered}>
          {owned
            ? <HeroCard card={card} showShine enableTilt />
            : <MissingCard card={card} />
          }
        </CardWrapper>
      </View>

      <Text style={styles.hint}>Session 5 — full detail screen coming next</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#060610',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  backText: {
    color: '#4fc3f7',
    fontFamily: 'Orbitron_700Bold',
    fontSize: 13,
  },
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    alignSelf: 'center',
  },
  hint: {
    textAlign: 'center',
    color: '#404458',
    fontFamily: 'monospace',
    fontSize: 11,
    marginBottom: 40,
  },
});
