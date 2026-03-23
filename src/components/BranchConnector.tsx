import React from 'react';
import { View, StyleSheet } from 'react-native';

interface BranchConnectorProps {
  completed: boolean;
  progress: number;    // 0.0–1.0
  color: string;
  orientation: 'horizontal' | 'vertical';
  length: number;
}

const BranchConnector = React.memo(function BranchConnector({
  completed, progress, color, orientation, length,
}: BranchConnectorProps) {
  const isVert = orientation === 'vertical';
  const fillFrac = completed ? 1 : Math.min(progress, 1);
  const fillColor = completed ? color : color + '60';

  return (
    <View style={[
      styles.track,
      isVert
        ? { width: 2, height: length }
        : { height: 2, width: length },
    ]}>
      <View style={[
        styles.fill,
        isVert
          ? { width: 2, height: length * fillFrac }
          : { height: 2, width: length * fillFrac },
        { backgroundColor: fillColor },
        completed && {
          shadowColor: color, shadowOpacity: 0.4, shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 }, elevation: 4,
        },
      ]} />
    </View>
  );
});

const styles = StyleSheet.create({
  track: { backgroundColor: '#1a1a30', alignSelf: 'center' },
  fill:  { position: 'absolute', top: 0, left: 0 },
});

export { BranchConnector };
