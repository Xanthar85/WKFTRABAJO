// src/components/SpotCard.tsx
// WKF — Tarjeta de un punto en la pantalla Home.
// v1.010 (bugs 5, 6, 7, 8, 15, 17):
//   - Estructura nueva (DP-080):
//       Nombre / Zona geográfica
//       Coordenadas / Profundidad / Botón copiar
//       Hoy / F1 F2 F3 F4
//       Mañana / F1 F2 F3 F4
//       dd|m × 5 días más
//   - Franjas clicables desde Home (bug 6). Al clicar, abre el
//     SpotScreen con la franja activa (onOpenFranja).
//   - Home muestra 7 días (hoy a +6) (DP-079).
//   - Franjas encuadradas con el color del veredicto (bug 5).
//   - Mini-gráfico nuevo con ejes, iconos y franjas (bug 14,
//     DP-090).
//   - Arrastrar para reordenar (DP-083): props de drag opcional.
//   - Botón "Invitar a un café" fuera de la tarjeta (bug 15):
//     la Home lo gestiona.
//   - Selector de embarcación por punto (lápiz para asignar slot 1,
//     slot 2 o usar kayak activo por defecto).

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatearCoords, type FormatoCoords } from '../lib/coords.ts';
import {
  calcularVeredictoFranjaDia,
  veredictoAColor,
} from '../lib/verdict-ui.ts';
import { MiniGrafico } from './MiniGrafico.tsx';
import { SelectorEmbarcacionModal } from './SelectorEmbarcacionModal.tsx';
import {
  useAppStore,
  getEmbarcacionParaSpot,
  buscarEmbarcacionPorId,
  type Spot,
  type FranjaUsuario,
} from '../state/store.ts';
import type {
  PerfilKayakista,
  Veredicto,
} from '../lib/verdict.ts';
import type { SpotWeather } from '../lib/openmeteo.ts';

export interface SpotCardProps {
  spot: Spot;
  weather: SpotWeather | null;
  franjas: FranjaUsuario[];
  perfil: PerfilKayakista;
  formatoCoords: FormatoCoords;
  onRefresh: () => void;
  onEdit: () => void;
  onDelete: () => void;
  refreshing?: boolean;
  /**
   * Se llama al clicar una franja. Recibe el id de la franja y el
   * ISO de fecha (para que SpotScreen sepa qué día mostrar).
   */
  onOpenFranja?: (franjaId: string, fechaISO: string) => void;
  /** Reordenar por arrastre. */
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
  /** Callback opcional para navegar a la pestaña Ajustes */
  onIrAAjustes?: () => void;
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function etiquetaDiaCorta(d: Date, offset: number, lang: string, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (offset === 0) return t('home.today');
  if (offset === 1) return t('home.tomorrow');
  if (offset === 2) return t('home.dayAfter');
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'es-ES', {
    day: '2-digit',
    month: '2-digit',
  });
}

export const SpotCard: React.FC<SpotCardProps> = ({
  spot,
  weather,
  franjas,
  perfil,
  formatoCoords,
  onRefresh,
  onEdit,
  onDelete,
  refreshing = false,
  onOpenFranja,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging = false,
  onIrAAjustes,
}) => {
  const { t, i18n } = useTranslation();
  const [modalBorradoAbierto, setModalBorradoAbierto] = useState(false);
  const [modalEmbarcacionAbierto, setModalEmbarcacionAbierto] = useState(false);

  const lang = i18n.language?.startsWith('en') ? 'en' : 'es';

  // Construye los 7 días a mostrar: hoy a +6 (DP-079).
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = Array.from({ length: 7 }, (_, offset) => {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() + offset);
    return { offset, fecha, key: localDateKey(fecha) };
  });

  const ahora = new Date();

  // ¿Está ya pasada la franja? Solo aplica a hoy.
  function franjaPasada(fechaBase: Date, inicio: number, fin: number): boolean {
    const hoyKey = localDateKey(hoy);
    const fechaKey = localDateKey(fechaBase);
    if (fechaKey !== hoyKey) return false;
    const h = ahora.getHours();
    if (inicio < fin) return h >= fin;
    return h >= inicio;
  }

  const ajustes = useAppStore((s) => s.ajustes);
  const updateSpot = useAppStore((s) => s.updateSpot);

  const embarcacionSpot = getEmbarcacionParaSpot(spot, ajustes);
  const categoriaSpot = embarcacionSpot.categoriaWKF;
  const nombreEmbarcacion = `${embarcacionSpot.marca} ${embarcacionSpot.modelo}`;
  const tieneEmbarcacionPropia = spot.embarcacionId != null;

  // Veredicto por franja y día, cacheado por key+id.
  const veredictosCache = React.useMemo(() => {
    const out: Record<string, Veredicto | null> = {};
    for (const d of dias) {
      for (const f of franjas) {
        const k = `${d.key}__${f.id}`;
        out[k] = calcularVeredictoFranjaDia(
          spot, weather, f, d.fecha, categoriaSpot, perfil, embarcacionSpot
        );
      }
    }
    return out;
  }, [spot, weather, franjas, categoriaSpot, perfil, dias, embarcacionSpot]);

  // Veredictos de HOY por franja (para el mini-gráfico).
  const veredictosHoy = React.useMemo(() => {
    const out: Record<string, Veredicto | null> = {};
    for (const f of franjas) {
      out[f.id] = veredictosCache[`${dias[0].key}__${f.id}`] ?? null;
    }
    return out;
  }, [veredictosCache, franjas, dias]);

  const coordsFormateadas = formatearCoords(spot.lat, spot.lon, formatoCoords);

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '12px',
        marginBottom: '10px',
        position: 'relative',
        opacity: isDragging ? 0.4 : 1,
        cursor: draggable ? 'grab' : 'default',
      }}
    >
      {/* Fila 1: Nombre + zona + embarcación + borrar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 2,
          gap: 6,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {spot.name || t('common.unnamed')}
          </h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 6,
              fontSize: '0.7rem',
              color: 'var(--text-dim)',
              marginTop: 2,
            }}
          >
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {t(`zones.${spot.zona ?? 'mediterraneo_espanol'}`)}
            </span>
          </div>
        </div>

        <button
          onClick={() => setModalBorradoAbierto(true)}
          title={t('common.delete')}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            padding: '2px 6px',
            fontSize: '0.85rem',
            lineHeight: 1,
            borderRadius: 4,
          }}
        >
          ✕
        </button>
      </div>

      {/* Fila 2: Coordenadas + profundidad + copiar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--font-mono, Fira Code, monospace)',
          fontSize: '0.68rem',
          color: 'var(--text-dim)',
          marginBottom: 8,
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {coordsFormateadas}
        </span>
      </div>

      {/* Fila 3: 7 días × franjas clicables */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          marginBottom: 8,
        }}
      >
        {dias.map(({ offset, fecha, key }) => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <div
              style={{
                minWidth: 52,
                fontSize: '0.68rem',
                fontWeight: 600,
                color: offset === 0 ? 'var(--accent)' : 'var(--text-dim)',
                fontFamily: 'var(--font-mono, Fira Code, monospace)',
              }}
            >
              {etiquetaDiaCorta(fecha, offset, lang, t)}
            </div>
            <div style={{ display: 'flex', gap: 3, flex: 1, minWidth: 0 }}>
              {franjas.map((franja) => {
                const v = veredictosCache[`${key}__${franja.id}`] ?? null;
                const color = v ? veredictoAColor(v) : 'var(--text-dim)';
                const pasada = franjaPasada(fecha, franja.inicio, franja.fin);
                return (
                  <button
                    key={franja.id}
                    onClick={() => {
                      if (onOpenFranja) {
                        onOpenFranja(franja.id, fecha.toISOString());
                      } else {
                        onEdit();
                      }
                    }}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: '4px 3px',
                      borderRadius: 4,
                      backgroundColor: 'transparent',
                      border: `1px solid ${color}`,
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: color,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      opacity: pasada ? 0.35 : 1,
                      cursor: 'pointer',
                    }}
                  >
                    {franja.nombre}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Fila 4: Mini-gráfico con ejes, iconos y franjas */}
      <div style={{ marginBottom: 8 }}>
        <MiniGrafico
          weather={weather}
          franjas={franjas}
          veredictos={veredictosHoy}
        />
      </div>

      {/* Fila 5: Botones */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg)',
            color: refreshing ? 'var(--text-dim)' : 'var(--text)',
            fontSize: '0.75rem',
            fontWeight: 500,
            cursor: refreshing ? 'not-allowed' : 'pointer',
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          {refreshing ? t('home.card.loading') : t('home.card.refresh')}
        </button>
      </div>

      {modalBorradoAbierto && (
        <div
          onClick={() => setModalBorradoAbierto(false)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            zIndex: 4000,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--verdict-desaconsejado)',
              borderRadius: 12, padding: 20,
              maxWidth: 380, width: '100%',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            }}
          >
            <h3 style={{
              margin: '0 0 10px 0',
              fontSize: '1rem', fontWeight: 700,
              color: 'var(--verdict-desaconsejado)',
            }}>
              {spot.waypointFavId
                ? 'Borrar punto'
                : t('common.delete')}
            </h3>
            <p style={{
              margin: '0 0 16px 0',
              fontSize: '0.85rem',
              color: 'var(--text)',
              lineHeight: 1.5,
            }}>
              {spot.waypointFavId
                ? `El punto "${spot.name}" tiene un waypoint asociado en WKF Fav. ¿Qué quieres borrar?`
                : `¿Borrar el punto "${spot.name}"?`}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {spot.waypointFavId && (
                <button
                  type="button"
                  onClick={async () => {
                    const { useNavegacionStore } = await import(
                      '../state/navegacion-store.ts'
                    );
                    await useNavegacionStore
                      .getState()
                      .eliminarWaypointSpot(spot.waypointFavId);
                    onDelete();
                    setModalBorradoAbierto(false);
                  }}
                  style={{
                    padding: '10px 14px', borderRadius: 8,
                    border: '1px solid var(--verdict-desaconsejado)',
                    backgroundColor: 'rgba(255, 45, 85, 0.15)',
                    color: 'var(--verdict-desaconsejado)',
                    fontSize: '0.85rem', fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Borrar punto y waypoint
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  setModalBorradoAbierto(false);
                }}
                style={{
                  padding: '10px 14px', borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text)',
                  fontSize: '0.85rem', cursor: 'pointer',
                }}
              >
                {spot.waypointFavId ? 'Borrar solo el punto' : t('common.delete')}
              </button>
              <button
                type="button"
                onClick={() => setModalBorradoAbierto(false)}
                style={{
                  padding: '10px 14px', borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-dim)',
                  fontSize: '0.85rem', cursor: 'pointer',
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para elegir embarcación por punto */}
      {modalEmbarcacionAbierto && (
        <SelectorEmbarcacionModal
          embarcacionIdActual={spot.embarcacionId ?? null}
          onSelect={(id) => {
            updateSpot(spot.id, { embarcacionId: id ?? undefined });
          }}
          onClose={() => setModalEmbarcacionAbierto(false)}
          onIrAAjustes={onIrAAjustes}
        />
      )}
    </div>
  );
};

export default SpotCard;