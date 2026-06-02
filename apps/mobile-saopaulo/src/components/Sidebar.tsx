import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Dimensions, TouchableWithoutFeedback,
} from 'react-native';
import { useRef, useEffect }  from 'react';
import { FareWidget }         from './FareWidget';
import { IdentityService }    from '../security/identity.service';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.78;

const LINES = [
  { id: 'L1',  name: 'Línea 1',  color: '#E31837', stations: 27 },
  { id: 'L2',  name: 'Línea 2',  color: '#F26522', stations: 22 },
  { id: 'L3',  name: 'Línea 3',  color: '#FFD100', stations: 18, textColor: '#333' },
  { id: 'L4',  name: 'Línea 4',  color: '#00A0DF', stations: 23 },
  { id: 'L4A', name: 'Línea 4A', color: '#00A0DF', stations: 6,  opacity: 0.75 },
  { id: 'L5',  name: 'Línea 5',  color: '#00A550', stations: 30 },
  { id: 'L6',  name: 'Línea 6',  color: '#9B59B6', stations: 10 },
];

const LANGS = [
  { code: 'es-CL', flag: '🇨🇱', label: 'ES' },
  { code: 'pt-BR', flag: '🇧🇷', label: 'PT' },
  { code: 'en-US', flag: '🇺🇸', label: 'EN' },
];

interface Props {
  visible:  boolean;
  onClose:  () => void;
  language: string;
  onLanguageChange: (lang: string) => void;
}

export function Sidebar({ visible, onClose, language, onLanguageChange }: Props) {
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue:         visible ? 0 : -SIDEBAR_WIDTH,
      useNativeDriver: true,
      bounciness:      0,
      speed:           20,
    }).start();
  }, [visible]);

  async function handleLanguageChange(lang: string) {
    await IdentityService.setPreferredLanguage(lang);
    onLanguageChange(lang);
  }

  return (
    <>
      {visible && (
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}

      <Animated.View style={[styles.sidebar, { transform: [{ translateX }] }]}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>M</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>Usuário</Text>
            <View style={styles.headerLocation}>
              <Text style={styles.headerLocationText}>📍 Santiago, Chile</Text>
            </View>
          </View>
        </View>

        <View style={styles.network}>
          <Text style={styles.networkLabel}>Rede detectada</Text>
          <View style={styles.networkRow}>
            <Text style={styles.networkName}>Metro de Santiago</Text>
            <View style={styles.networkDot} />
          </View>
        </View>

        <View style={styles.fareContainer}>
          <FareWidget />
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>LÍNEAS</Text>
          {LINES.map(line => (
            <View key={line.id} style={styles.lineItem}>
              <View style={[styles.lineBadge, { backgroundColor: line.color, opacity: line.opacity ?? 1 }]}>
                <Text style={[styles.lineBadgeText, { color: line.textColor ?? '#fff' }]}>{line.id}</Text>
              </View>
              <Text style={styles.lineName}>{line.name}</Text>
              <Text style={[styles.lineStations, { color: line.color }]}>{line.stations}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>ALERTAS</Text>
          <View style={styles.alertsBox}>
            <View style={styles.alertItem}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertLine}>L1</Text>
                <Text style={styles.alertTime}>3 min</Text>
                <View style={[styles.alertBadge, { backgroundColor: '#FAEEDA' }]}>
                  <Text style={[styles.alertBadgeText, { color: '#854F0B' }]}>atraso</Text>
                </View>
              </View>
              <Text style={styles.alertText}>Demoras en Baquedano +8 min</Text>
            </View>
            <View style={[styles.alertItem, { borderTopWidth: 0.5, borderTopColor: '#f0f0f0' }]}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertLine}>L1</Text>
                <Text style={styles.alertTime}>28 min</Text>
                <View style={[styles.alertBadge, { backgroundColor: '#FCEBEB' }]}>
                  <Text style={[styles.alertBadgeText, { color: '#A32D2D' }]}>alerta</Text>
                </View>
              </View>
              <Text style={styles.alertText}>Tobalaba cerrada, usar L4</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>IDIOMA</Text>
          <View style={styles.langRow}>
            {LANGS.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langBtn, language === lang.code && styles.langBtnActive]}
                onPress={() => handleLanguageChange(lang.code)}
                activeOpacity={0.7}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[styles.langLabel, language === lang.code && styles.langLabelActive]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}>
            <Text style={styles.settingsText}>⚙️  Configuración</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 10,
  },
  sidebar: {
    position:        'absolute',
    top:             0,
    left:            0,
    bottom:          0,
    width:           SIDEBAR_WIDTH,
    backgroundColor: '#fff',
    zIndex:          11,
    shadowColor:     '#000',
    shadowOpacity:   0.15,
    shadowRadius:    20,
    shadowOffset:    { width: 4, height: 0 },
    elevation:       16,
  },
  header: {
    backgroundColor: '#1a1a2e',
    padding:         20,
    paddingTop:      56,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
  },
  avatar: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: '#E31837',
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarText:       { color: '#fff', fontSize: 18, fontWeight: '500' },
  headerInfo:       { flex: 1 },
  headerName:       { color: '#fff', fontSize: 14, fontWeight: '500' },
  headerLocation:   { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  headerLocationText: { color: '#aaa', fontSize: 11 },
  network: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
    paddingBottom:   16,
  },
  networkLabel:     { color: '#666', fontSize: 10 },
  networkRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  networkName:      { color: '#fff', fontSize: 13, fontWeight: '500' },
  networkDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00A550' },
  fareContainer:    { paddingHorizontal: 16, paddingTop: 12 },
  scroll:           { flex: 1, paddingHorizontal: 16 },
  sectionLabel: {
    fontSize:     9,
    color:        '#999',
    fontWeight:   '600',
    letterSpacing: 0.5,
    marginTop:    14,
    marginBottom: 6,
  },
  lineItem:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  lineBadge: {
    width:          24,
    height:         24,
    borderRadius:   12,
    alignItems:     'center',
    justifyContent: 'center',
  },
  lineBadgeText:    { fontSize: 9, fontWeight: '500' },
  lineName:         { flex: 1, fontSize: 13, color: '#1a1a2e' },
  lineStations:     { fontSize: 11, fontWeight: '500' },
  divider:          { height: 0.5, backgroundColor: '#f0f0f0', marginTop: 10 },
  alertsBox:        { backgroundColor: '#fafafa', borderRadius: 10, overflow: 'hidden', borderWidth: 0.5, borderColor: '#f0f0f0' },
  alertItem:        { padding: 8 },
  alertHeader:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  alertLine:        { fontSize: 10, fontWeight: '500', color: '#E31837' },
  alertTime:        { fontSize: 10, color: '#999', flex: 1 },
  alertBadge:       { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  alertBadgeText:   { fontSize: 9 },
  alertText:        { fontSize: 11, color: '#333' },
  langRow:          { flexDirection: 'row', gap: 6, marginTop: 4 },
  langBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             4,
    paddingHorizontal: 10,
    paddingVertical:  5,
    borderRadius:    8,
    backgroundColor: '#f5f5f5',
    borderWidth:     0.5,
    borderColor:     '#ebebeb',
  },
  langBtnActive:    { backgroundColor: '#E31837', borderColor: '#E31837' },
  langFlag:         { fontSize: 15 },
  langLabel:        { fontSize: 10, color: '#555' },
  langLabelActive:  { color: '#fff', fontWeight: '500' },
  settingsRow:      { paddingVertical: 12 },
  settingsText:     { fontSize: 13, color: '#555' },
});