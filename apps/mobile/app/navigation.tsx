import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../src/config/api';

interface RouteStation {
  id:     string;
  name:   string;
  lineId: string;
}

interface EtaResponse {
  destination:   string;
  etaSeconds:    number;
  arrivalTime:   string;
  confidence:    number;
  routeDegraded: boolean;
  stationsCount: number;
  path:          RouteStation[];
}

type StationStatus = 'done' | 'current' | 'next' | 'pending';

const LINE_COLORS: Record<string, string> = {
  L1: '#E31837', L2: '#F26522', L3: '#FFD100',
  L4: '#00A0DF', L4A: '#00A0DF', L5: '#00A550', L6: '#9B59B6',
};

function getStationStatus(index: number, currentIndex: number): StationStatus {
  if (index < currentIndex)  return 'done';
  if (index === currentIndex) return 'current';
  if (index === currentIndex + 1) return 'next';
  return 'pending';
}

export default function NavigationScreen() {
  const params = useLocalSearchParams<{ destinationId: string; fromId: string; destinationName: string }>();

  const [eta,          setEta]          = useState<EtaResponse | null>(null);
  const [now,          setNow]          = useState(Date.now());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDelayed,    setIsDelayed]    = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  const delayStartRef    = useRef<number | null>(null);
  const segmentTimerRef  = useRef<number>(0);

  // Busca ETA do backend
  async function fetchEta() {
    if (!params.destinationId || !params.fromId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<EtaResponse>(
        `/eta/${params.destinationId}?from=${params.fromId}`
      );
      setEta(res.data);
      setCurrentIndex(0);
      delayStartRef.current = null;
      setIsDelayed(false);
    } catch {
      setError('No se pudo calcular la ruta. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchEta(); }, [params.destinationId, params.fromId]);

  // Relógio mestre — sem timer drift
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Lógica de progresso e atraso
  useEffect(() => {
    if (!eta) return;

    const arrivalTimestamp  = new Date(eta.arrivalTime).getTime();
    const totalSeconds      = eta.etaSeconds;
    const elapsed           = (Date.now() - (arrivalTimestamp - totalSeconds * 1000)) / 1000;
    const secondsPerStation = totalSeconds / eta.path.length;
    const newIndex          = Math.min(
      Math.floor(elapsed / secondsPerStation),
      eta.path.length - 1,
    );
    setCurrentIndex(newIndex);

    const remaining = Math.max(0, arrivalTimestamp - now);

    if (remaining === 0) {
      if (!delayStartRef.current) delayStartRef.current = Date.now();
      if (Date.now() - delayStartRef.current > 180_000) setIsDelayed(true);
    } else {
      delayStartRef.current = null;
      setIsDelayed(false);
    }
  }, [now, eta]);

  // Pausa/retoma com AppState
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') setNow(Date.now());
    });
    return () => sub.remove();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Calculando ruta...</Text>
      </View>
    );
  }

  if (error || !eta) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Error inesperado'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchEta}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const arrivalTimestamp = new Date(eta.arrivalTime).getTime();
  const remainingMs      = Math.max(0, arrivalTimestamp - now);
  const remainingMin     = Math.floor(remainingMs / 60_000);
  const remainingSec     = Math.floor((remainingMs % 60_000) / 1000);
  const lineColor        = LINE_COLORS[eta.path[0]?.lineId ?? 'L1'] ?? '#E31837';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: '#1a1a2e' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {eta.path[0]?.name} → {params.destinationName ?? eta.destination}
        </Text>
      </View>

      {isDelayed && (
        <TouchableOpacity style={styles.delayBanner} onPress={fetchEta}>
          <Text style={styles.delayText}>¿Hubo un retraso? Toca para actualizar ruta</Text>
        </TouchableOpacity>
      )}

      <View style={styles.etaCard}>
        <View>
          <Text style={styles.etaLabel}>Tiempo restante</Text>
          <Text style={[styles.etaValue, { color: lineColor }]}>
            {remainingMin}:{String(remainingSec).padStart(2, '0')}
          </Text>
        </View>
        <View style={styles.etaDivider} />
        <View style={styles.etaRight}>
          <Text style={styles.etaLabel}>Estaciones</Text>
          <Text style={styles.etaValue}>{eta.stationsCount}</Text>
        </View>
        <View style={styles.etaDivider} />
        <View style={styles.etaRight}>
          <Text style={styles.etaLabel}>Confianza</Text>
          <Text style={styles.etaValue}>{Math.round(eta.confidence * 100)}%</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.routeContainer}>
          <View style={styles.progressBar}>
            {eta.path.map((station, index) => {
              const status   = getStationStatus(index, currentIndex);
              const color    = LINE_COLORS[station.lineId] ?? '#E31837';
              const isDone   = status === 'done';
              const isCurrent = status === 'current';
              return (
                <View key={station.id} style={styles.progressItem}>
                  <View style={[
                    styles.dot,
                    isCurrent && styles.dotCurrent,
                    { backgroundColor: isDone ? color + '55' : isCurrent ? color : '#e0e0e0' },
                    isCurrent && { borderColor: color },
                  ]} />
                  {index < eta.path.length - 1 && (
                    <View style={[styles.line, { backgroundColor: isDone ? color + '55' : '#e0e0e0' }]} />
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.stationList}>
            {eta.path.map((station, index) => {
              const status = getStationStatus(index, currentIndex);
              const color  = LINE_COLORS[station.lineId] ?? '#E31837';
              return (
                <View key={station.id} style={styles.stationItem}>
                  <Text style={[
                    styles.stationName,
                    status === 'current' && [styles.stationNameCurrent, { color }],
                    status === 'done'    && styles.stationNameDone,
                    status === 'pending' && styles.stationNamePending,
                  ]}>
                    {station.name}
                  </Text>
                  <View style={[styles.linePill, { backgroundColor: color + '22' }]}>
                    <Text style={[styles.linePillText, { color }]}>{station.lineId}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f8f8f6' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { fontSize: 16, color: '#666' },
  errorText:   { fontSize: 14, color: '#E31837', textAlign: 'center', marginBottom: 16 },
  retryBtn:    { backgroundColor: '#E31837', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  retryText:   { color: '#fff', fontWeight: '500' },
  header: {
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  backBtn:     { padding: 4 },
  backText:    { color: '#fff', fontSize: 28, lineHeight: 28 },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '500', flex: 1 },
  delayBanner: {
    backgroundColor: '#FFF3CD', padding: 12, borderBottomWidth: 0.5,
    borderBottomColor: '#F0C040',
  },
  delayText:   { fontSize: 13, color: '#856404', textAlign: 'center' },
  etaCard: {
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  etaLabel:    { fontSize: 11, color: '#999' },
  etaValue:    { fontSize: 26, fontWeight: '500', color: '#1a1a2e', lineHeight: 30 },
  etaDivider:  { width: 0.5, height: 36, backgroundColor: '#f0f0f0', marginHorizontal: 16 },
  etaRight:    { alignItems: 'flex-end' },
  scroll:      { flex: 1 },
  routeContainer: { flexDirection: 'row', paddingTop: 20, paddingHorizontal: 20 },
  progressBar: { width: 20, alignItems: 'center' },
  progressItem: { alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, zIndex: 1 },
  dotCurrent: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.3,
    shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  line:        { width: 3, height: 44 },
  stationList: { flex: 1, paddingLeft: 14 },
  stationItem: { height: 56, justifyContent: 'center', flexDirection: 'row', alignItems: 'center' },
  stationName: { flex: 1, fontSize: 14, color: '#1a1a2e', fontWeight: '500' },
  stationNameCurrent: { fontSize: 16, fontWeight: '600' },
  stationNameDone:    { fontSize: 13, color: '#bbb', fontWeight: '400' },
  stationNamePending: { fontSize: 13, color: '#999', fontWeight: '400' },
  linePill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  linePillText: { fontSize: 9, fontWeight: '600' },
});
