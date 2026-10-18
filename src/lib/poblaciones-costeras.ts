// src/lib/poblaciones-costeras.ts
// WKF — Lista inicial de poblaciones costeras para el mapa táctico.
// F4-bis (MTmaster). Lista manual reducida. Se ampliará en WKF1.039
// con GeoNames (endpoint citiesJSON) o fuente equivalente.
//
// Formato: nombre | lat | lon (5 decimales, centro del casco urbano).

export interface PoblacionCostera {
  nombre: string;
  lat: number;
  lon: number;
}

export const POBLACIONES_COSTERAS: PoblacionCostera[] = [
  // España — Mediterráneo
  { nombre: "Algeciras", lat: 36.13333, lon: -5.45000 },
  { nombre: "Almería", lat: 36.83814, lon: -2.45974 },
  { nombre: "Alicante", lat: 38.34517, lon: -0.48149 },
  { nombre: "Benidorm", lat: 38.53816, lon: -0.13098 },
  { nombre: "Calpe", lat: 38.64472, lon: 0.04472 },
  { nombre: "Cartagena", lat: 37.60512, lon: -0.99102 },
  { nombre: "Castellón de la Plana", lat: 39.98636, lon: -0.03741 },
  { nombre: "Denia", lat: 38.84078, lon: 0.10662 },
  { nombre: "Estepona", lat: 36.42588, lon: -5.14642 },
  { nombre: "Fuengirola", lat: 36.53937, lon: -4.62429 },
  { nombre: "Gandía", lat: 38.96667, lon: -0.18333 },
  { nombre: "Málaga", lat: 36.72016, lon: -4.42034 },
  { nombre: "Marbella", lat: 36.51543, lon: -4.88583 },
  { nombre: "Motril", lat: 36.74588, lon: -3.51868 },
  { nombre: "Palma de Mallorca", lat: 39.56939, lon: 2.65024 },
  { nombre: "Peñíscola", lat: 40.36000, lon: 0.40694 },
  { nombre: "Roquetas de Mar", lat: 36.76416, lon: -2.61472 },
  { nombre: "Sagunto", lat: 39.68333, lon: -0.26667 },
  { nombre: "Torrevieja", lat: 37.97872, lon: -0.68222 },
  { nombre: "Valencia", lat: 39.46975, lon: -0.37739 },
  { nombre: "Vinaroz", lat: 40.47033, lon: 0.47559 },
  { nombre: "Jávea", lat: 38.79167, lon: 0.16667 },
  { nombre: "Alcoy", lat: 38.69833, lon: -0.47417 },
  { nombre: "Santa Pola", lat: 38.19194, lon: -0.55556 },
  { nombre: "Torre del Mar", lat: 36.73583, lon: -4.09583 },
  { nombre: "Nerja", lat: 36.74694, lon: -3.87694 },
  { nombre: "Adra", lat: 36.74972, lon: -3.02028 },
  { nombre: "Águilas", lat: 37.40639, lon: -1.58194 },
  { nombre: "Mazarrón", lat: 37.59889, lon: -1.31500 },
  { nombre: "San Pedro del Pinatar", lat: 37.83583, lon: -0.79111 },
  { nombre: "Cullera", lat: 39.16667, lon: -0.25000 },
  { nombre: "Oliva", lat: 38.91972, lon: -0.11917 },
  { nombre: "Burriana", lat: 39.88944, lon: -0.08472 },
  { nombre: "Benicarló", lat: 40.41667, lon: 0.41667 },
  { nombre: "Cambrils", lat: 41.06972, lon: 1.05972 },
  { nombre: "Tarragona", lat: 41.11888, lon: 1.24449 },
  { nombre: "Barcelona", lat: 41.38879, lon: 2.15899 },
  { nombre: "Mataró", lat: 41.53889, lon: 2.44472 },
  { nombre: "Blanes", lat: 41.67472, lon: 2.79250 },
  { nombre: "Palamós", lat: 41.85000, lon: 3.13333 },
  { nombre: "Roses", lat: 42.26194, lon: 3.17694 },
  { nombre: "Figueres", lat: 42.26645, lon: 2.96163 },

  // España — Atlántico y Cantábrico
  { nombre: "Cádiz", lat: 36.52672, lon: -6.28910 },
  { nombre: "Sanlúcar de Barrameda", lat: 36.77853, lon: -6.35366 },
  { nombre: "Huelva", lat: 37.26638, lon: -6.94004 },
  { nombre: "Ayamonte", lat: 37.21417, lon: -7.40833 },
  { nombre: "Isla Cristina", lat: 37.20000, lon: -7.31667 },
  { nombre: "Faro", lat: 37.01937, lon: -7.93223 },
  { nombre: "Lisboa", lat: 38.71667, lon: -9.13333 },
  { nombre: "Porto", lat: 41.14961, lon: -8.61099 },
  { nombre: "Vigo", lat: 42.23282, lon: -8.72264 },
  { nombre: "A Coruña", lat: 43.37135, lon: -8.39600 },
  { nombre: "Ferrol", lat: 43.48451, lon: -8.23299 },
  { nombre: "Gijón", lat: 43.53573, lon: -5.66152 },
  { nombre: "Avilés", lat: 43.55473, lon: -5.92483 },
  { nombre: "Santander", lat: 43.46472, lon: -3.80444 },
  { nombre: "Bilbao", lat: 43.26271, lon: -2.92528 },
  { nombre: "San Sebastián", lat: 43.31283, lon: -1.97499 },
  { nombre: "Bayona", lat: 43.36750, lon: -8.22500 }, // Galicia
  { nombre: "Ribadeo", lat: 43.53806, lon: -7.04083 },
  { nombre: "Viveiro", lat: 43.66194, lon: -7.59500 },
  { nombre: "Ortigueira", lat: 43.68333, lon: -7.85000 },

  // Baleares y Canarias
  { nombre: "Ibiza", lat: 38.90889, lon: 1.43222 },
  { nombre: "Mahón", lat: 39.88853, lon: 4.26583 },
  { nombre: "Ciutadella", lat: 40.00000, lon: 3.83333 },
  { nombre: "Las Palmas de Gran Canaria", lat: 28.12482, lon: -15.43001 },
  { nombre: "Santa Cruz de Tenerife", lat: 28.46824, lon: -16.25462 },
  { nombre: "Arrecife", lat: 28.96302, lon: -13.54770 },
  { nombre: "Puerto del Rosario", lat: 28.50038, lon: -13.86272 },
  { nombre: "San Sebastián de La Gomera", lat: 28.09167, lon: -17.11361 },
  { nombre: "Santa Cruz de La Palma", lat: 28.68351, lon: -17.76421 },
  { nombre: "Valverde", lat: 27.80600, lon: -17.91600 },

  // Francia — Mediterráneo
  { nombre: "Perpiñán", lat: 42.69764, lon: 2.89541 },
  { nombre: "Narbona", lat: 43.18333, lon: 3.00000 },
  { nombre: "Sète", lat: 43.40280, lon: 3.69278 },
  { nombre: "Montpellier", lat: 43.61093, lon: 3.87635 },
  { nombre: "Marsella", lat: 43.29648, lon: 5.38107 },
  { nombre: "Tolón", lat: 43.12442, lon: 5.92836 },
  { nombre: "Cannes", lat: 43.55135, lon: 7.01275 },
  { nombre: "Niza", lat: 43.70313, lon: 7.26608 },
  { nombre: "Ajaccio", lat: 41.92724, lon: 8.73810 },
  { nombre: "Bastia", lat: 42.70278, lon: 9.45000 },

  // Francia — Atlántico
  { nombre: "Bayona", lat: 43.48315, lon: -1.47484 },
  { nombre: "Burdeos", lat: 44.84044, lon: -0.58050 },
  { nombre: "La Rochelle", lat: 46.16033, lon: -1.15114 },
  { nombre: "Nantes", lat: 47.21725, lon: -1.55336 },
  { nombre: "Brest", lat: 48.39029, lon: -4.48628 },
  { nombre: "Saint-Malo", lat: 48.65000, lon: -2.01667 },

  // Italia
  { nombre: "Génova", lat: 44.40565, lon: 8.94626 },
  { nombre: "Livorno", lat: 43.55000, lon: 10.31667 },
  { nombre: "Roma", lat: 41.89193, lon: 12.51133 },
  { nombre: "Nápoles", lat: 40.85216, lon: 14.26811 },
  { nombre: "Bari", lat: 41.12066, lon: 16.86982 },
  { nombre: "Venecia", lat: 45.43719, lon: 12.33459 },
  { nombre: "Trieste", lat: 45.64953, lon: 13.77678 },
  { nombre: "Palermo", lat: 38.11519, lon: 13.36149 },
  { nombre: "Catania", lat: 37.50213, lon: 15.08719 },
  { nombre: "Cagliari", lat: 39.23054, lon: 9.11917 },
  { nombre: "Olbia", lat: 40.92388, lon: 9.49889 },

  // Grecia y Turquía
  { nombre: "Atenas", lat: 37.98376, lon: 23.72784 },
  { nombre: "El Pireo", lat: 37.94745, lon: 23.63708 },
  { nombre: "Salónica", lat: 40.64361, lon: 22.93086 },
  { nombre: "Patras", lat: 38.24444, lon: 21.73444 },
  { nombre: "Heraclión", lat: 35.32500, lon: 25.13056 },
  { nombre: "Rodas", lat: 36.43496, lon: 28.21754 },
  { nombre: "Estambul", lat: 41.01384, lon: 28.94966 },
  { nombre: "Esmirna", lat: 38.41273, lon: 27.13838 },
  { nombre: "Antalya", lat: 36.90812, lon: 30.69556 },
  { nombre: "Bodrum", lat: 37.03833, lon: 27.42917 },

  // Norte de África mediterráneo
  { nombre: "Tánger", lat: 35.76727, lon: -5.79975 },
  { nombre: "Ceuta", lat: 35.88933, lon: -5.32072 },
  { nombre: "Melilla", lat: 35.29369, lon: -2.93833 },
  { nombre: "Orán", lat: 35.69694, lon: -0.63306 },
  { nombre: "Argel", lat: 36.75389, lon: 3.05889 },
  { nombre: "Túnez", lat: 36.81904, lon: 10.16579 },
  { nombre: "Sfax", lat: 34.74056, lon: 10.76028 },
  { nombre: "Trípoli", lat: 32.88722, lon: 13.18750 },
  { nombre: "Alejandría", lat: 31.21564, lon: 29.95527 },
  { nombre: "Puerto Saíd", lat: 31.26531, lon: 32.30181 },
  { nombre: "Beirut", lat: 33.89332, lon: 35.50157 },
  { nombre: "Haifa", lat: 32.81841, lon: 34.98850 },
  { nombre: "Tel Aviv", lat: 32.08088, lon: 34.78057 },

  // América
  { nombre: "La Habana", lat: 23.11359, lon: -82.36660 },
  { nombre: "Veracruz", lat: 19.18095, lon: -96.14290 },
  { nombre: "Cartagena de Indias", lat: 10.39972, lon: -75.51444 },
  { nombre: "Maracaibo", lat: 10.65425, lon: -71.61274 },
  { nombre: "Recife", lat: -8.05389, lon: -34.88111 },
  { nombre: "Salvador de Bahía", lat: -12.97111, lon: -38.51083 },
  { nombre: "Río de Janeiro", lat: -22.90642, lon: -43.18223 },
  { nombre: "Santos", lat: -23.96083, lon: -46.33361 },
  { nombre: "Buenos Aires", lat: -34.61315, lon: -58.37723 },
  { nombre: "Montevideo", lat: -34.90328, lon: -56.18816 },
  { nombre: "Valparaíso", lat: -33.03611, lon: -71.62056 },
  { nombre: "Lima", lat: -12.04318, lon: -77.02824 },
  { nombre: "Guayaquil", lat: -2.19616, lon: -79.88621 },
  { nombre: "Miami", lat: 25.77427, lon: -80.19366 },
  { nombre: "Nueva York", lat: 40.71427, lon: -74.00597 },
  { nombre: "Los Ángeles", lat: 34.05223, lon: -118.24368 },
  { nombre: "San Francisco", lat: 37.77493, lon: -122.41942 },
  { nombre: "Vancouver", lat: 49.24966, lon: -123.11934 },

  // Oceanía y Asia (básico)
  { nombre: "Sídney", lat: -33.86785, lon: 151.20732 },
  { nombre: "Melbourne", lat: -37.81400, lon: 144.96332 },
  { nombre: "Brisbane", lat: -27.46794, lon: 153.02809 },
  { nombre: "Perth", lat: -31.95224, lon: 115.86140 },
  { nombre: "Auckland", lat: -36.84853, lon: 174.76349 },
  { nombre: "Wellington", lat: -41.28664, lon: 174.77557 },
  { nombre: "Tokio", lat: 35.68950, lon: 139.69171 },
  { nombre: "Yokohama", lat: 35.44778, lon: 139.64250 },
  { nombre: "Osaka", lat: 34.69374, lon: 135.50218 },
  { nombre: "Bangkok", lat: 13.75398, lon: 100.50144 },
  { nombre: "Singapur", lat: 1.28967, lon: 103.85007 },
  { nombre: "Yakarta", lat: -6.21462, lon: 106.84513 },
  { nombre: "Manila", lat: 14.60420, lon: 120.98220 },
  { nombre: "Ciudad del Cabo", lat: -33.92584, lon: 18.42322 },
  { nombre: "Durban", lat: -29.85790, lon: 31.02920 },
  { nombre: "Mombasa", lat: -4.05466, lon: 39.66359 },
  { nombre: "Dubái", lat: 25.06570, lon: 55.17128 },
  { nombre: "Bombay", lat: 19.07283, lon: 72.88261 },
  { nombre: "Hong Kong", lat: 22.28552, lon: 114.15769 },
  { nombre: "Shanghái", lat: 31.22222, lon: 121.45806 },
];

export function filtrarPorViewport(
  poblaciones: PoblacionCostera[],
  bounds: { sur: number; oeste: number; norte: number; este: number }
): PoblacionCostera[] {
  return poblaciones.filter(
    (p) =>
      p.lat >= bounds.sur &&
      p.lat <= bounds.norte &&
      p.lon >= bounds.oeste &&
      p.lon <= bounds.este
  );
}
// src/lib/poblaciones-costeras.ts