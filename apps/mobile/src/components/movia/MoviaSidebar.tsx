import React, { useEffect, useRef } from "react";
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
  type: "normal" | "delay" | "alert";
  text: string;
  time: string;
}

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
}

const LANGUAGES = [
  { code: "ES" as const, flag: "\u{1F1E8}\u{1F1F1}" },
  { code: "PT" as const, flag: "\u{1F1E7}\u{1F1F7}" },
  { code: "EN" as const, flag: "\u{1F1FA}\u{1F1F8}" },
];

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
}: MoviaSidebarProps) {
  const tariff = useTariffStatus();
  const { t } = useLocale();
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const headerContext = `${locationLabel ?? "Santiago, CL"} · ${contextLabel ?? t("location.plan_santiago")}`;

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
            <Feather name="x" size={24} color="rgba(255,255,255,0.8)" />
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
            {[t("filter.all"), "L1", "L2", "L3", "L4", "L5", "L6"].map(
              (f, i) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterChip,
                    i === 0 && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      i === 0 && styles.filterTextActive,
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </ScrollView>

          {alerts.map((alert, i) => (
            <TouchableOpacity
              key={i}
              style={styles.alertRow}
              activeOpacity={0.7}
            >
              <StatusBadge status={alert.type} />
              <Text style={styles.alertText} numberOfLines={2}>
                {alert.text}
              </Text>
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
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
    height: 104,
  },
  closeBtn: { position: "absolute", top: 42, right: 16 },
  profile: { flexDirection: "row", alignItems: "center", gap: 9, paddingRight: 34 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  profileText: { flex: 1, minWidth: 0 },
  userName: { fontSize: 14, fontWeight: "700", color: "#fff" },
  contextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  contextText: {
    flex: 1,
    fontSize: 11,
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "#fff",
  },
  filterChipActive: {
    backgroundColor: Colors.accentPrimary,
    borderColor: Colors.accentPrimary,
  },
  filterText: { fontSize: 13, fontWeight: "500", color: "#666" },
  filterTextActive: { color: "#fff", fontWeight: "600" },
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
  alertTime: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 6,
    fontWeight: "500",
  },
  langSection: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    padding: 20,
  },
  langBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  langBtnActive: { backgroundColor: Colors.accentPrimary },
  langText: { fontSize: 14, fontWeight: "500", color: "#666" },
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
