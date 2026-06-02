import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router }                                    from 'expo-router';
import { t }                                         from '../i18n';
import type { SupportedLocale }                      from '../i18n';

interface Props {
  locale?: SupportedLocale;
}

export function SearchBar({ locale = 'es-CL' }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.inputBox}
        onPress={() => router.push('/navigation')}
        activeOpacity={0.8}
      >
        <View style={styles.row}>
          <View style={styles.dotOrigin} />
          <Text style={styles.placeholder}>Mi ubicación</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.dotDest} />
          <Text style={styles.placeholderFaint}>{t('where_to', locale)}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { paddingHorizontal: 16, paddingVertical: 10 },
  inputBox: {
    backgroundColor: '#fff',
    borderRadius:     12,
    padding:          12,
    elevation:        4,
    shadowColor:      '#000',
    shadowOpacity:    0.1,
    shadowRadius:     6,
    shadowOffset:     { width: 0, height: 2 },
  },
  row:              { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dotOrigin: {
    width:        8,
    height:       8,
    borderRadius: 4,
    backgroundColor: '#1a1a2e',
  },
  dotDest: {
    width:        8,
    height:       8,
    borderRadius: 2,
    backgroundColor: '#E31837',
  },
  placeholder:      { fontSize: 13, color: '#333' },
  placeholderFaint: { fontSize: 13, color: '#999' },
  divider:          { height: 0.5, backgroundColor: '#e0e0e0', marginVertical: 8, marginLeft: 18 },
});