// src/lib/verdict.ts
// WKF — Núcleo de cálculo de veredictos.
// WKF1.069:
//   · El periodo ya NO se evalúa con umbrales fijos por zona ni con
//     "ifs" mágicos. Se evalúa por INTERPOLACIÓN LINEAL sobre la ola
//     real, usando PERIODO_ANCLAJES (4 puntos: 0,0 / 0,5 / 1,0 /
//     >=1,5 m). El periodo es universal: no depende de zona, ni de
//     categoría, ni de perfil, ni de franja.
//   · `Umbral` ya no tiene `periodo`. `umbralAplicado` tampoco.
//     `veredictoPorFactor.periodo` sigue existiendo (resultado de la
//     evaluación), pero no se ajusta por perfil/franja.
//   · `AJUSTE_PERFIL.periodo` y `AJUSTE_FRANJA.periodo` quedan en el
//     archivo como datos inocuos (no se usan). Se limpiarán en una
//     fase de limpieza posterior.
//   · Se elimina el parche de periodo de WKF1.062 (los dos `if`).

import {
  UMBRALES_BASE,
  UMBRALES_PATOS,
  UMBRALES_CANOAS,
  PERIODO_ANCLAJES,
  type Umbral,
  type ZonaTabla,
  type CategoriaKayakTabla,
  type CategoriaPatoTabla,
  type CategoriaCanoaTabla,
  type NivelExperienciaTabla,
  type FranjaDiaTabla,
  type TipoAccesoTabla,
  type AnclajePeriodo,
} from './verdict-tabla.ts';
import type { Kayak, TechoAbsoluto } from './kayaks.ts';
import {
  type Pato,
  type Canoa,
  TECHOS_PATOS,
  type CategoriaPato,
  TECHOS_CANOAS,
  type CategoriaCanoa,
} from './patos.ts';

export type Zona = ZonaTabla;
export type CategoriaKayak = CategoriaKayakTabla;
export type { CategoriaPato, CategoriaCanoa };
export type CategoriaEmbarcacionLigera = CategoriaPato | CategoriaCanoa;
export type CategoriaEmbarcacion = CategoriaKayak | CategoriaPato | CategoriaCanoa;
export type NivelExperiencia = NivelExperienciaTabla;
export type FranjaDia = FranjaDiaTabla;
export type TipoAcceso = TipoAccesoTabla;

export type Veredicto =
  | 'FAVORABLE'
  | 'ACEPTABLE'
  | 'EXIGENTE'
  | 'DESACONSEJADO';

export type VeredictoAcceso = 'SEGURA' | 'VIGILAR' | 'DIFICIL' | 'NO_SALIR';

export type { Umbral };

export interface Condiciones {
  viento: number;
  ola: number;
  periodo: number;
  corriente: number;
  marea: number;
}

export interface PerfilKayakista {
  experiencia: NivelExperiencia;
  vhf: boolean;
  remoRepuesto: boolean;
  ropaSeca: boolean;
  compartimentosEstancos: boolean;
  /** Peso del kayakista en kg. Se usa para el cálculo de autonomía. */
  pesoKayakistaKg: number;
  /** Peso total del equipo que lleva a bordo (kg). Se suma al
   *  kayak y al kayakista para calcular la autonomía. */
  pesoEquipoKg: number;
  /** Id del motor del catálogo, o null si no usa motor o si es
   *  personalizado. */
  motorElectricoId: string | null;
  /** Datos del motor si es personalizado (fuera de catálogo). */
  motorElectricoCustom: {
    empujeLbs: number;
    voltajeV: number;
    amperajeCruceroA: number | null;
  } | null;
  /** Id de la batería del catálogo, o null si no usa o si es
   *  personalizada. */
  bateriaElectricaId: string | null;
  /** Datos de la batería si es personalizada (fuera de catálogo). */
  bateriaElectricaCustom: {
    quimica: 'litio' | 'agm' | 'gel';
    voltajeV: number;
    capacidadAh: number;
    pesoKg: number;
  } | null;
}

export interface ResultadoVeredicto {
  veredicto: Veredicto;
  factorDisparador: keyof Umbral | 'periodo' | null;
  veredictoPorFactor: {
    viento: Veredicto;
    ola: Veredicto;
    periodo: Veredicto;
    corriente: Veredicto;
    marea: Veredicto;
  };
  umbralAplicado: Umbral;
}

export const CATEGORIAS_KAYAK: CategoriaKayak[] = ['K1', 'K2', 'K3', 'K4', 'K5'];

export const NIVELES_EXPERIENCIA: NivelExperiencia[] = [
  'novel',
  'principiante',
  'intermedio',
  'avanzado',
  'experto',
];

export const FRANJAS_DIA: FranjaDia[] = ['manana', 'tarde', 'noche'];

export const VEREDICTOS: Veredicto[] = [
  'FAVORABLE',
  'ACEPTABLE',
  'EXIGENTE',
  'DESACONSEJADO',
];

export const TIPOS_ACCESO: TipoAcceso[] = [
  'playa',
  'roca',
  'puerto_escollera',
  'otro',
];

export const VEREDICTOS_ACCESO: VeredictoAcceso[] = [
  'SEGURA',
  'VIGILAR',
  'DIFICIL',
  'NO_SALIR',
];

// ─── Ajustes por perfil y franja (SIN periodo) ──────────────────────
// WKF1.069: el periodo ya no se ajusta por perfil ni franja. Queda
// el campo `periodo` en estos registros para no romper tipos, pero
// el motor NO lo usa. Se limpiará en fase de limpieza posterior.

export const AJUSTE_PERFIL: Record<
  NivelExperiencia,
  { viento: number; ola: number; periodo: number; corriente: number; marea: number }
> = {
  novel:        { viento: -2, ola: -0.5, periodo: 1,  corriente: -0.5, marea: -0.5 },
  principiante: { viento: -1, ola: -0.3, periodo: 0.5, corriente: -0.3, marea: -0.3 },
  intermedio:   { viento: 0,  ola: 0,   periodo: 0,  corriente: 0,   marea: 0 },
  avanzado:     { viento: 1,  ola: 0.3, periodo: -0.5, corriente: 0.3, marea: 0.3 },
  experto:      { viento: 2,  ola: 0.5, periodo: -1, corriente: 0.5, marea: 0.5 },
};

export const AJUSTE_FRANJA: Record<
  FranjaDia,
  { viento: number; ola: number; corriente: number }
> = {
  manana: { viento: 0,  ola: 0,   corriente: 0 },
  tarde:  { viento: -1, ola: -0.2, corriente: -0.2 },
  noche:  { viento: -1, ola: -0.2, corriente: -0.2 },
};

export type ClaveEquipo =
  | 'vhf'
  | 'remoRepuesto'
  | 'ropaSeca'
  | 'compartimentosEstancos';

export const AJUSTE_EQUIPO: Record<ClaveEquipo, { viento: number }> = {
  vhf: { viento: 0.5 },
  remoRepuesto: { viento: 0.5 },
  ropaSeca: { viento: 0.5 },
  compartimentosEstancos: { viento: 0.5 },
};

export const AJUSTE_EQUIPO_NEGATIVO: Record<ClaveEquipo, { viento: number }> = {
  vhf: { viento: -0.5 },
  remoRepuesto: { viento: -0.5 },
  ropaSeca: { viento: -0.5 },
  compartimentosEstancos: { viento: -0.5 },
};

export const UMBRALES_ACCESO: Record<
  TipoAcceso,
  { segura: number; vigilar: number; dificil: number; noSalir: number }
> = {
  playa:            { segura: 0.3, vigilar: 0.6, dificil: 0.9, noSalir: 1.0 },
  roca:             { segura: 0.2, vigilar: 0.4, dificil: 0.6, noSalir: 0.7 },
  puerto_escollera: { segura: 0.3, vigilar: 0.5, dificil: 0.8, noSalir: 0.9 },
  otro:             { segura: 0.3, vigilar: 0.6, dificil: 0.9, noSalir: 1.0 },
};

// ─── Evaluador de un factor con umbrales {fav,ace,exi,des} ──────────

function evaluarFactor(
  valor: number,
  umbral: { fav: number; ace: number; exi: number; des: number },
  invertido = false
): Veredicto {
  if (invertido) {
    if (valor >= umbral.fav) return 'FAVORABLE';
    if (valor >= umbral.ace) return 'ACEPTABLE';
    if (valor >= umbral.exi) return 'EXIGENTE';
    return 'DESACONSEJADO';
  }
  if (valor <= umbral.fav) return 'FAVORABLE';
  if (valor <= umbral.ace) return 'ACEPTABLE';
  if (valor <= umbral.exi) return 'EXIGENTE';
  return 'DESACONSEJADO';
}

function peorVeredicto(a: Veredicto, b: Veredicto): Veredicto {
  const orden: Veredicto[] = ['FAVORABLE', 'ACEPTABLE', 'EXIGENTE', 'DESACONSEJADO'];
  return orden.indexOf(a) >= orden.indexOf(b) ? a : b;
}

function aplicarAjuste(
  umbral: { fav: number; ace: number; exi: number; des: number },
  ajuste: number
): { fav: number; ace: number; exi: number; des: number } {
  return {
    fav: umbral.fav + ajuste,
    ace: umbral.ace + ajuste,
    exi: umbral.exi + ajuste,
    des: umbral.des + ajuste,
  };
}

// ─── Interpolación lineal del periodo según la ola real ────────────
//
// PERIODO_ANCLAJES define 4 puntos (0,0 / 0,5 / 1,0 / >=1,5 m).
// Para una ola intermedia se interpola linealmente entre los dos
// anclajes que la rodean. Por debajo del primer anclaje se usa el
// primero. Por encima del último se usa el último. El resultado es
// un juego de 4 umbrales de periodo (fav/ace/exi/des) para esa ola.

export function umbralesPeriodoParaOla(
  olaM: number
): { fav: number; ace: number; exi: number; des: number } {
  const anclajes = PERIODO_ANCLAJES;
  const primero = anclajes[0];
  const ultimo = anclajes[anclajes.length - 1];

  if (!Number.isFinite(olaM) || olaM <= primero.olaM) {
    return { fav: primero.fav, ace: primero.ace, exi: primero.exi, des: primero.des };
  }
  if (olaM >= ultimo.olaM) {
    return { fav: ultimo.fav, ace: ultimo.ace, exi: ultimo.exi, des: ultimo.des };
  }

  // Buscar el tramo [a, b] que contiene olaM.
  let a: AnclajePeriodo = primero;
  let b: AnclajePeriodo = ultimo;
  for (let i = 0; i < anclajes.length - 1; i++) {
    const ai = anclajes[i];
    const bi = anclajes[i + 1];
    if (olaM >= ai.olaM && olaM <= bi.olaM) {
      a = ai;
      b = bi;
      break;
    }
  }

  const rango = b.olaM - a.olaM;
  const t = rango > 0 ? (olaM - a.olaM) / rango : 0;
  return {
    fav: a.fav + (b.fav - a.fav) * t,
    ace: a.ace + (b.ace - a.ace) * t,
    exi: a.exi + (b.exi - a.exi) * t,
    des: a.des + (b.des - a.des) * t,
  };
}

// ─── Cálculo principal ─────────────────────────────────────────────

export function calcularVeredicto(
  zona: Zona,
  categoria: CategoriaKayak | CategoriaPato | CategoriaCanoa | string,
  perfil: PerfilKayakista,
  franja: FranjaDia,
  condiciones: Condiciones,
  embarcacion?: Kayak | Pato | Canoa | TechoAbsoluto | null
): ResultadoVeredicto {
  const categoriaStr = typeof categoria === 'string' ? categoria : '';
  const esPato =
    (embarcacion && 'tipoEmbarcacion' in embarcacion && embarcacion.tipoEmbarcacion === 'pato') ||
    categoriaStr === 'P1' || categoriaStr === 'P2' ||
    categoriaStr === 'P3' || categoriaStr === 'P4';
  const esCanoa =
    (embarcacion && 'tipoEmbarcacion' in embarcacion && embarcacion.tipoEmbarcacion === 'canoa') ||
    categoriaStr === 'CA1' || categoriaStr === 'CA2' || categoriaStr === 'CA3';

  let techo: TechoAbsoluto | undefined;
  let baseOriginal: Umbral;

  if (esCanoa) {
    const catCanoa: CategoriaCanoa =
      (embarcacion && 'categoriaWKF' in embarcacion &&
       (embarcacion.categoriaWKF === 'CA1' ||
        embarcacion.categoriaWKF === 'CA2' ||
        embarcacion.categoriaWKF === 'CA3'))
        ? (embarcacion.categoriaWKF as CategoriaCanoa)
        : (categoriaStr === 'CA1' || categoriaStr === 'CA2' || categoriaStr === 'CA3')
        ? (categoriaStr as CategoriaCanoa)
        : 'CA1';

    baseOriginal = UMBRALES_CANOAS[catCanoa] ?? UMBRALES_CANOAS.CA1;
    const tc = TECHOS_CANOAS[catCanoa] ?? TECHOS_CANOAS.CA1;
    techo = {
      vientoMaxBf: tc.vientoMaxBf,
      olaMaxM: tc.olaMaxM,
      fuente: 'estimado',
    };
  } else if (esPato) {
    const catPato: CategoriaPato =
      embarcacion && 'categoriaWKF' in embarcacion && (embarcacion.categoriaWKF === 'P1' || embarcacion.categoriaWKF === 'P2' || embarcacion.categoriaWKF === 'P3' || embarcacion.categoriaWKF === 'P4')
        ? (embarcacion.categoriaWKF as CategoriaPato)
        : (categoria === 'P1' || categoria === 'P2' || categoria === 'P3' || categoria === 'P4')
        ? (categoria as CategoriaPato)
        : 'P1';

    baseOriginal = UMBRALES_PATOS[catPato] ?? UMBRALES_PATOS.P1;
    const tp = TECHOS_PATOS[catPato] ?? TECHOS_PATOS.P1;
    techo = {
      vientoMaxBf: tp.vientoMaxBf,
      olaMaxM: tp.olaMaxM,
      fuente: 'estimado',
    };
  } else {
    // Kayak. El techo puede venir de la embarcación (kayak del
    // catálogo con techoAbsoluto opcional) o pasarse directo
    // como TechoAbsoluto.
    if (embarcacion && 'techoAbsoluto' in embarcacion) {
      techo = embarcacion.techoAbsoluto; // puede ser undefined
    } else if (embarcacion && 'vientoMaxBf' in embarcacion) {
      techo = embarcacion as TechoAbsoluto;
    } else {
      techo = undefined;
    }

    const catKayak: CategoriaKayakTabla =
      categoria === 'K1' || categoria === 'K2' || categoria === 'K3' || categoria === 'K4' || categoria === 'K5'
        ? (categoria as CategoriaKayakTabla)
        : 'K3';
    baseOriginal = UMBRALES_BASE[zona]?.[catKayak] ?? UMBRALES_BASE.mediterraneo_espanol.K3;
  }

  const base: Umbral = {
    viento: { ...baseOriginal.viento },
    ola: { ...baseOriginal.ola },
    corriente: { ...baseOriginal.corriente },
    marea: { ...baseOriginal.marea },
  };

  // Recorte de umbrales de la tabla para no superar el techo absoluto del kayak
  if (techo && typeof techo.vientoMaxBf === 'number') {
    if (base.viento.des > techo.vientoMaxBf) {
      base.viento.des = techo.vientoMaxBf;
    }
    if (base.viento.exi > base.viento.des) {
      base.viento.exi = base.viento.des;
    }
  }

  if (techo && typeof techo.olaMaxM === 'number') {
    if (base.ola.des > techo.olaMaxM) {
      base.ola.des = techo.olaMaxM;
    }
    if (base.ola.exi > base.ola.des) {
      base.ola.exi = base.ola.des;
    }
  }

  const ajPerfil = AJUSTE_PERFIL[perfil.experiencia];
  const ajFranja = AJUSTE_FRANJA[franja];

  let ajEquipoViento = 0;
  ajEquipoViento += perfil.vhf
    ? AJUSTE_EQUIPO.vhf.viento
    : AJUSTE_EQUIPO_NEGATIVO.vhf.viento;
  ajEquipoViento += perfil.remoRepuesto
    ? AJUSTE_EQUIPO.remoRepuesto.viento
    : AJUSTE_EQUIPO_NEGATIVO.remoRepuesto.viento;
  ajEquipoViento += perfil.ropaSeca
    ? AJUSTE_EQUIPO.ropaSeca.viento
    : AJUSTE_EQUIPO_NEGATIVO.ropaSeca.viento;
  ajEquipoViento += perfil.compartimentosEstancos
    ? AJUSTE_EQUIPO.compartimentosEstancos.viento
    : AJUSTE_EQUIPO_NEGATIVO.compartimentosEstancos.viento;

  const umbralAplicado: Umbral = {
    viento: aplicarAjuste(
      base.viento,
      ajPerfil.viento + ajFranja.viento + ajEquipoViento
    ),
    ola: aplicarAjuste(base.ola, ajPerfil.ola + ajFranja.ola),
    corriente: aplicarAjuste(base.corriente, ajPerfil.corriente + ajFranja.corriente),
    marea: aplicarAjuste(base.marea, ajPerfil.marea),
  };

  if (techo && typeof techo.vientoMaxBf === 'number') {
    if (umbralAplicado.viento.des > techo.vientoMaxBf) {
      umbralAplicado.viento.des = techo.vientoMaxBf;
    }
    if (umbralAplicado.viento.exi > umbralAplicado.viento.des) {
      umbralAplicado.viento.exi = umbralAplicado.viento.des;
    }
  }

  if (techo && typeof techo.olaMaxM === 'number') {
    if (umbralAplicado.ola.des > techo.olaMaxM) {
      umbralAplicado.ola.des = techo.olaMaxM;
    }
    if (umbralAplicado.ola.exi > umbralAplicado.ola.des) {
      umbralAplicado.ola.exi = umbralAplicado.ola.des;
    }
  }

  // ─── Evaluación de factores ──────────────────────────────────────
  // WKF1.069: el periodo se evalúa con los umbrales interpolados a
  // partir de la ola real. No hay "ifs" mágicos. El periodo es
  // universal: no se ajusta por perfil ni franja.

  let vViento = evaluarFactor(condiciones.viento, umbralAplicado.viento);
  let vOla = evaluarFactor(condiciones.ola, umbralAplicado.ola);

  const umbralesPeriodo = umbralesPeriodoParaOla(condiciones.ola);
  const vPeriodo = evaluarFactor(condiciones.periodo, umbralesPeriodo, true);

  const vCorriente = evaluarFactor(condiciones.corriente, umbralAplicado.corriente);
  const vMarea = evaluarFactor(condiciones.marea, umbralAplicado.marea);

  let veredicto: Veredicto = 'FAVORABLE';
  veredicto = peorVeredicto(veredicto, vViento);
  veredicto = peorVeredicto(veredicto, vOla);
  veredicto = peorVeredicto(veredicto, vPeriodo);
  veredicto = peorVeredicto(veredicto, vCorriente);
  veredicto = peorVeredicto(veredicto, vMarea);

  let factorDisparador: keyof Umbral | 'periodo' | null = null;
  if (veredicto === 'EXIGENTE' || veredicto === 'DESACONSEJADO') {
    if (vViento === veredicto) factorDisparador = 'viento';
    else if (vOla === veredicto) factorDisparador = 'ola';
    else if (vPeriodo === veredicto) factorDisparador = 'periodo';
    else if (vCorriente === veredicto) factorDisparador = 'corriente';
    else if (vMarea === veredicto) factorDisparador = 'marea';
  }

  // Techo absoluto del kayak (límite duro de diseño/certificación).
  // Solo si EXISTE techo. Los kayaks a pala exentos no tienen techo.
  if (techo && typeof techo.vientoMaxBf === 'number' && typeof techo.olaMaxM === 'number') {
    const superaViento = condiciones.viento > techo.vientoMaxBf;
    const superaOla = condiciones.ola > techo.olaMaxM;
    if (superaViento || superaOla) {
      veredicto = 'DESACONSEJADO';
      if (superaViento) {
        vViento = 'DESACONSEJADO';
        factorDisparador = 'viento';
      }
      if (superaOla) {
        vOla = 'DESACONSEJADO';
        if (!superaViento) {
          factorDisparador = 'ola';
        }
      }
    }
  }

  return {
    veredicto,
    factorDisparador,
    veredictoPorFactor: {
      viento: vViento,
      ola: vOla,
      periodo: vPeriodo,
      corriente: vCorriente,
      marea: vMarea,
    },
    umbralAplicado,
  };
}

export function calcularVeredictoAcceso(
  tipoAcceso: TipoAcceso,
  olaCorregida: number
): VeredictoAcceso {
  const u = UMBRALES_ACCESO[tipoAcceso];
  if (olaCorregida <= u.segura) return 'SEGURA';
  if (olaCorregida <= u.vigilar) return 'VIGILAR';
  if (olaCorregida <= u.dificil) return 'DIFICIL';
  return 'NO_SALIR';
}