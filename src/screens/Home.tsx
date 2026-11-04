// src/screens/Home.tsx
// WKF — Pantalla principal.

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, type Spot } from '../state/store.ts';
import { Logo } from '../components/Logo.tsx';
import { SettingsScreen } from './SettingsScreen.tsx';
import { SpotScreen } from './SpotScreen.tsx';
import { MapScreen } from './MapScreen.tsx';
import { TutorialScreen } from './TutorialScreen.tsx';
import { SpotCard } from '../components/SpotCard.tsx';
import { PWAInstallButton } from '../components/PWAInstallButton.tsx';
import { APKInstallButton } from '../components/APKInstallButton.tsx';
import { ShareButton } from '../components/ShareButton.tsx';
import { PantallaDeslizante } from '../components/PantallaDeslizante.tsx';
import { fetchSpotWeather } from '../lib/openmeteo.ts';
import { resolverModelo } from '../lib/modelos.ts';
import { PrevisionScreen } from './PrevisionScreen.tsx';
import { NavegacionScreen } from './NavegacionScreen.tsx';
import {
  WKFPuntosIcon,
  WKFPrevisionIcon,
  WKFNavegacionIcon,
  WKFKoFiIcon,
  WKFAjustesIcon,
} from '../components/IconosBarra.tsx';
import { useNavegacionStore } from '../state/navegacion-store.ts';

type PestanaActiva = 'puntos' | 'prevision' | 'navegacion' | 'ajustes';

const PESTANAS_VALIDAS: PestanaActiva[] = [
  'navegacion',
  'puntos',
  'prevision',
  'ajustes',
];

function leerPestanaInicial(): PestanaActiva {
  if (typeof sessionStorage === 'undefined') return 'prevision';
  const guardada = sessionStorage.getItem('wkf-pestana-activa');
  if (guardada && PESTANAS_VALIDAS.includes(guardada as PestanaActiva)) {
    return guardada as PestanaActiva;
  }
  return 'prevision';
}

function colorContador(count: number): string {
  if (count <= 1) return 'var(--verdict-favorable)';
  if (count <= 3) return 'var(--verdict-aceptable)';
  if (count <= 5) return 'var(--verdict-exigente)';
  return 'var(--verdict-desaconsejado)';
}

const NAV_BAR_HEIGHT = 60;

export const Home: React.FC = () => {
  const { t } = useTranslation();

  const [pestanaActiva, setPestanaActiva] = useState<PestanaActiva>(
    leerPestanaInicial
  );
  const [pestanasMontadas, setPestanasMontadas] = useState<Set<PestanaActiva>>(
    () => new Set<PestanaActiva>([leerPestanaInicial()])
  );

  useEffect(() => {
    setPestanasMontadas((prev) => {
      if (prev.has(pestanaActiva)) return prev;
      const next = new Set(prev);
      next.add(pestanaActiva);
      return next;
    });
  }, [pestanaActiva]);

  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('wkf-pestana-activa', pestanaActiva);
    }
  }, [pestanaActiva]);
  const [cerrandoSpot, setCerrandoSpot] = useState(false);
  const [cerrandoMapa, setCerrandoMapa] = useState(false);
  const [cerrandoTutorial, setCerrandoTutorial] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [viewingSpotId, setViewingSpotId] = useState<string | null>(null);
  const [viewingSpotDate, setViewingSpotDate] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<'new' | 'edit' | null>(null);
  const [mapFocus, setMapFocus] = useState<'general' | 'acceso'>('general');
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [editSpot, setEditSpot] = useState<Spot | null>(null);
  const [refreshingMap, setRefreshingMap] = useState<Record<string, boolean>>({});
  const refreshingRef = useRef<Record<string, boolean>>({});
  const [errorAviso, setErrorAviso] = useState<string | null>(null);
  const errorTimeoutRef = useRef<number | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const spots = useAppStore((s) => s.spots);
  const ajustes = useAppStore((s) => s.ajustes);
  const getFreshWeather = useAppStore((s) => s.getFreshWeather);
  const getWeatherEntry = useAppStore((s) => s.getWeatherEntry);
  const setWeather = useAppStore((s) => s.setWeather);
  const addSpot = useAppStore((s) => s.addSpot);
  const updateSpot = useAppStore((s) => s.updateSpot);
  const removeSpot = useAppStore((s) => s.removeSpot);
  const setFranjaActiva = useAppStore((s) => s.setFranjaActiva);
  const reorderSpots = useAppStore((s) => s.reorderSpots);
  const cargarNavegacion = useNavegacionStore((s) => s.cargar);
  const cargadoNavegacion = useNavegacionStore((s) => s.cargado);

  const autoFetchDoneRef = useRef(false);

  useEffect(() => {
    if (!cargadoNavegacion) {
      void cargarNavegacion();
    }
  }, [cargadoNavegacion, cargarNavegacion]);

  useEffect(() => {
    const irAAjustesHandler = () => {
      setViewingSpotId(null);
      setPestanaActiva('ajustes');
    };
    window.addEventListener('wkf:ir-a-ajustes', irAAjustesHandler);

    const irAAnadirPuntoHandler = () => {
      setEditSpot(null);
      setMapFocus('general');
      setMapMode('new');
      setCerrandoMapa(false);
      setMostrarMapa(true);
      setPestanaActiva('puntos');
    };
    window.addEventListener('wkf:ir-a-anadir-punto', irAAnadirPuntoHandler);

    return () => {
      window.removeEventListener('wkf:ir-a-ajustes', irAAjustesHandler);
      window.removeEventListener('wkf:ir-a-anadir-punto', irAAnadirPuntoHandler);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  const estadoRef = useRef({
    pestanaActiva,
    viewingSpotId,
    mostrarMapa,
    showTutorial,
  });
  useEffect(() => {
    estadoRef.current = {
      pestanaActiva,
      viewingSpotId,
      mostrarMapa,
      showTutorial,
    };
  }, [pestanaActiva, viewingSpotId, mostrarMapa, showTutorial]);

  const guardiaActivaRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const empujarGuardia = () => {
      try {
        window.history.pushState({ wkfGuard: true }, '');
        guardiaActivaRef.current = true;
      } catch {
        // ignore
      }
    };

    empujarGuardia();

    const onPopState = () => {
      const st = estadoRef.current;

      if (st.showTutorial) {
        setCerrandoTutorial(true);
        setTimeout(() => setShowTutorial(false), 220);
        empujarGuardia();
        return;
      }
      if (st.mostrarMapa) {
        setCerrandoMapa(true);
        setTimeout(() => {
          setMostrarMapa(false);
          setMapMode(null);
          setEditSpot(null);
        }, 220);
        empujarGuardia();
        return;
      }
      if (st.viewingSpotId !== null) {
        setCerrandoSpot(true);
        setTimeout(() => {
          setViewingSpotId(null);
          setViewingSpotDate(null);
        }, 220);
        empujarGuardia();
        return;
      }

      const esInicio =
        st.pestanaActiva === 'prevision' ||
        st.pestanaActiva === 'navegacion' ||
        st.pestanaActiva === 'puntos';
      if (!esInicio) {
        setPestanaActiva('prevision');
        empujarGuardia();
        return;
      }

      const salir = window.confirm(
        t('app.salir', {
          defaultValue: '¿Quieres salir de WKF?',
        })
      );
      if (salir) {
        guardiaActivaRef.current = false;
        try {
          window.history.go(-2);
        } catch {
          // ignore
        }
      } else {
        empujarGuardia();
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefreshSpot = async (spotId: string, lat: number, lon: number) => {
    if (refreshingRef.current[spotId] || refreshingMap[spotId]) return;
    refreshingRef.current[spotId] = true;
    setRefreshingMap((prev) => ({ ...prev, [spotId]: true }));
    setErrorAviso(null);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    try {
      const data = await fetchSpotWeather(lat, lon);
      const modeloId = resolverModelo(useAppStore.getState().ajustes.modeloPrevision, lat, lon);
      setWeather(spotId, modeloId, data);
    } catch (err) {
      console.error('Error refreshing weather for spot', spotId, err);
      setErrorAviso(
        t('errores.refreshFailed', {
          defaultValue:
            'No se han podido actualizar los datos. Vuelve a intentarlo en unos minutos.',
        })
      );
      errorTimeoutRef.current = window.setTimeout(() => {
        setErrorAviso(null);
      }, 6000);
    } finally {
      refreshingRef.current[spotId] = false;
      setRefreshingMap((prev) => ({ ...prev, [spotId]: false }));
    }
  };

  useEffect(() => {
    if (spots.length === 0) return;
    if (autoFetchDoneRef.current) return;
    autoFetchDoneRef.current = true;

    for (const spot of spots) {
      const modeloId = resolverModelo(ajustes.modeloPrevision, spot.lat, spot.lon);
      const entry = getWeatherEntry(spot.id, modeloId);
      if (!entry || entry.stale) {
        void handleRefreshSpot(spot.id, spot.lat, spot.lon);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots.length]);

  const abrirPunto = (spotId: string, franjaId?: string, fechaISO?: string) => {
    if (franjaId) setFranjaActiva(franjaId);
    setViewingSpotDate(fechaISO ?? null);
    setViewingSpotId(spotId);
  };

  if (showTutorial) {
    return (
      <PantallaDeslizante
        activa={!cerrandoTutorial}
        onClose={() => {
          setShowTutorial(false);
          setCerrandoTutorial(false);
        }}
      >
        <TutorialScreen onClose={() => setCerrandoTutorial(true)} />
      </PantallaDeslizante>
    );
  }

  const handleDragStart =
    (spotId: string) => (e: React.DragEvent<HTMLDivElement>) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', spotId);
      setDraggingId(spotId);
    };

  const handleDragOver =
    (spotId: string) => (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverId !== spotId) setDragOverId(spotId);
    };

  const handleDrop =
    (targetId: string) => (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData('text/plain') || draggingId;
      setDraggingId(null);
      setDragOverId(null);
      if (!sourceId || sourceId === targetId) return;
      const from = spots.findIndex((s) => s.id === sourceId);
      const to = spots.findIndex((s) => s.id === targetId);
      if (from < 0 || to < 0) return;
      const copia = [...spots];
      const [movido] = copia.splice(from, 1);
      copia.splice(to, 0, movido);
      reorderSpots(copia.map((s) => s.id));
    };

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          paddingTop: 'max(12px, env(safe-area-inset-top))',
        }}
      >
        <Logo size="md" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <APKInstallButton />
          <ShareButton size="md" />
          <PWAInstallButton />
        </div>
      </header>

      {errorAviso && (
        <div
          role="alert"
          style={{
            maxWidth: '680px',
            margin: '12px auto 0',
            width: 'calc(100% - 40px)',
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid var(--verdict-desaconsejado)',
            backgroundColor: 'rgba(255, 45, 85, 0.12)',
            color: 'var(--verdict-desaconsejado)',
            fontSize: '0.85rem',
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            boxSizing: 'border-box',
          }}
        >
          <span>⚠️ {errorAviso}</span>
          <button
            type="button"
            onClick={() => setErrorAviso(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--verdict-desaconsejado)',
              cursor: 'pointer',
              fontSize: '0.95rem',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      )}

      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          width: '100%',
          maxWidth: '680px',
          margin: '0 auto',
          padding: '20px',
          boxSizing: 'border-box',
          paddingBottom: `calc(${NAV_BAR_HEIGHT + 20}px + env(safe-area-inset-bottom))`,
        }}
      >
        <div style={{ display: pestanaActiva === 'puntos' ? 'block' : 'none' }}>
          {spots.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                textAlign: 'center',
                backgroundColor: 'var(--surface)',
                borderRadius: 8,
                border: '1px solid var(--border)',
                marginTop: 20,
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.7 }}>
                📌
              </div>
              <h3
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                {t('home.noSpots')}
              </h3>
              <p
                style={{
                  margin: '0 0 20px 0',
                  fontSize: '0.9rem',
                  color: 'var(--text-dim)',
                  maxWidth: 360,
                }}
              >
                {t('home.empty.subtitle')}
              </p>
              <button
                onClick={() => {
                  setEditSpot(null);
                  setMapFocus('general');
                  setMapMode('new');
                  setCerrandoMapa(false);
                  setMostrarMapa(true);
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'var(--accent)',
                  color: '#000',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 229, 106, 0.25)',
                }}
              >
                + {t('home.addSpot')}
              </button>
            </div>
          ) : (
            <div style={{ paddingBottom: 80 }}>
              {spots.map((spot) => (
                <SpotCard
                  key={spot.id}
                  spot={spot}
                  weather={getFreshWeather(
                    spot.id,
                    resolverModelo(ajustes.modeloPrevision, spot.lat, spot.lon)
                  )}
                  franjas={ajustes.franjas}
                  perfil={ajustes.perfil}
                  formatoCoords={ajustes.formatoCoords}
                  refreshing={!!refreshingMap[spot.id]}
                  onRefresh={() => handleRefreshSpot(spot.id, spot.lat, spot.lon)}
                  onEdit={() => setViewingSpotId(spot.id)}
                  onDelete={() => removeSpot(spot.id)}
                  onOpenFranja={(franjaId, fechaISO) =>
                    abrirPunto(spot.id, franjaId, fechaISO)
                  }
                  draggable
                  isDragging={draggingId === spot.id}
                  onDragStart={handleDragStart(spot.id)}
                  onDragOver={handleDragOver(spot.id)}
                  onDrop={handleDrop(spot.id)}
                  onIrAAjustes={() => setPestanaActiva('ajustes')}
                />
              ))}

              <div
                style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  borderRadius: 8,
                  backgroundColor: 'var(--surface)',
                  border: `1px solid ${colorContador(spots.length)}`,
                  color: colorContador(spots.length),
                  fontFamily: 'var(--font-mono, Fira Code, monospace)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  letterSpacing: '0.04em',
                }}
              >
                {t('home.activeSpots', {
                  count: spots.length,
                  max: 6,
                  defaultValue: `Puntos activos ${spots.length}/6`,
                })}
              </div>
            </div>
          )}
        </div>

        {pestanasMontadas.has('prevision') && (
          <div style={{ display: pestanaActiva === 'prevision' ? 'block' : 'none' }}>
            <PrevisionScreen />
          </div>
        )}

        {pestanasMontadas.has('navegacion') && (
          <div
            style={{
              display: pestanaActiva === 'navegacion' ? 'flex' : 'none',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              height: '100%',
            }}
          >
            <NavegacionScreen />
          </div>
        )}

        {pestanasMontadas.has('ajustes') && (
          <div style={{ display: pestanaActiva === 'ajustes' ? 'block' : 'none' }}>
            <SettingsScreen
              onClose={() => setPestanaActiva('prevision')}
              onOpenTutorial={() => {
                setPestanaActiva('prevision');
                setShowTutorial(true);
              }}
            />
          </div>
        )}
      </main>

      {pestanaActiva === 'puntos' && spots.length > 0 && spots.length < 6 && (
        <div
          style={{
            position: 'fixed',
            bottom: `calc(${NAV_BAR_HEIGHT + 20}px + env(safe-area-inset-bottom))`,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 90,
            pointerEvents: 'none',
          }}
        >
          <button
            onClick={() => {
              setEditSpot(null);
              setMapFocus('general');
              setMapMode('new');
              setCerrandoMapa(false);
              setMostrarMapa(true);
            }}
            style={{
              pointerEvents: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              backgroundColor: 'var(--accent)',
              color: '#000',
              border: 'none',
              borderRadius: 24,
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow:
                '0 4px 16px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 229, 106, 0.3)',
            }}
          >
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span>
            <span>{t('home.addSpot')}</span>
          </button>
        </div>
      )}

      {/* Barra inferior fija: Puntos | Previsión | Navegación | Ko-fi | Ajustes */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: `calc(${NAV_BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
          paddingBottom: 'env(safe-area-inset-bottom)',
          backgroundColor: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 100,
          boxSizing: 'border-box',
        }}
      >
        <button
          type="button"
          onClick={() => setPestanaActiva('puntos')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            padding: '4px 8px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'transparent',
            fontSize: '0.7rem',
            height: '100%',
          }}
        >
          <WKFPuntosIcon size={48} glow={pestanaActiva === 'puntos'} activo={pestanaActiva === 'puntos'} />
          <span style={{ color: pestanaActiva === 'puntos' ? 'var(--accent)' : 'var(--text-dim)', fontWeight: pestanaActiva === 'puntos' ? 600 : 400 }}>
            {t('tabs.spots', { defaultValue: 'Puntos' })}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPestanaActiva('prevision')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            padding: '4px 8px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'transparent',
            fontSize: '0.7rem',
            height: '100%',
          }}
        >
          <WKFPrevisionIcon size={48} glow={pestanaActiva === 'prevision'} activo={pestanaActiva === 'prevision'} />
          <span style={{ color: pestanaActiva === 'prevision' ? '#00B8FF' : 'var(--text-dim)', fontWeight: pestanaActiva === 'prevision' ? 600 : 400 }}>
            {t('tabs.forecast', { defaultValue: 'Previsión' })}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPestanaActiva('navegacion')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            padding: '4px 8px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'transparent',
            fontSize: '0.7rem',
            height: '100%',
          }}
        >
          <WKFNavegacionIcon size={48} glow={pestanaActiva === 'navegacion'} activo={pestanaActiva === 'navegacion'} />
          <span style={{ color: pestanaActiva === 'navegacion' ? '#FF2D55' : 'var(--text-dim)', fontWeight: pestanaActiva === 'navegacion' ? 600 : 400 }}>
            {t('navegacion.tab', { defaultValue: 'Navegación' })}
          </span>
        </button>

        <a
          href="https://ko-fi.com/xanthar"
          target="_blank"
          rel="noopener noreferrer"
          title="Señuelos"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            padding: '4px 8px',
            textDecoration: 'none',
            color: 'transparent',
            fontSize: '0.7rem',
            height: '100%',
          }}
        >
          <div
            className="wkf-senuelos-icon-wrap"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter:
                'drop-shadow(0 0 10px var(--verdict-aceptable)) drop-shadow(0 0 20px var(--verdict-aceptable)) brightness(1.4) saturate(1.2)',
            }}
          >
            <WKFKoFiIcon size={48} glow={false} activo={true} />
          </div>
          <span style={{ color: 'var(--verdict-aceptable)', fontWeight: 500 }}>
            Señuelos
          </span>
          <style>{`
            .wkf-senuelos-icon-wrap svg g[stroke] {
              stroke: var(--verdict-aceptable) !important;
            }
            .wkf-senuelos-icon-wrap svg path[fill] {
              fill: var(--verdict-aceptable) !important;
            }
            .wkf-senuelos-icon-wrap svg line[stroke] {
              stroke: var(--verdict-aceptable) !important;
            }
          `}</style>
        </a>

        <button
          type="button"
          onClick={() => setPestanaActiva('ajustes')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            padding: '4px 10px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'transparent',
            fontSize: '0.7rem',
            height: '100%',
          }}
        >
          <WKFAjustesIcon size={48} glow={pestanaActiva === 'ajustes'} activo={pestanaActiva === 'ajustes'} />
          <span style={{ color: pestanaActiva === 'ajustes' ? '#FF8A00' : 'var(--text-dim)', fontWeight: pestanaActiva === 'ajustes' ? 600 : 400 }}>
            {t('tabs.settings', { defaultValue: 'Ajustes' })}
          </span>
        </button>
      </nav>

      {viewingSpotId !== null && (
        <PantallaDeslizante
          activa={!cerrandoSpot}
          zIndex={200}
          onClose={() => {
            setViewingSpotId(null);
            setViewingSpotDate(null);
            setCerrandoSpot(false);
          }}
        >
          <SpotScreen
            spotId={viewingSpotId}
            onClose={() => setCerrandoSpot(true)}
            initialDate={viewingSpotDate}
            onDateChange={(iso) => setViewingSpotDate(iso)}
            onEditSpot={(spotId, focus) => {
              const s = spots.find((x) => x.id === spotId);
              if (s) {
                setEditSpot(s);
                setMapFocus(focus ?? 'general');
                setMapMode('edit');
                setCerrandoMapa(false);
                setMostrarMapa(true);
              }
            }}
          />
        </PantallaDeslizante>
      )}

      {mostrarMapa && (
        <PantallaDeslizante
          activa={!cerrandoMapa}
          zIndex={300}
          onClose={() => {
            setMostrarMapa(false);
            setCerrandoMapa(false);
            setEditSpot(null);
            setMapMode(null);
          }}
        >
          <MapScreen
            initialSpot={editSpot}
            initialFocus={mapFocus}
            onCancel={() => setCerrandoMapa(true)}
            onSave={(draft) => {
              if (editSpot) {
                const coordsChanged =
                  editSpot.lat !== draft.lat || editSpot.lon !== draft.lon;
                updateSpot(editSpot.id, draft);
                if (coordsChanged) {
                  void handleRefreshSpot(editSpot.id, draft.lat, draft.lon);
                }
              } else {
                addSpot(draft);
              }
              setCerrandoMapa(true);
            }}
          />
        </PantallaDeslizante>
      )}
    </div>
  );
};

export default Home;
// src/screens/Home.tsx