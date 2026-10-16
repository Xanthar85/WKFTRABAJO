// src/lib/verdict-tabla.ts
// WKF — Tabla de umbrales base. Sin cambios en v1.010.
// 99 zonas × 5 categorías de kayak.
// Datos puros. No contiene lógica de veredicto.

export interface Umbral {
  viento: { fav: number; ace: number; exi: number; des: number };
  ola: { fav: number; ace: number; exi: number; des: number };
  periodo: { fav: number; ace: number; exi: number; des: number };
  corriente: { fav: number; ace: number; exi: number; des: number };
  marea: { fav: number; ace: number; exi: number; des: number };
}

export type ZonaTabla =
  | 'mediterraneo_espanol'
  | 'mediterraneo_frances'
  | 'mediterraneo_italiano'
  | 'mediterraneo_griego'
  | 'mediterraneo_turco'
  | 'mediterraneo_norteafricano'
  | 'mar_marmara'
  | 'mar_adriatico'
  | 'mar_egeo'
  | 'mar_negro'
  | 'atlantico_norte_espanol'
  | 'atlantico_portugues'
  | 'atlantico_frances_bretana'
  | 'canal_mancha'
  | 'mar_irlanda'
  | 'mar_celtico'
  | 'atlantico_britanico'
  | 'mar_noruega'
  | 'mar_barents_sur'
  | 'mar_baltico'
  | 'mar_del_norte'
  | 'islandia'
  | 'azores'
  | 'madeira'
  | 'canarias'
  | 'pacifico_americano'
  | 'pacifico_washington'
  | 'columbia_britanica'
  | 'alaska_sur'
  | 'atlantico_canadiense'
  | 'atlantico_usa_maine_massachusetts'
  | 'atlantico_usa_carolinas_florida'
  | 'golfo_mexico'
  | 'grandes_lagos'
  | 'chesapeake_long_island'
  | 'pacifico_mexicano'
  | 'golfo_california'
  | 'pacifico_centroamericano'
  | 'caribe_mexicano'
  | 'caribe_insular'
  | 'caribe_sur'
  | 'pacifico_sudamericano'
  | 'atlantico_sudamericano'
  | 'patagonia_pacifico'
  | 'patagonia_atlantico'
  | 'costa_este_australia'
  | 'costa_sur_australia'
  | 'costa_oeste_australia'
  | 'costa_norte_australia'
  | 'nueva_zelanda'
  | 'papua_nueva_guinea'
  | 'fiyi'
  | 'polinesia_francesa'
  | 'japon_pacifico'
  | 'japon_mar_japon'
  | 'corea_sur'
  | 'china_costera'
  | 'taiwan'
  | 'hong_kong'
  | 'vietnam'
  | 'tailandia_golfo'
  | 'tailandia_andaman'
  | 'malasia_peninsular'
  | 'malasia_borneo'
  | 'indonesia_bali'
  | 'indonesia_java'
  | 'indonesia_sumatra'
  | 'indonesia_sulawesi'
  | 'indonesia_flores'
  | 'filipinas'
  | 'india'
  | 'sri_lanka'
  | 'maldivas'
  | 'emiratos_arabes_unidos'
  | 'oman'
  | 'mar_rojo'
  | 'marruecos_atlantico'
  | 'sahara_occidental'
  | 'senegal'
  | 'costa_marfil'
  | 'ghana'
  | 'nigeria'
  | 'camerun'
  | 'angola'
  | 'namibia'
  | 'sudafrica_atlantico'
  | 'sudafrica_indico'
  | 'mozambique'
  | 'tanzania'
  | 'kenia'
  | 'somalia'
  | 'eritrea'
  | 'mar_rojo_africano'
  | 'madagascar'
  | 'mauricio'
  | 'reunion'
  | 'seychelles'
  | 'mar_artico'
  | 'groenlandia_sur';

export type CategoriaKayakTabla = 'K1' | 'K2' | 'K3' | 'K4' | 'K5';

export type NivelExperienciaTabla =
  | 'novel'
  | 'principiante'
  | 'intermedio'
  | 'avanzado'
  | 'experto';

export type FranjaDiaTabla = 'manana' | 'tarde' | 'noche';

export type TipoAccesoTabla =
  | 'playa'
  | 'roca'
  | 'puerto_escollera'
  | 'otro';

export const UMBRALES_BASE: Record<
  ZonaTabla,
  Record<CategoriaKayakTabla, Umbral>
> = {
  mediterraneo_espanol: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, marea: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.6 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.2 }, marea: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.6 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.5 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.8 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.9, exi: 1.6, des: 2.0 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
  },
  mediterraneo_frances: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, marea: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.6 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.2 }, marea: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.6 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.5 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.8 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.9, exi: 1.6, des: 2.0 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
  },
  mediterraneo_italiano: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.2 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.5 }, marea: { fav: 0.0, ace: 0.5, exi: 0.7, des: 1.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.8 }, marea: { fav: 0.0, ace: 0.5, exi: 0.7, des: 1.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.9, exi: 1.6, des: 2.0 }, marea: { fav: 0.0, ace: 0.5, exi: 0.7, des: 1.0 } },
  },
  mediterraneo_griego: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, marea: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.6 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.2 }, marea: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.6 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.5 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.8 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.9, exi: 1.6, des: 2.0 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
  },
  mediterraneo_turco: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, marea: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.6 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.2 }, marea: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.6 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.5 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.8 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.9, exi: 1.6, des: 2.0 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
  },
  mediterraneo_norteafricano: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, marea: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.6 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.2 }, marea: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.6 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.5 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.8 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.9, exi: 1.6, des: 2.0 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
  },
  mar_marmara: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.2, exi: 0.4, des: 0.6 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.2, exi: 0.3, des: 0.4 } },
    K2: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.7 }, periodo: { fav: 4, ace: 3, exi: 2, des: 1 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.2, exi: 0.3, des: 0.4 } },
    K3: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.9 }, periodo: { fav: 4, ace: 3, exi: 2, des: 1 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.0 }, marea: { fav: 0.0, ace: 0.2, exi: 0.3, des: 0.4 } },
    K4: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.1 }, periodo: { fav: 4, ace: 3, exi: 2, des: 1 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.4 }, marea: { fav: 0.0, ace: 0.2, exi: 0.3, des: 0.4 } },
    K5: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, periodo: { fav: 4, ace: 3, exi: 2, des: 1 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.6 }, marea: { fav: 0.0, ace: 0.2, exi: 0.3, des: 0.4 } },
  },
  mar_adriatico: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.2 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.5 }, marea: { fav: 0.0, ace: 0.5, exi: 0.7, des: 1.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.8 }, marea: { fav: 0.0, ace: 0.5, exi: 0.7, des: 1.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.9, exi: 1.6, des: 2.0 }, marea: { fav: 0.0, ace: 0.5, exi: 0.7, des: 1.0 } },
  },
  mar_egeo: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 7, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.1 }, marea: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.6 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.6 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.7 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.7, des: 2.2 }, marea: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.8 } },
  },
  mar_negro: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, marea: { fav: 0.0, ace: 0.1, exi: 0.2, des: 0.3 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.2 }, marea: { fav: 0.0, ace: 0.1, exi: 0.2, des: 0.3 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.5 }, marea: { fav: 0.0, ace: 0.1, exi: 0.2, des: 0.3 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.8 }, marea: { fav: 0.0, ace: 0.1, exi: 0.2, des: 0.3 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.9, exi: 1.6, des: 2.0 }, marea: { fav: 0.0, ace: 0.1, exi: 0.2, des: 0.3 } },
  },
  atlantico_norte_espanol: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
  },
  atlantico_portugues: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
  },
  atlantico_frances_bretana: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 3.0, exi: 5.0, des: 7.0 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 3.0, exi: 5.0, des: 7.0 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 4.0, exi: 6.0, des: 9.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 4.0, exi: 6.0, des: 9.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 4.0, exi: 6.0, des: 9.0 } },
  },
  canal_mancha: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 3.0, exi: 5.0, des: 7.0 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 3.0, exi: 5.0, des: 7.0 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.5, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 4.0, exi: 6.0, des: 9.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.8, exi: 2.5, des: 3.5 }, marea: { fav: 0.0, ace: 4.0, exi: 6.0, des: 9.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 2.0, exi: 2.8, des: 3.8 }, marea: { fav: 0.0, ace: 4.0, exi: 6.0, des: 9.0 } },
  },
  mar_irlanda: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 2.0, exi: 3.5, des: 5.0 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 2.0, exi: 3.5, des: 5.0 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 5.5 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 5.5 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 5.5 } },
  },
  mar_celtico: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 6.0 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 6.0 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 3.0, exi: 5.0, des: 7.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 3.0, exi: 5.0, des: 7.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 3.0, exi: 5.0, des: 7.0 } },
  },
  atlantico_britanico: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 3.0, exi: 5.0, des: 7.0 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 3.0, exi: 5.0, des: 7.0 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 4.0, exi: 6.0, des: 9.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 4.0, exi: 6.0, des: 9.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 4.0, exi: 6.0, des: 9.0 } },
  },
  mar_noruega: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.4, exi: 0.8, des: 1.2 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.5, exi: 1.0, des: 1.5 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.6, exi: 1.2, des: 1.8 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.4, des: 2.1 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.8, exi: 1.6, des: 2.4 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
  },
  mar_barents_sur: {
    K1: { viento: { fav: 0, ace: 1, exi: 2, des: 3 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.5 } },
    K2: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.5 } },
    K3: { viento: { fav: 0, ace: 2, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.2, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.2, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.2, exi: 2.0, des: 3.0 } },
  },
  mar_baltico: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, marea: { fav: 0.0, ace: 0.1, exi: 0.2, des: 0.3 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.2 }, marea: { fav: 0.0, ace: 0.1, exi: 0.2, des: 0.3 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.5 }, marea: { fav: 0.0, ace: 0.1, exi: 0.2, des: 0.3 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.8 }, marea: { fav: 0.0, ace: 0.1, exi: 0.2, des: 0.3 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.9, exi: 1.6, des: 2.0 }, marea: { fav: 0.0, ace: 0.1, exi: 0.2, des: 0.3 } },
  },
  mar_del_norte: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
  },
  islandia: {
    K1: { viento: { fav: 0, ace: 1, exi: 2, des: 3 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K2: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K3: { viento: { fav: 0, ace: 2, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K4: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K5: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
  },
  azores: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  madeira: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  canarias: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  pacifico_americano: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  pacifico_washington: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.7, des: 1.1 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.8, des: 1.2 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 1.0, des: 1.5 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.2, des: 1.8 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.4, des: 2.1 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
  },
  columbia_britanica: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 2.0, exi: 3.5, des: 5.0 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 2.0, exi: 3.5, des: 5.0 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 5.5 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 5.5 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 5.5 } },
  },
  alaska_sur: {
    K1: { viento: { fav: 0, ace: 1, exi: 2, des: 3 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 2.0, exi: 3.5, des: 5.0 } },
    K2: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 2.0, exi: 3.5, des: 5.0 } },
    K3: { viento: { fav: 0, ace: 2, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 5.5 } },
    K4: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 5.5 } },
    K5: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 5.5 } },
  },
  atlantico_canadiense: {
    K1: { viento: { fav: 0, ace: 1, exi: 2, des: 3 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 3.0, exi: 5.0, des: 7.0 } },
    K2: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 3.0, exi: 5.0, des: 7.0 } },
    K3: { viento: { fav: 0, ace: 2, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.5, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 4.0, exi: 6.0, des: 9.0 } },
    K4: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.8, exi: 2.5, des: 3.5 }, marea: { fav: 0.0, ace: 4.0, exi: 6.0, des: 9.0 } },
    K5: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 2.0, exi: 2.8, des: 3.8 }, marea: { fav: 0.0, ace: 4.0, exi: 6.0, des: 9.0 } },
  },
  atlantico_usa_maine_massachusetts: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
  },
  atlantico_usa_carolinas_florida: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  golfo_mexico: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.2, exi: 0.4, des: 0.6 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.2 }, marea: { fav: 0.0, ace: 0.2, exi: 0.3, des: 0.4 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.7 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.2, exi: 0.3, des: 0.4 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.3, exi: 0.4, des: 0.5 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.1 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.0 }, marea: { fav: 0.0, ace: 0.3, exi: 0.4, des: 0.5 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.2 }, marea: { fav: 0.0, ace: 0.3, exi: 0.4, des: 0.5 } },
  },
  grandes_lagos: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, marea: { fav: 0.0, ace: 0.1, exi: 0.2, des: 0.3 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.2 }, marea: { fav: 0.0, ace: 0.1, exi: 0.2, des: 0.3 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.5 }, marea: { fav: 0.0, ace: 0.1, exi: 0.2, des: 0.3 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.8 }, marea: { fav: 0.0, ace: 0.1, exi: 0.2, des: 0.3 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.9, exi: 1.6, des: 2.0 }, marea: { fav: 0.0, ace: 0.1, exi: 0.2, des: 0.3 } },
  },
  chesapeake_long_island: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.2, exi: 0.4, des: 0.6 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.1 }, marea: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.7 }, periodo: { fav: 4, ace: 3, exi: 2, des: 1 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.9 }, periodo: { fav: 4, ace: 3, exi: 2, des: 1 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.1 }, periodo: { fav: 4, ace: 3, exi: 2, des: 1 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.0 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, periodo: { fav: 4, ace: 3, exi: 2, des: 1 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.2 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
  },
  pacifico_mexicano: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  golfo_california: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.2, exi: 0.4, des: 0.6 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.7 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.1 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
  },
  pacifico_centroamericano: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
  },
  caribe_mexicano: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.2, exi: 0.4, des: 0.6 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.2 }, marea: { fav: 0.0, ace: 0.2, exi: 0.3, des: 0.4 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.7 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.2, exi: 0.3, des: 0.4 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.3, exi: 0.4, des: 0.5 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.1 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.0 }, marea: { fav: 0.0, ace: 0.3, exi: 0.4, des: 0.5 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.2 }, marea: { fav: 0.0, ace: 0.3, exi: 0.4, des: 0.5 } },
  },
  caribe_insular: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 7, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.2, exi: 0.3, des: 0.4 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.2, exi: 0.3, des: 0.4 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.3, exi: 0.4, des: 0.5 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.3, exi: 0.4, des: 0.5 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 0.3, exi: 0.4, des: 0.5 } },
  },
  caribe_sur: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 7, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.2, exi: 0.3, des: 0.4 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.2, exi: 0.3, des: 0.4 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.3, exi: 0.4, des: 0.5 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.3, exi: 0.4, des: 0.5 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 0.3, exi: 0.4, des: 0.5 } },
  },
  pacifico_sudamericano: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  atlantico_sudamericano: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  patagonia_pacifico: {
    K1: { viento: { fav: 0, ace: 1, exi: 2, des: 3 }, ola: { fav: 0.0, ace: 0.4, exi: 0.8, des: 1.2 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 2.0, exi: 3.5, des: 5.0 } },
    K2: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.5, exi: 1.0, des: 1.5 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.0, exi: 3.5, des: 5.0 } },
    K3: { viento: { fav: 0, ace: 2, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.6, exi: 1.2, des: 1.8 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.5, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 5.5 } },
    K4: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.7, exi: 1.4, des: 2.1 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.8, exi: 2.5, des: 3.5 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 5.5 } },
    K5: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.8, exi: 1.6, des: 2.4 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 2.0, exi: 2.8, des: 3.8 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 5.5 } },
  },
  patagonia_atlantico: {
    K1: { viento: { fav: 0, ace: 1, exi: 2, des: 3 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 6.0 } },
    K2: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 6.0 } },
    K3: { viento: { fav: 0, ace: 2, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.5, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 3.0, exi: 5.0, des: 7.0 } },
    K4: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.8, exi: 2.5, des: 3.5 }, marea: { fav: 0.0, ace: 3.0, exi: 5.0, des: 7.0 } },
    K5: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 2.0, exi: 2.8, des: 3.8 }, marea: { fav: 0.0, ace: 3.0, exi: 5.0, des: 7.0 } },
  },
  costa_este_australia: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  costa_sur_australia: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  costa_oeste_australia: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
  },
  costa_norte_australia: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.2, exi: 0.4, des: 0.6 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 6.0 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.7 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.5, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 6.0 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.8, exi: 2.5, des: 3.5 }, marea: { fav: 0.0, ace: 3.0, exi: 5.0, des: 7.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.1 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 2.0, exi: 2.8, des: 3.8 }, marea: { fav: 0.0, ace: 3.0, exi: 5.0, des: 7.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 2.2, exi: 3.0, des: 4.0 }, marea: { fav: 0.0, ace: 3.0, exi: 5.0, des: 7.0 } },
  },
  nueva_zelanda: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
  },
  papua_nueva_guinea: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  fiyi: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  polinesia_francesa: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.2, exi: 0.3, des: 0.4 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.2, exi: 0.3, des: 0.4 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.3, exi: 0.4, des: 0.5 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.3, exi: 0.4, des: 0.5 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 0.3, exi: 0.4, des: 0.5 } },
  },
  japon_pacifico: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
  },
  japon_mar_japon: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  corea_sur: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.2, exi: 0.4, des: 0.6 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 2.0, exi: 3.5, des: 5.0 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.7 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.0, exi: 3.5, des: 5.0 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.5, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 5.5 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.1 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.8, exi: 2.5, des: 3.5 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 5.5 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 2.0, exi: 2.8, des: 3.8 }, marea: { fav: 0.0, ace: 2.5, exi: 4.0, des: 5.5 } },
  },
  china_costera: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.2, exi: 0.4, des: 0.6 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.7 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.1 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
  },
  taiwan: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  hong_kong: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.2, exi: 0.4, des: 0.6 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.7 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.1 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  vietnam: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 7, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
  },
  tailandia_golfo: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.2, exi: 0.4, des: 0.6 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.7 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.1 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
  },
  tailandia_andaman: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
  },
  malasia_peninsular: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.2, exi: 0.4, des: 0.6 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.7 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.1 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
  },
  malasia_borneo: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 7, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
  },
  indonesia_bali: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
  },
  indonesia_java: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
  },
  indonesia_sumatra: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
  },
  indonesia_sulawesi: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
  },
  indonesia_flores: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
  },
  filipinas: {
    K1: { viento: { fav: 0, ace: 1, exi: 2, des: 3 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K2: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K3: { viento: { fav: 0, ace: 2, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
  },
  india: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
  },
  sri_lanka: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  maldivas: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
  },
  emiratos_arabes_unidos: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.2, exi: 0.4, des: 0.6 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.7 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.1 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
  },
  oman: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 7, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
  },
  mar_rojo: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.2, exi: 0.4, des: 0.6 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.7 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.1 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
  },
  marruecos_atlantico: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
  },
  sahara_occidental: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
  },
  senegal: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  costa_marfil: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  ghana: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  nigeria: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  camerun: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  angola: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  namibia: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  sudafrica_atlantico: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  sudafrica_indico: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.5, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.8, exi: 2.5, des: 3.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 2.0, exi: 2.8, des: 3.8 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  mozambique: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 10, ace: 8, exi: 6, des: 5 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.5, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.8, exi: 2.5, des: 3.5 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 2.0, exi: 2.8, des: 3.8 }, marea: { fav: 0.0, ace: 1.5, exi: 2.0, des: 3.0 } },
  },
  tanzania: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
  },
  kenia: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
  },
  somalia: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.4, exi: 2.0, des: 2.8 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 7, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.6, exi: 2.2, des: 3.0 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
  },
  eritrea: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.2, exi: 0.4, des: 0.6 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.7 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.1 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
  },
  mar_rojo_africano: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.2, exi: 0.4, des: 0.6 }, periodo: { fav: 6, ace: 5, exi: 4, des: 3 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.3, exi: 0.5, des: 0.7 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.4, exi: 0.6, des: 0.9 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.1 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, periodo: { fav: 5, ace: 4, exi: 3, des: 2 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
  },
  madagascar: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.8, exi: 1.2, des: 1.8 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.2 } },
  },
  mauricio: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
  },
  reunion: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
  },
  seychelles: {
    K1: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.2 } },
    K2: { viento: { fav: 0, ace: 3, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 0.5, exi: 0.8, des: 1.2 } },
    K3: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
    K4: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
    K5: { viento: { fav: 0, ace: 4, exi: 6, des: 7 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 0.7, exi: 1.0, des: 1.5 } },
  },
  mar_artico: {
    K1: { viento: { fav: 0, ace: 1, exi: 2, des: 3 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.5 } },
    K2: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 1.0, exi: 1.5, des: 2.5 } },
    K3: { viento: { fav: 0, ace: 2, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 1.2, exi: 2.0, des: 3.0 } },
    K4: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 1.2, exi: 2.0, des: 3.0 } },
    K5: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 1.2, exi: 2.0, des: 3.0 } },
  },
  groenlandia_sur: {
    K1: { viento: { fav: 0, ace: 1, exi: 2, des: 3 }, ola: { fav: 0.0, ace: 0.3, exi: 0.6, des: 0.9 }, periodo: { fav: 9, ace: 7, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.6, exi: 1.0, des: 1.4 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K2: { viento: { fav: 0, ace: 2, exi: 3, des: 4 }, ola: { fav: 0.0, ace: 0.4, exi: 0.7, des: 1.0 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.7, exi: 1.2, des: 1.6 }, marea: { fav: 0.0, ace: 1.5, exi: 2.5, des: 3.5 } },
    K3: { viento: { fav: 0, ace: 2, exi: 4, des: 5 }, ola: { fav: 0.0, ace: 0.5, exi: 0.9, des: 1.3 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 0.8, exi: 1.4, des: 2.0 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K4: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.6, exi: 1.1, des: 1.6 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.0, exi: 1.6, des: 2.2 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
    K5: { viento: { fav: 0, ace: 3, exi: 5, des: 6 }, ola: { fav: 0.0, ace: 0.7, exi: 1.3, des: 1.9 }, periodo: { fav: 8, ace: 6, exi: 5, des: 4 }, corriente: { fav: 0.0, ace: 1.2, exi: 1.8, des: 2.5 }, marea: { fav: 0.0, ace: 2.0, exi: 3.0, des: 4.0 } },
  },
};

export type CategoriaPatoTabla = 'P1' | 'P2' | 'P3' | 'P4';

export const UMBRALES_PATOS: Record<CategoriaPatoTabla, Umbral> = {
  P1: {
    viento: { fav: 1, ace: 2, exi: 3, des: 4 },
    ola: { fav: 0.1, ace: 0.2, exi: 0.3, des: 0.4 },
    periodo: { fav: 5, ace: 4, exi: 2, des: 2 },
    corriente: { fav: 0.2, ace: 0.3, exi: 0.5, des: 0.6 },
    marea: { fav: 0.2, ace: 0.3, exi: 0.4, des: 0.5 },
  },
  P2: {
    viento: { fav: 2, ace: 3, exi: 4, des: 4 },
    ola: { fav: 0.2, ace: 0.3, exi: 0.4, des: 0.5 },
    periodo: { fav: 5, ace: 4, exi: 2, des: 2 },
    corriente: { fav: 0.3, ace: 0.4, exi: 0.6, des: 0.7 },
    marea: { fav: 0.2, ace: 0.3, exi: 0.4, des: 0.5 },
  },
  P3: {
    viento: { fav: 2, ace: 3, exi: 4, des: 5 },
    ola: { fav: 0.2, ace: 0.4, exi: 0.6, des: 0.7 },
    periodo: { fav: 5, ace: 4, exi: 2, des: 2 },
    corriente: { fav: 0.3, ace: 0.5, exi: 0.8, des: 0.9 },
    marea: { fav: 0.2, ace: 0.3, exi: 0.4, des: 0.5 },
  },
  P4: {
    viento: { fav: 3, ace: 4, exi: 5, des: 6 },
    ola: { fav: 0.3, ace: 0.5, exi: 0.8, des: 0.9 },
    periodo: { fav: 5, ace: 4, exi: 2, des: 2 },
    corriente: { fav: 0.4, ace: 0.7, exi: 1.0, des: 1.1 },
    marea: { fav: 0.3, ace: 0.4, exi: 0.5, des: 0.6 },
  },
};

export type CategoriaCanoaTabla = 'CA1' | 'CA2' | 'CA3';

export const UMBRALES_CANOAS: Record<CategoriaCanoaTabla, Umbral> = {
  CA1: {
    viento: { fav: 1, ace: 2, exi: 3, des: 4 },
    ola: { fav: 0.1, ace: 0.2, exi: 0.4, des: 0.6 },
    periodo: { fav: 5, ace: 4, exi: 3, des: 2 },
    corriente: { fav: 0.2, ace: 0.4, exi: 0.6, des: 0.8 },
    marea: { fav: 0.2, ace: 0.3, exi: 0.5, des: 0.6 },
  },
  CA2: {
    viento: { fav: 2, ace: 3, exi: 4, des: 5 },
    ola: { fav: 0.2, ace: 0.3, exi: 0.5, des: 0.7 },
    periodo: { fav: 5, ace: 4, exi: 3, des: 2 },
    corriente: { fav: 0.3, ace: 0.5, exi: 0.8, des: 1.1 },
    marea: { fav: 0.2, ace: 0.3, exi: 0.5, des: 0.6 },
  },
  CA3: {
    viento: { fav: 2, ace: 3, exi: 5, des: 6 },
    ola: { fav: 0.3, ace: 0.4, exi: 0.7, des: 1.0 },
    periodo: { fav: 5, ace: 4, exi: 3, des: 2 },
    corriente: { fav: 0.4, ace: 0.6, exi: 1.0, des: 1.3 },
    marea: { fav: 0.3, ace: 0.4, exi: 0.6, des: 0.8 },
  },
};