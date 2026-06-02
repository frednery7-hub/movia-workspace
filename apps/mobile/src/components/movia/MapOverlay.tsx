import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export function MapOverlay() {
  return (
    <>
      <LinearGradient
        colors={['rgba(240,242,245,0.4)', 'transparent']}
        style={styles.top}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(240,242,245,0.6)']}
        style={styles.bottom}
        pointerEvents="none"
      />
    </>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, height: 140 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 },
});
