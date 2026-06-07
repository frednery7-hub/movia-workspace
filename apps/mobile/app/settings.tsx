import { useLanguage } from './_layout';
import { useState }                                                    from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { router }                                                       from 'expo-router';
import { IdentityService }                                              from '../src/security/identity.service';
import { ConsentService }                                               from '../src/privacy/consent.service';
import { api }                                                          from '../src/config/api';

export default function SettingsScreen() {
  const { language, setLanguage } = useLanguage();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          setLoading('logout');
          await IdentityService.fullLogout(async (token) => {
            await api.delete('/auth/session', { data: { refresh_token: token } });
          });
          router.replace('/consent');
          setLoading(null);
        },
      },
    ]);
  }

  async function handleRevokeConsent() {
    Alert.alert('Revocar consentimiento', '¿Deseas revocar tu consentimiento de privacidad?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Revocar',
        style: 'destructive',
        onPress: async () => {
          setLoading('consent');
          await ConsentService.revokeConsent();
          router.replace('/consent');
          setLoading(null);
        },
      },
    ]);
  }

  async function handleExportData() {
    setLoading('export');
    try {
      const res = await api.get<unknown>('/privacy/export');
      Alert.alert('Datos exportados', JSON.stringify(res.data, null, 2).slice(0, 300) + '...');
    } catch {
      Alert.alert('Error', 'No se pudo exportar los datos.');
    } finally {
      setLoading(null);
    }
  }

  async function handleDeleteData() {
    Alert.alert('Eliminar datos', '¿Estás seguro? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setLoading('delete');
          try {
            await api.delete('/privacy/data');
            await IdentityService.fullLogout();
            router.replace('/consent');
          } catch {
            Alert.alert('Error', 'No se pudo eliminar los datos.');
          } finally {
            setLoading(null);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Configuración</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>PRIVACIDAD</Text>
        <TouchableOpacity style={styles.item} onPress={handleExportData} activeOpacity={0.7} disabled={loading === 'export'}>
          <Text style={styles.itemIcon}>📦</Text>
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>Exportar mis datos</Text>
            <Text style={styles.itemDesc}>Descarga todos tus datos en formato JSON</Text>
          </View>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.item} onPress={handleRevokeConsent} activeOpacity={0.7} disabled={loading === 'consent'}>
          <Text style={styles.itemIcon}>🔒</Text>
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>Revocar consentimiento</Text>
            <Text style={styles.itemDesc}>Retira tu permiso de uso de ubicación</Text>
          </View>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.item} onPress={handleDeleteData} activeOpacity={0.7} disabled={loading === 'delete'}>
          <Text style={styles.itemIcon}>🗑️</Text>
          <View style={styles.itemText}>
            <Text style={[styles.itemTitle, { color: '#E31837' }]}>Eliminar mis datos</Text>
            <Text style={styles.itemDesc}>Elimina permanentemente todos tus datos</Text>
          </View>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SESIÓN</Text>
        <TouchableOpacity style={styles.item} onPress={handleLogout} activeOpacity={0.7} disabled={loading === 'logout'}>
          <Text style={styles.itemIcon}>🚪</Text>
          <View style={styles.itemText}>
            <Text style={[styles.itemTitle, { color: '#E31837' }]}>Cerrar sesión</Text>
            <Text style={styles.itemDesc}>Cierra tu sesión en este dispositivo</Text>
          </View>
          <Text style={styles.itemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>Movia v1.0.0 — LGPD compliant</Text>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>IDIOMA</Text>
            <TouchableOpacity style={styles.item} onPress={() => setLanguage('ES')} activeOpacity={0.7}>
              <Text style={styles.itemIcon}>🇨🇱</Text>
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>Español</Text>
                <Text style={styles.itemDesc}>{language === 'ES' ? 'Idioma actual' : 'Cambiar a español'}</Text>
              </View>
              <Text style={styles.itemArrow}>{language === 'ES' ? '✓' : '›'}</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.item} onPress={() => setLanguage('PT')} activeOpacity={0.7}>
              <Text style={styles.itemIcon}>🇧🇷</Text>
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>Português</Text>
                <Text style={styles.itemDesc}>{language === 'PT' ? 'Idioma atual' : 'Mudar para português'}</Text>
              </View>
              <Text style={styles.itemArrow}>{language === 'PT' ? '✓' : '›'}</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.item} onPress={() => setLanguage('EN')} activeOpacity={0.7}>
              <Text style={styles.itemIcon}>🇺🇸</Text>
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>English</Text>
                <Text style={styles.itemDesc}>{language === 'EN' ? 'Current language' : 'Switch to English'}</Text>
              </View>
              <Text style={styles.itemArrow}>{language === 'EN' ? '✓' : '›'}</Text>
            </TouchableOpacity>
          </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8f8f6' },
  content:      { padding: 20 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24, paddingTop: 8 },
  backBtn:      { padding: 4 },
  backText:     { fontSize: 28, color: '#1a1a2e', lineHeight: 28 },
  title:        { fontSize: 20, fontWeight: '500', color: '#1a1a2e' },
  section:      { marginBottom: 20 },
  sectionLabel: { fontSize: 10, color: '#999', fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  item:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, backgroundColor: '#fff', paddingHorizontal: 14, borderRadius: 12 },
  itemIcon:     { fontSize: 20 },
  itemText:     { flex: 1 },
  itemTitle:    { fontSize: 14, fontWeight: '500', color: '#1a1a2e' },
  itemDesc:     { fontSize: 12, color: '#999', marginTop: 2 },
  itemArrow:    { fontSize: 18, color: '#ccc' },
  divider:      { height: 0.5, backgroundColor: '#f0f0f0', marginLeft: 54 },
  version:      { textAlign: 'center', fontSize: 11, color: '#ccc', marginTop: 20 },
});