import React, { useState }                                        from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet }  from 'react-native';
import { router }                                                 from 'expo-router';

interface Station {
  id:         string;
  name:       string;
  status:     'done' | 'current' | 'next' | 'pending';
  connection?: { lineId: string; color: string };
}

const ROUTE: Station[] = [
  { id: '1', name: 'San Pablo',    status: 'done' },
  { id: '2', name: 'Neptuno',      status: 'done' },
  { id: '3', name: 'Pajaritos',    status: 'current', connection: { lineId: 'L5', color: '#00A550' } },
  { id: '4', name: 'Las Rejas',    status: 'next' },
  { id: '5', name: 'Ecuador',      status: 'pending' },
  { id: '6', name: 'San Alberto',  status: 'pending' },
  { id: '7', name: 'Blanqueado',   status: 'pending' },
  { id: '8', name: 'Pudahuel',     status: 'pending' },
  { id: '9', name: 'Los Dominicos',status: 'pending' },
];

const LINE_COLOR = '#E31837';

function dotColor(status: Station['status']): string {
  if (status === 'done')    return LINE_COLOR + '55';
  if (status === 'current') return LINE_COLOR;
  if (status === 'next')    return '#ccc';
  return '#e0e0e0';
}

function lineColor(status: Station['status']): string {
  if (status === 'done')    return LINE_COLOR + '55';
  if (status === 'current') return LINE_COLOR;
  return '#e0e0e0';
}

export default function NavigationScreen() {
  const [etaSeconds] = useState(39 * 60);
  const etaMin = Math.round(etaSeconds / 60);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          San Pablo → Los Dominicos
        </Text>
      </View>

      <View style={styles.etaCard}>
        <View>
          <Text style={styles.etaLabel}>Tiempo estimado</Text>
          <Text style={styles.etaValue}>{etaMin} min</Text>
        </View>
        <View style={styles.etaDivider} />
        <View style={styles.etaRight}>
          <Text style={styles.etaLabel}>Estaciones</Text>
          <Text style={styles.etaValue}>{ROUTE.length}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.routeContainer}>
          <View style={styles.progressBar}>
            {ROUTE.map((station, index) => (
              <View key={station.id} style={styles.progressItem}>
                <View style={[
                  styles.dot,
                  station.status === 'current' && styles.dotCurrent,
                  { backgroundColor: dotColor(station.status) },
                ]} />
                {index < ROUTE.length - 1 && (
                  <View style={[styles.line, { backgroundColor: lineColor(station.status) }]} />
                )}
              </View>
            ))}
          </View>

          <View style={styles.stationList}>
            {ROUTE.map((station) => (
              <View key={station.id} style={styles.stationItem}>
                <Text style={[
                  styles.stationName,
                  station.status === 'current'  && styles.stationNameCurrent,
                  station.status === 'done'     && styles.stationNameDone,
                  station.status === 'pending'  && styles.stationNamePending,
                ]}>
                  {station.name}
                </Text>
                {station.connection && (
                  <View style={styles.connectionRow}>
                    <View style={[styles.connectionDot, { backgroundColor: station.connection.color }]} />
                    <Text style={[styles.connectionText, { color: station.connection.color }]}>
                      Conexión {station.connection.lineId}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8f8f6' },
  header: {
    backgroundColor: '#1a1a2e',
    paddingTop:      52,
    paddingBottom:   14,
    paddingHorizontal: 16,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             10,
  },
  backBtn:      { padding: 4 },
  backText:     { color: '#fff', fontSize: 28, lineHeight: 28 },
  headerTitle:  { color: '#fff', fontSize: 14, fontWeight: '500', flex: 1 },
  etaCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical:  14,
    flexDirection:   'row',
    alignItems:      'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  etaLabel:     { fontSize: 11, color: '#999' },
  etaValue:     { fontSize: 26, fontWeight: '500', color: '#1a1a2e', lineHeight: 30 },
  etaDivider:   { width: 0.5, height: 36, backgroundColor: '#f0f0f0', marginHorizontal: 20 },
  etaRight:     { alignItems: 'flex-end', flex: 1 },
  scroll:       { flex: 1 },
  routeContainer: { flexDirection: 'row', paddingTop: 20, paddingHorizontal: 20 },
  progressBar:  { width: 20, alignItems: 'center' },
  progressItem: { alignItems: 'center' },
  dot: {
    width:        12,
    height:       12,
    borderRadius: 6,
    zIndex:       1,
  },
  dotCurrent: {
    width:       14,
    height:      14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#E31837',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation:   4,
  },
  line: {
    width:  3,
    height: 44,
  },
  stationList:  { flex: 1, paddingLeft: 14 },
  stationItem:  { height: 56, justifyContent: 'center' },
  stationName:  { fontSize: 14, color: '#1a1a2e', fontWeight: '500' },
  stationNameCurrent: { fontSize: 16, color: '#E31837', fontWeight: '500' },
  stationNameDone:    { fontSize: 13, color: '#bbb', fontWeight: '400' },
  stationNamePending: { fontSize: 13, color: '#999', fontWeight: '400' },
  connectionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  connectionDot: { width: 6, height: 6, borderRadius: 3 },
  connectionText: { fontSize: 10 },
});