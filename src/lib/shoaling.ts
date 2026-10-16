// src/lib/shoaling.ts
// WKF — Factor de shoaling sin batimetría.
// DP-029 / DP-032.

const LIMITE_ROTURA = 0.78;
const PROFUNDIDAD_REFERENCIA = 5;
const PROFUNDIDAD_PROFUNDA_REFERENCIA = 20;

export interface ResultadoShoaling {
  alturaCorregida: number;
  rompe: boolean;
  factor: number;
}

export function calcularShoaling(
  alturaAguasProfundas: number
): ResultadoShoaling {
  if (alturaAguasProfundas <= 0) {
    return {
      alturaCorregida: alturaAguasProfundas,
      rompe: false,
      factor: 1,
    };
  }

  const factor = Math.pow(
    PROFUNDIDAD_PROFUNDA_REFERENCIA / PROFUNDIDAD_REFERENCIA,
    0.25
  );
  let alturaCorregida = alturaAguasProfundas * factor;

  const alturaMaxima = LIMITE_ROTURA * PROFUNDIDAD_REFERENCIA;
  let rompe = false;
  if (alturaCorregida > alturaMaxima) {
    alturaCorregida = alturaMaxima;
    rompe = true;
  }

  return {
    alturaCorregida,
    rompe,
    factor: alturaCorregida / alturaAguasProfundas,
  };
}
