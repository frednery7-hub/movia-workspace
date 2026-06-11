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
import { LineChip } from "./LineChip";
import { StatusBadge } from "./StatusBadge";
import { FareBanner } from "./FareBanner";
import { Colors } from "../../theme/colors";
import { useTariffStatus } from "../../hooks/useTariffStatus";

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
}

const LANGUAGES = [
  { code: "ES" as const, flag: "\u{1F1E8}\u{1F1F1}" },
  { code: "PT" as const, flag: "\u{1F1E7}\u{1F1F7}" },
  { code: "EN" as const, flag: "\u{1F1FA}\u{1F1F8}" },
];

const INCIDENT_FILTERS: IncidentLineFilter[] = ["ALL", "L1", "L2", "L3", "L4", "L4A", "L5", "L6"];

function getInitials(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  return `${parts[0][0] ?? "M"}${parts[1]?.[0] ?? ""}`.toUpperCase();
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
}: MoviaSidebarProps) {
  const tariff = useTariffStatus();
  const { t } = useLocale();
  const [incidentFilter, setIncidentFilter] = useState<IncidentLineFilter>("ALL");
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const headerContext = `${locationLabel ?? "Santiago, CL"} · ${contextLabel ?? t("location.plan_santiago")}`;
  const filteredAlerts = useMemo(
    () => incidentFilter === "ALL" ? alerts : alerts.filter(alert => alert.lineId === incidentFilter),
    [alerts, incidentFilter],
  );

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
        style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}
      >
        <LinearGradient colors={["#1a1a2e", "#232340"]} style={styles.header}>
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

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>{t("lines")}</Text>
          {isLoading ? (
            [1, 2, 3, 4, 5, 6, 7].map((i) => <LineSkeleton key={i} />)
          ) : lines.length === 0 ? (
            <Text style={styles.empty}>{t('lines.empty')}</Text>
          ) : (
            lines.map((line) => (
              <TouchableOpacity
                key={line.number}
                style={styles.lineRow}
                activeOpacity={0.7}
              >
                <LineChip line={line.number} />
                <Text style={styles.lineName}>{line.name}</Text>
                <StatusBadge status={line.status} />
              </TouchableOpacity>
            ))
          )}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
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
                    incidentFilter === filter && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
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
            <View style={styles.alertEmpty}>
              <Text style={styles.alertEmptyTitle}>
                {incidentFilter === "ALL" ? t("alerts.empty_all_title") : `${t("alerts.empty_line_title")} ${incidentFilter}`}
              </Text>
              <Text style={styles.alertEmptyText}>{t("alerts.empty_body")}</Text>
              {!!incidentsSourceLabel && (
                <Text style={styles.alertMeta}>{incidentsSourceLabel}</Text>
              )}
              {!!incidentsUpdatedLabel && (
                <Text style={styles.alertMeta}>{incidentsUpdatedLabel}</Text>
              )}
            </View>
          )}

          {filteredAlerts.map((alert, i) => (
            <TouchableOpacity
              key={`${alert.lineId}-${i}-${alert.text}`}
              style={styles.alertRow}
              activeOpacity={0.7}
            >
              <StatusBadge status={alert.type} />
              <Text style={styles.alertLine}>{alert.lineId}</Text>
              <Text style={styles.alertText} numberOfLines={2}>
                {alert.text}
              </Text>
              {!!alert.description && (
                <Text style={styles.alertDescription} numberOfLines={3}>
                  {alert.description}
                </Text>
              )}
              <Text style={styles.alertMeta}>{alert.sourceLabel}</Text>
              <Text style={styles.alertTime}>{alert.time}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.langSection}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langBtn,
                  currentLanguage === lang.code && styles.langBtnActive,
                ]}
                onPress={() => onLanguageChange?.(lang.code)}
              >
                <Text
                  style={[
                    styles.langText,
                    currentLanguage === lang.code && styles.langTextActive,
                  ]}
                >
                  {lang.flag} {lang.code}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.settingsRow}
            activeOpacity={0.7}
            onPress={() => {
              onClose();
              router.push("/settings");
            }}
          >
            <Feather name="settings" size={20} color="#5A5A5A" />
            <Text style={styles.settingsText}>{t("settings")}</Text>
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
