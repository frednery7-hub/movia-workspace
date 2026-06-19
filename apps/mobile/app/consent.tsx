import { useState, useEffect }                                   from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router, useLocalSearchParams }                          from 'expo-router';
import { ConsentService }                                        from '../src/privacy/consent.service';
import { useLocale }                                             from '../src/context/LocaleContext';

export default function ConsentScreen() {
  const [locationUse, setLocationUse] = useState(true);
  const [analytics,   setAnalytics]   = useState(false);
  const { t } = useLocale();
  const { updated } = useLocalSearchParams<{ updated?: string }>();
  const isPolicyUpdate = updated === '1';

  useEffect(() => {
    if (!isPolicyUpdate) return;
    ConsentService.getConsent().then((existing) => {
      if (!existing) return;
      setLocationUse(existing.locationUse);
      setAnalytics(existing.analytics);
    });
  }, [isPolicyUpdate]);

  async function handleAccept() {
    await ConsentService.saveConsent(locationUse, analytics);
    router.replace('/');
  }

  async function handleDecline() {
    await ConsentService.saveConsent(false, false);
    router.replace('/no-location');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t(isPolicyUpdate ? 'consent.updated_title' : 'consent.title')}</Text>
        <Text style={styles.subtitle}>
          {t(isPolicyUpdate ? 'consent.updated_subtitle' : 'consent.subtitle')}
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.item}>
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>{t('consent.location_title')}</Text>
            <Text style={styles.itemDesc}>
              {t('consent.location_desc')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggle, locationUse && styles.toggleOn]}
            onPress={() => setLocationUse(!locationUse)}
          >
            <Text style={styles.toggleText}>{locationUse ? t('common.yes') : t('common.no')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.item}>
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>{t('consent.analytics_title')}</Text>
            <Text style={styles.itemDesc}>
              {t('consent.analytics_desc')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggle, analytics && styles.toggleOn]}
            onPress={() => setAnalytics(!analytics)}
          >
            <Text style={styles.toggleText}>{analytics ? t('common.yes') : t('common.no')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.legal}>
        {t('consent.legal')}
      </Text>

      <TouchableOpacity style={styles.policyLink} onPress={() => router.push('/privacy-policy')}>
        <Text style={styles.policyLinkText}>{t('privacy.view_policy')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnAccept} onPress={handleAccept}>
        <Text style={styles.btnAcceptText}>{t('consent.accept')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnDecline} onPress={handleDecline}>
        <Text style={styles.btnDeclineText}>{t('consent.continue_without_location')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flexGrow: 1, padding: 24, backgroundColor: '#f8f8f6' },
  header:         { marginBottom: 24 },
  title:          { fontSize: 22, fontWeight: '500', color: '#1a1a2e', marginBottom: 8 },
  subtitle:       { fontSize: 14, color: '#666', lineHeight: 22 },
  section:        { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 0.5, borderColor: '#e0e0e0' },
  item:           { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemText:       { flex: 1 },
  itemTitle:      { fontSize: 14, fontWeight: '500', color: '#1a1a2e', marginBottom: 2 },
  itemDesc:       { fontSize: 12, color: '#888', lineHeight: 18 },
  toggle:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#eee' },
  toggleOn:       { backgroundColor: '#E31837' },
  toggleText:     { fontSize: 12, fontWeight: '500', color: '#fff' },
  divider:        { height: 0.5, backgroundColor: '#e0e0e0', marginVertical: 12 },
  legal:          { fontSize: 11, color: '#999', lineHeight: 18, marginBottom: 24 },
  policyLink:     { alignSelf: 'flex-start', marginBottom: 18 },
  policyLinkText: { color: '#1A73E8', fontSize: 13, fontWeight: '700' },
  btnAccept:      { backgroundColor: '#E31837', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  btnAcceptText:  { color: '#fff', fontWeight: '500', fontSize: 15 },
  btnDecline:     { borderRadius: 12, padding: 14, alignItems: 'center' },
  btnDeclineText: { color: '#888', fontSize: 14 },
});
