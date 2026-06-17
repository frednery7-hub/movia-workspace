import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { useLocale } from "../../context/LocaleContext";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  LINE_DIRECTIONS,
  LINE_STATION_ORDER,
  type MetroLineId,
} from "@movia/shared-data/metro/line-directions";
import { STATIONS } from "@movia/shared-data/network/stations";
import { LineChip } from "./LineChip";
import { StatusBadge } from "./StatusBadge";
import { FareBanner } from "./FareBanner";
import { ExpressRouteBadge } from "./ExpressRouteBadge";
import { getExpressRouteState, getVisibleExpressRouteState } from "../../data/expressRoute";
import { Colors, getLineColor } from "../../theme/colors";
import { useAppTheme } from "../../theme/ThemeContext";
import { useTariffStatus } from "../../hooks/useTariffStatus";
import type { PointOfInterest } from "../../poi/types";
import { getAccessesForStation } from "../../poi/search/getAccessesForStation";
import { getPoisForLine } from "../../poi/search/getPoisForLine";
import { getPoisForStation } from "../../poi/search/getPoisForStation";
import { openGoogleMapsQuery } from "../../poi/search/openGoogleMapsQuery";

const SIDEBAR_WIDTH = Dimensions.get("window").width * 0.85;

export interface LineItem {
  number: "1" | "2" | "3" | "4" | "4A" | "5" | "6";
  name: string;
  status: "normal" | "delay" | "alert" | "suspended";
}

export interface AlertItem {
  lineId: "L1" | "L2" | "L3" | "L4" | "L4A" | "L5" | "L6";
  type: "normal" | "delay" | "alert";
  text: string;
  description?: string;
  time: string;
  sourceLabel: string;
}

type IncidentLineFilter = "ALL" | AlertItem["lineId"];

interface MoviaSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  lines?: LineItem[];
  alerts?: AlertItem[];
  isLoading?: boolean;
  currentLanguage?: "ES" | "PT" | "EN";
  onLanguageChange?: (lang: "ES" | "PT" | "EN") => void;
  profileName?: string | null;
  locationLabel?: string;
  contextLabel?: string;
  incidentsSourceLabel?: string;
  incidentsUpdatedLabel?: string;
  showIncidentStatus?: boolean;
  onSelectPoiDestination?: (poi: PointOfInterest) => void;
}

const LANGUAGES = [
  { code: "ES" as const, flag: "\u{1F1E8}\u{1F1F1}" },
  { code: "PT" as const, flag: "\u{1F1E7}\u{1F1F7}" },
  { code: "EN" as const, flag: "\u{1F1FA}\u{1F1F8}" },
];

const INCIDENT_FILTERS: IncidentLineFilter[] = ["ALL", "L1", "L2", "L3", "L4", "L4A", "L5", "L6"];
const METRO_LINE_IDS: MetroLineId[] = ["L1", "L2", "L3", "L4", "L4A", "L5", "L6"];
const STATION_BY_ID = new Map(STATIONS.map(station => [station.id, station]));

function getInitials(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  return `${parts[0][0] ?? "M"}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function toMetroLineId(lineNumber: LineItem["number"]): MetroLineId {
  return `L${lineNumber}` as MetroLineId;
}

function getStationLineIds(stationId: string): MetroLineId[] {
  return METRO_LINE_IDS.filter(lineId => LINE_STATION_ORDER[lineId].includes(stationId));
}

function formatLineIds(lineIds: MetroLineId[]) {
  return lineIds.join("/");
}

function getPrimaryPoiStation(poi: PointOfInterest) {
  return poi.recommendedStations.find(station => station.isPrimary) ?? poi.recommendedStations[0];
}

function formatPoiStations(poi: PointOfInterest) {
  return poi.recommendedStations.map(station => station.stationName).join(" / ");
}

function LineSkeleton() {
  return (
    <View style={skeletonStyles.row}>
      <View style={skeletonStyles.circle} />
      <View style={skeletonStyles.bar} />
      <View style={skeletonStyles.badge} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingHorizontal: 20,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#E0E0E0",
  },
  bar: { flex: 1, height: 14, borderRadius: 7, backgroundColor: "#E0E0E0" },
  badge: { width: 52, height: 22, borderRadius: 6, backgroundColor: "#E0E0E0" },
});

export function MoviaSidebar({
  isOpen,
  onClose,
  lines = [],
  alerts = [],
  isLoading = false,
  currentLanguage = "ES",
  onLanguageChange,
  profileName,
  locationLabel,
  contextLabel,
  incidentsSourceLabel,
  incidentsUpdatedLabel,
  showIncidentStatus = true,
  onSelectPoiDestination,
}: MoviaSidebarProps) {
  const tariff = useTariffStatus();
  const { t } = useLocale();
  const theme = useAppTheme();
  const [incidentFilter, setIncidentFilter] = useState<IncidentLineFilter>("ALL");
  const [selectedLineId, setSelectedLineId] = useState<MetroLineId | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const headerContext = `${locationLabel ?? "Santiago, CL"} · ${contextLabel ?? t("location.plan_santiago")}`;
  const filteredAlerts = useMemo(
    () => incidentFilter === "ALL" ? alerts : alerts.filter(alert => alert.lineId === incidentFilter),
    [alerts, incidentFilter],
  );
  const selectedLineStations = useMemo(() => {
    if (!selectedLineId) return [];

    return LINE_STATION_ORDER[selectedLineId]
      .map(stationId => STATION_BY_ID.get(stationId))
      .filter((station): station is typeof STATIONS[number] => Boolean(station));
  }, [selectedLineId]);
  const selectedStation = selectedStationId ? STATION_BY_ID.get(selectedStationId) ?? null : null;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  function handleBackFromDetail() {
    if (selectedStationId) {
      setSelectedStationId(null);
      setExpandedSections({});
      return;
    }

    if (selectedLineId) {
      setSelectedLineId(null);
      setExpandedSections({});
    }
  }

  function toggleSection(sectionId: string) {
    setExpandedSections(current => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }

  function renderBackHeader(title: string, subtitle?: string) {
    return (
      <View style={[styles.detailHeader, { borderBottomColor: theme.colors.borderSubtle }]}>
        <TouchableOpacity onPress={handleBackFromDetail} style={styles.detailBackButton}>
          <Feather name="arrow-left" size={18} color={theme.colors.iconMuted} />
        </TouchableOpacity>
        <View style={styles.detailHeaderText}>
          <Text style={[styles.detailTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>{title}</Text>
          {!!subtitle && (
            <Text style={[styles.detailSubtitle, { color: theme.colors.textTertiary }]} numberOfLines={1}>{subtitle}</Text>
          )}
        </View>
      </View>
    );
  }

  function renderPoiRow(poi: PointOfInterest, compact = false, contextLineId?: MetroLineId | null) {
    const primaryStation = getPrimaryPoiStation(poi);
    const lineLabel = formatLineIds(primaryStation.lineIds);
    const lineColor = contextLineId ?? primaryStation.lineIds[0];

    return (
      <TouchableOpacity
        key={poi.id}
        style={[
          styles.poiRow,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.borderSubtle,
            borderLeftColor: getLineColor(lineColor),
          },
        ]}
        activeOpacity={0.74}
        onPress={() => {
          onSelectPoiDestination?.(poi);
          onClose();
        }}
      >
        <View style={[styles.poiDot, { backgroundColor: getLineColor(lineColor) }]} />
        <View style={styles.poiTextBlock}>
          <Text style={[styles.poiName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{poi.name}</Text>
          <Text style={[styles.poiMeta, { color: theme.colors.textTertiary }]} numberOfLines={compact ? 1 : 2}>
            {t("search.recommendedStation")}: {formatPoiStations(poi)} · {lineLabel}
          </Text>
          {!compact && (
            <Text style={[styles.poiSummary, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {poi.lastMile.summary}
            </Text>
          )}
        </View>
        <Feather name="chevron-right" size={16} color={theme.colors.border} />
      </TouchableOpacity>
    );
  }

  function renderAccordion(sectionId: string, title: string, children: React.ReactNode) {
    const expanded = expandedSections[sectionId] === true;

    return (
      <View style={[styles.accordion, { borderColor: theme.colors.borderSubtle, backgroundColor: theme.colors.surfaceElevated }]}>
        <TouchableOpacity
          style={styles.accordionHeader}
          activeOpacity={0.76}
          onPress={() => toggleSection(sectionId)}
        >
          <Text style={[styles.accordionTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
          <Feather name={expanded ? "minus" : "plus"} size={16} color={theme.colors.iconMuted} />
        </TouchableOpacity>
        {expanded && <View style={styles.accordionBody}>{children}</View>}
      </View>
    );
  }

  function renderStationDetail() {
    if (!selectedStation) return null;

    const stationLineIds = getStationLineIds(selectedStation.id);
    const stationPois = getPoisForStation(selectedStation.id);
    const stationAccesses = getAccessesForStation(selectedStation.id);
    const stationExpressRoutes = stationLineIds
      .map(lineId => ({
        lineId,
        state: getVisibleExpressRouteState(getExpressRouteState(lineId, selectedStation.name)),
      }))
      .filter((item): item is { lineId: MetroLineId; state: NonNullable<ReturnType<typeof getExpressRouteState>> } =>
        item.state !== null,
      );

    return (
      <>
        {renderBackHeader(
          `${t("station.details")} ${selectedStation.name}`,
          stationLineIds.length > 0 ? formatLineIds(stationLineIds) : undefined,
        )}
        <View style={styles.detailContent}>
          {renderAccordion("accesses", t("station.accesses"), (
            stationAccesses.length > 0 ? (
              stationAccesses.map(access => (
                <View key={access.id} style={styles.accessRow}>
                  <Text style={[styles.accessName, { color: theme.colors.textPrimary }]}>{access.name}</Text>
                  <Text style={[styles.accessAddress, { color: theme.colors.textSecondary }]}>{access.address}</Text>
                  {!!access.reference && (
                    <Text style={[styles.accessReference, { color: theme.colors.textTertiary }]}>{access.reference}</Text>
                  )}
                  <TouchableOpacity onPress={() => openGoogleMapsQuery(access.googleMapsQuery)} style={styles.mapsButton}>
                    <Feather name="external-link" size={13} color={Colors.actionBlue} />
                    <Text style={styles.mapsButtonText}>{t("search.openInMaps")}</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyInline, { color: theme.colors.textTertiary }]}>{t("station.accesses.empty")}</Text>
            )
          ))}

          {renderAccordion("pois", t("poi.nearbyPlaces"), (
            stationPois.length > 0 ? stationPois.map(poi => renderPoiRow(poi, true)) : (
              <Text style={[styles.emptyInline, { color: theme.colors.textTertiary }]}>{t("poi.nearbyPlaces.empty")}</Text>
            )
          ))}

          {renderAccordion("connections", t("station.connections"), (
            stationLineIds.length > 1 ? (
              <View style={styles.connectionChips}>
                {stationLineIds.map(lineId => (
                  <View key={lineId} style={[styles.connectionChip, { backgroundColor: getLineColor(lineId) }]}>
                    <Text style={styles.connectionChipText}>{lineId}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyInline, { color: theme.colors.textTertiary }]}>{t("station.connections.empty")}</Text>
            )
          ))}

          {stationExpressRoutes.length > 0 && renderAccordion("express", t("expressRoute.label"), (
            <View style={styles.expressRouteRows}>
              {stationExpressRoutes.map(({ lineId, state }) => (
                <View key={`${lineId}-${state.type}`} style={styles.expressRouteRow}>
                  <View style={[styles.stationLineDot, { backgroundColor: getLineColor(lineId) }]} />
                  <Text style={[styles.expressRouteLine, { color: theme.colors.textSecondary }]}>{lineId}</Text>
                  <ExpressRouteBadge
                    type={state.type}
                    availability={state.availability}
                    compact
                  />
                  {state.type !== "common" && (
                    <Text style={[styles.expressRouteHint, { color: theme.colors.textTertiary }]}>
                      {t("expressRoute.takeTrain")} {state.type === "red" ? t("expressRoute.red") : t("expressRoute.green")}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>
      </>
    );
  }

  function renderLineDetail() {
    if (!selectedLineId) return null;

    const terminals = LINE_DIRECTIONS[selectedLineId];
    const linePois = getPoisForLine(selectedLineId);

    return (
      <>
        {renderBackHeader(
          `${t("lines")} ${selectedLineId.replace("L", "")}`,
          `${terminals.terminalA} ↔ ${terminals.terminalB}`,
        )}
        <View style={styles.detailContent}>
          {renderAccordion("line-pois", t("poi.nearbyPlaces"), (
            linePois.length > 0 ? linePois.map(poi => renderPoiRow(poi, true, selectedLineId)) : (
              <Text style={[styles.emptyInline, { color: theme.colors.textTertiary }]}>{t("poi.nearbyPlaces.empty")}</Text>
            )
          ))}

          <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>{t("search.all_stations")}</Text>
          {selectedLineStations.map(station => (
            <TouchableOpacity
              key={`${selectedLineId}-${station.id}`}
              style={[styles.stationRow, { borderBottomColor: theme.colors.borderSubtle }]}
              activeOpacity={0.72}
              onPress={() => {
                setSelectedStationId(station.id);
                setExpandedSections({});
              }}
            >
              <View style={[styles.stationLineDot, { backgroundColor: getLineColor(selectedLineId) }]} />
              <View style={styles.stationRowText}>
                <Text style={[styles.stationRowName, { color: theme.colors.textPrimary }]}>{station.name}</Text>
                <Text style={[styles.stationRowMeta, { color: theme.colors.textTertiary }]}>{station.shortCode}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={theme.colors.border} />
            </TouchableOpacity>
          ))}
        </View>
      </>
    );
  }

  function renderSidebarContent() {
    if (selectedStationId) return renderStationDetail();
    if (selectedLineId) return renderLineDetail();

    return (
      <>
        <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>{t("lines")}</Text>
        {isLoading ? (
          [1, 2, 3, 4, 5, 6, 7].map((i) => <LineSkeleton key={i} />)
        ) : lines.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textTertiary }]}>{t('lines.empty')}</Text>
        ) : (
          lines.map((line) => (
            <TouchableOpacity
              key={line.number}
              style={[styles.lineRow, { borderBottomColor: theme.colors.borderSubtle }]}
              activeOpacity={0.7}
              onPress={() => {
                setSelectedLineId(toMetroLineId(line.number));
                setExpandedSections({});
              }}
            >
              <LineChip line={line.number} />
              <Text style={[styles.lineName, { color: theme.colors.textPrimary }]}>{line.name}</Text>
              {showIncidentStatus && <StatusBadge status={line.status} />}
              <Feather name="chevron-right" size={16} color={theme.colors.border} />
            </TouchableOpacity>
          ))
        )}

        {showIncidentStatus && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24, color: theme.colors.textTertiary }]}>
              {t("alerts")}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filters}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
            >
              {INCIDENT_FILTERS.map(
                filter => (
                  <TouchableOpacity
                    key={filter}
                    onPress={() => setIncidentFilter(filter)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: theme.colors.surfaceElevated,
                        borderColor: theme.colors.border,
                      },
                      incidentFilter === filter && styles.filterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        { color: theme.colors.textSecondary },
                        incidentFilter === filter && styles.filterTextActive,
                      ]}
                    >
                      {filter === "ALL" ? t("filter.all") : filter}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </ScrollView>

            {filteredAlerts.length === 0 && (
              <View style={[
                styles.alertEmpty,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.borderSubtle,
                },
              ]}>
                <Text style={[styles.alertEmptyTitle, { color: theme.colors.textPrimary }]}>
                  {incidentFilter === "ALL" ? t("alerts.empty_all_title") : `${t("alerts.empty_line_title")} ${incidentFilter}`}
                </Text>
                <Text style={[styles.alertEmptyText, { color: theme.colors.textSecondary }]}>{t("alerts.empty_body")}</Text>
                {!!incidentsSourceLabel && (
                  <Text style={[styles.alertMeta, { color: theme.colors.textTertiary }]}>{incidentsSourceLabel}</Text>
                )}
                {!!incidentsUpdatedLabel && (
                  <Text style={[styles.alertMeta, { color: theme.colors.textTertiary }]}>{incidentsUpdatedLabel}</Text>
                )}
              </View>
            )}

            {filteredAlerts.map((alert, i) => (
              <TouchableOpacity
                key={`${alert.lineId}-${i}-${alert.text}`}
                style={[styles.alertRow, { borderBottomColor: theme.colors.borderSubtle }]}
                activeOpacity={0.7}
              >
                <StatusBadge status={alert.type} />
                <Text style={styles.alertLine}>{alert.lineId}</Text>
                <Text style={[styles.alertText, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                  {alert.text}
                </Text>
                {!!alert.description && (
                  <Text style={[styles.alertDescription, { color: theme.colors.textSecondary }]} numberOfLines={3}>
                    {alert.description}
                  </Text>
                )}
                <Text style={[styles.alertMeta, { color: theme.colors.textTertiary }]}>{alert.sourceLabel}</Text>
                <Text style={[styles.alertTime, { color: theme.colors.textTertiary }]}>{alert.time}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </>
    );
  }

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sidebar,
          {
            backgroundColor: theme.colors.background,
            shadowColor: theme.colors.shadow,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <LinearGradient colors={theme.colors.headerGradient} style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={19} color="rgba(255,255,255,0.72)" />
          </TouchableOpacity>
          <View style={styles.profile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(profileName)}</Text>
            </View>
            <View style={styles.profileText}>
              <Text style={styles.userName} numberOfLines={1}>{profileName ? `${t('sidebar.hello')}, ${profileName}` : t('location.plan_trip')}</Text>
              <View style={styles.contextRow}>
                <Feather
                  name="map-pin"
                  size={12}
                  color="rgba(255,255,255,0.75)"
                />
                <Text style={styles.contextText} numberOfLines={1}>{headerContext}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <FareBanner
          period={tariff.period}
          timeRange={tariff.timeRange}
          timeRangeKey={tariff.timeRangeKey}
        />

        <ScrollView
          style={[styles.scroll, { backgroundColor: theme.colors.background }]}
          showsVerticalScrollIndicator={false}
        >
          {renderSidebarContent()}

          <View style={styles.langSection}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                  style={[
                    styles.langBtn,
                    { backgroundColor: theme.colors.surfaceMuted },
                    currentLanguage === lang.code && styles.langBtnActive,
                  ]}
                onPress={() => onLanguageChange?.(lang.code)}
              >
                <Text
                  style={[
                    styles.langText,
                    { color: theme.colors.textSecondary },
                    currentLanguage === lang.code && styles.langTextActive,
                  ]}
                >
                  {lang.flag} {lang.code}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.settingsRow, { borderTopColor: theme.colors.borderSubtle }]}
            activeOpacity={0.7}
            onPress={() => {
              onClose();
              router.push("/settings");
            }}
          >
            <Feather name="settings" size={20} color={theme.colors.iconMuted} />
            <Text style={[styles.settingsText, { color: theme.colors.textPrimary }]}>{t("settings")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    maxWidth: 360,
    backgroundColor: "#fafafa",
    shadowColor: "#000",
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    paddingHorizontal: 15,
    paddingTop: 38,
    paddingBottom: 10,
    height: 92,
  },
  closeBtn: { position: "absolute", top: 37, right: 14, padding: 4 },
  profile: { flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 30 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  profileText: { flex: 1, minWidth: 0 },
  userName: { fontSize: 13, fontWeight: "700", color: "#fff" },
  contextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  contextText: {
    flex: 1,
    fontSize: 10.5,
    color: "rgba(255,255,255,0.74)",
    fontWeight: "500",
  },
  scroll: { flex: 1 },
  sectionTitle: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontSize: 11,
    textTransform: "uppercase",
    color: Colors.textTertiary,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  lineName: { flex: 1, fontSize: 14, fontWeight: "500" },
  detailHeader: {
    minHeight: 62,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
  },
  detailBackButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  detailHeaderText: { flex: 1, minWidth: 0 },
  detailTitle: { fontSize: 15, fontWeight: "800" },
  detailSubtitle: { marginTop: 2, fontSize: 11, fontWeight: "700" },
  detailContent: { paddingBottom: 8 },
  poiRow: {
    marginHorizontal: 14,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  poiDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  poiTextBlock: { flex: 1, minWidth: 0 },
  poiName: { fontSize: 13, fontWeight: "800" },
  poiMeta: { marginTop: 3, fontSize: 11, lineHeight: 15, fontWeight: "700" },
  poiSummary: { marginTop: 4, fontSize: 11, lineHeight: 15 },
  stationRow: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
  },
  stationLineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  stationRowText: { flex: 1, minWidth: 0 },
  stationRowName: { fontSize: 13, fontWeight: "700" },
  stationRowMeta: { marginTop: 2, fontSize: 11, fontWeight: "600" },
  accordion: {
    marginHorizontal: 14,
    marginBottom: 9,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  accordionHeader: {
    minHeight: 42,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accordionTitle: { fontSize: 13, fontWeight: "800" },
  accordionBody: { paddingBottom: 8 },
  accessRow: {
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  accessName: { fontSize: 13, fontWeight: "800" },
  accessAddress: { marginTop: 3, fontSize: 12, lineHeight: 16 },
  accessReference: { marginTop: 2, fontSize: 11, fontWeight: "600" },
  mapsButton: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  mapsButtonText: { fontSize: 12, fontWeight: "800", color: Colors.actionBlue },
  emptyInline: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  connectionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  connectionChip: {
    minWidth: 30,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  connectionChipText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  expressRouteRows: {
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  expressRouteRow: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expressRouteLine: { fontSize: 12, fontWeight: "800" },
  expressRouteHint: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
  empty: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textTertiary,
  },
  filters: { marginVertical: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "#fff",
  },
  filterChipActive: {
    backgroundColor: Colors.accentPrimary,
    borderColor: Colors.accentPrimary,
  },
  filterText: { fontSize: 12, fontWeight: "600", color: "#666" },
  filterTextActive: { color: "#fff", fontWeight: "600" },
  alertEmpty: {
    marginHorizontal: 20,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  alertEmptyTitle: { fontSize: 13, fontWeight: "800", color: Colors.textPrimary },
  alertEmptyText: { marginTop: 4, fontSize: 12, lineHeight: 17, color: Colors.textSecondary },
  alertMeta: { marginTop: 5, fontSize: 11, lineHeight: 15, color: Colors.textTertiary, fontWeight: "600" },
  alertRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  alertText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textPrimary,
    marginTop: 6,
  },
  alertDescription: { marginTop: 4, fontSize: 12, lineHeight: 17, color: Colors.textSecondary },
  alertLine: { marginTop: 8, fontSize: 11, fontWeight: "800", color: Colors.accentPrimary },
  alertTime: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 6,
    fontWeight: "500",
  },
  langSection: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  langBtn: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  langBtnActive: { backgroundColor: Colors.accentPrimary },
  langText: { fontSize: 12, fontWeight: "600", color: "#666" },
  langTextActive: { color: "#fff", fontWeight: "600" },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    height: 56,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  settingsText: { fontSize: 14, fontWeight: "500" },
});
