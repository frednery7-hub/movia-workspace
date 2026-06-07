import { useLanguage } from "./_layout";
import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { IdentityService } from "../src/security/identity.service";
import { ConsentService } from "../src/privacy/consent.service";
import { api } from "../src/config/api";
import { useLocale } from "../src/context/LocaleContext";

export default function SettingsScreen() {
  const { language, setLanguage } = useLanguage();
  const { t } = useLocale();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleLogout() {
    Alert.alert(t("settings.logout"), t("settings.alert.confirm"), [
      { text: t("settings.alert.cancel"), style: "cancel" },
      {
        text: t("settings.alert.exit"),
        style: "destructive",
        onPress: async () => {
          setLoading("logout");
          await IdentityService.fullLogout(async (token) => {
            await api.delete("/auth/session", {
              data: { refresh_token: token },
            });
          });
          router.replace("/consent");
          setLoading(null);
        },
      },
    ]);
  }

  async function handleRevokeConsent() {
    Alert.alert(t("settings.revoke"), t("settings.alert.revoke_confirm"), [
      { text: t("settings.alert.cancel"), style: "cancel" },
      {
        text: t("settings.alert.revoke"),
        style: "destructive",
        onPress: async () => {
          setLoading("consent");
          await ConsentService.revokeConsent();
          router.replace("/consent");
          setLoading(null);
        },
      },
    ]);
  }

  async function handleExportData() {
    setLoading("export");
    try {
      const res = await api.get<unknown>("/privacy/export");
      Alert.alert(
        t("settings.alert.exported"),
        JSON.stringify(res.data, null, 2).slice(0, 300) + "...",
      );
    } catch {
      Alert.alert(t("settings.alert.error"), t("settings.alert.export_error"));
    } finally {
      setLoading(null);
    }
  }

  async function handleDeleteData() {
    Alert.alert(
      t("settings.alert.delete_title"),
      t("settings.alert.delete_confirm"),
      [
        { text: t("settings.alert.cancel"), style: "cancel" },
        {
          text: t("settings.alert.delete"),
          style: "destructive",
          onPress: async () => {
            setLoading("delete");
            try {
              await api.delete("/privacy/data");
              await IdentityService.fullLogout();
              router.replace("/consent");
            } catch {
              Alert.alert(
                t("settings.alert.error"),
                t("settings.alert.delete_error"),
              );
            } finally {
              setLoading(null);
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t("settings.title")}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("settings.privacy")}</Text>
        <TouchableOpacity
          style={styles.item}
          onPress={handleExportData}
          activeOpacity={0.7}
          disabled={loading === "export"}
        >
          <Text style={styles.itemIcon}>📦</Text>
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>{t("settings.export")}</Text>
            <Text style={styles.itemDesc}>{t("settings.export_desc")}</Text>
          </View>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.item}
          onPress={handleRevokeConsent}
          activeOpacity={0.7}
          disabled={loading === "consent"}
        >
          <Text style={styles.itemIcon}>🔒</Text>
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>{t("settings.revoke")}</Text>
            <Text style={styles.itemDesc}>{t("settings.revoke_desc")}</Text>
          </View>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.item}
          onPress={handleDeleteData}
          activeOpacity={0.7}
          disabled={loading === "delete"}
        >
          <Text style={styles.itemIcon}>🗑️</Text>
          <View style={styles.itemText}>
            <Text style={[styles.itemTitle, { color: "#E31837" }]}>
              {t("settings.delete")}
            </Text>
            <Text style={styles.itemDesc}>{t("settings.delete_desc")}</Text>
          </View>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("settings.session")}</Text>
        <TouchableOpacity
          style={styles.item}
          onPress={handleLogout}
          activeOpacity={0.7}
          disabled={loading === "logout"}
        >
          <Text style={styles.itemIcon}>🚪</Text>
          <View style={styles.itemText}>
            <Text style={[styles.itemTitle, { color: "#E31837" }]}>
              {t("settings.logout")}
            </Text>
            <Text style={styles.itemDesc}>{t("settings.logout_desc")}</Text>
          </View>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>Movia v1.0.0 — LGPD compliant</Text>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("settings.language")}</Text>
        <TouchableOpacity
          style={styles.item}
          onPress={() => setLanguage("ES")}
          activeOpacity={0.7}
        >
          <Text style={styles.itemIcon}>🇨🇱</Text>
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>Español</Text>
            <Text style={styles.itemDesc}>
              {language === "ES"
                ? t("settings.current_language")
                : t("settings.switch_to_spanish")}
            </Text>
          </View>
          <Text style={styles.itemArrow}>{language === "ES" ? "✓" : "›"}</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.item}
          onPress={() => setLanguage("PT")}
          activeOpacity={0.7}
        >
          <Text style={styles.itemIcon}>🇧🇷</Text>
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>Português</Text>
            <Text style={styles.itemDesc}>
              {language === "PT"
                ? t("settings.current_language")
                : t("settings.switch_to_portuguese")}
            </Text>
          </View>
          <Text style={styles.itemArrow}>{language === "PT" ? "✓" : "›"}</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.item}
          onPress={() => setLanguage("EN")}
          activeOpacity={0.7}
        >
          <Text style={styles.itemIcon}>🇺🇸</Text>
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>English</Text>
            <Text style={styles.itemDesc}>
              {language === "EN"
                ? t("settings.current_language")
                : t("settings.switch_to_english")}
            </Text>
          </View>
          <Text style={styles.itemArrow}>{language === "EN" ? "✓" : "›"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f6" },
  content: { padding: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
    paddingTop: 8,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 28, color: "#1a1a2e", lineHeight: 28 },
  title: { fontSize: 20, fontWeight: "500", color: "#1a1a2e" },
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 10,
    color: "#999",
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  itemIcon: { fontSize: 20 },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: "500", color: "#1a1a2e" },
  itemDesc: { fontSize: 12, color: "#999", marginTop: 2 },
  itemArrow: { fontSize: 18, color: "#ccc" },
  divider: { height: 0.5, backgroundColor: "#f0f0f0", marginLeft: 54 },
  version: { textAlign: "center", fontSize: 11, color: "#ccc", marginTop: 20 },
});
