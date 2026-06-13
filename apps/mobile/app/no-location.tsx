import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router }                                    from 'expo-router';
import { ConsentService }                            from '../src/privacy/consent.service';
import { Feather }                                   from '@expo/vector-icons';
import { useLocale }                                 from '../src/context/LocaleContext';
import { ENABLE_METRO_INCIDENTS }                    from '../src/config/featureFlags';
import { useAppTheme } from '../src/theme/ThemeContext';

export default function NoLocationScreen() {
  const { t } = useLocale();
  const theme = useAppTheme();

  async function handleContinue() {
    router.replace({ pathname: '/', params: { selectOrigin: '1' } });
  }

  async function handleReviewConsent() {
    await ConsentService.revokeConsent();
    router.replace('/consent');
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Feather name="map-pin" size={44} color="#1A73E8" style={styles.icon} />

      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('no_location.title')}</Text>

      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        {t('no_location.description')}
      </Text>

      <View style={[
        styles.infoBox,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
        },
      ]}>
        <Text style={[styles.infoTitle, { color: theme.colors.textPrimary }]}>{t('no_location.what_can_do')}</Text>
        <Text style={[styles.infoItem, { color: theme.colors.textSecondary }]}>• {t('no_location.manual_search')}</Text>
        <Text style={[styles.infoItem, { color: theme.colors.textSecondary }]}>• {t('no_location.eta')}</Text>
        {ENABLE_METRO_INCIDENTS && (
          <Text style={[styles.infoItem, { color: theme.colors.textSecondary }]}>• {t('no_location.alerts')}</Text>
        )}
        <Text style={[styles.infoItem, { color: theme.colors.textSecondary }]}>• {t('no_location.preferences')}</Text>
      </View>

      <TouchableOpacity style={styles.btnPrimary} onPress={handleContinue} activeOpacity={0.8}>
        <Text style={styles.btnPrimaryText}>{t('no_location.continue')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnSecondary} onPress={handleReviewConsent} activeOpacity={0.8}>
        <Text style={styles.btnSecondaryText}>{t('no_location.review_permissions')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: '#f8f8f6',
    padding:         28,
    justifyContent:  'center',
  },
  icon:        { alignSelf: 'center', marginBottom: 20 },
  title:       { fontSize: 22, fontWeight: '500', color: '#1a1a2e', textAlign: 'center', marginBottom: 12 },
  description: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius:    14,
    padding:         16,
    marginBottom:    28,
    borderWidth:     0.5,
    borderColor:     '#e8e8e8',
  },
  infoTitle: { fontSize: 13, fontWeight: '500', color: '#1a1a2e', marginBottom: 10 },
  infoItem:  { fontSize: 13, color: '#555', marginBottom: 6, lineHeight: 20 },
  btnPrimary: {
    backgroundColor: '#E31837',
    borderRadius:    14,
    padding:         16,
    alignItems:      'center',
    marginBottom:    12,
  },
  btnPrimaryText:   { color: '#fff', fontWeight: '500', fontSize: 15 },
  btnSecondary:     { borderRadius: 14, padding: 14, alignItems: 'center' },
  btnSecondaryText: { color: '#888', fontSize: 14 },
});
