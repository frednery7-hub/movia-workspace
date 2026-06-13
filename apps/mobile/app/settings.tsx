import { useLanguage } from "./_layout";
import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { IdentityService } from "../src/security/identity.service";
import { ConsentService } from "../src/privacy/consent.service";
import { api } from "../src/config/api";
import { t as translate, SupportedLocale } from "../src/i18n";
import { useThemeController } from "../src/theme/ThemeContext";
import type { AppThemeMode } from "../src/theme/colors";

type Language = "ES" | "PT" | "EN";

const localeMap: Record<Language, SupportedLocale> = {
  ES: "es-CL",
  PT: "pt-BR",
  EN: "en-US",
};

export default function SettingsScreen() {
  const { language, setLanguage } = useLanguage();
  const { theme, themeMode, setThemeMode } = useThemeController();
  const locale = localeMap[language];
  const t = (key: string) => translate(key, locale);
  const [loading, setLoading] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    IdentityService.getProfileName().then(name => {
      if (name) setProfileName(name);
    });
  }, []);

  async function handleNameChange(name: string) {
    setProfileName(name);
    await IdentityService.setProfileName(name);
  }

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

  const themeOptions: Array<{ mode: AppThemeMode; label: string }> = [
    { mode: "system", label: t("settings.theme.system") },
    { mode: "light", label: t("settings.theme.light") },
    { mode: "dark", label: t("settings.theme.dark") },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={25} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t("settings.title")}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textTertiary }]}>{t("settings.profile")}</Text>
        <View style={[styles.item, { backgroundColor: theme.colors.surfaceElevated }]}>
          <Feather name="user" size={19} color={theme.colors.iconMuted} />
          <View style={styles.itemText}>
            <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>{t("settings.name")}</Text>
            <TextInput
              value={profileName}
              onChangeText={handleNameChange}
              placeholder={t("settings.name_placeholder")}
              placeholderTextColor={theme.colors.textTertiary}
              style={[styles.nameInput, { color: theme.colors.textPrimary }]}
              returnKeyType="done"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textTertiary }]}>{t("settings.language")}</Text>
        <View style={[styles.languageGroup, { backgroundColor: theme.colors.surfaceElevated }]}>
          {[
            { code: "ES" as const, label: "Español", flag: "🇨🇱", switchKey: "settings.switch_to_spanish" },
            { code: "PT" as const, label: "Português", flag: "🇧🇷", switchKey: "settings.switch_to_portuguese" },
            { code: "EN" as const, label: "English", flag: "🇺🇸", switchKey: "settings.switch_to_english" },
          ].map(item => (
            <View key={item.code}>
            <TouchableOpacity
              style={styles.languageItem}
              onPress={() => setLanguage(item.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.languageFlag}>{item.flag}</Text>
              <View style={styles.itemText}>
                <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>{item.label}</Text>
                <Text style={[styles.itemDesc, { color: theme.colors.textTertiary }]}>
                  {language === item.code
                    ? t("settings.current_language")
                    : t(item.switchKey)}
                </Text>
              </View>
              <Text style={[styles.itemArrow, { color: theme.colors.textTertiary }]}>{language === item.code ? "✓" : "›"}</Text>
            </TouchableOpacity>
            {item.code !== "EN" && <View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textTertiary }]}>{t("settings.appearance")}</Text>
        <View style={[styles.languageGroup, { backgroundColor: theme.colors.surfaceElevated }]}>
          {themeOptions.map((item, index) => {
            const isActive = themeMode === item.mode;
            return (
              <View key={item.mode}>
                <TouchableOpacity
                  style={styles.languageItem}
                  onPress={() => setThemeMode(item.mode)}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={item.mode === "system" ? "smartphone" : item.mode === "light" ? "sun" : "moon"}
                    size={18}
                    color={isActive ? "#1A73E8" : theme.colors.iconMuted}
                  />
                  <View style={styles.itemText}>
                    <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>{item.label}</Text>
                  </View>
                  <Text style={[styles.itemArrow, { color: isActive ? "#1A73E8" : theme.colors.textTertiary }]}>
                    {isActive ? "✓" : "›"}
                  </Text>
                </TouchableOpacity>
                {index < themeOptions.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />
                )}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textTertiary }]}>{t("settings.privacy")}</Text>
        <TouchableOpacity
          style={[styles.item, { backgroundColor: theme.colors.surfaceElevated }]}
          onPress={handleExportData}
          activeOpacity={0.7}
          disabled={loading === "export"}
        >
          <Feather name="download" size={19} color={theme.colors.iconMuted} />
          <View style={styles.itemText}>
            <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>{t("settings.export")}</Text>
            <Text style={[styles.itemDesc, { color: theme.colors.textTertiary }]}>{t("settings.export_desc")}</Text>
          </View>
          <Text style={[styles.itemArrow, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
        <View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />
        <TouchableOpacity
          style={[styles.item, { backgroundColor: theme.colors.surfaceElevated }]}
          onPress={handleRevokeConsent}
          activeOpacity={0.7}
          disabled={loading === "consent"}
        >
          <Feather name="shield" size={19} color={theme.colors.iconMuted} />
          <View style={styles.itemText}>
            <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>{t("settings.revoke")}</Text>
            <Text style={[styles.itemDesc, { color: theme.colors.textTertiary }]}>{t("settings.revoke_desc")}</Text>
          </View>
          <Text style={[styles.itemArrow, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
        <View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />
        <TouchableOpacity
          style={[styles.item, { backgroundColor: theme.colors.surfaceElevated }]}
          onPress={handleDeleteData}
          activeOpacity={0.7}
          disabled={loading === "delete"}
        >
          <Feather name="trash-2" size={19} color="#E31837" />
          <View style={styles.itemText}>
            <Text style={[styles.itemTitle, { color: "#E31837" }]}>
              {t("settings.delete")}
            </Text>
            <Text style={[styles.itemDesc, { color: theme.colors.textTertiary }]}>{t("settings.delete_desc")}</Text>
          </View>
          <Text style={[styles.itemArrow, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textTertiary }]}>{t("settings.session")}</Text>
        <TouchableOpacity
          style={[styles.item, { backgroundColor: theme.colors.surfaceElevated }]}
          onPress={handleLogout}
          activeOpacity={0.7}
          disabled={loading === "logout"}
        >
          <Feather name="log-out" size={19} color="#E31837" />
          <View style={styles.itemText}>
            <Text style={[styles.itemTitle, { color: "#E31837" }]}>
              {t("settings.logout")}
            </Text>
            <Text style={[styles.itemDesc, { color: theme.colors.textTertiary }]}>{t("settings.logout_desc")}</Text>
          </View>
          <Text style={[styles.itemArrow, { color: theme.colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textTertiary }]}>{t("settings.about")}</Text>
        <View style={[styles.item, { backgroundColor: theme.colors.surfaceElevated }]}>
          <Feather name="info" size={19} color={theme.colors.iconMuted} />
          <View style={styles.itemText}>
            <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>Movia</Text>
            <Text style={[styles.itemDesc, { color: theme.colors.textTertiary }]}>{t("settings.version")}</Text>
          </View>
        </View>
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
  languageGroup: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  languageFlag: { width: 22, fontSize: 16, textAlign: "center" },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: "500", color: "#1a1a2e" },
  itemDesc: { fontSize: 12, color: "#999", marginTop: 2 },
  nameInput: {
    marginTop: 3,
    padding: 0,
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a2e",
  },
  itemArrow: { fontSize: 18, color: "#ccc" },
  divider: { height: 0.5, backgroundColor: "#f0f0f0", marginLeft: 54 },
  version: { textAlign: "center", fontSize: 11, color: "#ccc", marginTop: 20 },
});
