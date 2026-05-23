import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

export default function HomeScreen() {
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Apontando para a rota exata validada no Postman
    fetch('http://10.0.2.2:3000/lines')
      .then(res => res.json())
      .then(data => {
        setLines(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao buscar dados:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E31837" />
        <Text style={{marginTop: 10}}>Conectando aos servidores Movia...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: -33.4372,
          longitude: -70.6344,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {lines.map((line) => (
          // CORREÇÃO 1: Substituição da <View> pelo Fragmento React para não quebrar a renderização do mapa
          <React.Fragment key={line.id}>
            <Polyline
              // CORREÇÃO 2: Suporte aos campos reais do nosso banco Prisma (latitude/longitude)
              coordinates={line.stations?.map((s: any) => ({
                latitude: s.latitude || s.lat,
                longitude: s.longitude || s.lng
              })) || []}
              strokeColor={line.color}
              strokeWidth={5}
            />
            {line.stations?.map((station: any) => (
              <Marker
                key={station.id}
                coordinate={{ 
                  latitude: station.latitude || station.lat, 
                  longitude: station.longitude || station.lng 
                }}
                title={station.name}
                description={`Linha ${line.name}`}
              />
            ))}
          </React.Fragment>
        ))}
      </MapView>

      <View style={styles.header}>
        {/* Cumprindo o requisito oficial do Item 38 */}
        <Text style={styles.title}>Movia iniciado com sucesso</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  container: { 
    flex: 1 
  },
  map: { 
    width: Dimensions.get('window').width, 
    height: Dimensions.get('window').height 
  },
  header: { 
    position: 'absolute', 
    top: 50, 
    left: 20, 
    right: 20, 
    backgroundColor: '#FFFFFF', 
    padding: 15, 
    borderRadius: 10, 
    elevation: 5, 
    shadowColor: '#000', 
    shadowOpacity: 0.2, 
    shadowRadius: 5 
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    color: '#E31837' 
  }
});