// src/screens/MapScreen.tsx
// WKF — Pantalla de mapa (nuevo/editar punto).
// v1.010: sin cambios funcionales. La profundidad sigue el mismo
// flujo (obtenerProfundidad). Se mantiene la firma.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { Spot } from '../state/store.ts';
import type { Zona, TipoAcceso } from '../lib/verdict.ts';
import { stringsEs } from '../i18n/strings.es.ts';
import { detectarZona, centroideDeZona } from '../lib/zonas-geo.ts';
import { parsearCoords } from '../lib/coords.ts';

const SPAIN_CENTER: [number, number] = [39.5, -0.5];
const INITIAL_ZOOM = 6;

function createPinIcon(color: string) {
  return L.divIcon({
    className: 'wkf-pin',
    html: `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="16" r="11" stroke="${color}" stroke-width="2" fill="#0A0A0A"/>
        <circle cx="20" cy="16" r="3.5" fill="${color}"/>
        <line x1="20" y1="3" x2="20" y2="6" stroke="${color}" stroke-width="1.5"/>
        <line x1="20" y1="26" x2="20" y2="29" stroke="${color}" stroke-width="1.5"/>
        <line x1="7" y1="16" x2="10" y2="16" stroke="${color}" stroke-width="1.5"/>
        <line x1="30" y1="16" x2="33" y2="16" stroke="${color}" stroke-width="1.5"/>
        <path d="M20 29 L17 34 L20 33 L23 34 Z" fill="${color}"/>
      </svg>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 34],
  });
}

const pinPescaIcon = createPinIcon('#00E56A'); // verde lima
const pinAccesoIcon = createPinIcon('#00B8FF'); // azul cian

const TODAS_ZONAS = Object.keys(stringsEs.zones) as Zona[];
const TIPOS_ACCESO: TipoAcceso[] = ['playa', 'roca', 'puerto_escollera', 'otro'];

export interface MapScreenProps {
  initialSpot?: Spot | null;
  initialFocus?: 'general' | 'acceso';
  onCancel: () => void;
  onSave: (draft: Omit<Spot, 'id' | 'createdAt'>) => void;
}

function ClickHandler({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (disabled) return;
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapController({ onMap }: { onMap: (map: L.Map) => void }) {
  const map = useMap();
  React.useEffect(() => {
    onMap(map);
  }, [map, onMap]);
  return null;
}

export const MapScreen: React.FC<MapScreenProps> = ({
  initialSpot,
  initialFocus = 'general',
  onCancel,
  onSave,
}) => {
  const { t, i18n } = useTranslation();
  const isEditing = !!initialSpot;

  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  const accessSectionRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (initialFocus === 'acceso') {
      const timer = setTimeout(() => {
        accessSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [initialFocus]);

  const [puntoPesca, setPuntoPesca] = useState<{ lat: number; lon: number } | null>(
    initialSpot ? { lat: initialSpot.lat, lon: initialSpot.lon } : null
  );

  const [puntoAcceso, setPuntoAcceso] = useState<{
    lat: number;
    lon: number;
  } | null>(
    initialSpot?.accesoLat != null && initialSpot?.accesoLon != null
      ? {
          lat: initialSpot.accesoLat,
          lon: initialSpot.accesoLon,
        }
      : null
  );

  const [nombre, setNombre] = useState(initialSpot?.name ?? '');
  const [nombreEditadoManualmente, setNombreEditadoManualmente] = useState(
    !!initialSpot?.name
  );

  const [zona, setZona] = useState<Zona>(
    initialSpot?.zona ?? 'mediterraneo_espanol'
  );
  const [tipoAcceso, setTipoAcceso] = useState<TipoAcceso | null>(
    initialSpot?.tipoAcceso ?? null
  );


  const zonasOrdenadas = React.useMemo(() => {
    return [...TODAS_ZONAS].sort((a, b) => {
      const labelA = t(`zones.${a}`);
      const labelB = t(`zones.${b}`);
      return labelA.localeCompare(labelB);
    });
  }, [t]);

  async function handleBuscar(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const query = busqueda.trim();
    if (!query) return;

    const coords = parsearCoords(query);
    if (coords && mapInstance) {
      mapInstance.flyTo([coords.lat, coords.lon], 12);
      return;
    }

    setBuscando(true);
    setErrorBusqueda(null);
    const lang = i18n.language && i18n.language.startsWith('en') ? 'en' : 'es';

    try {
      let lat: number | null = null;
      let lon: number | null = null;

      try {
        const urlNominatim = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          query
        )}&limit=5&accept-language=${lang}`;
        const res = await fetch(urlNominatim, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'WKF-WebApp/0.1',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            lat = parseFloat(data[0].lat);
            lon = parseFloat(data[0].lon);
          }
        }
      } catch {
        // fallback
      }

      if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
        try {
          const urlOpenMeteo = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            query
          )}&count=5&language=${lang}`;
          const res = await fetch(urlOpenMeteo, {
            headers: { Accept: 'application/json' },
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data?.results) && data.results.length > 0) {
              lat = data.results[0].latitude;
              lon = data.results[0].longitude;
            }
          }
        } catch {
          // fallback falló
        }
      }

      if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
        if (mapInstance) {
          mapInstance.flyTo([lat, lon], 11);
        }
      } else {
        setErrorBusqueda(t('errores.geocoder'));
        setTimeout(() => setErrorBusqueda(null), 3000);
      }
    } finally {
      setBuscando(false);
    }
  }

  async function handlePick(lat: number, lon: number) {
    setPuntoPesca({ lat, lon });

    const zonaDetectada = detectarZona(lat, lon);
    setZona(zonaDetectada);

    try {
      const lang = i18n.language && i18n.language.startsWith('en') ? 'en' : 'es';
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1&accept-language=${lang}`;
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'WKF-WebApp/0.1',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const addr = data?.address;
        const suggested =
          addr?.village ||
          addr?.hamlet ||
          addr?.town ||
          addr?.city ||
          addr?.municipality ||
          addr?.suburb ||
          addr?.city_district ||
          addr?.county ||
          addr?.state_district ||
          addr?.state ||
          (data?.name && data?.name !== addr?.country ? data.name : '') ||
          '';
        if (suggested && !nombreEditadoManualmente) {
          setNombre(suggested);
        }
      }
    } catch {
      // Ignorar fallo de geocodificación
    }
  }

  function handleZonaChange(nuevaZona: Zona) {
    setZona(nuevaZona);
    const c = centroideDeZona(nuevaZona);
    if (c && mapInstance) {
      mapInstance.flyTo([c.lat, c.lon], 7);
    }
  }

  React.useEffect(() => {
    if (!mapInstance || !puntoPesca) return;
    if (puntoAcceso && (puntoAcceso.lat !== puntoPesca.lat || puntoAcceso.lon !== puntoPesca.lon)) {
      const bounds = L.latLngBounds(
        [puntoPesca.lat, puntoPesca.lon],
        [puntoAcceso.lat, puntoAcceso.lon]
      );
      mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else {
      mapInstance.setView([puntoPesca.lat, puntoPesca.lon], 13);
    }
  }, [mapInstance]);

  function handleSave() {
    if (!puntoPesca) return;
    const trimmed = nombre.trim() || t('map.unnamed');
    onSave({
      name: trimmed,
      lat: puntoPesca.lat,
      lon: puntoPesca.lon,
      zona,
      tipoAcceso,
      accesoLat: puntoAcceso?.lat ?? null,
      accesoLon: puntoAcceso?.lon ?? null,
    });
  }

  const mapCenter: [number, number] = puntoPesca
    ? [puntoPesca.lat, puntoPesca.lon]
    : SPAIN_CENTER;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'Inter, system-ui, sans-serif',
        zIndex: 1000,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '6px 12px',
            backgroundColor: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text)',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          {t('common.cancel')}
        </button>

        <span
          style={{
            fontFamily: 'var(--font-mono, Fira Code, monospace)',
            fontWeight: 600,
            fontSize: '0.95rem',
            letterSpacing: '0.04em',
          }}
        >
          {isEditing ? t('map.editSpot') : t('map.newSpot')}
        </span>

        <button
          type="button"
          disabled={!puntoPesca}
          onClick={handleSave}
          style={{
            padding: '6px 16px',
            backgroundColor: puntoPesca ? 'var(--accent)' : 'var(--border)',
            color: puntoPesca ? '#000' : 'var(--text-dim)',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: puntoPesca ? 'pointer' : 'not-allowed',
          }}
        >
          {t('common.save')}
        </button>
      </header>

      <div style={{ flex: 1, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            marginLeft: 56,
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            pointerEvents: 'none',
          }}
        >
          <form
            onSubmit={handleBuscar}
            style={{
              display: 'flex',
              gap: 8,
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 10,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
              pointerEvents: 'auto',
            }}
          >
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={t('common.search')}
              style={{
                flex: 1,
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '8px 12px',
                color: 'var(--text)',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="submit"
              disabled={buscando || !busqueda.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--accent)',
                color: '#000',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: buscando || !busqueda.trim() ? 'not-allowed' : 'pointer',
                opacity: buscando || !busqueda.trim() ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {buscando ? '...' : t('common.search')}
            </button>
          </form>

          {errorBusqueda && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.95)',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: '0.8rem',
                fontWeight: 500,
                textAlign: 'center',
                pointerEvents: 'auto',
                alignSelf: 'center',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              }}
            >
              {errorBusqueda}
            </div>
          )}
        </div>

        <MapContainer
          center={mapCenter}
          zoom={puntoPesca ? 12 : INITIAL_ZOOM}
          style={{ width: '100%', height: '100%' }}
        >
          <MapController onMap={setMapInstance} />

          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <ClickHandler disabled={false} onPick={handlePick} />

          {puntoPesca && (
            <Marker
              position={[puntoPesca.lat, puntoPesca.lon]}
              icon={pinPescaIcon}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target as L.Marker;
                  const latlng = marker.getLatLng();
                  setPuntoPesca({ lat: latlng.lat, lon: latlng.lng });
                  const zonaDetectada = detectarZona(latlng.lat, latlng.lng);
                  setZona(zonaDetectada);
                },
              }}
            />
          )}

          {tipoAcceso != null && puntoAcceso && (
            <Marker
              position={[puntoAcceso.lat, puntoAcceso.lon]}
              icon={pinAccesoIcon}
              draggable={true}
              zIndexOffset={500}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target as L.Marker;
                  const latlng = marker.getLatLng();
                  setPuntoAcceso({
                    lat: latlng.lat,
                    lon: latlng.lng,
                  });
                },
              }}
            >
              <Tooltip permanent direction="bottom" offset={[0, 10]}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  {t('access.dragToAdjust')}
                </span>
              </Tooltip>
            </Marker>
          )}

          {tipoAcceso != null && puntoPesca && puntoAcceso && (
            <Polyline
              positions={[
                [puntoPesca.lat, puntoPesca.lon],
                [puntoAcceso.lat, puntoAcceso.lon],
              ]}
              pathOptions={{
                color: '#00B8FF',
                dashArray: '4 4',
                weight: 2,
              }}
            />
          )}
        </MapContainer>

        {puntoPesca && (
          <div
            style={{
              position: 'absolute',
              left: 12,
              right: 12,
              bottom: 16,
              maxHeight: '45vh',
              overflowY: 'auto',
              padding: 12,
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-dim)',
                  marginBottom: 4,
                }}
              >
                {t('map.spotName')}
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => {
                  const val = e.target.value;
                  setNombre(val);
                  if (val.trim() === '') {
                    setNombreEditadoManualmente(false);
                  } else {
                    setNombreEditadoManualmente(true);
                  }
                }}
                placeholder={t('map.spotNamePlaceholder')}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  borderRadius: 6,
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-dim)',
                  marginBottom: 4,
                }}
              >
                {t('settings.zones')}
              </label>
              <select
                value={zona}
                onChange={(e) => handleZonaChange(e.target.value as Zona)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  borderRadius: 6,
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              >
                {zonasOrdenadas.map((z) => (
                  <option key={z} value={z}>
                    {t(`zones.${z}`)}
                  </option>
                ))}
              </select>
            </div>

            <div
              ref={accessSectionRef}
              style={{
                borderRadius: 8,
                padding: initialFocus === 'acceso' ? '8px 10px' : 0,
                border: initialFocus === 'acceso' ? '1px solid var(--accent-2)' : 'none',
                backgroundColor: initialFocus === 'acceso' ? 'rgba(0, 184, 255, 0.06)' : 'transparent',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: initialFocus === 'acceso' ? 'var(--accent-2)' : 'var(--text-dim)',
                  fontWeight: initialFocus === 'acceso' ? 600 : 400,
                  marginBottom: 4,
                }}
              >
                <span>{t('access.title')}</span>
                {initialFocus === 'acceso' && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--accent-2)', fontWeight: 600 }}>
                    {tipoAcceso == null ? '📍 Configurar acceso' : `✓ ${t(`access.${tipoAcceso}`)}`}
                  </span>
                )}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {TIPOS_ACCESO.map((tipo) => {
                  const active = tipoAcceso === tipo;
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => {
                        const nuevoTipo = active ? null : tipo;
                        setTipoAcceso(nuevoTipo);
                        if (nuevoTipo !== null && !puntoAcceso && puntoPesca) {
                          setPuntoAcceso({
                            lat: puntoPesca.lat,
                            lon: puntoPesca.lon,
                          });
                        }
                        if (nuevoTipo === null) {
                          setPuntoAcceso(null);
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: `1px solid ${
                          active ? 'var(--accent-2)' : 'var(--border)'
                        }`,
                        backgroundColor: active
                          ? 'rgba(0, 184, 255, 0.15)'
                          : 'var(--bg)',
                        color: active ? 'var(--accent-2)' : 'var(--text-dim)',
                        fontSize: '0.75rem',
                        fontWeight: active ? 600 : 400,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {t(`access.${tipo}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            {tipoAcceso != null && (
              <div
                style={{
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg)',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  fontSize: '0.75rem',
                  color: 'var(--text-dim)',
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: 'var(--accent-2)',
                    marginBottom: 2,
                  }}
                >
                  {t('access.title')}
                </div>
                <div style={{ fontStyle: 'italic' }}>
                  {t('access.dragToAdjust')}
                </div>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontFamily: 'var(--font-mono, Fira Code, monospace)',
                fontSize: '0.75rem',
                color: 'var(--text-dim)',
                borderTop: '1px solid var(--border)',
                paddingTop: 6,
              }}
            >
              <span>
                {puntoPesca.lat.toFixed(5)}, {puntoPesca.lon.toFixed(5)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapScreen;