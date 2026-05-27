import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router }                                    from 'expo-router';
import { FareWidget }                               from './FareWidget';
import { RecentDestinations }                       from './RecentDestinations';

export function SearchCard() {
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
          <Text style={styles.placeholderFaint}>¿A dónde vas?</Text>
        </View>
      </TouchableOpacity>

      <RecentDestinations />
      <FareWidget />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position:        'absolute',
    bottom:          24,
    left:            16,
    right:           16,
    backgroundColor: '#fff',
    borderRadius:    20,
    padding:         14,
    shadowColor:     '#000',
    shadowOpacity:   0.10,
    shadowRadius:    16,
    shadowOffset:    { width: 0, height: 4 },
    elevation:       8,
  },
  inputBox: {
    backgroundColor: '#f8f8f6',
    borderRadius:    12,
    padding:         10,
    borderWidth:     0.5,
    borderColor:     '#ebebeb',
  },
  row:              { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dotOrigin:        { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1a1a2e' },
  dotDest:          { width: 8, height: 8, borderRadius: 2, backgroundColor: '#E31837' },
  placeholder:      { fontSize: 12, color: '#444' },
  placeholderFaint: { fontSize: 12, color: '#bbb' },
  divider:          { height: 0.5, backgroundColor: '#eee', marginVertical: 7, marginLeft: 18 },
});