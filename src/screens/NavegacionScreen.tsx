// src/screens/NavegacionScreen.tsx
// WKF — Pantalla raíz de la pestaña Navegación.
// WKF1.073: fusión de Navegar y Mapa + persistencia del destino activo.
// WKF1.083: destino especial 'ver-track' para el botón 🗺️ de Archivos.
//   · Se traduce a "cambia a Navegar y guarda el id en sessionStorage,
//     sin tocar el destino de navegación". El mapa hará fitBounds.

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavegacionStore } from '../state/navegacion-store.ts';
import {
  NavegarScreen,
  type DestinoNavegacion,
} from './Navegacion/NavegarScreen.tsx';
import { ArchivosScreen } from './Navegacion/ArchivosScreen.tsx';

type SubTab = 'navegar' | 'archivos';

const ORDEN_SUBTABS: SubTab[] = ['navegar', 'archivos'];
const STORAGE_SUBTAB = 'wkf-nav-subtab';
const STORAGE_DESTINO = 'wkf-nav-destino';
const STORAGE_DESTINO_PENDIENTE = 'wkf-nav-destino-pendiente';
const STORAGE_RESALTAR = 'wkf-nav-resaltar';

function leerSubTabInicial(): SubTab {
  if (typeof sessionStorage === 'undefined') return 'navegar';
  try {
    const v = sessionStorage.getItem(STORAGE_SUBTAB);
    if (v === 'navegar' || v === 'archivos') return v;
  } catch {
    // ignore
  }
  return 'navegar';
}

function leerDestinoInicial(): DestinoNavegacion | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_DESTINO);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.tipo !== 'string') {
      return null;
    }
    return parsed as DestinoNavegacion;
  } catch {
    return null;
  }
}

function persistirDestino(destino: DestinoNavegacion | null): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (destino) {
      sessionStorage.setItem(STORAGE_DESTINO, JSON.stringify(destino));
    } else {
      sessionStorage.removeItem(STORAGE_DESTINO);
    }
  } catch {
    // ignore
  }
}

export const NavegacionScreen: React.FC = () => {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<SubTab>(() => leerSubTabInicial());
  const [destinoNavegacion, setDestinoNavegacion] =
    useState<DestinoNavegacion | null>(() => leerDestinoInicial());

  const [subTabsMontados, setSubTabsMontados] = useState<Set<SubTab>>(
    () => new Set<SubTab>(['navegar'])
  );
  const montadosRef = useRef(subTabsMontados);

  useEffect(() => {
    montadosRef.current = subTabsMontados;
  }, [subTabsMontados]);

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.setItem(STORAGE_SUBTAB, subTab);
    } catch {
      // ignore
    }
  }, [subTab]);

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(STORAGE_DESTINO_PENDIENTE);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || typeof parsed.tipo !== 'string') {
        sessionStorage.removeItem(STORAGE_DESTINO_PENDIENTE);
        return;
      }
      sessionStorage.removeItem(STORAGE_DESTINO_PENDIENTE);
      setDestinoNavegacion(parsed as DestinoNavegacion);
      setSubTab('navegar');
      activarSubTab('navegar');
    } catch {
      try { sessionStorage.removeItem(STORAGE_DESTINO_PENDIENTE); } catch { /* ignore */ }
    }
  }, []);

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
    persistirDestino(destino);
    activarSubTab('navegar');
  };

  // WKF1.083: destino especial 'ver-track' para el botón 🗺️ de Archivos.
  // No inicia navegación. Guarda el id en sessionStorage para que
  // NavegarScreen haga fitBounds y resalte, y cambia a la sub-pestaña
  // Navegar. El destino de navegación se queda como está.
  const verTrackEnMapa = (id: string) => {
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_RESALTAR, id);
      } catch {
        // ignore
      }
    }
    activarSubTab('navegar');
  };

  const navegarAElementoCapa = (
    bloqueId: string,
    capaId: string,
    elementoId: string,
    tipo: 'punto' | 'linea' | 'poligono'
  ) => {
    if (tipo === 'punto') {
      iniciarNavegacion({ tipo: 'punto-capa', bloqueId, capaId, elementoId });
      return;
    }
    if (tipo === 'poligono') {
      iniciarNavegacion({ tipo: 'poligono', bloqueId, capaId, elementoId });
      return;
    }
    if (tipo === 'linea') {
      iniciarNavegacion({ tipo: 'linea', bloqueId, capaId, elementoId });
      return;
    }
  };

  const navegarADestino = (destino: DestinoNavegacion) => {
    iniciarNavegacion(destino);
  };

  const etiquetaDe = (id: SubTab): string => {
    switch (id) {
      case 'navegar':
        return t('navegacion.subtab.navegar', { defaultValue: 'Navegar' });
      case 'archivos':
        return t('navegacion.subtab.importar', { defaultValue: 'Archivos' });
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
                borderBottom: activo ? '2px solid var(--accent)' : '2px solid var(--verdict-aceptable)',
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
              onNavegarAElemento={navegarAElementoCapa}
              onNavegarADestino={navegarADestino}
            />
          </div>
        )}

        {subTabsMontados.has('archivos') && (
          <div
            style={{
              display: subTab === 'archivos' ? 'flex' : 'none',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
            }}
          >
            <ArchivosScreen
              onNavegar={iniciarNavegacion}
              onVerTrackEnMapa={verTrackEnMapa}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default NavegacionScreen;
// src/screens/NavegacionScreen.tsx