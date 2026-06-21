// Metro de Santiago — Dados Oficiais Completos
// Fonte: metro.cl (verificado estação por estação, junho 2026)
// 126 estações físicas únicas | 143 entradas linha-estação (DTPM)
// 17 estações de transferência | 7 linhas

export interface StationMeta {
  name: string;
  x: number;   // 0–100 (Oeste→Leste)
  y: number;   // 0–100 (Norte→Sul)
  lines: string[];
  isTransfer?: boolean;
  transferLines?: string[][];  // pares de linhas conectadas
  efeIntegration?: boolean;
}

export interface MetroLine {
  id: string;
  name: string;
  color: string;
  stations: string[];
}

// ── 126 Estações Físicas Únicas ───────────────────────────────────────────────
export const STATIONS: Record<string, StationMeta> = {

  // ── Linha 1 — Vermelho #E31837 (Oeste→Leste, y≈47) ──────────────────────────
  st_san_pablo:               { name: "San Pablo",               x:  5, y: 47, lines: ["1","5"], isTransfer: true  },
  st_neptuno:                 { name: "Neptuno",                 x:  8, y: 47, lines: ["1"] },
  st_pajaritos:               { name: "Pajaritos",               x: 11, y: 47, lines: ["1"] },
  st_las_rejas:               { name: "Las Rejas",               x: 14, y: 47, lines: ["1"] },
  st_ecuador:                 { name: "Ecuador",                 x: 17, y: 47, lines: ["1"] },
  st_san_alberto_hurtado:     { name: "San Alberto Hurtado",     x: 20, y: 47, lines: ["1"] },
  st_universidad_de_santiago: { name: "Universidad de Santiago", x: 23, y: 47, lines: ["1"] },
  st_estacion_central:        { name: "Estación Central",        x: 27, y: 47, lines: ["1"], efeIntegration: true },
  st_union_latinoamericana:   { name: "Unión Latinoamericana",   x: 30, y: 47, lines: ["1"] },
  st_republica:               { name: "República",               x: 33, y: 47, lines: ["1"] },
  st_los_heroes:              { name: "Los Héroes",              x: 35, y: 47, lines: ["1","2"], isTransfer: true },
  st_la_moneda:               { name: "La Moneda",               x: 38, y: 47, lines: ["1"] },
  st_universidad_de_chile:    { name: "Universidad de Chile",    x: 41, y: 47, lines: ["1","3"], isTransfer: true },
  st_santa_lucia:             { name: "Santa Lucía",             x: 44, y: 47, lines: ["1"] },
  st_universidad_catolica:    { name: "Universidad Católica",    x: 47, y: 47, lines: ["1"] },
  st_baquedano:               { name: "Baquedano",               x: 50, y: 47, lines: ["1","5"], isTransfer: true },
  st_salvador:                { name: "Salvador",                x: 53, y: 47, lines: ["1"] },
  st_manuel_montt:            { name: "Manuel Montt",            x: 56, y: 47, lines: ["1"] },
  st_pedro_de_valdivia:       { name: "Pedro de Valdivia",       x: 59, y: 47, lines: ["1"] },
  st_los_leones:              { name: "Los Leones",              x: 62, y: 47, lines: ["1","6"], isTransfer: true },
  st_tobalaba:                { name: "Tobalaba",                x: 65, y: 47, lines: ["1","4"], isTransfer: true },
  st_el_golf:                 { name: "El Golf",                 x: 69, y: 47, lines: ["1"] },
  st_alcantara:               { name: "Alcántara",               x: 72, y: 47, lines: ["1"] },
  st_escuela_militar:         { name: "Escuela Militar",         x: 75, y: 47, lines: ["1"] },
  st_manquehue:               { name: "Manquehue",               x: 78, y: 47, lines: ["1"] },
  st_hernando_de_magallanes:  { name: "Hernando de Magallanes",  x: 82, y: 47, lines: ["1"] },
  st_los_dominicos:           { name: "Los Dominicos",           x: 86, y: 47, lines: ["1"] },

  // ── Linha 2 — Laranja #F26522 (Norte→Sul, x≈36) ─────────────────────────────
  st_vespucio_norte:          { name: "Vespucio Norte",          x: 36, y:  8, lines: ["2"] },
  st_zapadores:               { name: "Zapadores",               x: 36, y: 11, lines: ["2"] },
  st_dorsal:                  { name: "Dorsal",                  x: 36, y: 15, lines: ["2"] },
  st_einstein:                { name: "Einstein",                x: 36, y: 19, lines: ["2"] },
  st_cementerios:             { name: "Cementerios",             x: 36, y: 23, lines: ["2"] },
  st_cerro_blanco:            { name: "Cerro Blanco",            x: 36, y: 27, lines: ["2"] },
  st_patronato:               { name: "Patronato",               x: 36, y: 31, lines: ["2"] },
  st_puente_cal_y_canto:      { name: "Puente Cal y Canto",      x: 36, y: 35, lines: ["2","3"], isTransfer: true },
  st_santa_ana:               { name: "Santa Ana",               x: 36, y: 38, lines: ["2","5"], isTransfer: true },
  st_toesca:                  { name: "Toesca",                  x: 36, y: 51, lines: ["2"] },
  st_parque_ohiggins:         { name: "Parque O'Higgins",        x: 36, y: 54, lines: ["2"] },
  st_rondizzoni:              { name: "Rondizzoni",              x: 36, y: 57, lines: ["2"] },
  st_franklin:                { name: "Franklin",                x: 36, y: 60, lines: ["2","6"], isTransfer: true },
  st_el_llano:                { name: "El Llano",                x: 36, y: 63, lines: ["2"] },
  st_san_miguel:              { name: "San Miguel",              x: 36, y: 66, lines: ["2"] },
  st_lo_vial:                 { name: "Lo Vial",                 x: 36, y: 70, lines: ["2"] },
  st_departamental:           { name: "Departamental",           x: 36, y: 73, lines: ["2"] },
  st_ciudad_del_nino:         { name: "Ciudad del Niño",         x: 36, y: 76, lines: ["2"] },
  st_lo_ovalle:               { name: "Lo Ovalle",               x: 36, y: 79, lines: ["2"] },
  st_el_parron:               { name: "El Parrón",               x: 36, y: 82, lines: ["2"] },
  st_la_cisterna:             { name: "La Cisterna",             x: 36, y: 85, lines: ["2","4A"], isTransfer: true },
  // Extensão sul L2 (2023+)
  st_el_bosque:               { name: "El Bosque",               x: 36, y: 88, lines: ["2"] },
  st_observatorio:            { name: "Observatorio",            x: 36, y: 91, lines: ["2"] },
  st_copa_lo_martinez:        { name: "Copa Lo Martínez",        x: 36, y: 93, lines: ["2"] },
  st_hospital_el_pino:        { name: "Hospital El Pino",        x: 36, y: 96, lines: ["2"] },

  // ── Linha 3 — Marrom #8B5E3C (NW→SE) ────────────────────────────────────────
  // Extensão noroeste L3 (2023)
  st_plaza_quilicura:         { name: "Plaza Quilicura",         x: 42, y:  1, lines: ["3"] },
  st_lo_cruzat:               { name: "Lo Cruzat",               x: 41, y:  3, lines: ["3"] },
  st_ferrocarril:             { name: "Ferrocarril",             x: 41, y:  5, lines: ["3"] },
  st_los_libertadores:        { name: "Los Libertadores",        x: 41, y:  7, lines: ["3"] },
  st_cardenal_caro:           { name: "Cardenal Caro",           x: 40, y: 11, lines: ["3"] },
  st_vivaceta:                { name: "Vivaceta",                x: 39, y: 15, lines: ["3"] },
  st_conchali:                { name: "Conchalí",                x: 39, y: 19, lines: ["3"] },
  st_plaza_chacabuco:         { name: "Plaza Chacabuco",         x: 38, y: 23, lines: ["3"] },
  st_hospitales:              { name: "Hospitales",              x: 38, y: 27, lines: ["3"] },
  st_plaza_de_armas:          { name: "Plaza de Armas",          x: 41, y: 40, lines: ["3","5"], isTransfer: true },
  st_parque_almagro:          { name: "Parque Almagro",          x: 43, y: 51, lines: ["3"] },
  st_matta:                   { name: "Matta",                   x: 46, y: 54, lines: ["3"] },
  st_irarrazaval:             { name: "Irarrázaval",             x: 50, y: 58, lines: ["3","5"], isTransfer: true },
  st_monsenor_eyzaguirre:     { name: "Monseñor Eyzaguirre",     x: 53, y: 61, lines: ["3"] },
  st_nunoa:                   { name: "Ñuñoa",                   x: 56, y: 65, lines: ["3","6"], isTransfer: true },
  st_chile_espana:            { name: "Chile España",            x: 59, y: 68, lines: ["3"] },
  st_villa_frei:              { name: "Villa Frei",              x: 61, y: 70, lines: ["3"] },
  st_plaza_egana:             { name: "Plaza Egaña",             x: 63, y: 66, lines: ["3","4"], isTransfer: true },
  st_fernando_castillo_velasco: { name: "Fernando Castillo Velasco", x: 66, y: 70, lines: ["3"] },

  // ── Linha 4 — Azul #00A0DF (Tobalaba→Puente Alto, SE) ───────────────────────
  st_cristobal_colon:         { name: "Cristóbal Colón",         x: 67, y: 51, lines: ["4"] },
  st_francisco_bilbao:        { name: "Francisco Bilbao",        x: 68, y: 55, lines: ["4"] },
  st_principe_de_gales:       { name: "Príncipe de Gales",       x: 67, y: 58, lines: ["4"] },
  st_simon_bolivar:           { name: "Simón Bolívar",           x: 65, y: 62, lines: ["4"] },
  st_los_orientales:          { name: "Los Orientales",          x: 64, y: 67, lines: ["4"] },
  st_grecia:                  { name: "Grecia",                  x: 63, y: 70, lines: ["4"] },
  st_los_presidentes:         { name: "Los Presidentes",         x: 62, y: 73, lines: ["4"] },
  st_quilin:                  { name: "Quilín",                  x: 62, y: 75, lines: ["4"] },
  st_las_torres:              { name: "Las Torres",              x: 62, y: 77, lines: ["4"] },
  st_macul:                   { name: "Macul",                   x: 62, y: 79, lines: ["4"] },
  st_vicuna_mackenna:         { name: "Vicuña Mackenna",         x: 61, y: 82, lines: ["4","4A"], isTransfer: true },
  st_vicente_valdes:          { name: "Vicente Valdés",          x: 61, y: 85, lines: ["4","5"], isTransfer: true },
  st_rojas_magallanes:        { name: "Rojas Magallanes",        x: 61, y: 87, lines: ["4"] },
  st_trinidad:                { name: "Trinidad",                x: 62, y: 89, lines: ["4"] },
  st_san_jose_de_la_estrella: { name: "San José de la Estrella", x: 62, y: 91, lines: ["4"] },
  st_los_quillayes:           { name: "Los Quillayes",           x: 63, y: 92, lines: ["4"] },
  st_elisa_correa:            { name: "Elisa Correa",            x: 63, y: 93, lines: ["4"] },
  st_hospital_sotero_del_rio: { name: "Hospital Sótero del Río", x: 63, y: 94, lines: ["4"] },
  st_protectora_de_la_infancia: { name: "Protectora de la Infancia", x: 63, y: 95, lines: ["4"] },
  st_las_mercedes:            { name: "Las Mercedes",            x: 63, y: 96, lines: ["4"] },
  st_plaza_de_puente_alto:    { name: "Plaza de Puente Alto",    x: 63, y: 98, lines: ["4"] },

  // ── Linha 4A — Azul clara #4DC3F7 (Vicuña Mackenna→La Cisterna) ─────────────
  st_santa_julia:             { name: "Santa Julia",             x: 56, y: 85, lines: ["4A"] },
  st_la_granja:               { name: "La Granja",               x: 50, y: 85, lines: ["4A"] },
  st_santa_rosa:              { name: "Santa Rosa",              x: 44, y: 85, lines: ["4A"] },
  st_san_ramon:               { name: "San Ramón",               x: 40, y: 85, lines: ["4A"] },

  // ── Linha 5 — Verde #00A550 (Plaza de Maipú→Vicente Valdés) ─────────────────
  st_plaza_de_maipu:          { name: "Plaza de Maipú",          x:  2, y: 62, lines: ["5"] },
  st_santiago_bueras:         { name: "Santiago Bueras",         x:  5, y: 62, lines: ["5"] },
  st_del_sol:                 { name: "Del Sol",                 x:  8, y: 62, lines: ["5"] },
  st_monte_tabor:             { name: "Monte Tabor",             x: 11, y: 62, lines: ["5"] },
  st_las_parcelas:            { name: "Las Parcelas",            x: 14, y: 62, lines: ["5"] },
  st_laguna_sur:              { name: "Laguna Sur",              x: 17, y: 62, lines: ["5"] },
  st_barrancas:               { name: "Barrancas",               x: 20, y: 62, lines: ["5"] },
  st_pudahuel:                { name: "Pudahuel",                x:  3, y: 54, lines: ["5"] },
  st_lo_prado:                { name: "Lo Prado",                x:  9, y: 54, lines: ["5"] },
  st_blanqueado:              { name: "Blanqueado",              x: 13, y: 54, lines: ["5"] },
  st_gruta_de_lourdes:        { name: "Gruta de Lourdes",        x: 17, y: 54, lines: ["5"] },
  st_quinta_normal:           { name: "Quinta Normal",           x: 21, y: 54, lines: ["5"] },
  st_cumming:                 { name: "Cumming",                 x: 28, y: 50, lines: ["5"] },
  st_bellas_artes:            { name: "Bellas Artes",            x: 44, y: 43, lines: ["5"] },
  st_parque_bustamante:       { name: "Parque Bustamante",       x: 52, y: 51, lines: ["5"] },
  st_santa_isabel:            { name: "Santa Isabel",            x: 50, y: 55, lines: ["5"] },
  st_nuble:                   { name: "Ñuble",                   x: 55, y: 62, lines: ["5","6"], isTransfer: true },
  st_rodrigo_de_araya:        { name: "Rodrigo de Araya",        x: 57, y: 64, lines: ["5"] },
  st_carlos_valdovinos:       { name: "Carlos Valdovinos",       x: 59, y: 66, lines: ["5"] },
  st_camino_agricola:         { name: "Camino Agrícola",         x: 60, y: 68, lines: ["5"] },
  st_san_joaquin:             { name: "San Joaquín",             x: 61, y: 70, lines: ["5"] },
  st_pedrero:                 { name: "Pedrero",                 x: 61, y: 73, lines: ["5"] },
  st_mirador:                 { name: "Mirador",                 x: 61, y: 75, lines: ["5"] },
  st_bellavista_de_la_florida: { name: "Bellavista de La Florida", x: 61, y: 78, lines: ["5"] },

  // ── Linha 6 — Roxo #9B59B6 (Cerrillos→Los Leones) ───────────────────────────
  st_cerrillos:               { name: "Cerrillos",               x: 21, y: 73, lines: ["6"] },
  st_lo_valledor:             { name: "Lo Valledor",             x: 26, y: 69, lines: ["6"], efeIntegration: true },
  st_presidente_pedro_aguirre_cerda:     { name: "Pedro Aguirre Cerda",     x: 31, y: 66, lines: ["6"] },
  st_bio_bio:                 { name: "Bío Bío",                 x: 44, y: 59, lines: ["6"] },
  st_estadio_nacional:        { name: "Estadio Nacional",        x: 57, y: 60, lines: ["6"] },
  st_ines_de_suarez:          { name: "Inés de Suárez",          x: 60, y: 53, lines: ["6"] },
};

// ── Linhas com estações ordenadas ─────────────────────────────────────────────
export const LINES: MetroLine[] = [
  {
    id: "1", name: "Línea 1", color: "#E31837",
    stations: [
      "st_san_pablo","st_neptuno","st_pajaritos","st_las_rejas","st_ecuador",
      "st_san_alberto_hurtado","st_universidad_de_santiago","st_estacion_central",
      "st_union_latinoamericana","st_republica","st_los_heroes","st_la_moneda",
      "st_universidad_de_chile","st_santa_lucia","st_universidad_catolica",
      "st_baquedano","st_salvador","st_manuel_montt","st_pedro_de_valdivia",
      "st_los_leones","st_tobalaba","st_el_golf","st_alcantara","st_escuela_militar",
      "st_manquehue","st_hernando_de_magallanes","st_los_dominicos",
    ],
  },
  {
    id: "2", name: "Línea 2", color: "#F26522",
    stations: [
      "st_vespucio_norte","st_zapadores","st_dorsal","st_einstein","st_cementerios",
      "st_cerro_blanco","st_patronato","st_puente_cal_y_canto","st_santa_ana",
      "st_los_heroes","st_toesca","st_parque_ohiggins","st_rondizzoni","st_franklin",
      "st_el_llano","st_san_miguel","st_lo_vial","st_departamental","st_ciudad_del_nino",
      "st_lo_ovalle","st_el_parron","st_la_cisterna",
      "st_el_bosque","st_observatorio","st_copa_lo_martinez","st_hospital_el_pino",
    ],
  },
  {
    id: "3", name: "Línea 3", color: "#8B5E3C",
    stations: [
      "st_plaza_quilicura","st_lo_cruzat","st_ferrocarril","st_los_libertadores",
      "st_cardenal_caro","st_vivaceta","st_conchali","st_plaza_chacabuco",
      "st_hospitales","st_puente_cal_y_canto","st_plaza_de_armas",
      "st_universidad_de_chile","st_parque_almagro","st_matta","st_irarrazaval",
      "st_monsenor_eyzaguirre","st_nunoa","st_chile_espana","st_villa_frei",
      "st_plaza_egana","st_fernando_castillo_velasco",
    ],
  },
  {
    id: "4", name: "Línea 4", color: "#00A0DF",
    stations: [
      "st_tobalaba","st_cristobal_colon","st_francisco_bilbao","st_principe_de_gales",
      "st_simon_bolivar","st_plaza_egana","st_los_orientales","st_grecia",
      "st_los_presidentes","st_quilin","st_las_torres","st_macul","st_vicuna_mackenna",
      "st_vicente_valdes","st_rojas_magallanes","st_trinidad","st_san_jose_de_la_estrella",
      "st_los_quillayes","st_elisa_correa","st_hospital_sotero_del_rio",
      "st_protectora_de_la_infancia","st_las_mercedes","st_plaza_de_puente_alto",
    ],
  },
  {
    id: "4A", name: "Línea 4A", color: "#4DC3F7",
    stations: [
      "st_vicuna_mackenna","st_santa_julia","st_la_granja","st_santa_rosa",
      "st_san_ramon","st_la_cisterna",
    ],
  },
  {
    id: "5", name: "Línea 5", color: "#00A550",
    stations: [
      "st_plaza_de_maipu","st_santiago_bueras","st_del_sol","st_monte_tabor",
      "st_las_parcelas","st_laguna_sur","st_barrancas","st_pudahuel","st_san_pablo",
      "st_lo_prado","st_blanqueado","st_gruta_de_lourdes","st_quinta_normal",
      "st_cumming","st_santa_ana","st_plaza_de_armas","st_bellas_artes","st_baquedano",
      "st_parque_bustamante","st_santa_isabel","st_irarrazaval","st_nuble",
      "st_rodrigo_de_araya","st_carlos_valdovinos","st_camino_agricola","st_san_joaquin",
      "st_pedrero","st_mirador","st_bellavista_de_la_florida","st_vicente_valdes",
    ],
  },
  {
    id: "6", name: "Línea 6", color: "#9B59B6",
    stations: [
      "st_cerrillos","st_lo_valledor","st_presidente_pedro_aguirre_cerda","st_franklin",
      "st_bio_bio","st_nuble","st_estadio_nacional","st_nunoa",
      "st_ines_de_suarez","st_los_leones",
    ],
  },
];

// ── 17 Transferências Oficiais ─────────────────────────────────────────────────
export const TRANSFERS = [
  { station: "Baquedano",           lines: ["1","5"] },
  { station: "Franklin",            lines: ["2","6"] },
  { station: "Irarrázaval",         lines: ["3","5"] },
  { station: "La Cisterna",         lines: ["2","4A"] },
  { station: "Los Héroes",          lines: ["1","2"] },
  { station: "Los Leones",          lines: ["1","6"] },
  { station: "Ñuble",               lines: ["5","6"] },
  { station: "Ñuñoa",               lines: ["3","6"] },
  { station: "Plaza de Armas",      lines: ["3","5"] },
  { station: "Plaza Egaña",         lines: ["3","4"] },
  { station: "Puente Cal y Canto",  lines: ["2","3"] },
  { station: "San Pablo",           lines: ["1","5"] },
  { station: "Santa Ana",           lines: ["2","5"] },
  { station: "Tobalaba",            lines: ["1","4"] },
  { station: "Universidad de Chile",lines: ["1","3"] },
  { station: "Vicente Valdés",      lines: ["4","5"] },
  { station: "Vicuña Mackenna",     lines: ["4","4A"] },
] as const;

// ── Resumo ─────────────────────────────────────────────────────────────────────
export const METRO_SUMMARY = {
  uniqueStations: 126,
  dtpmCount: 143,
  transfers: 17,
  lines: 7,
  colors: {
    "1": "#E31837",
    "2": "#F26522",
    "3": "#8B5E3C",
    "4": "#00A0DF",
    "4A": "#4DC3F7",
    "5": "#00A550",
    "6": "#9B59B6",
  },
  newStations: [
    "El Bosque","Observatorio","Copa Lo Martínez","Hospital El Pino",
    "Plaza Quilicura","Lo Cruzat","Ferrocarril",
  ],
  corrections: [
    "Presidente Pedro Aguirre Cerda → Pedro Aguirre Cerda",
    "Vicuña Mackenna: L4+L4A apenas (não L5)",
    "L3 cor: #8B5E3C (marrom, não amarelo)",
    "L4A cor: #4DC3F7 (azul clara, diferente de L4)",
    "Lo Valledor: integração com rede EFE",
  ],
};
