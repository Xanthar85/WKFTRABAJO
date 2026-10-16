// src/lib/motores-electricos.ts
// WKF — Catálogo de motores eléctricos y baterías para kayaks, patos y
// canoas. Se usa para la calculadora experimental de autonomía y
// velocidad de crucero.
//
// IMPORTANTE: es una estimación experimental. No sustituye a los datos
// del fabricante ni a las pruebas reales en el agua. Los valores de
// amperaje y potencia son aproximaciones de la industria cuando el
// fabricante no los publica.
//
// Regla de conversión empuje→amperaje a velocidad de crucero:
//   Aproximadamente 0,55 A por cada lb de empuje, en motor de 12 V.
//   Referencia empírica usada por la industria de kayak eléctrico.
//   Para otros voltajes se ajusta linealmente.
//
// Regla de conversión amperaje→potencia:
//   P (W) = V × A.

export type QuimicaBateria = 'litio' | 'agm' | 'gel';
export type TipoMotor = 'transom' | 'bow_mount' | 'integrado' | 'otro';

export interface MotorElectrico {
  id: string;
  marca: string;
  modelo: string;
  tipo: TipoMotor;
  empujeLbs: number;
  voltajeV: number;
  /** Amperaje a velocidad de crucero. Si es null, se estima. */
  amperajeCruceroA: number | null;
  /** Potencia nominal en W. Si es null, se estima. */
  potenciaW: number | null;
  /** Notas libres. Se muestran en la ficha. */
  notas: string;
  /** true si es una entrada genérica (no un modelo comercial real). */
  generico: boolean;
}

export interface BateriaElectrica {
  id: string;
  quimica: QuimicaBateria;
  voltajeV: number;
  capacidadAh: number;
  pesoKg: number;
  notas: string;
  /** true si es una entrada genérica (no un modelo comercial real). */
  generico: boolean;
}

// ────────────────────────────────────────────────────────────────────
// CATÁLOGO DE MOTORES
// ────────────────────────────────────────────────────────────────────

export const CATALOGO_MOTORES: MotorElectrico[] = [
  // ── Minn Kota ─────────────────────────────────────────────────────
  {
    id: 'minkota-endura-30',
    marca: 'Minn Kota',
    modelo: 'Endura 30',
    tipo: 'transom',
    empujeLbs: 30,
    voltajeV: 12,
    amperajeCruceroA: 15,
    potenciaW: 180,
    notas: 'Motor de popa clásico. Ligero y económico. Uso en lagos y aguas tranquilas.',
    generico: false,
  },
  {
    id: 'minkota-endura-40',
    marca: 'Minn Kota',
    modelo: 'Endura 40',
    tipo: 'transom',
    empujeLbs: 40,
    voltajeV: 12,
    amperajeCruceroA: 20,
    potenciaW: 240,
    notas: 'Versión más potente del Endura. Buen equilibrio peso/empuje.',
    generico: false,
  },
  {
    id: 'minkota-endura-max-55',
    marca: 'Minn Kota',
    modelo: 'Endura Max 55',
    tipo: 'transom',
    empujeLbs: 55,
    voltajeV: 12,
    amperajeCruceroA: 28,
    potenciaW: 336,
    notas: 'Gama alta del Endura. Requiere batería de mayor capacidad.',
    generico: false,
  },
  {
    id: 'minkota-traxxis-55',
    marca: 'Minn Kota',
    modelo: 'Traxxis 55',
    tipo: 'transom',
    empujeLbs: 55,
    voltajeV: 12,
    amperajeCruceroA: 28,
    potenciaW: 336,
    notas: 'Con sistema de inclinación asistida.',
    generico: false,
  },

  // ── Watersnake ────────────────────────────────────────────────────
  {
    id: 'watersnake-t18',
    marca: 'Watersnake',
    modelo: 'T18',
    tipo: 'transom',
    empujeLbs: 18,
    voltajeV: 12,
    amperajeCruceroA: 10,
    potenciaW: 120,
    notas: 'El más ligero de la gama. Para kayaks pequeños y aguas tranquilas.',
    generico: false,
  },
  {
    id: 'watersnake-t24',
    marca: 'Watersnake',
    modelo: 'T24',
    tipo: 'transom',
    empujeLbs: 24,
    voltajeV: 12,
    amperajeCruceroA: 13,
    potenciaW: 156,
    notas: 'Motor ligero para kayak de pesca.',
    generico: false,
  },
  {
    id: 'watersnake-t34',
    marca: 'Watersnake',
    modelo: 'T34',
    tipo: 'transom',
    empujeLbs: 34,
    voltajeV: 12,
    amperajeCruceroA: 18,
    potenciaW: 216,
    notas: 'Motor medio, polivalente.',
    generico: false,
  },
  {
    id: 'watersnake-t54',
    marca: 'Watersnake',
    modelo: 'T54',
    tipo: 'transom',
    empujeLbs: 54,
    voltajeV: 12,
    amperajeCruceroA: 28,
    potenciaW: 336,
    notas: 'Gama alta. Requiere batería de buena capacidad.',
    generico: false,
  },
  {
    id: 'watersnake-asp-18',
    marca: 'Watersnake',
    modelo: 'ASP 18',
    tipo: 'transom',
    empujeLbs: 18,
    voltajeV: 12,
    amperajeCruceroA: 10,
    potenciaW: 120,
    notas: 'Variante con hélice de tres palas.',
    generico: false,
  },

  // ── Torqeedo ──────────────────────────────────────────────────────
  {
    id: 'torqeedo-travel-1103',
    marca: 'Torqeedo',
    modelo: 'Travel 1103',
    tipo: 'integrado',
    empujeLbs: 30,
    voltajeV: 29.6,
    amperajeCruceroA: 12,
    potenciaW: 1100,
    notas: 'Motor con batería integrada de litio. Batería extraíble. Precio alto.',
    generico: false,
  },
  {
    id: 'torqeedo-travel-503',
    marca: 'Torqeedo',
    modelo: 'Travel 503',
    tipo: 'integrado',
    empujeLbs: 20,
    voltajeV: 29.6,
    amperajeCruceroA: 8,
    potenciaW: 500,
    notas: 'Versión ligera del Travel. Batería integrada de litio.',
    generico: false,
  },
  {
    id: 'torqeedo-ultralight-403',
    marca: 'Torqeedo',
    modelo: 'Ultralight 403',
    tipo: 'integrado',
    empujeLbs: 25,
    voltajeV: 29.6,
    amperajeCruceroA: 10,
    potenciaW: 400,
    notas: 'Ultraligero, diseñado para kayaks y canoas.',
    generico: false,
  },

  // ── Haswing ───────────────────────────────────────────────────────
  {
    id: 'haswing-protruar-1',
    marca: 'Haswing',
    modelo: 'Protruar 1.0',
    tipo: 'transom',
    empujeLbs: 32,
    voltajeV: 12,
    amperajeCruceroA: 17,
    potenciaW: 204,
    notas: 'Motor de popa con buen equilibrio peso/potencia.',
    generico: false,
  },
  {
    id: 'haswing-protruar-2',
    marca: 'Haswing',
    modelo: 'Protruar 2.0',
    tipo: 'transom',
    empujeLbs: 44,
    voltajeV: 12,
    amperajeCruceroA: 23,
    potenciaW: 276,
    notas: 'Versión media. Buena opción para kayak medio.',
    generico: false,
  },
  {
    id: 'haswing-protruar-3',
    marca: 'Haswing',
    modelo: 'Protruar 3.0',
    tipo: 'transom',
    empujeLbs: 55,
    voltajeV: 12,
    amperajeCruceroA: 28,
    potenciaW: 336,
    notas: 'Gama alta de Haswing.',
    generico: false,
  },
  {
    id: 'haswing-osapian-1',
    marca: 'Haswing',
    modelo: 'Osapian 1.0',
    tipo: 'transom',
    empujeLbs: 30,
    voltajeV: 12,
    amperajeCruceroA: 16,
    potenciaW: 192,
    notas: 'Motor económico de entrada.',
    generico: false,
  },

  // ── Rhino ─────────────────────────────────────────────────────────
  {
    id: 'rhino-vx-34',
    marca: 'Rhino',
    modelo: 'VX 34',
    tipo: 'transom',
    empujeLbs: 34,
    voltajeV: 12,
    amperajeCruceroA: 18,
    potenciaW: 216,
    notas: 'Motor de popa orientado a kayak de pesca.',
    generico: false,
  },
  {
    id: 'rhino-vx-44',
    marca: 'Rhino',
    modelo: 'VX 44',
    tipo: 'transom',
    empujeLbs: 44,
    voltajeV: 12,
    amperajeCruceroA: 23,
    potenciaW: 276,
    notas: 'Versión media.',
    generico: false,
  },
  {
    id: 'rhino-vx-55',
    marca: 'Rhino',
    modelo: 'VX 55',
    tipo: 'transom',
    empujeLbs: 55,
    voltajeV: 12,
    amperajeCruceroA: 28,
    potenciaW: 336,
    notas: 'Gama alta.',
    generico: false,
  },

  // ── Newport Vessels ───────────────────────────────────────────────
  {
    id: 'newport-kayak-series-36',
    marca: 'Newport Vessels',
    modelo: 'Kayak Series 36',
    tipo: 'transom',
    empujeLbs: 36,
    voltajeV: 12,
    amperajeCruceroA: 19,
    potenciaW: 228,
    notas: 'Motor compacto diseñado para kayak de pesca.',
    generico: false,
  },
  {
    id: 'newport-kayak-series-55',
    marca: 'Newport Vessels',
    modelo: 'Kayak Series 55',
    tipo: 'transom',
    empujeLbs: 55,
    voltajeV: 12,
    amperajeCruceroA: 28,
    potenciaW: 336,
    notas: 'Versión potente para kayak grande.',
    generico: false,
  },
  {
    id: 'newport-x-series-46',
    marca: 'Newport Vessels',
    modelo: 'X Series 46',
    tipo: 'transom',
    empujeLbs: 46,
    voltajeV: 12,
    amperajeCruceroA: 24,
    potenciaW: 288,
    notas: 'Motor de popa todoterreno.',
    generico: false,
  },

  // ── Entrada genérica (fuera de catálogo) ──────────────────────────
  {
    id: 'generico-empuje-libre',
    marca: 'Personalizado',
    modelo: 'Motor personalizado',
    tipo: 'otro',
    empujeLbs: 0,
    voltajeV: 12,
    amperajeCruceroA: null,
    potenciaW: null,
    notas: 'Motor introducido por el usuario. Amperaje y potencia estimados a partir del empuje.',
    generico: true,
  },
];

// ────────────────────────────────────────────────────────────────────
// CATÁLOGO DE BATERÍAS
// ────────────────────────────────────────────────────────────────────

export const CATALOGO_BATERIAS: BateriaElectrica[] = [
  // ── Litio (LiFePO4) ───────────────────────────────────────────────
  {
    id: 'litio-50-12',
    quimica: 'litio',
    voltajeV: 12,
    capacidadAh: 50,
    pesoKg: 6,
    notas: 'Litio 50 Ah 12 V. Ligera, larga vida. Precio alto.',
    generico: true,
  },
  {
    id: 'litio-100-12',
    quimica: 'litio',
    voltajeV: 12,
    capacidadAh: 100,
    pesoKg: 12,
    notas: 'Litio 100 Ah 12 V. La opción buena para kayak eléctrico. 12 kg.',
    generico: true,
  },
  {
    id: 'litio-150-12',
    quimica: 'litio',
    voltajeV: 12,
    capacidadAh: 150,
    pesoKg: 18,
    notas: 'Litio 150 Ah 12 V. Gran autonomía con poco peso.',
    generico: true,
  },

  // ── Plomo-ácido (AGM) ─────────────────────────────────────────────
  {
    id: 'agm-50-12',
    quimica: 'agm',
    voltajeV: 12,
    capacidadAh: 50,
    pesoKg: 14,
    notas: 'Plomo-ácido 50 Ah 12 V. Barata pero pesada.',
    generico: true,
  },
  {
    id: 'agm-100-12',
    quimica: 'agm',
    voltajeV: 12,
    capacidadAh: 100,
    pesoKg: 28,
    notas: 'Plomo-ácido 100 Ah 12 V. Peso alto para kayak.',
    generico: true,
  },
  {
    id: 'agm-150-12',
    quimica: 'agm',
    voltajeV: 12,
    capacidadAh: 150,
    pesoKg: 42,
    notas: 'Plomo-ácido 150 Ah 12 V. Peso prohibitivo para kayak.',
    generico: true,
  },

  // ── Gel ───────────────────────────────────────────────────────────
  {
    id: 'gel-50-12',
    quimica: 'gel',
    voltajeV: 12,
    capacidadAh: 50,
    pesoKg: 12,
    notas: 'Gel 50 Ah 12 V. Intermedia entre litio y AGM.',
    generico: true,
  },
  {
    id: 'gel-100-12',
    quimica: 'gel',
    voltajeV: 12,
    capacidadAh: 100,
    pesoKg: 24,
    notas: 'Gel 100 Ah 12 V. Peso intermedio.',
    generico: true,
  },

  // ── Entrada genérica (fuera de catálogo) ──────────────────────────
  {
    id: 'generico-bateria-libre',
    quimica: 'litio',
    voltajeV: 12,
    capacidadAh: 0,
    pesoKg: 0,
    notas: 'Batería introducida por el usuario.',
    generico: true,
  },
];

// ────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────

/** Estimación de amperaje a velocidad de crucero cuando el fabricante no
 *  lo publica. Basada en la regla empírica de la industria: ~0,55 A por
 *  lb de empuje en motor de 12 V. Para otros voltajes se ajusta
 *  linealmente (a más voltaje, menos corriente para el mismo empuje). */
export function estimarAmperajePorEmpuje(
  empujeLbs: number,
  voltajeV: number
): number {
  if (empujeLbs <= 0) return 0;
  const amperajeRef12V = empujeLbs * 0.55;
  const amperaje = amperajeRef12V * (12 / voltajeV);
  return Math.round(amperaje * 10) / 10;
}

/** Estimación de potencia en W a partir del voltaje y el amperaje. */
export function estimarPotencia(voltajeV: number, amperajeA: number): number {
  return Math.round(voltajeV * amperajeA);
}

export function buscarMotorPorId(id: string): MotorElectrico | undefined {
  return CATALOGO_MOTORES.find((m) => m.id === id);
}

export function buscarBateriaPorId(id: string): BateriaElectrica | undefined {
  return CATALOGO_BATERIAS.find((b) => b.id === id);
}

export function etiquetaMotor(motor: MotorElectrico): string {
  if (motor.generico && motor.empujeLbs === 0) {
    return motor.marca;
  }
  return `${motor.marca} ${motor.modelo} (${motor.empujeLbs} lbs, ${motor.voltajeV} V)`;
}

export function etiquetaBateria(bateria: BateriaElectrica): string {
  const quimicaLabel =
    bateria.quimica === 'litio' ? 'Litio'
    : bateria.quimica === 'agm' ? 'Plomo-ácido'
    : 'Gel';
  return `${quimicaLabel} ${bateria.capacidadAh} Ah ${bateria.voltajeV} V (${bateria.pesoKg} kg)`;
}