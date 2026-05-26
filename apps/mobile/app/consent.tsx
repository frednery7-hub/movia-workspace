import { useState }                                              from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router }                                                from 'expo-router';
import { ConsentService }                                        from '../src/privacy/consent.service';

export default function ConsentScreen() {
  const [locationUse, setLocationUse] = useState(true);
  const [analytics,   setAnalytics]   = useState(false);

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
        <Text style={styles.title}>Tu privacidad importa</Text>
        <Text style={styles.subtitle}>
          Movia usa tu ubicación solo para calcular rutas y tiempos de llegada.
          Nunca vendemos tus datos ni los compartimos con terceros.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.item}>
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>Ubicación durante el uso</Text>
            <Text style={styles.itemDesc}>
              Necesaria para calcular tu ruta y ETA en tiempo real.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggle, locationUse && styles.toggleOn]}
            onPress={() => setLocationUse(!locationUse)}
          >
            <Text style={styles.toggleText}>{locationUse ? 'Sí' : 'No'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.item}>
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>Mejoras del servicio</Text>
            <Text style={styles.itemDesc}>
              Datos anónimos para mejorar tiempos y rutas.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggle, analytics && styles.toggleOn]}
            onPress={() => setAnalytics(!analytics)}
          >
            <Text style={styles.toggleText}>{analytics ? 'Sí' : 'No'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.legal}>
        Puedes revocar este consentimiento en cualquier momento desde Configuración.
        Base legal: consentimiento explícito (LGPD Art. 7, I).
      </Text>

      <TouchableOpacity style={styles.btnAccept} onPress={handleAccept}>
        <Text style={styles.btnAcceptText}>Aceptar y continuar</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnDecline} onPress={handleDecline}>
        <Text style={styles.btnDeclineText}>Solo continuar sin ubicación</Text>
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
  btnAccept:      { backgroundColor: '#E31837', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  btnAcceptText:  { color: '#fff', fontWeight: '500', fontSize: 15 },
  btnDecline:     { borderRadius: 12, padding: 14, alignItems: 'center' },
  btnDeclineText: { color: '#888', fontSize: 14 },
});