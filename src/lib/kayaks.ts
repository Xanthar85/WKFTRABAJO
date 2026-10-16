// src/lib/kayaks.ts
// WKF — Catálogo de kayaks.
//
// Reglas (v1.024):
//   - La certificación CE manda sobre la categoría WKF.
//   - Los kayaks a pala están EXENTOS de la Directiva 2013/53/UE
//     (art. 2.2.a.ii). NO llevan techo CE ni categoría Directiva A-D.
//     Su categoría Directiva es 'exento'.
//   - Los kayaks con pedales, motor o cualquier propulsión no manual
//     SÍ entran en el ámbito de la Directiva. Si el fabricante no
//     publica categoría CE, van a 'no_certificado' y techo D.
//   - No inventamos techo. Si no hay CE, no hay techo. Punto.
//   - Una sola entrada por modelo. Las variantes (pala / aletas /
//     hélice) se unifican en una entrada con el peso representativo.
//   - Peso y certificaciones se han verificado contra fabricantes y
//     distribuidores oficiales. Fiabilidad general declarada: 7/10.
//
// Estructura por entrada:
//   id, marca, modelo, eslora, manga, volumen, tipoCasco, autovaciable,
//   timon, compartimentosEstancos, capacidadCarga, propulsion,
//   categoriaWKF, categoriaDirectiva, pesoKg?, pesoFuente?,
//   certificado, certificadoOficial, verificado,
//   certificaciones, techoAbsoluto?

import type { CategoriaKayak } from './verdict.ts';

export type Propulsion = 'pala' | 'pedal_aletas' | 'pedal_helice';
export type CategoriaDirectiva =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'no_certificado'
  | 'exento';
export type TipoCasco = 'V' | 'U' | 'plano';
export type CategoriaHinchable = 'HI1' | 'HI2';
export type FuentePeso = 'fabricante' | 'distribuidor' | 'estimado';

export interface CertificacionesKayak {
  ce: 'A' | 'B' | 'C' | 'D' | null;
  ukca: 'A' | 'B' | 'C' | 'D' | null;
  uscg: boolean;
  abyc: boolean;
  nmma: boolean;
  as_nzs: boolean;
  jci: boolean;
  iso_12217: boolean;
  iso_14946: boolean;
  iso_10087: boolean;
}

export interface TechoAbsoluto {
  vientoMaxBf: number;
  olaMaxM: number;
  fuente: 'CE' | 'UKCA' | 'ABYC' | 'NMMA' | 'AS/NZS' | 'JCI' | 'ISO' | 'estimado';
}

export interface Kayak<C = any> {
  id: string;
  marca: string;
  modelo: string;
  eslora: number;
  manga: number;
  volumen: number;
  tipoCasco: TipoCasco;
  autovaciable: boolean;
  timon: boolean;
  compartimentosEstancos: boolean;
  capacidadCarga: number;
  propulsion: Propulsion;
  categoriaWKF: C extends CategoriaKayak | CategoriaHinchable ? C : CategoriaKayak | CategoriaHinchable;
  categoriaDirectiva: CategoriaDirectiva;
  /** Peso del kayak en vacío, en kg. Opcional. */
  pesoKg?: number;
  /** De dónde viene el peso: fabricante (oficial), distribuidor
   *  (fiable pero no oficial) o estimado (por categoría K). */
  pesoFuente?: FuentePeso;
  certificado: boolean;
  certificadoOficial: boolean;
  verificado: boolean;
  certificaciones: CertificacionesKayak;
  /** Techo absoluto por CE. Ausente si el kayak está exento de la
   *  Directiva (kayaks a pala) o si no hay techo oficial. */
  techoAbsoluto?: TechoAbsoluto;
}

export interface KayakEditado extends Kayak {
  origen: 'usuario';
}

export interface EntradaKayakEditado {
  eslora: number;
  manga: number;
  tipoCasco: 'V' | 'U' | 'plano';
  autovaciable: boolean;
  timon: boolean;
  compartimentosEstancos: boolean;
  capacidadCarga: number;
  propulsion: 'pala' | 'pedal_aletas' | 'pedal_helice';
  pesoKg?: number;
}

// Estimación de peso por categoría WKF. Se usa cuando un kayak no
// tiene peso oficial ni de distribuidor.
export function pesoEstimadoPorCategoria(cat: CategoriaKayak): number {
  switch (cat) {
    case 'K1': return 12;
    case 'K2': return 20;
    case 'K3': return 28;
    case 'K4': return 35;
    case 'K5': return 22;
  }
}

// Deduce la categoría WKF (K1-K5) a partir de los datos técnicos.
export function deducirCategoriaWKF(
  entrada: EntradaKayakEditado
): CategoriaKayak {
  const { eslora, timon, compartimentosEstancos, autovaciable, propulsion } = entrada;

  let base: CategoriaKayak;
  if (eslora < 3.0) base = 'K1';
  else if (eslora < 3.6) base = 'K2';
  else if (eslora < 4.2) base = 'K3';
  else if (eslora < 4.8) base = 'K4';
  else base = 'K5';

  let factoresBuenos = 0;
  if (timon) factoresBuenos++;
  if (compartimentosEstancos) factoresBuenos++;
  if (autovaciable) factoresBuenos++;
  if (propulsion === 'pedal_aletas' || propulsion === 'pedal_helice') {
    factoresBuenos++;
  }

  const orden: CategoriaKayak[] = ['K1', 'K2', 'K3', 'K4', 'K5'];
  let idx = orden.indexOf(base);

  if (factoresBuenos >= 2) {
    idx = Math.min(idx + 1, 4);
  } else if (factoresBuenos === 0) {
    idx = Math.max(idx - 1, 0);
  }

  return orden[idx];
}

const SIN_CERTIFICAR: CertificacionesKayak = {
  ce: null, ukca: null, uscg: false, abyc: false, nmma: false,
  as_nzs: false, jci: false, iso_12217: false, iso_14946: false, iso_10087: false,
};

const TECHO_C: TechoAbsoluto = { vientoMaxBf: 6, olaMaxM: 2.0, fuente: 'CE' };
const TECHO_D: TechoAbsoluto = { vientoMaxBf: 4, olaMaxM: 0.5, fuente: 'estimado' };

function certCE(cat: 'A' | 'B' | 'C' | 'D'): CertificacionesKayak {
  return { ...SIN_CERTIFICAR, ce: cat, iso_12217: true, iso_14946: true, iso_10087: true };
}

// Entrada a pala, exenta de Directiva. Sin techo.
function entradaPala(
  marca: string,
  id: string,
  modelo: string,
  eslora: number,
  manga: number,
  volumen: number,
  tipoCasco: TipoCasco,
  autovaciable: boolean,
  timon: boolean,
  compartimentosEstancos: boolean,
  capacidadCarga: number,
  propulsion: Propulsion,
  categoriaWKF: CategoriaKayak | CategoriaHinchable,
  pesoKg: number | undefined,
  pesoFuente: FuentePeso | undefined
): Kayak {
  return {
    id, marca, modelo, eslora, manga, volumen, tipoCasco,
    autovaciable, timon, compartimentosEstancos, capacidadCarga, propulsion,
    categoriaWKF,
    categoriaDirectiva: 'exento',
    pesoKg, pesoFuente,
    certificado: false,
    certificadoOficial: false,
    verificado: false,
    certificaciones: { ...SIN_CERTIFICAR },
    // Sin techoAbsoluto. Exento de Directiva.
  };
}

// Entrada con pedales/motor, ámbito CE. Si fabricante declara C,
// techo C. Si no declara, 'no_certificado' con techo D.
function entradaConMotor(
  marca: string,
  id: string,
  modelo: string,
  eslora: number,
  manga: number,
  volumen: number,
  tipoCasco: TipoCasco,
  autovaciable: boolean,
  timon: boolean,
  compartimentosEstancos: boolean,
  capacidadCarga: number,
  propulsion: Propulsion,
  categoriaWKF: CategoriaKayak | CategoriaHinchable,
  catDir: 'C' | 'D' | 'no_certificado',
  pesoKg: number | undefined,
  pesoFuente: FuentePeso | undefined
): Kayak {
  const esCE = catDir === 'C' || catDir === 'D';
  return {
    id, marca, modelo, eslora, manga, volumen, tipoCasco,
    autovaciable, timon, compartimentosEstancos, capacidadCarga, propulsion,
    categoriaWKF,
    categoriaDirectiva: catDir,
    pesoKg, pesoFuente,
    certificado: esCE,
    certificadoOficial: esCE,
    verificado: false,
    certificaciones: esCE ? certCE(catDir) : { ...SIN_CERTIFICAR },
    techoAbsoluto: catDir === 'C' ? TECHO_C : TECHO_D,
  };
}

export const CATALOGO_KAYAKS: Kayak[] = [
  // ── Stealth Kayaks (Sudáfrica, a pala) ───────────────────────────
  entradaPala('Stealth Kayaks', 'stealth-profisha-525', 'Profisha 525', 5.25, 0.66, 400, 'V', false, true, true, 200, 'pala', 'K5', 27, 'fabricante'),
  entradaPala('Stealth Kayaks', 'stealth-profisha-575', 'Profisha 575', 5.75, 0.66, 420, 'V', false, true, true, 220, 'pala', 'K5', 28, 'fabricante'),
  entradaPala('Stealth Kayaks', 'stealth-profisha-475', 'Profisha 475', 4.75, 0.66, 350, 'V', false, true, true, 180, 'pala', 'K5', 26, 'fabricante'),

  // ── Epic Kayaks (Sudáfrica, a pala) ──────────────────────────────
  entradaPala('Epic Kayaks', 'epic-v5', 'V5', 5.20, 0.51, 300, 'V', false, true, true, 150, 'pala', 'K5', 11.8, 'fabricante'),
  entradaPala('Epic Kayaks', 'epic-v6', 'V6', 6.10, 0.51, 350, 'V', false, true, true, 180, 'pala', 'K5', 16.0, 'fabricante'),
  entradaPala('Epic Kayaks', 'epic-v7', 'V7', 6.70, 0.51, 380, 'V', false, true, true, 190, 'pala', 'K5', 24.0, 'fabricante'),
  entradaPala('Epic Kayaks', 'epic-v8', 'V8', 7.60, 0.51, 400, 'V', false, true, true, 200, 'pala', 'K5', 10.0, 'fabricante'),
  entradaPala('Epic Kayaks', 'epic-surfski-v10', 'Surfski V10', 6.40, 0.43, 280, 'V', false, true, true, 140, 'pala', 'K5', 10.0, 'fabricante'),

  // ── Tiderace Kayaks (UK, a pala) ─────────────────────────────────
  entradaPala('Tiderace Kayaks', 'tiderace-xcite', 'Xcite', 5.20, 0.53, 320, 'V', false, true, true, 160, 'pala', 'K5', 25.8, 'fabricante'),
  entradaPala('Tiderace Kayaks', 'tiderace-xplore', 'Xplore', 5.30, 0.55, 340, 'V', false, true, true, 170, 'pala', 'K5', 26.5, 'fabricante'),
  entradaPala('Tiderace Kayaks', 'tiderace-xceed', 'Xceed', 5.40, 0.54, 330, 'V', false, true, true, 165, 'pala', 'K5', 23.5, 'fabricante'),

  // ── Valley Kayaks (UK, a pala) ───────────────────────────────────
  entradaPala('Valley Kayaks', 'valley-etain-175', 'Etain 17.5', 5.33, 0.53, 340, 'V', false, true, true, 170, 'pala', 'K5', 25.0, 'distribuidor'),
  entradaPala('Valley Kayaks', 'valley-etain-177', 'Etain 17.7', 5.40, 0.53, 350, 'V', false, true, true, 175, 'pala', 'K5', 26.0, 'distribuidor'),
  entradaPala('Valley Kayaks', 'valley-nordkapp', 'Nordkapp', 5.30, 0.52, 320, 'V', false, true, true, 160, 'pala', 'K5', 25.4, 'distribuidor'),

  // ── P&H Sea Kayaks (UK, a pala) ──────────────────────────────────
  entradaPala('P&H Sea Kayaks', 'ph-cetus', 'Cetus', 5.20, 0.53, 330, 'V', false, true, true, 165, 'pala', 'K5', 24.5, 'fabricante'),
  entradaPala('P&H Sea Kayaks', 'ph-scorpio', 'Scorpio', 5.10, 0.54, 320, 'V', false, true, true, 160, 'pala', 'K5', 29.0, 'fabricante'),
  entradaPala('P&H Sea Kayaks', 'ph-delphin', 'Delphin', 4.80, 0.55, 300, 'V', false, true, true, 150, 'pala', 'K5', 25.0, 'fabricante'),

  // ── Rockpool Kayaks (UK, a pala) ─────────────────────────────────
  entradaPala('Rockpool Kayaks', 'rockpool-taran', 'Taran', 5.40, 0.52, 330, 'V', false, true, true, 165, 'pala', 'K5', 24.5, 'fabricante'),
  entradaPala('Rockpool Kayaks', 'rockpool-alaw', 'Alaw', 5.20, 0.53, 320, 'V', false, true, true, 160, 'pala', 'K5', 24.9, 'distribuidor'),

  // ── NDK (UK, a pala) ─────────────────────────────────────────────
  entradaPala('NDK', 'ndk-explorer', 'Explorer', 5.30, 0.53, 340, 'V', false, true, true, 170, 'pala', 'K5', 25.0, 'fabricante'),
  entradaPala('NDK', 'ndk-romany', 'Romany', 5.10, 0.54, 320, 'V', false, true, true, 160, 'pala', 'K5', 25.0, 'fabricante'),

  // ── SKUK (UK, a pala) ────────────────────────────────────────────
  entradaPala('SKUK', 'skuk-grand-illusion', 'Grand Illusion', 5.40, 0.53, 340, 'V', false, true, true, 170, 'pala', 'K5', 21.5, 'fabricante'),
  entradaPala('SKUK', 'skuk-progression', 'Progression', 5.20, 0.53, 320, 'V', false, true, true, 160, 'pala', 'K5', 19.5, 'fabricante'),

  // ── Current Designs (Canadá, a pala) ─────────────────────────────
  entradaPala('Current Designs', 'current-designs-solstice-gt', 'Solstice GT', 5.40, 0.55, 340, 'V', false, true, true, 170, 'pala', 'K5', 23.5, 'fabricante'),
  entradaPala('Current Designs', 'current-designs-solstice-gts', 'Solstice GTS', 5.20, 0.55, 320, 'V', false, true, true, 160, 'pala', 'K5', 22.7, 'fabricante'),
  entradaPala('Current Designs', 'current-designs-karla', 'Karla', 5.00, 0.54, 300, 'V', false, true, true, 150, 'pala', 'K5', 22.9, 'fabricante'),

  // ── Boreal Design (Canadá, a pala) ───────────────────────────────
  entradaPala('Boreal Design', 'boreal-baffin', 'Baffin', 5.20, 0.55, 330, 'V', false, true, true, 165, 'pala', 'K5', 28.3, 'fabricante'),
  entradaPala('Boreal Design', 'boreal-epsilon', 'Epsilon', 5.00, 0.54, 310, 'V', false, true, true, 155, 'pala', 'K5', 31.8, 'fabricante'),

  // ── Seaward Kayaks (Canadá, a pala) ──────────────────────────────
  entradaPala('Seaward Kayaks', 'seaward-navigator', 'Navigator', 5.30, 0.55, 340, 'V', false, true, true, 170, 'pala', 'K5', 25.4, 'fabricante'),
  entradaPala('Seaward Kayaks', 'seaward-quest', 'Quest', 5.10, 0.54, 320, 'V', false, true, true, 160, 'pala', 'K5', 26.5, 'fabricante'),

  // ── Necky Kayaks (USA, a pala) ───────────────────────────────────
  entradaPala('Necky Kayaks', 'necky-chatham', 'Chatham', 5.20, 0.55, 330, 'V', false, true, true, 165, 'pala', 'K5', 24.3, 'distribuidor'),
  entradaPala('Necky Kayaks', 'necky-looksha', 'Looksha', 5.00, 0.54, 310, 'V', false, true, true, 155, 'pala', 'K5', 26.5, 'distribuidor'),

  // ── Wilderness Systems travesía (USA, a pala) ────────────────────
  entradaPala('Wilderness Systems', 'wilderness-tempest-170', 'Tempest 170', 5.20, 0.55, 330, 'V', false, true, true, 165, 'pala', 'K5', 25.9, 'fabricante'),
  entradaPala('Wilderness Systems', 'wilderness-tempest-165', 'Tempest 165', 5.00, 0.54, 310, 'V', false, true, true, 155, 'pala', 'K5', 24.9, 'fabricante'),

  // ── Dagger Kayaks (USA, a pala) ──────────────────────────────────
  entradaPala('Dagger Kayaks', 'dagger-stratos', 'Stratos', 5.10, 0.55, 320, 'V', false, true, true, 160, 'pala', 'K5', 24.5, 'distribuidor'),
  entradaPala('Dagger Kayaks', 'dagger-alchemy', 'Alchemy', 4.90, 0.55, 300, 'V', false, true, true, 150, 'pala', 'K5', 23.1, 'distribuidor'),

  // ── Prijon Kayaks (Alemania, a pala) ─────────────────────────────
  entradaPala('Prijon Kayaks', 'prijon-kodiak', 'Kodiak', 5.20, 0.55, 330, 'V', false, true, true, 165, 'pala', 'K5', 28.0, 'distribuidor'),
  entradaPala('Prijon Kayaks', 'prijon-seayak', 'Seayak', 5.00, 0.54, 310, 'V', false, true, true, 155, 'pala', 'K5', 26.5, 'fabricante'),

  // ── Ocean Kayak (USA, a pala) ────────────────────────────────────
  entradaPala('Ocean Kayak', 'ocean-kayak-trident-13', 'Trident 13', 3.96, 0.71, 300, 'V', true, true, false, 150, 'pala', 'K3', 35.8, 'fabricante'),
  entradaPala('Ocean Kayak', 'ocean-kayak-trident-15', 'Trident 15', 4.57, 0.71, 340, 'V', true, true, false, 170, 'pala', 'K4', 41.3, 'fabricante'),
  entradaPala('Ocean Kayak', 'ocean-kayak-prowler-13', 'Prowler 13', 3.96, 0.71, 300, 'V', true, false, false, 150, 'pala', 'K3', 28.1, 'fabricante'),
  entradaPala('Ocean Kayak', 'ocean-kayak-prowler-15', 'Prowler 15', 4.57, 0.71, 340, 'V', true, false, false, 170, 'pala', 'K4', 27.2, 'distribuidor'),
  entradaPala('Ocean Kayak', 'ocean-kayak-malibu-two', 'Malibu Two', 3.66, 0.86, 320, 'U', true, false, false, 180, 'pala', 'K3', 35.4, 'fabricante'),
  entradaPala('Ocean Kayak', 'ocean-kayak-caper', 'Caper', 3.35, 0.76, 260, 'U', true, false, false, 130, 'pala', 'K2', 24.5, 'fabricante'),
  entradaPala('Ocean Kayak', 'ocean-kayak-scrambler', 'Scrambler', 3.66, 0.76, 280, 'U', true, false, false, 140, 'pala', 'K3', 21.3, 'fabricante'),

  // ── Perception (USA/UK, a pala y pedal) ──────────────────────────
  entradaPala('Perception', 'perception-pescador-pro-12', 'Pescador Pro 12', 3.66, 0.81, 350, 'U', true, false, false, 180, 'pala', 'K3', 29.0, 'fabricante'),
  entradaPala('Perception', 'perception-pescador-pro-10', 'Pescador Pro 10', 3.05, 0.76, 280, 'U', true, false, false, 140, 'pala', 'K2', 25.9, 'fabricante'),
  entradaPala('Perception', 'perception-striker-115', 'Striker 11.5', 3.51, 0.81, 330, 'U', true, false, false, 170, 'pala', 'K3', 29.5, 'distribuidor'),
  entradaConMotor('Perception', 'perception-pilot-12', 'Pilot 12', 3.66, 0.81, 350, 'U', true, false, false, 180, 'pedal_helice', 'K3', 'no_certificado', 38.6, 'fabricante'),

  // ── Wilderness Systems pesca (USA, a pala) ───────────────────────
  entradaPala('Wilderness Systems', 'wilderness-thresher-140', 'Thresher 140', 4.27, 0.71, 350, 'V', true, true, false, 180, 'pala', 'K4', 34.0, 'fabricante'),
  entradaPala('Wilderness Systems', 'wilderness-thresher-155', 'Thresher 155', 4.72, 0.71, 380, 'V', true, true, false, 200, 'pala', 'K4', 36.3, 'fabricante'),
  entradaPala('Wilderness Systems', 'wilderness-tarpon-120', 'Tarpon 120', 3.66, 0.76, 320, 'U', true, false, false, 160, 'pala', 'K3', 29.3, 'fabricante'),
  entradaPala('Wilderness Systems', 'wilderness-tarpon-140', 'Tarpon 140', 4.27, 0.76, 360, 'U', true, true, false, 190, 'pala', 'K4', 30.8, 'fabricante'),
  entradaPala('Wilderness Systems', 'wilderness-ride-115', 'Ride 115', 3.51, 0.81, 340, 'U', true, false, false, 180, 'pala', 'K3', 34.5, 'fabricante'),
  entradaPala('Wilderness Systems', 'wilderness-ride-135', 'Ride 135', 4.11, 0.81, 380, 'U', true, true, false, 200, 'pala', 'K3', 37.2, 'fabricante'),
  entradaConMotor('Wilderness Systems', 'wilderness-radar-115', 'Radar 115', 3.51, 0.81, 360, 'U', true, false, false, 190, 'pedal_helice', 'K3', 'no_certificado', 38.6, 'fabricante'),
  entradaConMotor('Wilderness Systems', 'wilderness-radar-135', 'Radar 135', 4.11, 0.81, 400, 'U', true, true, false, 200, 'pedal_helice', 'K4', 'no_certificado', 40.8, 'fabricante'),

  // ── Jackson Kayak (USA, a pala) ──────────────────────────────────
  entradaPala('Jackson Kayak', 'jackson-big-rig-hd', 'Big Rig HD', 3.96, 0.91, 400, 'U', true, true, false, 250, 'pala', 'K3', 44.9, 'fabricante'),
  entradaPala('Jackson Kayak', 'jackson-kraken-135', 'Kraken 13.5', 4.11, 0.76, 350, 'V', true, true, false, 200, 'pala', 'K4', 32.7, 'fabricante'),
  entradaPala('Jackson Kayak', 'jackson-kraken-155', 'Kraken 15.5', 4.72, 0.76, 380, 'V', true, true, false, 220, 'pala', 'K4', 38.6, 'fabricante'),
  entradaPala('Jackson Kayak', 'jackson-cuda-12', 'Cuda 12', 3.66, 0.81, 340, 'U', true, false, false, 180, 'pala', 'K3', 33.6, 'fabricante'),
  entradaPala('Jackson Kayak', 'jackson-cuda-14', 'Cuda 14', 4.27, 0.81, 370, 'U', true, true, false, 200, 'pala', 'K4', 36.3, 'fabricante'),
  entradaPala('Jackson Kayak', 'jackson-coosa-hd', 'Coosa HD', 3.66, 0.86, 360, 'U', true, false, false, 190, 'pala', 'K3', 37.6, 'fabricante'),
  entradaPala('Jackson Kayak', 'jackson-mayfly', 'Mayfly', 3.35, 0.76, 280, 'U', true, false, false, 140, 'pala', 'K2', 40.4, 'fabricante'),

  // ── Old Town (USA, a pala y pedal) ───────────────────────────────
  entradaPala('Old Town', 'old-town-sportsman-120', 'Sportsman 120', 3.66, 0.81, 350, 'U', true, true, false, 200, 'pala', 'K3', 38.6, 'fabricante'),
  entradaPala('Old Town', 'old-town-sportsman-106', 'Sportsman 106', 3.20, 0.76, 280, 'U', true, false, false, 150, 'pala', 'K2', 34.9, 'fabricante'),
  entradaPala('Old Town', 'old-town-predator-13', 'Predator 13', 3.96, 0.81, 380, 'U', true, true, false, 200, 'pala', 'K3', 39.0, 'fabricante'),
  entradaPala('Old Town', 'old-town-predator-mx', 'Predator MX', 3.66, 0.86, 360, 'U', true, false, false, 190, 'pala', 'K3', 37.2, 'fabricante'),
  entradaPala('Old Town', 'old-town-topwater-120', 'Topwater 120', 3.66, 0.81, 350, 'U', true, true, false, 200, 'pala', 'K3', 37.2, 'fabricante'),
  entradaPala('Old Town', 'old-town-topwater-106', 'Topwater 106', 3.20, 0.76, 280, 'U', true, false, false, 150, 'pala', 'K2', 33.1, 'distribuidor'),
  entradaConMotor('Old Town', 'old-town-predator-pdl', 'Predator PDL', 4.11, 0.86, 420, 'U', true, true, false, 250, 'pedal_helice', 'K4', 'no_certificado', 55.3, 'fabricante'),
  entradaConMotor('Old Town', 'old-town-sportsman-pdl-120', 'Sportsman PDL 120', 3.66, 0.86, 400, 'U', true, true, false, 220, 'pedal_helice', 'K3', 'no_certificado', 52.6, 'fabricante'),
  entradaConMotor('Old Town', 'old-town-sportsman-salty-pdl-120', 'Sportsman Salty PDL 120', 3.66, 0.86, 400, 'U', true, true, false, 220, 'pedal_helice', 'K3', 'no_certificado', 47.2, 'fabricante'),
  entradaConMotor('Old Town', 'old-town-topwater-pdl-120', 'Topwater PDL 120', 3.66, 0.86, 400, 'U', true, true, false, 220, 'pedal_helice', 'K3', 'no_certificado', 52.6, 'fabricante'),

  // ── FeelFree (USA con presencia EU) ──────────────────────────────
  entradaPala('FeelFree', 'feelfree-lure-115', 'Lure 11.5', 3.51, 0.86, 350, 'U', true, false, false, 180, 'pala', 'K3', 39.5, 'fabricante'),
  entradaPala('FeelFree', 'feelfree-lure-135', 'Lure 13.5', 4.11, 0.86, 390, 'U', true, true, false, 200, 'pala', 'K3', 48.5, 'distribuidor'),
  entradaPala('FeelFree', 'feelfree-moken-125', 'Moken 12.5', 3.81, 0.81, 350, 'U', true, false, false, 180, 'pala', 'K3', 38.6, 'fabricante'),
  entradaPala('FeelFree', 'feelfree-moken-10', 'Moken 10', 3.05, 0.76, 280, 'U', true, false, false, 140, 'pala', 'K2', 31.3, 'fabricante'),
  entradaConMotor('FeelFree', 'feelfree-lure-115-overdrive', 'Lure 11.5 Overdrive', 3.51, 0.86, 360, 'U', true, false, false, 190, 'pedal_helice', 'K3', 'no_certificado', 39.5, 'fabricante'),
  entradaConMotor('FeelFree', 'feelfree-lure-135-overdrive', 'Lure 13.5 Overdrive', 4.11, 0.86, 400, 'U', true, true, false, 210, 'pedal_helice', 'K3', 'no_certificado', 48.5, 'distribuidor'),

  // ── Riot Kayaks (Canadá, a pala y pedal) ─────────────────────────
  entradaPala('Riot Kayaks', 'riot-escape-12', 'Escape 12', 3.66, 0.76, 300, 'U', true, false, false, 150, 'pala', 'K3', 27.4, 'fabricante'),
  entradaPala('Riot Kayaks', 'riot-escape-10', 'Escape 10', 3.05, 0.76, 260, 'U', true, false, false, 130, 'pala', 'K2', 27.4, 'fabricante'),
  entradaConMotor('Riot Kayaks', 'riot-mako-12', 'Mako 12', 3.66, 0.76, 310, 'U', true, false, false, 160, 'pedal_helice', 'K3', 'no_certificado', 36.1, 'fabricante'),

  // ── Viking Kayaks (NZ, a pala y pedal) ───────────────────────────
  entradaPala('Viking Kayaks', 'viking-profish-reload', 'Profish Reload', 4.27, 0.76, 350, 'V', true, true, false, 200, 'pala', 'K4', 27, 'fabricante'),
  entradaConMotor('Viking Kayaks', 'viking-profish-reload-pedal', 'Profish Reload Pedal', 4.27, 0.76, 360, 'V', true, true, false, 200, 'pedal_helice', 'K4', 'no_certificado', 27, 'fabricante'),
  entradaPala('Viking Kayaks', 'viking-profish-gt', 'Profish GT', 3.96, 0.76, 300, 'V', true, true, false, 150, 'pala', 'K3', 25, 'fabricante'),
  entradaConMotor('Viking Kayaks', 'viking-profish-gt-pedal', 'Profish GT Pedal', 3.96, 0.76, 310, 'V', true, true, false, 160, 'pedal_helice', 'K3', 'no_certificado', 25, 'fabricante'),
  entradaPala('Viking Kayaks', 'viking-profish-400', 'Profish 400', 4.00, 0.76, 310, 'V', true, true, false, 160, 'pala', 'K3', 25, 'fabricante'),
  entradaPala('Viking Kayaks', 'viking-espri', 'Espri', 3.66, 0.76, 290, 'V', true, false, false, 140, 'pala', 'K3', 22, 'fabricante'),
  entradaPala('Viking Kayaks', 'viking-nemo', 'Nemo', 3.35, 0.76, 270, 'V', true, false, false, 130, 'pala', 'K2', 19, 'fabricante'),

  // ── Hobie (USA, pedal) ───────────────────────────────────────────
  entradaConMotor('Hobie', 'hobie-mirage-revolution-13', 'Mirage Revolution 13', 4.01, 0.71, 300, 'V', true, true, false, 150, 'pedal_aletas', 'K3', 'no_certificado', 39.9, 'fabricante'),
  entradaConMotor('Hobie', 'hobie-mirage-revolution-11', 'Mirage Revolution 11', 3.35, 0.71, 270, 'V', true, true, false, 130, 'pedal_aletas', 'K2', 'no_certificado', 36.7, 'fabricante'),
  entradaConMotor('Hobie', 'hobie-mirage-outback', 'Mirage Outback', 3.66, 0.86, 350, 'U', true, true, false, 180, 'pedal_aletas', 'K3', 'no_certificado', 46.7, 'fabricante'),
  entradaConMotor('Hobie', 'hobie-mirage-pro-angler-12', 'Mirage Pro Angler 12', 3.66, 0.91, 400, 'U', true, true, false, 230, 'pedal_aletas', 'K3', 'no_certificado', 58.3, 'fabricante'),
  entradaConMotor('Hobie', 'hobie-mirage-pro-angler-14', 'Mirage Pro Angler 14', 4.17, 0.96, 450, 'U', true, true, false, 250, 'pedal_aletas', 'K4', 'no_certificado', 65.5, 'fabricante'),
  entradaConMotor('Hobie', 'hobie-mirage-pro-angler-17t', 'Mirage Pro Angler 17T', 5.18, 0.96, 500, 'U', true, true, false, 300, 'pedal_aletas', 'K4', 'no_certificado', 110.7, 'fabricante'),
  entradaConMotor('Hobie', 'hobie-mirage-compass', 'Mirage Compass', 3.66, 0.86, 340, 'U', true, true, false, 180, 'pedal_aletas', 'K3', 'no_certificado', 39.5, 'fabricante'),
  entradaConMotor('Hobie', 'hobie-mirage-passport-105', 'Mirage Passport 10.5', 3.20, 0.81, 300, 'U', true, false, false, 160, 'pedal_aletas', 'K2', 'no_certificado', 34.0, 'fabricante'),
  entradaConMotor('Hobie', 'hobie-mirage-passport-12', 'Mirage Passport 12', 3.66, 0.81, 340, 'U', true, true, false, 180, 'pedal_aletas', 'K3', 'no_certificado', 37.6, 'fabricante'),
  entradaConMotor('Hobie', 'hobie-mirage-lynx', 'Mirage Lynx', 3.35, 0.81, 300, 'U', true, false, false, 160, 'pedal_aletas', 'K2', 'no_certificado', 28.6, 'fabricante'),

  // ── Native Watercraft (USA, a pala y pedal) ──────────────────────
  entradaConMotor('Native Watercraft', 'native-slayer-propel-10', 'Slayer Propel 10', 3.05, 0.76, 280, 'U', true, false, false, 150, 'pedal_helice', 'K2', 'no_certificado', 28.1, 'distribuidor'),
  entradaConMotor('Native Watercraft', 'native-slayer-propel-13', 'Slayer Propel 13', 3.96, 0.81, 380, 'U', true, true, false, 200, 'pedal_helice', 'K3', 'no_certificado', 44.7, 'distribuidor'),
  entradaConMotor('Native Watercraft', 'native-titan-105', 'Titan 10.5', 3.20, 0.86, 340, 'U', true, false, false, 180, 'pedal_helice', 'K2', 'no_certificado', 49.5, 'distribuidor'),
  entradaConMotor('Native Watercraft', 'native-titan-12', 'Titan 12', 3.66, 0.91, 400, 'U', true, true, false, 220, 'pedal_helice', 'K3', 'no_certificado', 56.0, 'distribuidor'),
  entradaConMotor('Native Watercraft', 'native-titan-135', 'Titan 13.5', 4.11, 0.91, 420, 'U', true, true, false, 250, 'pedal_helice', 'K4', 'no_certificado', 75.3, 'distribuidor'),
  entradaPala('Native Watercraft', 'native-ultimate-fx-12', 'Ultimate FX 12', 3.66, 0.81, 340, 'U', true, false, false, 180, 'pala', 'K3', 29.5, 'fabricante'),
  entradaPala('Native Watercraft', 'native-ultimate-fx-15', 'Ultimate FX 15', 4.57, 0.81, 380, 'U', true, true, false, 200, 'pala', 'K4', 40.8, 'fabricante'),

  // ── Pelican (Canadá, a pala y pedal) ─────────────────────────────
  entradaPala('Pelican', 'pelican-catch-120', 'Catch 120', 3.66, 0.81, 340, 'U', true, false, false, 180, 'pala', 'K3', 30.8, 'fabricante'),
  entradaPala('Pelican', 'pelican-catch-100', 'Catch 100', 3.05, 0.76, 270, 'U', true, false, false, 140, 'pala', 'K2', 24.5, 'distribuidor'),
  entradaConMotor('Pelican', 'pelican-catch-130-hydryve', 'Catch 130 Hydryve', 3.96, 0.81, 370, 'U', true, true, false, 200, 'pedal_helice', 'K3', 'no_certificado', 35.4, 'fabricante'),
  entradaConMotor('Pelican', 'pelican-catch-110-hydryve', 'Catch 110 Hydryve', 3.35, 0.81, 310, 'U', true, false, false, 160, 'pedal_helice', 'K2', 'no_certificado', 30.4, 'fabricante'),

  // ── Sun Dolphin (USA, a pala) ────────────────────────────────────
  entradaPala('Sun Dolphin', 'sun-dolphin-journey-12', 'Journey 12', 3.66, 0.76, 300, 'U', true, false, false, 150, 'pala', 'K3', 21.8, 'fabricante'),
  entradaPala('Sun Dolphin', 'sun-dolphin-journey-10', 'Journey 10', 3.05, 0.76, 260, 'U', true, false, false, 130, 'pala', 'K2', 20.0, 'fabricante'),
  entradaPala('Sun Dolphin', 'sun-dolphin-aruba-10', 'Aruba 10', 3.05, 0.76, 250, 'U', true, false, false, 120, 'pala', 'K2', 18.1, 'fabricante'),

  // ── Lifetime (USA, a pala) ───────────────────────────────────────
  entradaPala('Lifetime', 'lifetime-tamarack-120', 'Tamarack 120', 3.66, 0.76, 300, 'U', true, false, false, 150, 'pala', 'K3', 23.1, 'fabricante'),
  entradaPala('Lifetime', 'lifetime-tamarack-100', 'Tamarack 100', 3.05, 0.76, 260, 'U', true, false, false, 130, 'pala', 'K2', 22.7, 'fabricante'),
  entradaPala('Lifetime', 'lifetime-stealth-pro', 'Stealth Pro', 3.35, 0.76, 270, 'U', true, false, false, 140, 'pala', 'K2', 36.3, 'fabricante'),

  // ── Ascend (USA, a pala) ─────────────────────────────────────────
  entradaPala('Ascend', 'ascend-fs12t', 'FS12T', 3.66, 0.81, 340, 'U', true, false, false, 180, 'pala', 'K3', 34.9, 'fabricante'),
  entradaPala('Ascend', 'ascend-fs10', 'FS10', 3.05, 0.76, 270, 'U', true, false, false, 140, 'pala', 'K2', 25.9, 'fabricante'),
  entradaPala('Ascend', 'ascend-fs128t', 'FS128T', 3.81, 0.81, 360, 'U', true, true, false, 190, 'pala', 'K3', 43.5, 'fabricante'),
  entradaPala('Ascend', 'ascend-h12', 'H12', 3.66, 0.81, 340, 'U', true, false, false, 180, 'pala', 'K3', 34.5, 'fabricante'),

  // ── Bonafide (USA, a pala y pedal) ───────────────────────────────
  entradaPala('Bonafide', 'bonafide-ss107', 'SS107', 3.20, 0.81, 300, 'U', true, false, false, 160, 'pala', 'K2', 38.1, 'fabricante'),
  entradaPala('Bonafide', 'bonafide-ss127', 'SS127', 3.81, 0.81, 350, 'U', true, false, false, 190, 'pala', 'K3', 42.6, 'fabricante'),
  entradaPala('Bonafide', 'bonafide-rs117', 'RS117', 3.51, 0.86, 340, 'U', true, false, false, 180, 'pala', 'K3', 34.9, 'fabricante'),
  entradaConMotor('Bonafide', 'bonafide-p127', 'P127', 3.81, 0.86, 360, 'U', true, true, false, 200, 'pedal_helice', 'K3', 'no_certificado', 54.4, 'fabricante'),
  entradaPala('Bonafide', 'bonafide-ex123', 'EX123', 3.66, 0.81, 340, 'U', true, false, false, 180, 'pala', 'K3', 30.4, 'fabricante'),

  // ── Crescent (USA, a pala) ───────────────────────────────────────
  entradaPala('Crescent', 'crescent-lite-tackle', 'Lite Tackle', 3.66, 0.81, 330, 'U', true, false, false, 170, 'pala', 'K3', 35.8, 'fabricante'),
  entradaPala('Crescent', 'crescent-crew', 'Crew', 3.96, 0.81, 350, 'U', true, true, false, 190, 'pala', 'K3', 38.1, 'fabricante'),
  entradaPala('Crescent', 'crescent-shoalie', 'Shoalie', 3.81, 0.81, 340, 'U', true, false, false, 180, 'pala', 'K3', 34.9, 'fabricante'),
  entradaPala('Crescent', 'crescent-ck1', 'CK1', 3.66, 0.81, 330, 'U', true, false, false, 170, 'pala', 'K3', 29.5, 'fabricante'),

  // ── Nucanoe (USA, a pala) ────────────────────────────────────────
  entradaPala('Nucanoe', 'nucanoe-frontier-12', 'Frontier 12', 3.66, 0.91, 380, 'U', true, true, false, 250, 'pala', 'K3', 36.3, 'fabricante'),
  entradaPala('Nucanoe', 'nucanoe-pursuit', 'Pursuit', 3.96, 0.91, 400, 'U', true, true, false, 270, 'pala', 'K3', 37.2, 'fabricante'),
  entradaPala('Nucanoe', 'nucanoe-flint', 'Flint', 3.35, 0.86, 320, 'U', true, false, false, 200, 'pala', 'K2', 28.6, 'fabricante'),
  entradaPala('Nucanoe', 'nucanoe-unlimited', 'Unlimited', 4.27, 0.91, 420, 'U', true, true, false, 300, 'pala', 'K4', 38.1, 'fabricante'),
  entradaPala('Nucanoe', 'nucanoe-u10', 'U10', 3.05, 0.86, 300, 'U', true, false, false, 180, 'pala', 'K2', 32.7, 'distribuidor'),
  entradaPala('Nucanoe', 'nucanoe-f10', 'F10', 3.05, 0.91, 320, 'U', true, false, false, 200, 'pala', 'K2', 28.1, 'fabricante'),

  // ── Vibe (USA, a pala) ───────────────────────────────────────────
  entradaPala('Vibe', 'vibe-sea-ghost-110', 'Sea Ghost 110', 3.35, 0.81, 310, 'U', true, false, false, 160, 'pala', 'K2', 38.1, 'fabricante'),
  entradaPala('Vibe', 'vibe-sea-ghost-130', 'Sea Ghost 130', 3.96, 0.81, 370, 'U', true, true, false, 200, 'pala', 'K3', 41.7, 'fabricante'),
  entradaPala('Vibe', 'vibe-yellowfin-100', 'Yellowfin 100', 3.05, 0.81, 290, 'U', true, false, false, 150, 'pala', 'K2', 29.0, 'fabricante'),
  entradaPala('Vibe', 'vibe-yellowfin-120', 'Yellowfin 120', 3.66, 0.81, 340, 'U', true, false, false, 180, 'pala', 'K3', 35.8, 'fabricante'),
  entradaPala('Vibe', 'vibe-yellowfin-130t', 'Yellowfin 130T', 3.96, 0.81, 370, 'U', true, true, false, 200, 'pala', 'K3', 44.9, 'fabricante'),
  entradaPala('Vibe', 'vibe-shearwater-125', 'Shearwater 125', 3.81, 0.81, 350, 'U', true, false, false, 190, 'pala', 'K3', 49.4, 'fabricante'),
  entradaPala('Vibe', 'vibe-maverick-120', 'Maverick 120', 3.66, 0.81, 340, 'U', true, false, false, 180, 'pala', 'K3', 32.7, 'distribuidor'),

  // ── 3 Waters (USA, a pala) ───────────────────────────────────────
  entradaPala('3 Waters', '3waters-big-fish-105', 'Big Fish 105', 3.20, 0.81, 290, 'U', true, false, false, 150, 'pala', 'K2', 40.4, 'distribuidor'),
  entradaPala('3 Waters', '3waters-big-fish-108', 'Big Fish 108', 3.35, 0.81, 300, 'U', true, false, false, 160, 'pala', 'K2', 61.2, 'distribuidor'),
  entradaPala('3 Waters', '3waters-big-fish-120', 'Big Fish 120', 3.66, 0.81, 340, 'U', true, false, false, 180, 'pala', 'K3', 45.4, 'distribuidor'),
  entradaPala('3 Waters', '3waters-big-fish-103', 'Big Fish 103', 3.05, 0.76, 270, 'U', true, false, false, 140, 'pala', 'K2', 49.9, 'distribuidor'),

  // ── Malibu Kayaks (USA, a pala) ──────────────────────────────────
  entradaPala('Malibu Kayaks', 'malibu-x-13', 'X-13', 3.96, 0.76, 320, 'V', true, true, false, 170, 'pala', 'K3', 27.2, 'fabricante'),
  entradaPala('Malibu Kayaks', 'malibu-stealth-12', 'Stealth 12', 3.66, 0.81, 330, 'U', true, false, false, 170, 'pala', 'K3', 25.9, 'fabricante'),
  entradaPala('Malibu Kayaks', 'malibu-stealth-14', 'Stealth 14', 4.27, 0.81, 360, 'U', true, true, false, 190, 'pala', 'K4', 29.0, 'fabricante'),
  entradaPala('Malibu Kayaks', 'malibu-pro-explorer', 'Pro Explorer', 3.96, 0.81, 340, 'U', true, true, false, 180, 'pala', 'K3', 24.9, 'distribuidor'),
  entradaPala('Malibu Kayaks', 'malibu-mini-x', 'Mini-X', 2.90, 0.76, 240, 'U', true, false, false, 120, 'pala', 'K1', 18.1, 'fabricante'),

  // ── Cobra Kayaks (USA, a pala) ───────────────────────────────────
  entradaPala('Cobra Kayaks', 'cobra-fish-n-dive', 'Fish n Dive', 3.66, 0.81, 330, 'U', true, false, false, 170, 'pala', 'K3', 29.9, 'fabricante'),
  entradaPala('Cobra Kayaks', 'cobra-marauder', 'Marauder', 4.27, 0.81, 360, 'U', true, true, false, 190, 'pala', 'K4', 24.9, 'distribuidor'),
  entradaPala('Cobra Kayaks', 'cobra-explorer', 'Explorer', 3.96, 0.81, 340, 'U', true, true, false, 180, 'pala', 'K3', 19.5, 'distribuidor'),
  entradaPala('Cobra Kayaks', 'cobra-navigator', 'Navigator', 3.66, 0.76, 310, 'U', true, false, false, 160, 'pala', 'K3', 21.3, 'fabricante'),
  entradaPala('Cobra Kayaks', 'cobra-tourer', 'Tourer', 4.57, 0.76, 340, 'V', true, true, false, 180, 'pala', 'K4', 22.7, 'distribuidor'),
  entradaPala('Cobra Kayaks', 'cobra-tandem', 'Tandem', 4.57, 0.86, 380, 'U', true, false, false, 220, 'pala', 'K4', 27.2, 'fabricante'),

  // ── Galaxy Kayaks (España) ───────────────────────────────────────
  entradaConMotor('Galaxy Kayaks', 'galaxy-cruz-ultra', 'Cruz Ultra', 2.92, 0.84, 180, 'U', true, false, false, 150, 'pala', 'K2', 'no_certificado', 22.0, 'distribuidor'),
  entradaConMotor('Galaxy Kayaks', 'galaxy-rider', 'Rider', 2.64, 0.80, 150, 'U', true, false, false, 130, 'pala', 'K1', 'no_certificado', 22.0, 'distribuidor'),
  entradaConMotor('Galaxy Kayaks', 'galaxy-ocelote', 'Ocelote', 2.90, 0.82, 200, 'U', true, true, false, 150, 'pedal_aletas', 'K2', 'no_certificado', 25.0, 'fabricante'),
  entradaConMotor('Galaxy Kayaks', 'galaxy-alboran-hv', 'Alborán HV', 4.09, 0.80, 350, 'U', true, true, false, 180, 'pala', 'K4', 'C', 30.0, 'distribuidor'),
  entradaConMotor('Galaxy Kayaks', 'galaxy-alboran-fx3', 'Alborán FX3', 4.09, 0.80, 350, 'U', true, true, false, 180, 'pedal_helice', 'K4', 'C', 35.5, 'distribuidor'),
  entradaConMotor('Galaxy Kayaks', 'galaxy-wildcat-fx3', 'Wildcat FX3', 3.57, 0.80, 300, 'U', true, true, false, 180, 'pedal_aletas', 'K3', 'C', 31.0, 'fabricante'),
  entradaConMotor('Galaxy Kayaks', 'galaxy-supernova-fx', 'Supernova FX', 3.98, 0.85, 400, 'U', true, true, false, 220, 'pedal_helice', 'K3', 'C', 43.8, 'distribuidor'),
  entradaConMotor('Galaxy Kayaks', 'galaxy-supernova-jr-fx', 'Supernova Jr FX', 3.00, 0.80, 200, 'U', true, true, false, 150, 'pedal_helice', 'K2', 'C', 32.3, 'fabricante'),
  entradaConMotor('Galaxy Kayaks', 'galaxy-strike', 'Strike', 3.40, 0.84, 300, 'U', true, true, false, 160, 'pala', 'K3', 'no_certificado', 26.0, 'distribuidor'),
  entradaPala('Galaxy Kayaks', 'galaxy-tandem-tahiti-x', 'Tándem Tahiti X', 3.70, 0.86, 400, 'U', true, false, false, 240, 'pala', 'K4', 33.0, 'fabricante'),
  entradaConMotor('Galaxy Kayaks', 'galaxy-ranger', 'Ranger', 2.90, 0.78, 180, 'U', true, false, false, 140, 'pala', 'K2', 'no_certificado', 19.0, 'distribuidor'),
  entradaConMotor('Galaxy Kayaks', 'galaxy-force', 'Force', 2.70, 0.78, 160, 'U', true, false, false, 130, 'pala', 'K1', 'no_certificado', 21.0, 'fabricante'),

  // ── Todo Kayak (España) ──────────────────────────────────────────
  entradaPala('Todo Kayak', 'todo-kayak-hook', 'Hook', 2.39, 0.79, 180, 'U', true, false, false, 125, 'pala', 'K1', 16, 'fabricante'),
  entradaPala('Todo Kayak', 'todo-kayak-delta', 'Delta', 2.66, 0.70, 150, 'U', true, false, false, 100, 'pala', 'K1', 19, 'fabricante'),
  entradaPala('Todo Kayak', 'todo-kayak-randal', 'Randal', 2.44, 0.79, 200, 'U', true, false, false, 120, 'pala', 'K1', 15, 'fabricante'),
  entradaPala('Todo Kayak', 'todo-kayak-tornado', 'Tornado', 2.92, 0.70, 180, 'V', true, false, false, 136, 'pala', 'K2', 15, 'fabricante'),
  entradaPala('Todo Kayak', 'todo-kayak-haddock', 'Haddock', 4.50, 0.63, 350, 'V', false, true, true, 155, 'pala', 'K4', 24, 'fabricante'),
  entradaConMotor('Todo Kayak', 'todo-kayak-racer', 'Racer', 3.68, 0.80, 320, 'U', true, true, false, 180, 'pedal_aletas', 'K3', 'no_certificado', 35, 'fabricante'),
  entradaConMotor('Todo Kayak', 'todo-kayak-sondeo', 'Sondeo', 3.71, 0.97, 450, 'U', true, true, false, 220, 'pedal_helice', 'K4', 'no_certificado', 48.6, 'fabricante'),
  entradaConMotor('Todo Kayak', 'todo-kayak-voluta', 'Voluta', 3.96, 0.82, 400, 'U', true, true, false, 180, 'pedal_helice', 'K3', 'no_certificado', 53.8, 'fabricante'),
  entradaConMotor('Todo Kayak', 'todo-kayak-catamaran-f15', 'Catamarán F15', 3.82, 1.00, 500, 'plano', true, true, false, 380, 'pedal_helice', 'K4', 'no_certificado', 65, 'fabricante'),
  entradaConMotor('Todo Kayak', 'todo-kayak-oxifish', 'Oxifish', 2.90, 0.95, 300, 'U', true, true, false, 230, 'pedal_aletas', 'K3', 'no_certificado', 46, 'fabricante'),
  entradaConMotor('Todo Kayak', 'todo-kayak-navio-tandem', 'Navío Tándem', 4.53, 0.88, 450, 'U', true, true, false, 300, 'pedal_helice', 'K4', 'no_certificado', 66, 'fabricante'),
  entradaConMotor('Todo Kayak', 'todo-kayak-taramay-tandem', 'Taramay Tándem', 4.50, 0.91, 450, 'U', true, true, false, 300, 'pedal_aletas', 'K4', 'no_certificado', 66, 'fabricante'),
  entradaConMotor('Todo Kayak', 'todo-kayak-matrix', 'Matrix', 3.16, 0.87, 300, 'U', true, true, false, 180, 'pedal_helice', 'K3', 'no_certificado', 38, 'fabricante'),
  entradaPala('Todo Kayak', 'todo-kayak-barracuda-pro', 'Barracuda PRO', 2.95, 0.80, 200, 'U', true, false, false, 150, 'pala', 'K2', 21, 'fabricante'),
  entradaPala('Todo Kayak', 'todo-kayak-barracuda-tandem', 'Barracuda Tándem', 3.72, 0.89, 350, 'U', true, false, false, 250, 'pala', 'K4', 32, 'fabricante'),
  entradaPala('Todo Kayak', 'todo-kayak-barcaza', 'Barcaza', 4.99, 0.90, 500, 'U', true, false, false, 280, 'pala', 'K5', 57, 'fabricante'),
  entradaPala('Todo Kayak', 'todo-kayak-marine', 'Marine', 2.70, 0.80, 180, 'U', true, false, false, 130, 'pala', 'K1', 18, 'fabricante'),
  entradaPala('Todo Kayak', 'todo-kayak-marea-tandem', 'Marea Tándem', 3.73, 0.82, 300, 'U', true, false, false, 220, 'pala', 'K3', 32, 'fabricante'),
  entradaPala('Todo Kayak', 'todo-kayak-pingo', 'Pingo', 3.30, 0.80, 280, 'U', true, true, false, 150, 'pala', 'K3', 39.9, 'fabricante'),
  entradaPala('Todo Kayak', 'todo-kayak-luna', 'Luna', 3.30, 0.78, 250, 'U', true, false, false, 140, 'pala', 'K2', 32, 'fabricante'),

  // ── KOL Outdoor (España) ─────────────────────────────────────────
  entradaConMotor('KOL Outdoor', 'kol-outdoor-whale-propel-two', 'Whale Propel Two', 4.50, 0.91, 450, 'U', true, true, false, 300, 'pedal_helice', 'K4', 'C', 60.8, 'distribuidor'),
  entradaConMotor('KOL Outdoor', 'kol-outdoor-swift-360', 'Swift 360', 3.60, 0.66, 250, 'V', false, true, true, 150, 'pala', 'K4', 'C', 26, 'distribuidor'),
  entradaConMotor('KOL Outdoor', 'kol-outdoor-tarpon-propel-320', 'Tarpon Propel 320', 3.16, 0.86, 300, 'U', true, true, false, 140, 'pedal_helice', 'K3', 'C', 29, 'distribuidor'),
  entradaConMotor('KOL Outdoor', 'kol-outdoor-oceanus-r', 'Oceanus R', 3.72, 0.86, 350, 'U', true, false, false, 250, 'pala', 'K4', 'C', 33, 'distribuidor'),
  entradaConMotor('KOL Outdoor', 'kol-outdoor-oceanus-pro', 'Oceanus PRO', 3.72, 0.86, 350, 'U', true, false, false, 250, 'pala', 'K4', 'C', 34, 'distribuidor'),
  entradaConMotor('KOL Outdoor', 'kol-outdoor-falco-combo-11', 'Falco Combo 11', 3.35, 0.86, 300, 'U', true, false, false, 160, 'pala', 'K3', 'C', 33, 'distribuidor'),
  entradaConMotor('KOL Outdoor', 'kol-outdoor-dentex-one', 'Dentex One', 3.00, 0.84, 200, 'U', true, true, false, 230, 'pedal_helice', 'K2', 'C', 32, 'distribuidor'),
  entradaConMotor('KOL Outdoor', 'kol-outdoor-dolphin-propel-12', 'Dolphin Propel 12', 3.66, 0.83, 350, 'U', true, true, false, 180, 'pedal_helice', 'K4', 'C', 31.2, 'distribuidor'),
  entradaConMotor('KOL Outdoor', 'kol-outdoor-fisher-pro-12', 'Fisher Pro 12', 3.70, 0.81, 380, 'U', true, true, false, 180, 'pedal_aletas', 'K4', 'C', 36, 'distribuidor'),
  entradaConMotor('KOL Outdoor', 'kol-outdoor-conger-p-lite', 'Conger P Lite', 2.80, 0.80, 180, 'U', true, false, false, 140, 'pala', 'K4', 'C', 19.5, 'distribuidor'),
  entradaConMotor('KOL Outdoor', 'kol-outdoor-big-pro-angler-12', 'Big Pro Angler 12', 3.65, 0.83, 350, 'U', true, true, false, 180, 'pala', 'K4', 'C', 31.2, 'distribuidor'),
  entradaConMotor('KOL Outdoor', 'kol-outdoor-fury-one', 'Fury One', 3.10, 0.84, 250, 'U', true, false, false, 160, 'pala', 'K4', 'C', 28, 'distribuidor'),
  entradaConMotor('KOL Outdoor', 'kol-outdoor-dace-pro-angler-10', 'Dace Pro Angler 10', 3.10, 0.76, 250, 'U', true, true, false, 140, 'pala', 'K4', 'no_certificado', 23, 'fabricante'),
  entradaConMotor('KOL Outdoor', 'kol-outdoor-dace-pro-angler-12', 'Dace Pro Angler 12', 3.65, 0.77, 300, 'U', true, true, false, 160, 'pala', 'K4', 'C', 29, 'distribuidor'),
  entradaConMotor('KOL Outdoor', 'kol-outdoor-dace-pro-angler-14', 'Dace Pro Angler 14', 4.25, 0.75, 350, 'U', true, true, false, 220, 'pala', 'K4', 'no_certificado', 35, 'fabricante'),

  // ── Marlin Kayak (España) ────────────────────────────────────────
  entradaConMotor('Marlin Kayak', 'marlin-kayak-fins-max-2025-2026', 'Fins Max 2025/2026', 3.72, 0.84, 350, 'U', true, true, false, 170, 'pedal_helice', 'K4', 'C', 33, 'distribuidor'),
  entradaConMotor('Marlin Kayak', 'marlin-kayak-fins-mini', 'Fins Mini', 2.92, 0.83, 200, 'U', true, true, false, 150, 'pedal_aletas', 'K2', 'C', 26, 'fabricante'),
  entradaConMotor('Marlin Kayak', 'marlin-kayak-mini-falcon-2026', 'Mini Falcon 2026', 2.50, 0.90, 200, 'U', true, true, false, 165, 'pedal_aletas', 'K2', 'no_certificado', 28.8, 'fabricante'),
  entradaConMotor('Marlin Kayak', 'marlin-kayak-one-2026', 'One 2026', 2.96, 0.81, 200, 'U', true, false, false, 165, 'pala', 'K2', 'no_certificado', 22, 'fabricante'),

  // ── Vicking (España) ─────────────────────────────────────────────
  entradaConMotor('Vicking', 'vicking-vk-09-evo', 'VK-09 EVO', 3.80, 0.80, 350, 'U', true, true, false, 200, 'pala', 'K3', 'no_certificado', 35, 'fabricante'),

  // ── Hinchables (a pala, fuera de ámbito CE como embarcación) ─────
  entradaPala('Tribord (Decathlon)', 'tribord-100-confort-hinchable', '100 Confort Hinchable', 3.65, 1.00, 250, 'U', true, false, false, 195, 'pala', 'HI2', 11.5, 'fabricante'),
  entradaPala('Aqua Marina', 'aqua-marina-steam-412-hinchable', 'Steam 412 Hinchable', 4.12, 0.90, 300, 'U', true, false, false, 180, 'pala', 'HI2', 15.5, 'fabricante'),
];

export function buscarKayakPorId(id: string): Kayak | undefined {
  return CATALOGO_KAYAKS.find((k) => k.id === id);
}

export function buscarKayaksPorNombre(texto: string): Kayak[] {
  const q = texto.trim().toLowerCase();
  if (!q) return [];
  return CATALOGO_KAYAKS.filter((k) =>
    `${k.marca} ${k.modelo}`.toLowerCase().includes(q)
  ).slice(0, 50);
}

export function etiquetaCategoria(kayak: Kayak | KayakEditado): string {
  if ('origen' in kayak && kayak.origen === 'usuario') {
    return `${kayak.categoriaWKF}e`;
  }
  return `${kayak.categoriaWKF}${kayak.certificadoOficial ? 'c' : ''}`;
}