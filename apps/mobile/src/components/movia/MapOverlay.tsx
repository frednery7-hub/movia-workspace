import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../theme/colors';

export function MapOverlay() {
  const theme = useAppTheme();

  return (
    <>
      <LinearGradient
        colors={[theme.colors.overlayTop, 'transparent']}
        style={styles.top}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', theme.colors.overlayBottom]}
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
