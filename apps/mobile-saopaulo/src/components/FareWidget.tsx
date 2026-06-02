import { View, Text, StyleSheet } from 'react-native';

interface FareInfo {
  type:  'PUNTA' | 'VALLE' | 'BAJO';
  label: string;
  price: number;
  hours: string;
  color: string;
}

export function getCurrentFare(): FareInfo {
  const now   = new Date();
  const fmt   = new Intl.DateTimeFormat("es-CL", { hour: "numeric", minute: "numeric", hour12: false, timeZone: "America/Santiago" }).format(now);
  const [hh, mm] = fmt.split(":").map(Number);
  const time  = hh * 60 + mm;

  if ((time >= 420 && time <= 539) || (time >= 1080 && time <= 1199)) {
    return { type: 'PUNTA', label: 'Punta', price: 895, hours: '07:00–08:59 / 18:00–19:59', color: '#F26522' };
  }
  if ((time >= 360 && time <= 419) || (time >= 1245 && time <= 1380)) {
    return { type: 'BAJO', label: 'Bajo', price: 735, hours: '06:00–06:59 / 20:45–23:00', color: '#2196F3' };
  }
  return { type: 'VALLE', label: 'Valle', price: 815, hours: '09:00–17:59 / 20:00–20:44', color: '#4CAF50' };
}

export function FareWidget() {
  const fare = getCurrentFare();

  return (
    <View style={[styles.container, { backgroundColor: fare.color }]}>
      <View>
        <Text style={styles.type}>{fare.label.toUpperCase()}</Text>
        <Text style={styles.hours}>{fare.hours}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>${fare.price}</Text>
        <Text style={styles.label}>tarifa agora</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius:      10,
    paddingHorizontal: 14,
    paddingVertical:   10,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    marginTop:         10,
  },
  type:   { fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  hours:  { fontSize: 9,  color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  right:  { alignItems: 'flex-end' },
  price:  { fontSize: 22, fontWeight: '500', color: '#fff', lineHeight: 24 },
  label:  { fontSize: 9,  color: 'rgba(255,255,255,0.7)' },
});