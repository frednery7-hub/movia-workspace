import React, { useEffect, useState }                          from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, Polyline }                            from 'react-native-maps';
import { api }                                                   from '../src/config/api';

export default function HomeScreen() {
  const [lines, setLines]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/lines')
      .then(res => {
        setLines(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar linhas:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E31837" />
        <Text style={{ marginTop: 10 }}>Conectando aos servidores Movia...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude:      -33.4372,
          longitude:     -70.6344,
          latitudeDelta:  0.1,
          longitudeDelta: 0.1,
        }}
      >
        {lines.map(line => (
          <React.Fragment key={line.id}>
            <Polyline
              coordinates={line.stations?.map((s: any) => ({
                latitude:  s.latitude ?? s.lat,
                longitude: s.longitude ?? s.lng,
              })) ?? []}
              strokeColor={line.color}
              strokeWidth={5}
            />
            {line.stations?.map((station: any) => (
              <Marker
                key={station.id}
                coordinate={{
                  latitude:  station.latitude ?? station.lat,
                  longitude: station.longitude ?? station.lng,
                }}
                title={station.name}
                description={`Linha ${line.name}`}
              />
            ))}
          </React.Fragment>
        ))}
      </MapView>

      <View style={styles.header}>
        <Text style={styles.title}>Movia</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  map: {
    width:  Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  header: {
    position:        'absolute',
    top:             50,
    left:            20,
    right:           20,
    backgroundColor: '#FFFFFF',
    padding:         15,
    borderRadius:    10,
    elevation:       5,
    shadowColor:     '#000',
    shadowOpacity:   0.2,
    shadowRadius:    5,
  },
  title: {
    fontSize:   20,
    fontWeight: 'bold',
    textAlign:  'center',
    color:      '#E31837',
  },
});