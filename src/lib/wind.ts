// src/lib/wind.ts
// WKF — Nombres de los vientos.
// DP-034: rosa mediterránea de 16 rumbos para fachada mediterránea.
// Genéricos en el resto del mundo.
// v1.010: se mantiene la interfaz. Sin cambios funcionales.

export type ZonaViento = 'mediterraneo' | 'generico';

export const CARDINALES_16 = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSO', 'SO', 'OSO',
  'O', 'ONO', 'NO', 'NNO',
] as const;

export type Cardinal16 = typeof CARDINALES_16[number];

// Rosa mediterránea. Clave = índice 0-15 (N ... NNO).
export const ROSA_MEDITERRANEA: string[] = [
  'Tramontana',
  'Greco-Tramontana',
  'Gregal',
  'Greco-Levante',
  'Levante',
  'Siroco-Levante',
  'Siroco',
  'Siroco-Ostro',
  'Ostro',
  'Ostro-Libeccio',
  'Lebeche',
  'Poniente-Libeccio',
  'Poniente',
  'Poniente-Mistral',
  'Mistral',
  'Tramontana-Mistral',
];

// Nombres mediterráneos para el idioma inglés. Formato
// "Levante (Easterly)".
export const ROSA_MEDITERRANEA_EN: string[] = [
  'Tramontana (Northerly)',
  'Greco-Tramontana (NNE)',
  'Gregal (Northeasterly)',
  'Greco-Levante (ENE)',
  'Levante (Easterly)',
  'Siroco-Levante (ESE)',
  'Siroco (Southeasterly)',
  'Siroco-Ostro (SSE)',
  'Ostro (Southerly)',
  'Ostro-Libeccio (SSW)',
  'Lebeche (Southwesterly)',
  'Poniente-Libeccio (WSW)',
  'Poniente (Westerly)',
  'Poniente-Mistral (WNW)',
  'Mistral (Northwesterly)',
  'Tramontana-Mistral (NNW)',
];

// Zonas donde se aplica la rosa mediterránea (DP-034).
export const ZONAS_VIENTO_MEDITERRANEO: string[] = [
  'mediterraneo_espanol',
  'mediterraneo_frances',
  'mediterraneo_italiano',
  'mediterraneo_griego',
  'mediterraneo_turco',
  'mediterraneo_norteafricano',
  'mar_marmara',
  'mar_adriatico',
  'mar_egeo',
];

// Devuelve el índice 0-15 correspondiente al rumbo.
export function gradosARumbo(grados: number | null): number {
  if (grados == null) return 0;
  const normalizado = ((grados % 360) + 360) % 360;
  return Math.round(normalizado / 22.5) % 16;
}

export interface NombreViento {
  grados: number | null;
  cardinal: Cardinal16 | '—';
  nombre: string;      // nombre completo (mediterráneo o cardinal)
  zona: ZonaViento;
}

// Devuelve grados, cardinal, y nombre del viento según la zona y
// el idioma. Si la zona no es mediterránea, el nombre es el cardinal.
export function nombreViento(
  grados: number | null,
  zona: string,
  idioma: 'es' | 'en' = 'es'
): NombreViento {
  if (grados == null) {
    return { grados: null, cardinal: '—', nombre: '—', zona: 'generico' };
  }
  const rumbo = gradosARumbo(grados);
  const cardinal = CARDINALES_16[rumbo];
  const esMediterraneo = ZONAS_VIENTO_MEDITERRANEO.includes(zona);
  const zonaTipo: ZonaViento = esMediterraneo ? 'mediterraneo' : 'generico';
  const nombre = esMediterraneo
    ? (idioma === 'en' ? ROSA_MEDITERRANEA_EN[rumbo] : ROSA_MEDITERRANEA[rumbo])
    : cardinal;
  return {
    grados,
    cardinal,
    nombre,
    zona: zonaTipo,
  };
}

// Abreviatura estándar (N, NNE, NE, ...).
export function abreviaturaViento(grados: number | null): string {
  if (grados == null) return '—';
  const rumbo = gradosARumbo(grados);
  return CARDINALES_16[rumbo];
}

// Formato compacto para tabla: "NNW 336° (Mestral)".
export function formatoVientoTabla(
  grados: number | null,
  zona: string,
  idioma: 'es' | 'en'
): string {
  if (grados == null) return '—';
  const nv = nombreViento(grados, zona, idioma);
  const g = Math.round(grados);
  return `${nv.cardinal} ${g}° (${nv.nombre})`;
}

// Solo el nombre (para ejes o etiquetas cortas).
export function etiquetaVientoCorta(
  grados: number | null,
  zona: string,
  idioma: 'es' | 'en'
): string {
  if (grados == null) return '—';
  const nv = nombreViento(grados, zona, idioma);
  return nv.cardinal;
}