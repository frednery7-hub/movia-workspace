import React, { useEffect, useState, useRef }                       from 'react';
import { View, StyleSheet, Dimensions, PanResponder }               from 'react-native';
import MapView, { PROVIDER_GOOGLE }                                  from 'react-native-maps';
import { Sidebar }                                                   from '../src/components/Sidebar';
import { SearchCard }                                                from '../src/components/SearchCard';
import { IdentityService }                                           from '../src/security/identity.service';
import { api }                                                       from '../src/config/api';
import { CacheService }                                              from '../src/config/cache.service';
import { LocationService }                                           from '../src/location/location.service';

interface Line {
  id:       string;
  name:     string;
  color:    string;
  stations?: { id: string; name: string; latitude: number; longitude: number }[];
}

const { width, height } = Dimensions.get('window');

const SANTIAGO_DEFAULT = {
  latitude:      -33.4372,
  longitude:     -70.6344,
  latitudeDelta:  0.05,
  longitudeDelta: 0.05,
};

export default function HomeScreen() {
  const [lines,          setLines]          = useState<Line[]>([]);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [language,       setLanguage]       = useState('es-CL');
  const [region,         setRegion]         = useState(SANTIAGO_DEFAULT);
  const mapRef = useRef<MapView>(null);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dx > 20 && Math.abs(g.dy) < 30,
      onPanResponderRelease: (_, g) => {
        if (g.dx > 60) setSidebarVisible(true);
      },
    }),
  ).current;

  useEffect(() => {
    async function init() {
      const lang = await IdentityService.getPreferredLanguage();
      setLanguage(lang);

      // Solicita permissão e centraliza no usuário
      const status = await LocationService.requestPermission();
      if (status === 'granted') {
        const loc = await LocationService.getCurrentLocation();
        if (loc.latitude && loc.longitude) {
          const userRegion = {
            latitude:      loc.latitude,
            longitude:     loc.longitude,
            latitudeDelta:  0.03,
            longitudeDelta: 0.03,
          };
          setRegion(userRegion);
          mapRef.current?.animateToRegion(userRegion, 800);
        }
      }

      const cached = await CacheService.get<Line[]>('lines');
      if (cached) { setLines(cached); return; }

      try {
        const res = await api.get<Line[]>('/lines');
        setLines(res.data);
        await CacheService.set('lines', res.data, 10 * 60 * 1000);
      } catch {
        // usa cache expirado se disponível
      }
    }
    init();
  }, []);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        followsUserLocation
      />

      <SearchCard />

      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        language={language}
        onLanguageChange={setLanguage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map:       { width, height },
});