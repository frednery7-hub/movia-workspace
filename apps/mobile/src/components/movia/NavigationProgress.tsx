import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Dimensions, PanResponder } from 'react-native';
import { useLocale } from '../../context/LocaleContext';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChip } from './LineChip';
import { Colors, LineColors } from '../../theme/colors';

export interface Station {
  name: string;
  status: 'passed' | 'current' | 'future';
  line?: '1' | '2' | '3' | '4' | '4A' | '5' | '6';
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

type SheetState = 'compact' | 'normal' | 'expanded';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHTS: Record<SheetState, number> = {
  compact: 142,
  normal: Math.min(440, Math.round(SCREEN_HEIGHT * 0.52)),
  expanded: Math.round(SCREEN_HEIGHT * 0.86),
};

export function NavigationProgress({
  origin, destination, estimatedTime, arrivalTime,
  stations, currentLine, onClose,
}: NavigationProgressProps) {
  const { t } = useLocale();
  const lineColor = LineColors[currentLine] ?? Colors.accentPrimary;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sheetHeight = useRef(new Animated.Value(SHEET_HEIGHTS.normal)).current;
  const sheetStateRef = useRef<SheetState>('normal');
  const [sheetState, setSheetStateValue] = useState<SheetState>('normal');
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

  function snapToSheetState(next: SheetState) {
    sheetStateRef.current = next;
    setSheetStateValue(next);
    Animated.spring(sheetHeight, {
      toValue: SHEET_HEIGHTS[next],
      damping: 22,
      stiffness: 180,
      mass: 0.8,
      useNativeDriver: false,
    }).start();
  }

  function toggleSheet() {
    snapToSheetState(sheetStateRef.current === 'compact' ? 'normal' : sheetStateRef.current === 'normal' ? 'expanded' : 'compact');
  }

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_, gesture) => {
      const baseHeight = SHEET_HEIGHTS[sheetStateRef.current];
      const nextHeight = Math.max(SHEET_HEIGHTS.compact, Math.min(SHEET_HEIGHTS.expanded, baseHeight - gesture.dy));
      sheetHeight.setValue(nextHeight);
    },
    onPanResponderRelease: (_, gesture) => {
      const states: SheetState[] = ['compact', 'normal', 'expanded'];
      const current = sheetStateRef.current;
      const currentIndex = states.indexOf(current);

      if (gesture.dy < -42 || gesture.vy < -0.5) {
        snapToSheetState(states[Math.min(currentIndex + 1, states.length - 1)]);
        return;
      }

      if (gesture.dy > 42 || gesture.vy > 0.5) {
        snapToSheetState(states[Math.max(currentIndex - 1, 0)]);
        return;
      }

      const projected = SHEET_HEIGHTS[current] - gesture.dy;
      const nearest = states.reduce((best, state) => {
        return Math.abs(SHEET_HEIGHTS[state] - projected) < Math.abs(SHEET_HEIGHTS[best] - projected) ? state : best;
      }, current);
      snapToSheetState(nearest);
    },
  })).current;

  return (
    <Animated.View style={[
      styles.container,
      { height: sheetHeight },
    ]}>
      {/* Handle de arrasto */}
      <TouchableOpacity
        {...panResponder.panHandlers}
        onPress={toggleSheet}
        activeOpacity={0.8}
        style={styles.dragHandle}
        accessibilityLabel={isExpanded ? t('navigation.collapse') : t('navigation.expand')}
      >
        <View style={styles.handleBar} />
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
          <View style={styles.compactCopy}>
            <Text style={styles.compactEta} numberOfLines={1}>
              {estimatedTime} · {nextStation ? `${t('navigation.next')}: ${nextStation.name}` : `${t('eta.arrives')} ${arrivalTime}`}
            </Text>
            <Text style={styles.compactUpdated}>{t('navigation.updated_now')}</Text>
          </View>
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
            const stationLine = station.line ?? currentLine;
            const stationLineColor = LineColors[stationLine] ?? lineColor;
            const nextLineColor = station.transfer ? LineColors[station.transfer.line] : stationLineColor;

            return (
              <View key={index} style={styles.stationRow}>
                <View style={styles.trackColumn}>
                  <View style={[
                    styles.dot,
                    isCurrent && styles.dotCurrent,
                    isPassed && styles.dotPassed,
                    isFuture && styles.dotFuture,
                    isCurrent && { borderColor: stationLineColor },
                  ]} />
                  {!isLast && station.transfer ? (
                    <LinearGradient colors={[stationLineColor, nextLineColor]} style={styles.trackTransfer} />
                  ) : !isLast && (
                    <View style={[
                      styles.track,
                      (isPassed || isCurrent) && { backgroundColor: stationLineColor },
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
                      style={[styles.currentStationCard, { borderLeftColor: stationLineColor }]}
                    >
                      <View style={styles.currentTitleRow}>
                        <View style={[styles.currentIcon, { backgroundColor: stationLineColor }]}>
                          <Feather name="navigation" size={14} color="#fff" />
                        </View>
                        <Text style={styles.stationNameCurrent}>{station.name}</Text>
                      </View>
                      <View style={styles.currentBadge}>
                        <View style={[styles.currentBadgeDot, { backgroundColor: stationLineColor }]} />
                        <Text style={styles.youAreHere}>{t('navigation.you_are_here')}</Text>
                      </View>
                    </LinearGradient>
                  ) : (
                    <Text style={[styles.stationName, isPassed && styles.stationNamePassed]}>
                      {station.name}
                    </Text>
                  )}
                  {station.transfer && (
                    <View style={styles.transferCard}>
                      <LinearGradient colors={[stationLineColor, nextLineColor]} style={styles.transferAccent} />
                      <View style={[styles.transferIcon, { backgroundColor: LineColors[station.transfer.line] }]}>
                        <Feather name="repeat" size={14} color="#fff" />
                      </View>
                      <View style={styles.transferTextGroup}>
                        <Text style={styles.transferTitle}>{t('navigation.transfer_here')}</Text>
                        <View style={styles.transferLineRow}>
                          <Text style={styles.transferName}>{t('navigation.take_line')}</Text>
                          <LinearGradient colors={[stationLineColor, nextLineColor]} style={styles.transferPill}>
                            <Text style={styles.transferPillText}>L{stationLine} → L{station.transfer.line}</Text>
                          </LinearGradient>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  dragHandle: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.12)' },
  header: {
    height: 54, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  origin: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  arrow: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  destination: { fontSize: 15, color: '#fff', fontWeight: '700' },
  summaryCard: {
    marginHorizontal: 18, marginTop: 10, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.06)',
  },
  eta: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary },
  arrival: { fontSize: 13, color: Colors.textSecondary, marginTop: 3, fontWeight: '500' },
  updated: { fontSize: 11, color: Colors.textTertiary, marginTop: 3, fontWeight: '600' },
  expandButton: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EEF6FF',
  },
  compactSummary: {
    height: 56,
    marginHorizontal: 18,
    marginTop: 6,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.grayBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactCopy: { flex: 1 },
  compactEta: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  compactUpdated: { marginTop: 2, fontSize: 11, fontWeight: '600', color: Colors.textTertiary },
  nextPanel: {
    marginHorizontal: 18,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
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
  stationRow: { flexDirection: 'row', gap: 14, minHeight: 40 },
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
  trackTransfer: {
    flex: 1,
    width: 3,
    marginTop: 2,
    borderRadius: 2,
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
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#fff',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  transferAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
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
  transferPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  transferPillText: { fontSize: 11, color: '#fff', fontWeight: '800' },
});
