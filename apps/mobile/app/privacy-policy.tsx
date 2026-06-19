import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocale } from '../src/context/LocaleContext';
import { useAppTheme } from '../src/theme/ThemeContext';

const SECTIONS = [
  'who_we_are',
  'data_collected',
  'location',
  'searches',
  'google_services',
  'notifications',
  'technical_data',
  'third_parties',
  'retention',
  'security',
  'rights',
  'contact',
] as const;

export default function PrivacyPolicyScreen() {
  const { t } = useLocale();
  const theme = useAppTheme();

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={25} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('privacy.title')}</Text>
      </View>
      <Text style={[styles.updated, { color: theme.colors.textTertiary }]}>{t('privacy.last_updated')}</Text>
      {SECTIONS.map(section => (
        <View key={section} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{t(`privacy.${section}.title`)}</Text>
          <Text style={[styles.sectionBody, { color: theme.colors.textSecondary }]}>{t(`privacy.${section}.body`)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8 },
  backButton: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '800' },
  updated: { marginTop: 10, marginBottom: 24, fontSize: 12 },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 6 },
  sectionBody: { fontSize: 14, lineHeight: 21 },
});
