import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Dimensions, PanResponder } from 'react-native';
import { useLocale } from '../../context/LocaleContext';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChip } from './LineChip';
import { ExpressRouteBadge } from './ExpressRouteBadge';
import { Colors, getLineColor } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeContext';
import {
  CURRENT_STATION_BANNER_RADIUS_METERS,
  type StationProgressState,
  type TripStatus,
} from '../../trip/activeTripState';
import { getVisibleExpressRouteState, type ExpressRouteState } from '../../data/expressRoute';

export interface Station {
  id: string;
  name: string;
  status: 'completed' | 'current' | 'next' | 'upcoming' | 'transfer' | 'arrived';
  line?: '1' | '2' | '3' | '4' | '4A' | '5' | '6';
  direction?: string;
  transfer?: { line: '1' | '2' | '3' | '4' | '4A' | '5' | '6'; name: string; direction?: string };
  expressRoute?: ExpressRouteState | null;
}

interface NavigationProgressProps {
  origin: string;
  destination: string;
  estimatedTime: string;
  arrivalTime: string;
  stations: Station[];
  currentLine: '1' | '2' | '3' | '4' | '4A' | '5' | '6';
  currentDirection?: string;
  navigationConfidenceLabel: string;
  navigationConfidenceColor: string;
  tripStatus: TripStatus;
  stationProgressState?: StationProgressState;
  currentStationDistanceMeters?: number | null;
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
  stations, currentLine, currentDirection, navigationConfidenceLabel, navigationConfidenceColor, tripStatus, stationProgressState = 'between-stations', currentStationDistanceMeters = null, onClose,
}: NavigationProgressProps) {
  const { t } = useLocale();
  const theme = useAppTheme();
  const lineColor = getLineColor(currentLine);
  const canShowCurrentStationBanner =
    tripStatus === 'arrived' ||
    (
      tripStatus === 'active' &&
      stationProgressState === 'at-station' &&
      currentStationDistanceMeters !== null &&
      currentStationDistanceMeters <= CURRENT_STATION_BANNER_RADIUS_METERS
    );
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.25)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const sheetHeight = useRef(new Animated.Value(SHEET_HEIGHTS.normal)).current;
  const sheetStateRef = useRef<SheetState>('normal');
  const [sheetState, setSheetStateValue] = useState<SheetState>('normal');
  const rawCurrentIndex = stations.findIndex(station => station.status === 'current' || station.status === 'arrived');
  const currentIndex = canShowCurrentStationBanner ? rawCurrentIndex : -1;
  const hasCurrentStation = currentIndex >= 0;
  const currentStation = hasCurrentStation ? stations[currentIndex] : undefined;
  const focusedStation = stations.find(station => station.status === 'next') ?? stations[0];
  const nextStation = currentIndex >= 0 ? stations[currentIndex + 1] : focusedStation;
  const isApproaching = stationProgressState === 'approaching-next-station' && Boolean(nextStation);
  const approachingText = isApproaching && nextStation
    ? `${t('navigation.approaching')} ${nextStation.name}`
    : null;
  const hasArrived = tripStatus === 'arrived';
  const isPreview = tripStatus === 'preview';
  const isCompact = sheetState === 'compact';
  const isExpanded = sheetState === 'expanded';

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.45, duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.25, duration: 800, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  useEffect(() => {
    contentOpacity.setValue(0.45);
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [stationProgressState, currentStation?.id, nextStation?.id, contentOpacity]);

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
      {
        backgroundColor: theme.colors.surface,
        shadowColor: theme.colors.shadow,
      },
      { height: sheetHeight },
    ]}>
      <View style={[styles.dragSurface, { backgroundColor: theme.colors.surface }]} {...panResponder.panHandlers}>
      {/* Handle de arrasto */}
      <TouchableOpacity
        onPress={toggleSheet}
        activeOpacity={0.8}
        style={styles.dragHandle}
        accessibilityLabel={isExpanded ? t('navigation.collapse') : t('navigation.expand')}
      >
        <View style={[styles.handleBar, { backgroundColor: theme.colors.dragHandle }]} />
      </TouchableOpacity>
      <LinearGradient colors={theme.colors.headerGradient} style={styles.header}>
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
        <TouchableOpacity
          style={[
            styles.compactSummary,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={toggleSheet}
          activeOpacity={0.86}
        >
          <View style={styles.compactCopy}>
            <Text style={[styles.compactEta, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {hasArrived ? t('trip.completed') : estimatedTime}
            </Text>
            <Animated.Text style={[styles.compactUpdated, { color: theme.colors.textTertiary, opacity: contentOpacity }]} numberOfLines={2}>
              {hasArrived ? `${t('trip.arrived_destination')}\n${destination}` : approachingText ?? (currentDirection ? `L${currentLine} · ${t('direction')} ${currentDirection}` : navigationConfidenceLabel)}
              {!hasArrived && (nextStation ? `\n${t('navigation.next')}: ${nextStation.name}` : `\n${t('eta.arrives')} ${arrivalTime}`)}
            </Animated.Text>
          </View>
          <Feather name="chevron-up" size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
      ) : (
        <View style={[
          styles.summaryCard,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.borderSubtle,
            shadowColor: theme.colors.shadow,
          },
        ]}>
          <View>
            <Text style={[styles.eta, { color: theme.colors.textPrimary }]}>{hasArrived ? t('trip.completed') : estimatedTime}</Text>
            <Text style={[styles.arrival, { color: theme.colors.textSecondary }]}>{hasArrived ? `${t('trip.arrived_to')} ${destination}` : `${t('eta.arrives')} ${arrivalTime} · ${stations.length} ${t('eta.stations')}`}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: navigationConfidenceColor }]} />
              <Text style={[styles.updated, { color: theme.colors.textTertiary }]}>
                {navigationConfidenceLabel} · {t('navigation.updated_now')}
              </Text>
            </View>
            {currentDirection && (
              <Text style={[styles.directionText, { color: theme.colors.textPrimary }]}>L{currentLine} · {t('direction')} {currentDirection}</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={toggleSheet}
            style={[styles.expandButton, { backgroundColor: theme.isDark ? '#10243E' : '#EEF6FF' }]}
            activeOpacity={0.8}
          >
            <Feather name={isExpanded ? 'minimize-2' : 'maximize-2'} size={18} color={Colors.actionBlue} />
          </TouchableOpacity>
        </View>
      )}

      {!isCompact && !isExpanded && (
        <Animated.View style={[styles.nextPanel, { backgroundColor: theme.colors.surfaceMuted, opacity: contentOpacity }]}>
          <View style={styles.nextColumn}>
            <Text style={[styles.nextLabel, { color: theme.colors.textTertiary }]}>{hasArrived ? t('trip.completed') : isPreview ? t('trip.preview') : isApproaching ? t('navigation.approaching') : hasCurrentStation ? t('navigation.you_are_here') : navigationConfidenceLabel}</Text>
            <Text style={[styles.nextStationName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{isApproaching ? nextStation?.name : hasCurrentStation ? currentStation?.name : origin}</Text>
          </View>
          {!hasArrived && (
            <View style={styles.nextColumn}>
              <Text style={[styles.nextLabel, { color: theme.colors.textTertiary }]}>{t('navigation.next')}</Text>
              <Text style={[styles.nextStationName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{nextStation?.name ?? destination}</Text>
            </View>
          )}
        </Animated.View>
      )}
      </View>

      {!isCompact && (
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {isExpanded && (
          <Text style={[styles.fullTimelineTitle, { color: theme.colors.textTertiary }]}>{t('navigation.full_timeline')}</Text>
        )}
        <View style={styles.progressList}>
          {stations.map((station, index) => {
            const isCurrent =
              (station.status === 'current' || station.status === 'arrived') &&
              canShowCurrentStationBanner;
            const isArrivedStation = station.status === 'arrived';
            const isPassed = station.status === 'completed';
            const isNext = station.status === 'next';
            const isFuture = station.status === 'upcoming';
            const isLast = index === stations.length - 1;
            const stationLine = station.line ?? currentLine;
            const stationLineColor = getLineColor(stationLine, lineColor);
            const nextLineColor = station.transfer ? getLineColor(station.transfer.line, stationLineColor) : stationLineColor;
            const visibleExpressRoute = getVisibleExpressRouteState(station.expressRoute);

            return (
              <View key={index} style={styles.stationRow}>
                <View style={styles.trackColumn}>
                  <View style={[
                      styles.dot,
                      isCurrent && styles.dotCurrent,
                      isPassed && styles.dotPassed,
                      isNext && styles.dotNext,
                      isFuture && styles.dotFuture,
                      (isCurrent || isNext || isFuture) && { backgroundColor: theme.colors.surface },
                      isFuture && { borderColor: theme.colors.border },
                      isCurrent && { borderColor: stationLineColor, shadowColor: stationLineColor },
                      isNext && { borderColor: stationLineColor },
                      isPassed && { backgroundColor: stationLineColor },
                    station.transfer && !isPassed && !isCurrent && { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: nextLineColor, backgroundColor: stationLineColor },
                  ]} />
                  {!isLast && station.transfer ? (
                    <LinearGradient colors={[stationLineColor, nextLineColor]} style={styles.trackTransfer} />
                  ) : !isLast && (
                    <View style={[
                      styles.track,
                      (isPassed || isCurrent) && { backgroundColor: stationLineColor },
                      isFuture && [styles.trackDashed, { borderLeftColor: theme.colors.border }],
                    ]} />
                  )}
                </View>

                <Animated.View style={[styles.stationInfo, isNext && { opacity: contentOpacity }]}>
                  {isCurrent ? (
                    <LinearGradient
                      colors={[theme.colors.surfaceElevated, `${stationLineColor}${theme.isDark ? '24' : '18'}`]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.currentStationCard, { borderLeftColor: stationLineColor, shadowColor: stationLineColor }]}
                    >
                      <View style={styles.currentTitleRow}>
                        <Animated.View
                          style={[
                            styles.currentHalo,
                            {
                              backgroundColor: stationLineColor,
                              opacity: pulseOpacity,
                              transform: [{ scale: pulseAnim }],
                            },
                          ]}
                        />
                        <View style={[styles.currentIcon, { backgroundColor: stationLineColor }]}>
                          <Feather name="navigation" size={14} color="#fff" />
                        </View>
                        <Text style={[styles.stationNameCurrent, { color: stationLineColor }]}>{station.name}</Text>
                      </View>
                      <View style={[styles.currentBadge, { backgroundColor: theme.isDark ? 'rgba(15,23,42,0.74)' : 'rgba(255,255,255,0.72)' }]}>
                        <View style={[styles.currentBadgeDot, { backgroundColor: stationLineColor }]} />
                        <Text style={[styles.youAreHere, { color: theme.colors.textPrimary }]}>{isArrivedStation ? t('trip.arrived_destination') : t('navigation.you_are_here')}</Text>
                      </View>
                      {visibleExpressRoute && (
                        <View style={styles.timelineExpressBadge}>
                          <ExpressRouteBadge
                            type={visibleExpressRoute.type}
                            availability={visibleExpressRoute.availability}
                            compact
                          />
                        </View>
                      )}
                    </LinearGradient>
                  ) : (
                    <Text style={[
                      styles.stationName,
                      { color: theme.colors.textPrimary },
                      isPassed && [styles.stationNamePassed, { color: theme.colors.textTertiary }],
                    ]}>
                      {station.name}
                    </Text>
                  )}
                  {!isCurrent && station.direction && (
                    <Text style={[styles.stationDirection, { color: theme.colors.textTertiary }]}>L{stationLine} · {t('direction')} {station.direction}</Text>
                  )}
                  {!isCurrent && visibleExpressRoute && (
                    <View style={styles.timelineExpressBadge}>
                      <ExpressRouteBadge
                        type={visibleExpressRoute.type}
                        availability={visibleExpressRoute.availability}
                        compact
                      />
                    </View>
                  )}
                  {station.transfer && (
                    <View style={[
                      styles.transferCard,
                      {
                        backgroundColor: theme.colors.surfaceElevated,
                        borderColor: theme.colors.borderSubtle,
                      },
                    ]}>
                      <LinearGradient colors={[stationLineColor, nextLineColor]} style={styles.transferAccent} />
                      <View style={[styles.transferIcon, { backgroundColor: getLineColor(station.transfer.line, stationLineColor) }]}>
                        <Feather name="repeat" size={14} color="#fff" />
                      </View>
                      <View style={styles.transferTextGroup}>
                        <Text style={[styles.transferTitle, { color: theme.colors.textPrimary }]}>{t('navigation.transfer_here')}</Text>
                        <View style={styles.transferLineRow}>
                          <Text style={[styles.transferName, { color: theme.colors.textSecondary }]}>{t('navigation.take_line')}</Text>
                          <LinearGradient colors={[stationLineColor, nextLineColor]} style={styles.transferPill}>
                            <Text style={styles.transferPillText}>L{stationLine} → L{station.transfer.line}</Text>
                          </LinearGradient>
                          <LineChip line={station.transfer.line} variant="compact" />
                        </View>
                        {station.transfer.direction && (
                          <Text style={[styles.transferDirection, { color: theme.colors.textPrimary }]}>{t('direction')} {station.transfer.direction}</Text>
                        )}
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
  dragSurface: { backgroundColor: '#fff' },
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
    marginHorizontal: 18, marginTop: 8, marginBottom: 7,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 13, backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.06)',
  },
  eta: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary },
  arrival: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' },
  updated: { fontSize: 10, color: Colors.textTertiary, marginTop: 2, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  directionText: { fontSize: 12, color: Colors.textPrimary, marginTop: 3, fontWeight: '800' },
  expandButton: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EEF6FF',
  },
  compactSummary: {
    minHeight: 70,
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
  compactEta: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  compactUpdated: { marginTop: 2, fontSize: 11, lineHeight: 15, fontWeight: '700', color: Colors.textTertiary },
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
    shadowColor: Colors.textSecondary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  dotPassed: { opacity: 1 },
  dotNext: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 2,
  },
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
    shadowColor: Colors.textSecondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
  },
  currentTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  currentHalo: {
    position: 'absolute',
    left: -4,
    width: 34,
    height: 34,
    borderRadius: 17,
  },
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
    color: Colors.textPrimary,
  },
  stationNamePassed: { color: Colors.grayText, opacity: 0.72, fontWeight: '400' },
  stationDirection: { marginTop: 3, fontSize: 12, fontWeight: '700', color: Colors.textTertiary },
  timelineExpressBadge: { marginTop: 5 },
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
  transferDirection: { marginTop: 5, fontSize: 12, fontWeight: '800', color: Colors.textPrimary },
});
