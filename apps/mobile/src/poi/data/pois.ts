import type { PointOfInterest } from '../types';

export const POIS: PointOfInterest[] = [
  {
    id: 'costanera-center',
    name: 'Costanera Center',
    aliases: [
      'costanera',
      'costaneira',
      'costanera center',
      'sky costanera',
      'mall costanera',
      'gran torre santiago',
    ],
    category: 'shopping',
    recommendedStations: [
      {
        stationId: 'tobalaba',
        stationName: 'Tobalaba',
        lineIds: ['L1', 'L4'],
        isPrimary: true,
      },
    ],
    lastMile: {
      mode: 'direct',
      summary:
        'Integração imediata por conexão subterrânea sinalizada a partir do mezanino de transferências.',
    },
    context:
      'Maior complexo de compras da América Latina e polo de atração corporativa e turística de Santiago.',
    searchBoost: 100,
    googleMapsQuery: 'Costanera Center Santiago Chile',
  },
  {
    id: 'mall-plaza-vespucio',
    name: 'Mall Plaza Vespucio',
    aliases: [
      'plaza vespucio',
      'mall vespucio',
      'mall plaza vespucio',
      'plaza vespuccio',
    ],
    category: 'shopping',
    recommendedStations: [
      {
        stationId: 'vicuna-mackenna',
        stationName: 'Vicuña Mackenna',
        lineIds: ['L4', 'L4A'],
        isPrimary: true,
      },
      {
        stationId: 'bellavista-de-la-florida',
        stationName: 'Bellavista de La Florida',
        lineIds: ['L5'],
        isPrimary: false,
      },
    ],
    lastMile: {
      mode: 'direct',
      summary:
        'Saída direta para hub intermodal conectado às Linhas 4, 4A e 5.',
    },
    context:
      'Principal epicentro comercial da Zona Sul de Santiago, com fluxo intenso durante o dia.',
    searchBoost: 90,
    googleMapsQuery: 'Mall Plaza Vespucio Santiago Chile',
  },
  {
    id: 'vina-concha-y-toro',
    name: 'Viña Concha y Toro',
    aliases: [
      'concha y toro',
      'concha toro',
      'vina concha y toro',
      'viña concha y toro',
    ],
    category: 'wine',
    recommendedStations: [
      {
        stationId: 'las-mercedes',
        stationName: 'Las Mercedes',
        lineIds: ['L4'],
        isPrimary: true,
      },
      {
        stationId: 'plaza-de-puente-alto',
        stationName: 'Plaza de Puente Alto',
        lineIds: ['L4'],
        isPrimary: false,
      },
    ],
    lastMile: {
      mode: 'bus_transfer',
      summary:
        'Continua por ônibus local ou conexão intermodal em direção à zona de Pirque.',
    },
    context:
      'Vinícola histórica do Vale do Maipo, uma das visitas enoturísticas mais procuradas por turistas.',
    searchBoost: 76,
    googleMapsQuery: 'Viña Concha y Toro Pirque Chile',
  },
  {
    id: 'vina-cousino-macul',
    name: 'Viña Cousiño Macul',
    aliases: [
      'cousino macul',
      'cousiño macul',
      'vina cousino macul',
      'viña cousiño macul',
    ],
    category: 'wine',
    recommendedStations: [
      {
        stationId: 'quilin',
        stationName: 'Quilín',
        lineIds: ['L4'],
        isPrimary: true,
      },
    ],
    lastMile: {
      mode: 'taxi_or_app',
      summary:
        'Último trecho recomendado por táxi ou app de transporte a partir da Linha 4.',
    },
    context:
      'Vinícola tradicional dentro da área metropolitana, com acesso mais confortável por conexão curta desde Quilín.',
    searchBoost: 64,
    googleMapsQuery: 'Viña Cousiño Macul Santiago Chile',
  },
  {
    id: 'templo-bahai-sudamerica',
    name: "Templo Bahá'í de Sudamérica",
    aliases: [
      'templo bahai',
      "templo bahá'í",
      'templo bahai sudamerica',
    ],
    category: 'religion',
    recommendedStations: [
      {
        stationId: 'grecia',
        stationName: 'Grecia',
        lineIds: ['L4'],
        isPrimary: true,
      },
      {
        stationId: 'plaza-egana',
        stationName: 'Plaza Egaña',
        lineIds: ['L3', 'L4'],
        isPrimary: false,
      },
    ],
    lastMile: {
      mode: 'bus_transfer',
      summary:
        'Continua por ônibus local em direção ao setor precordillerano de Peñalolén.',
    },
    context:
      'Templo de arquitetura icônica nos pés da Cordilheira, visitado por turistas e moradores.',
    searchBoost: 68,
    googleMapsQuery: "Templo Bahá'í de Sudamérica Santiago Chile",
  },
  {
    id: 'catedral-metropolitana-santiago',
    name: 'Catedral Metropolitana de Santiago',
    aliases: [
      'catedral',
      'catedral metropolitana',
      'catedral de santiago',
      'plaza de armas catedral',
    ],
    category: 'religion',
    recommendedStations: [
      {
        stationId: 'plaza-de-armas',
        stationName: 'Plaza de Armas',
        lineIds: ['L3', 'L5'],
        isPrimary: true,
      },
    ],
    lastMile: {
      mode: 'direct',
      summary:
        'Acesso direto ao entorno da Plaza de Armas, com caminhada curta até a Catedral.',
    },
    context:
      'Marco histórico do centro de Santiago e ponto central do circuito cívico e patrimonial.',
    searchBoost: 78,
    googleMapsQuery: 'Catedral Metropolitana de Santiago Chile',
  },
  {
    id: 'palacio-la-moneda',
    name: 'Palácio de La Moneda',
    aliases: [
      'la moneda',
      'palacio la moneda',
      'palacio de la moneda',
      'gobierno',
      'casa de gobierno',
    ],
    category: 'government',
    recommendedStations: [
      {
        stationId: 'la-moneda',
        stationName: 'La Moneda',
        lineIds: ['L1'],
        isPrimary: true,
      },
    ],
    lastMile: {
      mode: 'direct',
      summary:
        'Saída direta para o eixo cívico do centro de Santiago.',
    },
    context:
      'Sede do governo chileno e referência central para visitas ao centro histórico.',
    searchBoost: 88,
    googleMapsQuery: 'Palacio de La Moneda Santiago Chile',
  },
  {
    id: 'museu-nacional-belas-artes',
    name: 'Museu Nacional de Belas Artes',
    aliases: [
      'bellas artes',
      'museo bellas artes',
      'museu belas artes',
      'museo nacional de bellas artes',
    ],
    category: 'museum',
    recommendedStations: [
      {
        stationId: 'bellas-artes',
        stationName: 'Bellas Artes',
        lineIds: ['L5'],
        isPrimary: true,
      },
    ],
    lastMile: {
      mode: 'short_walk',
      summary:
        'Caminhada curta pelo entorno do Parque Forestal a partir da estação Bellas Artes.',
    },
    context:
      'Museu clássico do circuito cultural do centro, próximo ao Parque Forestal.',
    searchBoost: 70,
    googleMapsQuery: 'Museo Nacional de Bellas Artes Santiago Chile',
  },
  {
    id: 'museu-memoria-direitos-humanos',
    name: 'Museu da Memória e dos Direitos Humanos',
    aliases: [
      'museo de la memoria',
      'museu da memoria',
      'museo memoria derechos humanos',
      'museu da memória e dos direitos humanos',
    ],
    category: 'museum',
    recommendedStations: [
      {
        stationId: 'quinta-normal',
        stationName: 'Quinta Normal',
        lineIds: ['L5'],
        isPrimary: true,
      },
    ],
    lastMile: {
      mode: 'direct',
      summary:
        'Saída direta para o eixo de museus do Parque Quinta Normal.',
    },
    context:
      'Museu de memória histórica e direitos humanos, parte do polo cultural da Quinta Normal.',
    searchBoost: 82,
    googleMapsQuery: 'Museo de la Memoria y los Derechos Humanos Santiago Chile',
  },
  {
    id: 'centro-artesanal-los-dominicos',
    name: 'Centro Artesanal Los Dominicos',
    aliases: [
      'los dominicos',
      'centro artesanal',
      'pueblito los dominicos',
      'artesanato los dominicos',
    ],
    category: 'crafts',
    recommendedStations: [
      {
        stationId: 'los-dominicos',
        stationName: 'Los Dominicos',
        lineIds: ['L1'],
        isPrimary: true,
      },
    ],
    lastMile: {
      mode: 'direct',
      summary:
        'Acesso direto pelo terminal Los Dominicos da Linha 1.',
    },
    context:
      'Polo de artesanato, gastronomia e compras locais no extremo leste da Linha 1.',
    searchBoost: 74,
    googleMapsQuery: 'Pueblito Los Dominicos Santiago Chile',
  },
  {
    id: 'mercado-central',
    name: 'Mercado Central',
    aliases: [
      'mercado central',
      'mercado de santiago',
      'cal y canto mercado',
    ],
    category: 'market',
    recommendedStations: [
      {
        stationId: 'puente-cal-y-canto',
        stationName: 'Puente Cal y Canto',
        lineIds: ['L2', 'L3'],
        isPrimary: true,
      },
    ],
    lastMile: {
      mode: 'short_walk',
      summary:
        'Caminhada curta pelo setor histórico ao norte do centro.',
    },
    context:
      'Mercado tradicional de Santiago, conhecido por restaurantes e produtos do mar.',
    searchBoost: 72,
    googleMapsQuery: 'Mercado Central Santiago Chile',
  },
  {
    id: 'parque-ohiggins',
    name: "Parque O'Higgins",
    aliases: [
      'parque ohiggins',
      "parque o'higgins",
      'movistar arena',
      'fantasilandia',
    ],
    category: 'park',
    recommendedStations: [
      {
        stationId: 'parque-ohiggins',
        stationName: "Parque O'Higgins",
        lineIds: ['L2'],
        isPrimary: true,
      },
    ],
    lastMile: {
      mode: 'direct',
      summary:
        'Saída direta para o parque, Movistar Arena e Fantasilandia.',
    },
    context:
      'Grande parque urbano e polo de eventos, lazer e shows.',
    searchBoost: 75,
    googleMapsQuery: "Parque O'Higgins Santiago Chile",
  },
  {
    id: 'parque-pueblito-las-vizcachas',
    name: 'Parque Municipal Pueblito Las Vizcachas',
    aliases: [
      'pueblito las vizcachas',
      'parque las vizcachas',
      'vizcachas',
      'cajon del maipo',
    ],
    category: 'park',
    recommendedStations: [
      {
        stationId: 'plaza-de-puente-alto',
        stationName: 'Plaza de Puente Alto',
        lineIds: ['L4'],
        isPrimary: true,
      },
      {
        stationId: 'las-mercedes',
        stationName: 'Las Mercedes',
        lineIds: ['L4'],
        isPrimary: false,
      },
    ],
    lastMile: {
      mode: 'bus_transfer',
      summary:
        'Continua por ônibus ou intermodal em direção ao setor de Las Vizcachas.',
    },
    context:
      'Parque de acesso ao setor sul-oriente e às rotas turísticas próximas ao Cajón del Maipo.',
    searchBoost: 58,
    googleMapsQuery: 'Parque Municipal Pueblito Las Vizcachas Chile',
  },
  {
    id: 'parque-quinta-normal',
    name: 'Parque Quinta Normal',
    aliases: [
      'quinta normal',
      'parque quinta normal',
    ],
    category: 'park',
    recommendedStations: [
      {
        stationId: 'quinta-normal',
        stationName: 'Quinta Normal',
        lineIds: ['L5'],
        isPrimary: true,
      },
    ],
    lastMile: {
      mode: 'direct',
      summary:
        'Saída direta para o parque e para o circuito de museus do setor.',
    },
    context:
      'Parque histórico com museus, áreas verdes e equipamentos culturais.',
    searchBoost: 66,
    googleMapsQuery: 'Parque Quinta Normal Santiago Chile',
  },
  {
    id: 'aeroporto-internacional-scl',
    name: 'Aeroporto Internacional SCL',
    aliases: [
      'aeroporto',
      'aeropuerto',
      'scl',
      'arturo merino benitez',
      'arturo merino benítez',
      'aeropuerto internacional',
      'aeroporto internacional',
    ],
    category: 'airport',
    recommendedStations: [
      {
        stationId: 'pajaritos',
        stationName: 'Pajaritos',
        lineIds: ['L1'],
        isPrimary: true,
      },
      {
        stationId: 'los-heroes',
        stationName: 'Los Héroes',
        lineIds: ['L1', 'L2'],
        isPrimary: false,
      },
    ],
    lastMile: {
      mode: 'bus_transfer',
      summary:
        'Conexão com ônibus aeroportuário a partir de Pajaritos; Los Héroes é alternativa central.',
    },
    context:
      'Principal aeroporto de Santiago, conectado ao metrô por serviços de ônibus.',
    searchBoost: 96,
    googleMapsQuery: 'Aeropuerto Arturo Merino Benítez Santiago Chile',
  },
];

export function getPoiById(poiId: string): PointOfInterest | null {
  return POIS.find(poi => poi.id === poiId) ?? null;
}
