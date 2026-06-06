export type SupportedLocale = 'es-CL' | 'pt-BR' | 'en-US';

export const translations: Record<SupportedLocale, Record<string, string>> = {
  'es-CL': {
    'eta.minutes':          'min',
    'eta.stations':         'estaciones',
    'direction':            'Dirección',
    'connection':           'Combinación',
    'where_to':             '¿A dónde vas?',
    'recent_destinations':  'Destinos recientes',
    'estimated_time':       'Tiempo estimado',
    'navigation.normal':    'En ruta',
    'navigation.hybrid':    'Señal débil',
    'navigation.degraded':  'Sin GPS',
    'navigation.emergency': '¿Sigues en la estación?',
    'lines':                'Líneas',
    'settings':             'Configuración',
    'alerts':               'Ocurrencias',
    'connecting':           'Conectando a Movia...',
    'eta.arrives': 'Llega a las',
  },
  'pt-BR': {
    'eta.minutes':          'min',
    'eta.stations':         'estações',
    'direction':            'Sentido',
    'connection':           'Conexão',
    'where_to':             'Para onde?',
    'recent_destinations':  'Destinos recentes',
    'estimated_time':       'Tempo estimado',
    'navigation.normal':    'Em rota',
    'navigation.hybrid':    'Sinal fraco',
    'navigation.degraded':  'Sem GPS',
    'navigation.emergency': 'Ainda está na estação?',
    'lines':                'Linhas',
    'settings':             'Configurações',
    'alerts':               'Ocorrências',
    'connecting':           'Conectando ao Movia...',
    'eta.arrives': 'Chega às',
  },
  'en-US': {
    'eta.minutes':          'min',
    'eta.stations':         'stations',
    'direction':            'Direction',
    'connection':           'Transfer',
    'where_to':             'Where to?',
    'recent_destinations':  'Recent destinations',
    'estimated_time':       'Estimated time',
    'navigation.normal':    'On route',
    'navigation.hybrid':    'Weak signal',
    'navigation.degraded':  'No GPS',
    'navigation.emergency': 'Still at the station?',
    'lines':                'Lines',
    'settings':             'Settings',
    'alerts':               'Alerts',
    'connecting':           'Connecting to Movia...',
    'eta.arrives': 'Arrives at',
  }
};

export function t(key: string, locale: SupportedLocale = 'es-CL'): string {
  return translations[locale]?.[key] ?? key;
}