import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export interface Destination {
  id:       string;
  name:     string;
  line:     string;
  distance: string;
}

const MOCK_RECENTS: Destination[] = [
  { id: '1', name: 'Baquedano',     line: 'L1',    distance: '2.1 km' },
  { id: '2', name: 'Tobalaba',      line: 'L1/L4', distance: '3.3 km' },
  { id: '3', name: 'Los Dominicos', line: 'L1',    distance: '4.8 km' },
];

interface Props {
  onSelect?: (dest: Destination) => void;
}

export function RecentDestinations({ onSelect }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>RECIENTES</Text>
      {MOCK_RECENTS.map((dest, index) => (
        <TouchableOpacity
          key={dest.id}
          style={[styles.item, index < MOCK_RECENTS.length - 1 && styles.itemBorder]}
          onPress={() => onSelect?.(dest)}
          activeOpacity={0.7}
        >
          <View style={styles.iconBox}>
            <Text style={styles.iconText}>🕐</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{dest.name}</Text>
            <Text style={styles.meta}>{dest.line} · {dest.distance}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { marginTop: 14 },
  label:      { fontSize: 9, color: '#999', fontWeight: '600', letterSpacing: 0.5, marginBottom: 6 },
  item:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  itemBorder: { borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  iconBox: {
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: '#FCE8E8',
    alignItems:      'center',
    justifyContent:  'center',
  },
  iconText: { fontSize: 13 },
  info:     { flex: 1 },
  name:     { fontSize: 12, fontWeight: '500', color: '#1a1a2e' },
  meta:     { fontSize: 10, color: '#999', marginTop: 1 },
  arrow:    { fontSize: 18, color: '#ccc' },
});