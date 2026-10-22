// src/screens/NavegacionScreen.tsx
// WKF — Pantalla raíz de la pestaña Navegación.
//
// v1.049: extensión Fase 29.
//   · Subtab inicial pasa a 'navegar'. La pestaña Navegación arranca
//     "a pelo" en navegación sin destino.
//   · onNavegarAElemento conectado: al clicar un elemento del mapa
//     (punto / línea / polígono importado) en Navegar, se arranca
//     la navegación a él.
// v1.042: lazy + keep-alive de sub-tabs. Cada sub-tab se monta la
//   primera vez que se visita y se mantiene montado (oculto) a
//   partir de ahí. Los no visitados NO se montan.

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavegacionStore } from '../state/navegacion-store.ts';
import { WaypointsRutasScreen } from './Navegacion/WaypointsRutasScreen.tsx';
import { RutasScreen } from './Navegacion/RutasScreen.tsx';
import { NavegarScreen, type DestinoNavegacion } from './Navegacion/NavegarScreen.tsx';
import { ImportarScreen } from './Navegacion/ImportarScreen.tsx';

type SubTab = 'waypoints' | 'rutas' | 'navegar' | 'importar';

const ORDEN_SUBTABS: SubTab[] = ['waypoints', 'rutas', 'navegar', 'importar'];

export const NavegacionScreen: React.FC = () => {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<SubTab>('navegar');
  const [destinoNavegacion, setDestinoNavegacion] =
    useState<DestinoNavegacion | null>(null);

  // Set de sub-tabs que YA se han montado al menos una vez.
  // Arranca con el inicial, que es el único que se monta de salida.
  const [subTabsMontados, setSubTabsMontados] = useState<Set<SubTab>>(
    () => new Set<SubTab>(['navegar'])
  );
  const montadosRef = useRef(subTabsMontados);

  useEffect(() => {
    montadosRef.current = subTabsMontados;
  }, [subTabsMontados]);

  const cargar = useNavegacionStore((s) => s.cargar);
  const cargado = useNavegacionStore((s) => s.cargado);
  const error = useNavegacionStore((s) => s.error);

  useEffect(() => {
    if (!cargado) {
      void cargar();
    }
  }, [cargado, cargar]);

  const activarSubTab = (id: SubTab) => {
    if (!montadosRef.current.has(id)) {
      setSubTabsMontados((prev) => {
        const siguiente = new Set(prev);
        siguiente.add(id);
        return siguiente;
      });
    }
    setSubTab(id);
  };

  const iniciarNavegacion = (destino: DestinoNavegacion) => {
    setDestinoNavegacion(destino);
    activarSubTab('navegar');
  };

  // Al clicar un elemento de una capa importada en el mapa de Navegar,
  // se arranca navegación a él. Punto → destino 'waypoint' imposible
  // (no está en waypoints), así que se delega al NavegarScreen que ya
  // gestiona el waypoint puntual. Aquí solo se cubren polígono/línea.
  const navegarAElementoCapa = (
    bloqueId: string,
    capaId: string,
    elementoId: string,
    tipo: 'punto' | 'linea' | 'poligono'
  ) => {
    if (tipo === 'poligono') {
      iniciarNavegacion({ tipo: 'poligono', bloqueId, capaId, elementoId });
      return;
    }
    if (tipo === 'linea') {
      iniciarNavegacion({ tipo: 'linea', bloqueId, capaId, elementoId });
      return;
    }
    // tipo === 'punto' lo resuelve NavegarScreen internamente.
  };

  const cambiarDestino = () => {
    setDestinoNavegacion(null);
    activarSubTab('waypoints');
  };

  const etiquetaDe = (id: SubTab): string => {
    switch (id) {
      case 'waypoints':
        return t('navegacion.subtab.waypoints');
      case 'rutas':
        return t('navegacion.subtab.rutas');
      case 'navegar':
        return t('navegacion.subtab.navegar');
      case 'importar':
        return t('navegacion.subtab.importar');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        role="tablist"
        style={{
          display: 'flex',
          flexShrink: 0,
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        {ORDEN_SUBTABS.map((id) => {
          const activo = subTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activo}
              onClick={() => activarSubTab(id)}
              style={{
                flex: 1,
                padding: '12px 8px',
                border: 'none',
                borderBottom: `2px solid ${
                  activo ? 'var(--accent)' : 'transparent'
                }`,
                backgroundColor: activo ? 'var(--bg)' : 'transparent',
                color: activo ? 'var(--accent)' : 'var(--text-dim)',
                fontSize: '0.82rem',
                fontWeight: activo ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {etiquetaDe(id)}
            </button>
          );
        })}
      </div>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(255, 45, 85, 0.12)',
            borderBottom: '1px solid var(--verdict-desaconsejado)',
            color: 'var(--verdict-desaconsejado)',
            fontSize: '0.8rem',
            lineHeight: 1.4,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        {subTabsMontados.has('waypoints') && (
          <div
            style={{
              display: subTab === 'waypoints' ? 'flex' : 'none',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
            }}
          >
            <WaypointsRutasScreen onNavegar={iniciarNavegacion} />
          </div>
        )}

        {subTabsMontados.has('rutas') && (
          <div
            style={{
              display: subTab === 'rutas' ? 'flex' : 'none',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
            }}
          >
            <RutasScreen onNavegar={iniciarNavegacion} />
          </div>
        )}

        {subTabsMontados.has('navegar') && (
          <div
            style={{
              display: subTab === 'navegar' ? 'flex' : 'none',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
            }}
          >
            <NavegarScreen
              destino={destinoNavegacion}
              onCambiarDestino={cambiarDestino}
              onNavegarAElemento={navegarAElementoCapa}
            />
          </div>
        )}

        {subTabsMontados.has('importar') && (
          <div
            style={{
              display: subTab === 'importar' ? 'flex' : 'none',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
            }}
          >
            <ImportarScreen />
          </div>
        )}
      </div>
    </div>
  );
};

export default NavegacionScreen;