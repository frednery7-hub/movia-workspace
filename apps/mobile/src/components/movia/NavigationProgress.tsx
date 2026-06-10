import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useLocale } from '../../context/LocaleContext';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChip } from './LineChip';
import { Colors, LineColors } from '../../theme/colors';

export interface Station {
  name: string;
  status: 'passed' | 'current' | 'future';
  transfer?: { line: '1' | '2' | '3' | '4' | '4A' | '5' | '6'; name: string };
}

interface NavigationProgressProps {
  origin: string;
  destination: string;
  estimatedTime: string;
  arrivalTime: string;
  stations: Station[];
  currentLine: '1' | '2' | '3' | '4' | '4A' | '5' | '6';
  onClose: () => void;
}

export function NavigationProgress({
  origin, destination, estimatedTime, arrivalTime,
  stations, currentLine, onClose,
}: NavigationProgressProps) {
  const { t } = useLocale();
  const lineColor = LineColors[currentLine] ?? Colors.accentPrimary;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [sheetState, setSheetState] = useState<'compact' | 'normal' | 'expanded'>('normal');
  const currentIndex = stations.findIndex(station => station.status === 'current');
  const currentStation = stations[currentIndex] ?? stations[0];
  const nextStation = stations[currentIndex + 1];
  const isCompact = sheetState === 'compact';
  const isExpanded = sheetState === 'expanded';

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  function toggleSheet() {
    setSheetState(prev => prev === 'compact' ? 'normal' : prev === 'normal' ? 'expanded' : 'compact');
  }

  return (
    <View style={[
      styles.container,
      isCompact && styles.containerCompact,
      isExpanded && styles.containerExpanded,
    ]}>
      {/* Handle de arrasto */}
      <TouchableOpacity
        onPress={toggleSheet}
        activeOpacity={0.8}
        style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}
        accessibilityLabel={isExpanded ? t('navigation.collapse') : t('navigation.expand')}
      >
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.12)' }} />
      </TouchableOpacity>
      <LinearGradient colors={['#1a1a2e', '#232340']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.origin}>{origin}</Text>
          <Text style={styles.arrow}> → </Text>
          <Text style={styles.destination}>{destination}</Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={24} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </LinearGradient>

      {isCompact ? (
        <TouchableOpacity style={styles.compactSummary} onPress={toggleSheet} activeOpacity={0.86}>
          <Text style={styles.compactEta}>{estimatedTime}</Text>
          <Text style={styles.compactNext} numberOfLines={1}>
            {nextStation ? `${t('navigation.next')}: ${nextStation.name}` : `${t('eta.arrives')} ${arrivalTime}`}
          </Text>
          <Feather name="chevron-up" size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.eta}>{estimatedTime}</Text>
            <Text style={styles.arrival}>{t('eta.arrives')} {arrivalTime} · {stations.length} {t('eta.stations')}</Text>
            <Text style={styles.updated}>{t('navigation.updated_now')}</Text>
          </View>
          <TouchableOpacity onPress={toggleSheet} style={styles.expandButton} activeOpacity={0.8}>
            <Feather name={isExpanded ? 'minimize-2' : 'maximize-2'} size={18} color={Colors.actionBlue} />
          </TouchableOpacity>
        </View>
      )}

      {!isCompact && !isExpanded && (
        <View style={styles.nextPanel}>
          <View style={styles.nextColumn}>
            <Text style={styles.nextLabel}>{t('navigation.you_are_here')}</Text>
            <Text style={styles.nextStationName} numberOfLines={1}>{currentStation?.name ?? origin}</Text>
          </View>
          <View style={styles.nextColumn}>
            <Text style={styles.nextLabel}>{t('navigation.next')}</Text>
            <Text style={styles.nextStationName} numberOfLines={1}>{nextStation?.name ?? destination}</Text>
          </View>
        </View>
      )}

      {!isCompact && (
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {isExpanded && (
          <Text style={styles.fullTimelineTitle}>{t('navigation.full_timeline')}</Text>
        )}
        <View style={styles.progressList}>
          {stations.map((station, index) => {
            const isCurrent = station.status === 'current';
            const isPassed = station.status === 'passed';
            const isFuture = station.status === 'future';
            const isLast = index === stations.length - 1;

            return (
              <View key={index} style={styles.stationRow}>
                <View style={styles.trackColumn}>
                  <View style={[
                    styles.dot,
                    isCurrent && styles.dotCurrent,
                    isPassed && styles.dotPassed,
                    isFuture && styles.dotFuture,
                    isCurrent && { borderColor: Colors.accentPrimary },
                  ]} />
                  {!isLast && (
                    <View style={[
                      styles.track,
                      (isPassed || isCurrent) && { backgroundColor: lineColor },
                      isFuture && styles.trackDashed,
                    ]} />
                  )}
                </View>

                <Animated.View style={[styles.stationInfo, isCurrent && { transform: [{ scale: pulseAnim }] }]}>
                  {isCurrent ? (
                    <LinearGradient
                      colors={['#fff5f7', '#ffe5eb']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.currentStationCard, { borderLeftColor: lineColor }]}
                    >
                      <View style={styles.currentTitleRow}>
                        <View style={[styles.currentIcon, { backgroundColor: lineColor }]}>
                          <Feather name="navigation" size={14} color="#fff" />
                        </View>
                        <Text style={styles.stationNameCurrent}>{station.name}</Text>
                      </View>
                      <View style={styles.currentBadge}>
                        <View style={[styles.currentBadgeDot, { backgroundColor: lineColor }]} />
                        <Text style={styles.youAreHere}>{t('navigation.you_are_here')}</Text>
                      </View>
                    </LinearGradient>
                  ) : (
                    <Text style={[styles.stationName, isPassed && styles.stationNamePassed]}>
                      {station.name}
                    </Text>
                  )}
                  {station.transfer && (
                    <View style={[
                      styles.transferCard,
                      {
                        borderColor: LineColors[station.transfer.line],
                        backgroundColor: LineColors[station.transfer.line] + '18',
                      },
                    ]}>
                      <View style={[styles.transferIcon, { backgroundColor: LineColors[station.transfer.line] }]}>
                        <Feather name="repeat" size={14} color="#fff" />
                      </View>
                      <View style={styles.transferTextGroup}>
                        <Text style={styles.transferTitle}>{t('navigation.transfer_here')}</Text>
                        <View style={styles.transferLineRow}>
                          <Text style={styles.transferName}>{t('navigation.take_line')}</Text>
                          <LineChip line={station.transfer.line} variant="compact" />
                        </View>
                      </View>
                    </View>
                  )}
                </Animated.View>
              </View>
            );
          })}
        </View>
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '55%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  containerCompact: {
    maxHeight: 154,
  },
  containerExpanded: {
    maxHeight: '88%',
  },
  header: {
    height: 62, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  origin: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  arrow: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  destination: { fontSize: 15, color: '#fff', fontWeight: '700' },
  summaryCard: {
    marginHorizontal: 20, marginTop: 14, marginBottom: 10,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.06)',
  },
  eta: { fontSize: 32, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.8 },
  arrival: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, fontWeight: '500' },
  updated: { fontSize: 12, color: Colors.textTertiary, marginTop: 4, fontWeight: '600' },
  expandButton: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EEF6FF',
  },
  compactSummary: {
    height: 54,
    marginHorizontal: 18,
    marginTop: 6,
    marginBottom: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.grayBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactEta: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  compactNext: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  nextPanel: {
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: Colors.graySurface,
    flexDirection: 'row',
    gap: 14,
  },
  nextColumn: { flex: 1 },
  nextLabel: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, textTransform: 'uppercase' },
  nextStationName: { marginTop: 4, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  scroll: { flex: 1 },
  fullTimelineTitle: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
  },
  progressList: { paddingHorizontal: 20, paddingBottom: 32 },
  stationRow: { flexDirection: 'row', gap: 14, minHeight: 44 },
  trackColumn: { width: 16, alignItems: 'center' },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.grayText, marginTop: 4,
  },
  dotCurrent: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#fff', borderWidth: 3,
    marginTop: 0, marginLeft: -3,
    shadowColor: Colors.accentPrimary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  dotPassed: { backgroundColor: Colors.grayText, opacity: 0.5 },
  dotFuture: {
    backgroundColor: '#fff', borderWidth: 2,
    borderColor: Colors.grayBorder,
  },
  track: {
    flex: 1, width: 2, marginTop: 2,
    backgroundColor: Colors.grayBorder,
  },
  trackDashed: { backgroundColor: 'transparent', borderLeftWidth: 2, borderLeftColor: 'rgba(0,0,0,0.12)', borderStyle: 'dashed' },
  stationInfo: { flex: 1, paddingBottom: 16 },
  stationName: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  currentStationCard: {
    borderLeftWidth: 4,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginLeft: -4,
    shadowColor: '#E31837',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
  },
  currentTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  currentIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationNameCurrent: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.accentPrimary,
  },
  stationNamePassed: { color: Colors.grayText, opacity: 0.5, fontWeight: '400' },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    marginTop: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  currentBadgeDot: { width: 7, height: 7, borderRadius: 4 },
  youAreHere: { fontSize: 12, color: Colors.textPrimary, fontWeight: '700' },
  transferCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    alignSelf: 'stretch',
  },
  transferIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transferTextGroup: { flex: 1 },
  transferTitle: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  transferLineRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  transferName: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
});
