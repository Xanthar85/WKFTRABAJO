// src/lib/autonomia.ts
// WKF — Calculadora experimental de autonomía y velocidad de crucero
// para kayaks, patos y canoas con motor eléctrico.
//
// ADVERTENCIA: es una estimación. La autonomía real depende del
// viento, la corriente, el peso total, la eficiencia de la hélice,
// el estado de la batería y el estilo de conducción. No sustituye a
// las pruebas reales ni a los datos del fabricante.
//
// Método de cálculo:
//   1. Velocidad máxima teórica del conjunto: se iguala el empuje
//      del motor con la resistencia del casco a esa velocidad.
//      La resistencia usa la fórmula clásica de resistencia de
//      olas + resistencia de fricción para un kayak medio.
//   2. Energía útil de la batería: capacidadAh × voltajeV × 80%
//      (profundidad de descarga segura).
//   3. Autonomía: energía útil × eficiencia_hélice / potencia.
//   4. Velocidad y autonomía se calculan para dos modos: máxima
//      autonomía (35% del empuje) y crucero (65% del empuje).
//
// v1.025: el peso total incluye pesoKayak + pesoKayakista + pesoEquipo
//         + pesoBatería + 3 kg de motor y cables.
//
// Aviso legal: es experimental. Lo dice la UI en cada cálculo.

import type { MotorElectrico, BateriaElectrica } from './motores-electricos.ts';
import {
  estimarAmperajePorEmpuje,
  estimarPotencia,
} from './motores-electricos.ts';

export interface DatosCasco {
  esloraM: number;      // eslora en metros
  mangaM: number;       // manga en metros
  pesoKg: number;       // peso del kayak en vacío
  tipoCasco: 'V' | 'U' | 'plano';
}

export interface EntradaAutonomia {
  casco: DatosCasco | null;
  motor: MotorElectrico | null;
  motorCustom: {
    empujeLbs: number;
    voltajeV: number;
    amperajeCruceroA: number | null;
  } | null;
  bateria: BateriaElectrica | null;
  bateriaCustom: {
    quimica: 'litio' | 'agm' | 'gel';
    voltajeV: number;
    capacidadAh: number;
    pesoKg: number;
  } | null;
  /** Peso del kayakista en kg. */
  pesoKayakistaKg: number;
  /** Peso del equipo a bordo en kg (opcional, default 0). */
  pesoEquipoKg: number;
}

export interface ResultadoModo {
  velocidadKt: number;
  velocidadKmh: number;
  autonomiaHoras: number;
  autonomiaKm: number;
  autonomiaMn: number;
  amperajeA: number;
  potenciaW: number;
}

export interface ResultadoAutonomia {
  modoMaximaAutonomia: ResultadoModo;
  modoCrucero: ResultadoModo;
  energiaUtilWh: number;
  eficienciaHelice: number;
  pesoTotalKg: number;
  /** Velocidad máxima teórica del conjunto en kt (por encima de
   *  esto el casco no da más, da igual el motor). */
  velocidadTopeKt: number;
  /** true si algún dato del casco falta o es cero. La UI debe
   *  mostrar un aviso o bloquear la pestaña. */
  datosIncompletos: boolean;
}

const EFICIENCIA_HÉLICE = 0.45;
const PROFUNDIDAD_DESCARGA = 0.8;
const FACTOR_CRUCERO = 0.65;
const FACTOR_MAXIMA_AUTONOMIA = 0.35;

/** Factor de forma del casco. A mayor valor, menos resistencia.
 *  El casco en V corta mejor el agua, el plano golpea. */
function factorForma(tipoCasco: 'V' | 'U' | 'plano'): number {
  if (tipoCasco === 'V') return 1.05;
  if (tipoCasco === 'U') return 1.0;
  return 0.92;
}

/** Resistencia del casco a una velocidad dada (en kgf, aproximada).
 *  Modelo simplificado de resistencia de olas para kayak medio:
 *    R = k * desplazamiento * (v / sqrt(Lwl))^2
 *  donde k engloba la forma del casco y la fricción.
 *  Es una aproximación, no un modelo hidrodinámico completo. */
function resistenciaCasco(
  velocidadKt: number,
  casco: DatosCasco,
  pesoTotalKg: number
): number {
  if (velocidadKt <= 0) return 0;
  const lwl = casco.esloraM * 0.95;
  const vRel = velocidadKt / Math.sqrt(lwl);
  const k = 0.018 * factorForma(casco.tipoCasco);
  const resistencia = k * pesoTotalKg * vRel * vRel;
  return resistencia;
}

/** Convierte empuje en lbs a fuerza en kgf. 1 lb ≈ 0.4536 kgf. */
function empujeAKgf(empujeLbs: number): number {
  return empujeLbs * 0.4536;
}

/** Calcula la velocidad tope del conjunto (casco + motor) resolviendo
 *  empuje = resistencia por bisección. Devuelve velocidad en kt. */
function calcularVelocidadTope(
  empujeLbs: number,
  casco: DatosCasco,
  pesoTotalKg: number
): number {
  const fuerzaKgf = empujeAKgf(empujeLbs);
  if (fuerzaKgf <= 0) return 0;
  let lo = 0;
  let hi = 8;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const r = resistenciaCasco(mid, casco, pesoTotalKg);
    if (r < fuerzaKgf) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function calcularAutonomia(
  entrada: EntradaAutonomia
): ResultadoAutonomia | null {
  const {
    casco,
    motor,
    motorCustom,
    bateria,
    bateriaCustom,
    pesoKayakistaKg,
    pesoEquipoKg,
  } = entrada;

  // Determinar motor
  let empujeLbs = 0;
  let voltajeMotorV = 12;
  let amperajeNominalA = 0;

  if (motor && !motor.generico) {
    empujeLbs = motor.empujeLbs;
    voltajeMotorV = motor.voltajeV;
    amperajeNominalA = motor.amperajeCruceroA ?? estimarAmperajePorEmpuje(motor.empujeLbs, motor.voltajeV);
  } else if (motorCustom) {
    empujeLbs = motorCustom.empujeLbs;
    voltajeMotorV = motorCustom.voltajeV;
    amperajeNominalA = motorCustom.amperajeCruceroA ?? estimarAmperajePorEmpuje(motorCustom.empujeLbs, motorCustom.voltajeV);
  } else {
    return null;
  }

  if (empujeLbs <= 0 || amperajeNominalA <= 0) return null;

  // Determinar batería
  let capacidadAh = 0;
  let voltajeBateriaV = 12;
  let pesoBateriaKg = 0;

  if (bateria && !bateria.generico) {
    capacidadAh = bateria.capacidadAh;
    voltajeBateriaV = bateria.voltajeV;
    pesoBateriaKg = bateria.pesoKg;
  } else if (bateriaCustom) {
    capacidadAh = bateriaCustom.capacidadAh;
    voltajeBateriaV = bateriaCustom.voltajeV;
    pesoBateriaKg = bateriaCustom.pesoKg;
  } else if (bateria && bateria.generico && bateria.capacidadAh > 0) {
    capacidadAh = bateria.capacidadAh;
    voltajeBateriaV = bateria.voltajeV;
    pesoBateriaKg = bateria.pesoKg;
  } else {
    return null;
  }

  if (capacidadAh <= 0) return null;

  // Energía útil
  const energiaNominalWh = capacidadAh * voltajeBateriaV;
  const energiaUtilWh = energiaNominalWh * PROFUNDIDAD_DESCARGA;

  // Datos del casco
  const datosIncompletos =
    !casco || casco.esloraM <= 0 || casco.mangaM <= 0 || casco.pesoKg <= 0;

  if (datosIncompletos) {
    return {
      modoMaximaAutonomia: { velocidadKt: 0, velocidadKmh: 0, autonomiaHoras: 0, autonomiaKm: 0, autonomiaMn: 0, amperajeA: 0, potenciaW: 0 },
      modoCrucero: { velocidadKt: 0, velocidadKmh: 0, autonomiaHoras: 0, autonomiaKm: 0, autonomiaMn: 0, amperajeA: 0, potenciaW: 0 },
      energiaUtilWh: Math.round(energiaUtilWh),
      eficienciaHelice: EFICIENCIA_HÉLICE,
      pesoTotalKg: 0,
      velocidadTopeKt: 0,
      datosIncompletos: true,
    };
  }

  // Peso total estimado: casco + batería + kayakista + equipo + 3 kg
  // de motor, cables y accesorios.
  const pesoEquipoSeguro = Number.isFinite(pesoEquipoKg) && pesoEquipoKg > 0 ? pesoEquipoKg : 0;
  const pesoTotalKg =
    casco.pesoKg + pesoBateriaKg + pesoKayakistaKg + pesoEquipoSeguro + 3;
  const cascoFinal: DatosCasco = { ...casco, pesoKg: pesoTotalKg };

  // Velocidad tope del conjunto
  const velocidadTopeKt = calcularVelocidadTope(empujeLbs, cascoFinal, pesoTotalKg);

  // Modo crucero: 65% del empuje nominal
  const empujeCrucero = empujeLbs * FACTOR_CRUCERO;
  const velocidadCruceroTope = calcularVelocidadTope(empujeCrucero, cascoFinal, pesoTotalKg);
  const velocidadCrucero = Math.min(velocidadCruceroTope, velocidadTopeKt);

  const fraccionEmpujeCrucero = empujeCrucero / empujeLbs;
  const amperajeCrucero = amperajeNominalA * fraccionEmpujeCrucero;
  const potenciaCrucero = estimarPotencia(voltajeBateriaV, amperajeCrucero);
  const horasCrucero = potenciaCrucero > 0
    ? (energiaUtilWh * EFICIENCIA_HÉLICE) / potenciaCrucero
    : 0;

  // Modo máxima autonomía: 35% del empuje nominal
  const empujeMaxAut = empujeLbs * FACTOR_MAXIMA_AUTONOMIA;
  const velocidadMaxAutTope = calcularVelocidadTope(empujeMaxAut, cascoFinal, pesoTotalKg);
  const velocidadMaxAut = Math.min(velocidadMaxAutTope, velocidadTopeKt);

  const fraccionEmpujeMaxAut = empujeMaxAut / empujeLbs;
  const amperajeMaxAut = amperajeNominalA * fraccionEmpujeMaxAut;
  const potenciaMaxAut = estimarPotencia(voltajeBateriaV, amperajeMaxAut);
  const horasMaxAut = potenciaMaxAut > 0
    ? (energiaUtilWh * EFICIENCIA_HÉLICE) / potenciaMaxAut
    : 0;

  const ktAKmh = (kt: number) => kt * 1.852;

  return {
    modoMaximaAutonomia: {
      velocidadKt: Math.round(velocidadMaxAut * 100) / 100,
      velocidadKmh: Math.round(ktAKmh(velocidadMaxAut) * 100) / 100,
      autonomiaHoras: Math.round(horasMaxAut * 100) / 100,
      autonomiaKm: Math.round(velocidadMaxAut * ktAKmh(1) * horasMaxAut * 100) / 100,
      autonomiaMn: Math.round(velocidadMaxAut * horasMaxAut * 100) / 100,
      amperajeA: Math.round(amperajeMaxAut * 10) / 10,
      potenciaW: Math.round(potenciaMaxAut),
    },
    modoCrucero: {
      velocidadKt: Math.round(velocidadCrucero * 100) / 100,
      velocidadKmh: Math.round(ktAKmh(velocidadCrucero) * 100) / 100,
      autonomiaHoras: Math.round(horasCrucero * 100) / 100,
      autonomiaKm: Math.round(velocidadCrucero * ktAKmh(1) * horasCrucero * 100) / 100,
      autonomiaMn: Math.round(velocidadCrucero * horasCrucero * 100) / 100,
      amperajeA: Math.round(amperajeCrucero * 10) / 10,
      potenciaW: Math.round(potenciaCrucero),
    },
    energiaUtilWh: Math.round(energiaUtilWh),
    eficienciaHelice: EFICIENCIA_HÉLICE,
    pesoTotalKg: Math.round(pesoTotalKg),
    velocidadTopeKt: Math.round(velocidadTopeKt * 100) / 100,
    datosIncompletos: false,
  };
}