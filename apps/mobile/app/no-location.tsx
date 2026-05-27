import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router }                                    from 'expo-router';
import { ConsentService }                            from '../src/privacy/consent.service';

export default function NoLocationScreen() {
  async function handleContinue() {
    router.replace('/');
  }

  async function handleReviewConsent() {
    await ConsentService.revokeConsent();
    router.replace('/consent');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📍</Text>

      <Text style={styles.title}>Sin ubicación activa</Text>

      <Text style={styles.description}>
        El app funciona sin GPS. Podrás ingresar tu estación de origen manualmente
        al planificar tu ruta.
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>¿Qué puedes hacer?</Text>
        <Text style={styles.infoItem}>• Buscar estaciones manualmente</Text>
        <Text style={styles.infoItem}>• Consultar tiempos de llegada</Text>
        <Text style={styles.infoItem}>• Ver alertas de las líneas</Text>
        <Text style={styles.infoItem}>• Cambiar idioma y preferencias</Text>
      </View>

      <TouchableOpacity style={styles.btnPrimary} onPress={handleContinue} activeOpacity={0.8}>
        <Text style={styles.btnPrimaryText}>Continuar sin GPS</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnSecondary} onPress={handleReviewConsent} activeOpacity={0.8}>
        <Text style={styles.btnSecondaryText}>Revisar permisos</Text>
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
  icon:        { fontSize: 52, textAlign: 'center', marginBottom: 20 },
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