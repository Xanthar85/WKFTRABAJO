// src/lib/zonas-geo.ts
// WKF — Geolocalización de zona por coordenadas.
// v1.010: sin cambios.

import type { Zona } from './verdict.ts';

export interface ZonaGeo {
  zona: Zona;
  lat: number;
  lon: number;
  radioKm: number;
}

export const ZONAS_GEO: ZonaGeo[] = [
  // ─── Mediterráneo ────────────────────────────────────────────
  { zona: 'mediterraneo_espanol', lat: 39.7, lon: 0.5, radioKm: 500 },
  { zona: 'mediterraneo_frances', lat: 43.3, lon: 4.5, radioKm: 250 },
  { zona: 'mediterraneo_italiano', lat: 41.0, lon: 14.0, radioKm: 600 },
  { zona: 'mediterraneo_griego', lat: 38.0, lon: 23.5, radioKm: 500 },
  { zona: 'mediterraneo_turco', lat: 36.5, lon: 30.5, radioKm: 500 },
  { zona: 'mediterraneo_norteafricano', lat: 34.0, lon: 10.0, radioKm: 800 },
  { zona: 'mar_marmara', lat: 40.7, lon: 28.0, radioKm: 120 },
  { zona: 'mar_adriatico', lat: 43.0, lon: 15.5, radioKm: 350 },
  { zona: 'mar_egeo', lat: 38.5, lon: 25.5, radioKm: 250 },
  { zona: 'mar_negro', lat: 43.5, lon: 34.0, radioKm: 550 },

  // ─── Atlántico europeo ───────────────────────────────────────
  { zona: 'atlantico_norte_espanol', lat: 43.5, lon: -8.0, radioKm: 300 },
  { zona: 'atlantico_portugues', lat: 39.5, lon: -9.3, radioKm: 400 },
  { zona: 'atlantico_frances_bretana', lat: 47.5, lon: -3.5, radioKm: 400 },
  { zona: 'canal_mancha', lat: 50.0, lon: -1.5, radioKm: 350 },
  { zona: 'mar_irlanda', lat: 53.5, lon: -5.5, radioKm: 300 },
  { zona: 'mar_celtico', lat: 49.5, lon: -8.0, radioKm: 300 },
  { zona: 'atlantico_britanico', lat: 55.0, lon: -10.0, radioKm: 500 },
  { zona: 'mar_noruega', lat: 65.0, lon: 4.0, radioKm: 700 },
  { zona: 'mar_barents_sur', lat: 70.5, lon: 33.0, radioKm: 500 },
  { zona: 'mar_baltico', lat: 58.0, lon: 20.0, radioKm: 800 },
  { zona: 'mar_del_norte', lat: 56.0, lon: 3.0, radioKm: 500 },

  // ─── Islas atlánticas ────────────────────────────────────────
  { zona: 'islandia', lat: 65.0, lon: -18.0, radioKm: 300 },
  { zona: 'azores', lat: 38.5, lon: -28.0, radioKm: 300 },
  { zona: 'madeira', lat: 32.7, lon: -17.0, radioKm: 100 },
  { zona: 'canarias', lat: 28.0, lon: -15.5, radioKm: 250 },

  // ─── Norteamérica Pacífico ───────────────────────────────────
  { zona: 'pacifico_americano', lat: 37.0, lon: -122.5, radioKm: 800 },
  { zona: 'pacifico_washington', lat: 47.5, lon: -124.5, radioKm: 300 },
  { zona: 'columbia_britanica', lat: 50.5, lon: -127.0, radioKm: 400 },
  { zona: 'alaska_sur', lat: 58.0, lon: -150.0, radioKm: 800 },

  // ─── Norteamérica Atlántico ──────────────────────────────────
  { zona: 'atlantico_canadiense', lat: 45.5, lon: -60.0, radioKm: 700 },
  { zona: 'atlantico_usa_maine_massachusetts', lat: 42.5, lon: -70.0, radioKm: 350 },
  { zona: 'atlantico_usa_carolinas_florida', lat: 31.0, lon: -80.5, radioKm: 700 },
  { zona: 'golfo_mexico', lat: 27.0, lon: -90.0, radioKm: 800 },
  { zona: 'grandes_lagos', lat: 44.0, lon: -83.0, radioKm: 700 },
  { zona: 'chesapeake_long_island', lat: 38.5, lon: -74.5, radioKm: 300 },

  // ─── México, Centroamérica, Caribe ───────────────────────────
  { zona: 'pacifico_mexicano', lat: 20.0, lon: -105.5, radioKm: 700 },
  { zona: 'golfo_california', lat: 27.5, lon: -111.5, radioKm: 500 },
  { zona: 'pacifico_centroamericano', lat: 12.0, lon: -87.0, radioKm: 700 },
  { zona: 'caribe_mexicano', lat: 20.0, lon: -87.0, radioKm: 300 },
  { zona: 'caribe_insular', lat: 18.0, lon: -70.0, radioKm: 800 },
  { zona: 'caribe_sur', lat: 12.0, lon: -70.0, radioKm: 600 },

  // ─── Sudamérica ──────────────────────────────────────────────
  { zona: 'pacifico_sudamericano', lat: -5.0, lon: -78.0, radioKm: 900 },
  { zona: 'atlantico_sudamericano', lat: -22.0, lon: -42.0, radioKm: 1000 },
  { zona: 'patagonia_pacifico', lat: -47.0, lon: -75.0, radioKm: 700 },
  { zona: 'patagonia_atlantico', lat: -47.0, lon: -65.5, radioKm: 700 },

  // ─── Oceanía ─────────────────────────────────────────────────
  { zona: 'costa_este_australia', lat: -30.0, lon: 153.5, radioKm: 700 },
  { zona: 'costa_sur_australia', lat: -35.0, lon: 137.0, radioKm: 700 },
  { zona: 'costa_oeste_australia', lat: -27.0, lon: 114.0, radioKm: 700 },
  { zona: 'costa_norte_australia', lat: -15.0, lon: 130.0, radioKm: 900 },
  { zona: 'nueva_zelanda', lat: -41.0, lon: 174.0, radioKm: 500 },
  { zona: 'papua_nueva_guinea', lat: -6.0, lon: 147.0, radioKm: 700 },
  { zona: 'fiyi', lat: -18.0, lon: 178.0, radioKm: 400 },
  { zona: 'polinesia_francesa', lat: -17.5, lon: -149.5, radioKm: 700 },

  // ─── Asia Pacífico ───────────────────────────────────────────
  { zona: 'japon_pacifico', lat: 34.5, lon: 138.0, radioKm: 600 },
  { zona: 'japon_mar_japon', lat: 38.0, lon: 135.0, radioKm: 400 },
  { zona: 'corea_sur', lat: 35.5, lon: 128.0, radioKm: 300 },
  { zona: 'china_costera', lat: 28.0, lon: 121.5, radioKm: 800 },
  { zona: 'taiwan', lat: 23.5, lon: 121.0, radioKm: 200 },
  { zona: 'hong_kong', lat: 22.3, lon: 114.2, radioKm: 100 },
  { zona: 'vietnam', lat: 14.0, lon: 109.0, radioKm: 700 },
  { zona: 'tailandia_golfo', lat: 9.5, lon: 100.0, radioKm: 500 },
  { zona: 'tailandia_andaman', lat: 8.0, lon: 98.3, radioKm: 300 },
  { zona: 'malasia_peninsular', lat: 4.0, lon: 103.0, radioKm: 400 },
  { zona: 'malasia_borneo', lat: 4.0, lon: 114.0, radioKm: 500 },
  { zona: 'indonesia_bali', lat: -8.4, lon: 115.2, radioKm: 150 },
  { zona: 'indonesia_java', lat: -7.5, lon: 110.0, radioKm: 400 },
  { zona: 'indonesia_sumatra', lat: -1.5, lon: 100.0, radioKm: 500 },
  { zona: 'indonesia_sulawesi', lat: -2.0, lon: 121.0, radioKm: 500 },
  { zona: 'indonesia_flores', lat: -8.5, lon: 121.5, radioKm: 300 },
  { zona: 'filipinas', lat: 12.0, lon: 122.5, radioKm: 700 },

  // ─── Índico ──────────────────────────────────────────────────
  { zona: 'india', lat: 15.0, lon: 78.0, radioKm: 900 },
  { zona: 'sri_lanka', lat: 7.5, lon: 80.7, radioKm: 200 },
  { zona: 'maldivas', lat: 3.2, lon: 73.2, radioKm: 200 },
  { zona: 'emiratos_arabes_unidos', lat: 25.0, lon: 54.5, radioKm: 200 },
  { zona: 'oman', lat: 20.5, lon: 58.0, radioKm: 500 },
  { zona: 'mar_rojo', lat: 20.0, lon: 38.5, radioKm: 800 },

  // ─── África atlántica ────────────────────────────────────────
  { zona: 'marruecos_atlantico', lat: 32.5, lon: -9.0, radioKm: 500 },
  { zona: 'sahara_occidental', lat: 24.0, lon: -15.0, radioKm: 500 },
  { zona: 'senegal', lat: 14.5, lon: -17.3, radioKm: 400 },
  { zona: 'costa_marfil', lat: 5.3, lon: -4.5, radioKm: 300 },
  { zona: 'ghana', lat: 5.5, lon: 0.0, radioKm: 300 },
  { zona: 'nigeria', lat: 4.5, lon: 6.5, radioKm: 400 },
  { zona: 'camerun', lat: 3.5, lon: 9.5, radioKm: 300 },
  { zona: 'angola', lat: -12.0, lon: 13.5, radioKm: 700 },
  { zona: 'namibia', lat: -22.5, lon: 14.5, radioKm: 600 },
  { zona: 'sudafrica_atlantico', lat: -32.0, lon: 17.5, radioKm: 500 },
  { zona: 'sudafrica_indico', lat: -30.0, lon: 30.5, radioKm: 500 },

  // ─── África índica ───────────────────────────────────────────
  { zona: 'mozambique', lat: -18.0, lon: 36.0, radioKm: 800 },
  { zona: 'tanzania', lat: -6.5, lon: 39.5, radioKm: 400 },
  { zona: 'kenia', lat: -3.0, lon: 40.0, radioKm: 300 },
  { zona: 'somalia', lat: 5.0, lon: 48.5, radioKm: 700 },
  { zona: 'eritrea', lat: 15.5, lon: 39.5, radioKm: 300 },
  { zona: 'mar_rojo_africano', lat: 22.0, lon: 37.0, radioKm: 700 },
  { zona: 'madagascar', lat: -19.0, lon: 47.0, radioKm: 500 },
  { zona: 'mauricio', lat: -20.2, lon: 57.5, radioKm: 100 },
  { zona: 'reunion', lat: -21.1, lon: 55.5, radioKm: 80 },
  { zona: 'seychelles', lat: -4.6, lon: 55.5, radioKm: 150 },

  // ─── Ártico ──────────────────────────────────────────────────
  { zona: 'mar_artico', lat: 78.0, lon: 20.0, radioKm: 900 },
  { zona: 'groenlandia_sur', lat: 62.0, lon: -45.0, radioKm: 700 },
];

function distanciaKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function detectarZona(lat: number, lon: number): Zona {
  let mejor: ZonaGeo = ZONAS_GEO[0];
  let mejorDist = Infinity;

  for (const z of ZONAS_GEO) {
    const d = distanciaKm(lat, lon, z.lat, z.lon);
    if (d <= z.radioKm) {
      if (d < mejorDist) {
        mejor = z;
        mejorDist = d;
      }
    } else {
      if (mejorDist === Infinity && d < mejorDist) {
        mejor = z;
        mejorDist = d;
      }
    }
  }

  return mejor.zona;
}

export function centroideDeZona(
  zona: Zona
): { lat: number; lon: number } | null {
  const z = ZONAS_GEO.find((x) => x.zona === zona);
  if (!z) return null;
  return { lat: z.lat, lon: z.lon };
}