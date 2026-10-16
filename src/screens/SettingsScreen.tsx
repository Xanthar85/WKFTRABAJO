// src/screens/SettingsScreen.tsx
// WKF — Pantalla de Ajustes.
// v1.025:
//   - Campo "Peso del equipo" en Mi perfil de kayakista.
//   - Campo "Peso del kayak propio" en el modal de kayak propio
//     (opcional, default vacío → se estima por categoría).
//   - Compatibilidad con techoAbsoluto opcional en kayaks a pala.
// v1.022: campo "Peso del kayakista" en Mi perfil de kayakista.
// v1.024: fix del input del peso en Android. type="text" inputMode="numeric",
//         estado string, clamp en onBlur. Sigue la lección v1.021.

import React, { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useAppStore,
  type FranjaUsuario,
  type ImportFailReason,
  type Embarcacion,
  buscarEmbarcacionPorId,
} from '../state/store.ts';
import {
  CATALOGO_KAYAKS,
  buscarKayakPorId,
  etiquetaCategoria,
  deducirCategoriaWKF,
  pesoEstimadoPorCategoria,
  type Kayak,
  type KayakEditado,
  type CertificacionesKayak,
  type EntradaKayakEditado,
} from '../lib/kayaks.ts';
import {
  CATALOGO_PATOS,
  CATALOGO_CANOAS,
  buscarPatoPorId,
  type Pato,
  type Canoa,
  TECHOS_PATOS,
} from '../lib/patos.ts';
import {
  CATALOGO_MOTORES,
  CATALOGO_BATERIAS,
  buscarMotorPorId,
  buscarBateriaPorId,
  etiquetaMotor,
  etiquetaBateria,
  estimarAmperajePorEmpuje,
  type MotorElectrico,
  type BateriaElectrica,
} from '../lib/motores-electricos.ts';
import {
  NIVELES_EXPERIENCIA,
  type CategoriaKayak,
  type NivelExperiencia,
} from '../lib/verdict.ts';
import type { FormatoCoords } from '../lib/coords.ts';
import type { NivelColorTabla } from '../lib/verdict-color.ts';
import {
  OPCIONES_VIENTO,
  OPCIONES_OLA,
  OPCIONES_TEMPERATURA,
  OPCIONES_PRESION,
  OPCIONES_CORRIENTE,
  OPCIONES_DISTANCIA,
  OPCIONES_PRECIPITACION,
  SUFIJO_VIENTO,
  SUFIJO_OLA,
  SUFIJO_TEMPERATURA,
  SUFIJO_PRESION,
  SUFIJO_CORRIENTE,
  SUFIJO_DISTANCIA,
  SUFIJO_PRECIPITACION,
} from '../lib/unidades.ts';

interface SettingsScreenProps {
  onClose: () => void;
  onOpenTutorial: () => void;
}

type FeedbackImport =
  | { tipo: 'ok'; spots: number }
  | { tipo: 'error'; motivo: ImportFailReason }
  | null;

const SUBPESTANAS: Array<{ id: string; labelKey: string; locked?: boolean }> = [
  { id: 'waves', labelKey: 'tabs.waves', locked: true },
  { id: 'wind', labelKey: 'tabs.wind', locked: true },
  { id: 'weather', labelKey: 'tabs.weather' },
  { id: 'air', labelKey: 'tabs.air' },
  { id: 'barometer', labelKey: 'tabs.barometer' },
  { id: 'activity', labelKey: 'tabs.activity' },
  { id: 'sun', labelKey: 'tabs.sun' },
  { id: 'moon', labelKey: 'tabs.moon' },
  { id: 'tides', labelKey: 'tabs.tides' },
];

const OPCIONES_COLOR: Array<{ valor: NivelColorTabla; labelKey: string }> = [
  { valor: 'ninguno', labelKey: 'settings.colorTablaNinguno' },
  { valor: 'rojos', labelKey: 'settings.colorTablaRojos' },
  { valor: 'rn', labelKey: 'settings.colorTablaRN' },
  { valor: 'rna', labelKey: 'settings.colorTablaRNA' },
  { valor: 'todo', labelKey: 'settings.colorTablaTodo' },
];

const MAPA_MOTIVO_A_CLAVE_I18N: Record<ImportFailReason, string> = {
  no_es_objeto: 'import.errors.notObject',
  version_incorrecta: 'import.errors.wrongVersion',
  spots_no_array: 'import.errors.spotsNotArray',
  spot_mal_formado: 'import.errors.spotMalformed',
  ajustes_mal_formados: 'import.errors.settingsMalformed',
  franjas_mal_formadas: 'import.errors.slotsMalformed',
  perfil_mal_formado: 'import.errors.profileMalformed',
};

interface FilaCertificacion {
  labelKey: string;
  activa: boolean;
  valor?: string;
}

function construirFilasCertificaciones(
  cert: CertificacionesKayak
): FilaCertificacion[] {
  return [
    { labelKey: 'kayak.certCE', activa: cert.ce != null, valor: cert.ce ?? undefined },
    { labelKey: 'kayak.certUKCA', activa: cert.ukca != null, valor: cert.ukca ?? undefined },
    { labelKey: 'kayak.certUSCG', activa: cert.uscg },
    { labelKey: 'kayak.certABYC', activa: cert.abyc },
    { labelKey: 'kayak.certNMMA', activa: cert.nmma },
    { labelKey: 'kayak.certASNZS', activa: cert.as_nzs },
    { labelKey: 'kayak.certJCI', activa: cert.jci },
    { labelKey: 'kayak.certISO12217', activa: cert.iso_12217 },
    { labelKey: 'kayak.certISO14946', activa: cert.iso_14946 },
    { labelKey: 'kayak.certISO10087', activa: cert.iso_10087 },
  ];
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onClose,
  onOpenTutorial,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const ajustes = useAppStore((s) => s.ajustes);
  const setFormatoCoords = useAppStore((s) => s.setFormatoCoords);
  const setKayakIds = useAppStore((s) => s.setKayakIds);
  const setPerfil = useAppStore((s) => s.setPerfil);
  const setFranjas = useAppStore((s) => s.setFranjas);
  const toggleSubpestana = useAppStore((s) => s.toggleSubpestana);
  const setOrdenSubpestanas = useAppStore((s) => s.setOrdenSubpestanas);
  const setColorTabla = useAppStore((s) => s.setColorTabla);
  const setFiltroFranja = useAppStore((s) => s.setFiltroFranja);
  const setUnidades = useAppStore((s) => s.setUnidades);
  const resetAll = useAppStore((s) => s.resetAll);
  const exportState = useAppStore((s) => s.exportState);
  const importState = useAppStore((s) => s.importState);

  const kayaksEditados = useAppStore((s) => s.kayaksEditados);
  const addKayakEditado = useAppStore((s) => s.addKayakEditado);
  const updateKayakEditado = useAppStore((s) => s.updateKayakEditado);
  const removeKayakEditado = useAppStore((s) => s.removeKayakEditado);

  const [activeSlotPicker, setActiveSlotPicker] = useState<number | null>(null);
  const [kayakSearchQuery, setKayakSearchQuery] = useState('');
  const [fichaTecnicaKayak, setFichaTecnicaKayak] = useState<Embarcacion | null>(null);
  const [feedbackImport, setFeedbackImport] = useState<FeedbackImport>(null);
  const [editandoKayakPropio, setEditandoKayakPropio] = useState<
    KayakEditado | 'nuevo' | null
  >(null);
  const [modalMotorAbierto, setModalMotorAbierto] = useState(false);
  const [modalBateriaAbierto, setModalBateriaAbierto] = useState(false);
  const [pesoTexto, setPesoTexto] = useState<string>(
    String(ajustes.perfil.pesoKayakistaKg ?? 90)
  );
  const [pesoEquipoTexto, setPesoEquipoTexto] = useState<string>(
    String(ajustes.perfil.pesoEquipoKg ?? 0)
  );

  const motorSeleccionado = useMemo(() => {
    if (ajustes.perfil.motorElectricoId) {
      return buscarMotorPorId(ajustes.perfil.motorElectricoId) ?? null;
    }
    return null;
  }, [ajustes.perfil.motorElectricoId]);

  const bateriaSeleccionada = useMemo(() => {
    if (ajustes.perfil.bateriaElectricaId) {
      return buscarBateriaPorId(ajustes.perfil.bateriaElectricaId) ?? null;
    }
    return null;
  }, [ajustes.perfil.bateriaElectricaId]);

  const motorActivoLabel = useMemo(() => {
    if (motorSeleccionado) return etiquetaMotor(motorSeleccionado);
    if (ajustes.perfil.motorElectricoCustom) {
      const c = ajustes.perfil.motorElectricoCustom;
      return `${t('perfil.motorPersonalizado')}: ${c.empujeLbs} lbs (${c.voltajeV} V)`;
    }
    return t('perfil.motorSinMotor');
  }, [motorSeleccionado, ajustes.perfil.motorElectricoCustom, t]);

  const motorSubLabel = useMemo(() => {
    if (motorSeleccionado) return motorSeleccionado.notas;
    if (ajustes.perfil.motorElectricoCustom) {
      const c = ajustes.perfil.motorElectricoCustom;
      return c.amperajeCruceroA ? `Amperaje estimado: ~${c.amperajeCruceroA} A` : null;
    }
    return null;
  }, [motorSeleccionado, ajustes.perfil.motorElectricoCustom]);

  const bateriaActivaLabel = useMemo(() => {
    if (bateriaSeleccionada) return etiquetaBateria(bateriaSeleccionada);
    if (ajustes.perfil.bateriaElectricaCustom) {
      const c = ajustes.perfil.bateriaElectricaCustom;
      const q = c.quimica === 'litio' ? t('perfil.motorBateriaLitio') : c.quimica === 'agm' ? t('perfil.motorBateriaAGM') : t('perfil.motorBateriaGel');
      return `${q}: ${c.capacidadAh} Ah · ${c.voltajeV} V · ${c.pesoKg} kg`;
    }
    return 'Sin batería';
  }, [bateriaSeleccionada, ajustes.perfil.bateriaElectricaCustom, t]);

  const bateriaSubLabel = useMemo(() => {
    if (bateriaSeleccionada) return bateriaSeleccionada.notas;
    return null;
  }, [bateriaSeleccionada]);

  const kayakSlot1 = ajustes.kayakIds[0]
    ? buscarEmbarcacionPorId(ajustes.kayakIds[0], kayaksEditados)
    : null;
  const kayakSlot2 = ajustes.kayakIds[1]
    ? buscarEmbarcacionPorId(ajustes.kayakIds[1], kayaksEditados)
    : null;

  const handleSelectKayak = (slotIndex: number, embarcacion: Embarcacion) => {
    const current = [...ajustes.kayakIds];
    current[slotIndex] = embarcacion.id;
    setKayakIds(current.slice(0, 2));
    setActiveSlotPicker(null);
    setKayakSearchQuery('');
  };

  const handleRemoveKayakSlot = (slotIndex: number) => {
    const current = [...ajustes.kayakIds];
    current.splice(slotIndex, 1);
    setKayakIds(current);
  };

  type EmbarcacionConTipo =
    | (Kayak & { tipoVaso: 'kayak' })
    | (Pato & { tipoVaso: 'pato' })
    | (Canoa & { tipoVaso: 'canoa' })
    | (KayakEditado & { tipoVaso: 'kayak_propio' });

  const catalogoUnificado: EmbarcacionConTipo[] = useMemo(() => [
    ...CATALOGO_KAYAKS.map((k) => ({ ...k, tipoVaso: 'kayak' as const })),
    ...CATALOGO_PATOS.map((p) => ({ ...p, tipoVaso: 'pato' as const })),
    ...CATALOGO_CANOAS.map((c) => ({ ...c, tipoVaso: 'canoa' as const })),
    ...kayaksEditados.map((k) => ({ ...k, tipoVaso: 'kayak_propio' as const })),
  ], [kayaksEditados]);

  const filteredKayaks = useMemo(() => {
    const terms = kayakSearchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return catalogoUnificado.filter((k) => {
      if (terms.length === 0) return true;
      const text = `${k.marca} ${k.modelo} ${k.tipoVaso}`.toLowerCase();
      return terms.every((term) => text.includes(term));
    }).sort((a, b) => {
      const cmpMarca = a.marca.localeCompare(b.marca);
      if (cmpMarca !== 0) return cmpMarca;
      return a.modelo.localeCompare(b.modelo);
    });
  }, [catalogoUnificado, kayakSearchQuery]);

  const listaSubpestanasOrdenadas = useMemo(() => {
    const orden = ajustes.ordenSubpestanas || [];
    const baseMap = new Map(SUBPESTANAS.map((s) => [s.id, s]));
    const result: typeof SUBPESTANAS = [];
    for (const id of orden) {
      const item = baseMap.get(id);
      if (item) {
        result.push(item);
        baseMap.delete(id);
      }
    }
    for (const s of SUBPESTANAS) {
      if (baseMap.has(s.id)) {
        result.push(s);
      }
    }
    return result;
  }, [ajustes.ordenSubpestanas]);

  const handleMoveSubpestana = (index: number, delta: -1 | 1) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= listaSubpestanasOrdenadas.length) return;
    const nuevo = [...listaSubpestanasOrdenadas.map((s) => s.id)];
    const temp = nuevo[index];
    nuevo[index] = nuevo[targetIndex];
    nuevo[targetIndex] = temp;
    setOrdenSubpestanas(nuevo);
  };

  const handleFranjaChange = (
    index: number,
    field: keyof FranjaUsuario,
    value: string | number
  ) => {
    const updated = ajustes.franjas.map((f, i) =>
      i === index ? { ...f, [field]: value } : f
    );
    setFranjas(updated);
  };

  const handleAddFranja = () => {
    if (ajustes.franjas.length >= 4) return;
    const newFranja: FranjaUsuario = {
      id: `franja_${Date.now()}`,
      nombre: `Franja ${ajustes.franjas.length + 1}`,
      inicio: 8,
      fin: 14,
    };
    setFranjas([...ajustes.franjas, newFranja]);
  };

  const handleDeleteFranja = (index: number) => {
    if (ajustes.franjas.length <= 1) return;
    setFranjas(ajustes.franjas.filter((_, i) => i !== index));
  };

  const handleExportJson = () => {
    const data = exportState();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const filename = `wkf-backup-${yyyy}${mm}${dd}.json`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(event.target?.result as string);
      } catch {
        setFeedbackImport({ tipo: 'error', motivo: 'no_es_objeto' });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      const confirmed = window.confirm(t('import.confirmReplace'));
      if (!confirmed) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      const result = importState(parsed);
      if ('motivo' in result) {
        setFeedbackImport({
          tipo: 'error',
          motivo: result.motivo as ImportFailReason,
        });
      } else {
        setFeedbackImport({ tipo: 'ok', spots: result.spotsImportados });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleClearAll = () => {
    if (window.confirm(t('settings.clearAllConfirm'))) resetAll();
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  };
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
    marginBottom: 12,
  };
  const segmentedContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
  };
  const buttonOptionStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    backgroundColor: active
      ? 'var(--accent-subtle, rgba(56, 189, 248, 0.15))'
      : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text)',
    fontSize: '0.9rem',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s ease',
  });
  const fichaRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '8px 0',
    borderBottom: '1px solid var(--border)',
    fontSize: '0.85rem',
  };
  const fichaLabelStyle: React.CSSProperties = {
    color: 'var(--text-muted)',
    flexShrink: 0,
  };
  const fichaValorStyle: React.CSSProperties = {
    fontFamily: 'Fira Code, monospace',
    color: 'var(--text)',
    fontWeight: 500,
    textAlign: 'right',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'Inter, system-ui, sans-serif',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          {t('settings.title')}
        </h1>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text)',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t('common.close')}
        </button>
      </header>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 20,
          maxWidth: 680,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>{t('settings.language')}</div>
          <div style={segmentedContainerStyle}>
            <button
              onClick={() => setLanguage('es')}
              style={buttonOptionStyle(language === 'es')}
            >
              {t('settings.languageEs')}
            </button>
            <button
              onClick={() => setLanguage('en')}
              style={buttonOptionStyle(language === 'en')}
            >
              {t('settings.languageEn')}
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>{t('settings.theme')}</div>
          <div style={segmentedContainerStyle}>
            <button
              onClick={() => setTheme('dark')}
              style={buttonOptionStyle(theme === 'dark')}
            >
              {t('settings.themeDark')}
            </button>
            <button
              onClick={() => setTheme('light')}
              style={buttonOptionStyle(theme === 'light')}
            >
              {t('settings.themeLight')}
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>{t('coords.format')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(['dd', 'dms', 'ddm'] as FormatoCoords[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormatoCoords(fmt)}
                style={{
                  ...buttonOptionStyle(ajustes.formatoCoords === fmt),
                  textAlign: 'left',
                }}
              >
                {t(`coords.${fmt}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Sección Unidades */}
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>{t('settings.unitsSection')}</div>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              margin: '0 0 16px 0',
            }}
          >
            {t('settings.unitsSectionDesc')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Viento (columna 1) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                }}
              >
                {t('unidades.viento1')}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {OPCIONES_VIENTO.map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnidades({ viento: u })}
                    style={buttonOptionStyle(ajustes.unidades.viento === u)}
                  >
                    {SUFIJO_VIENTO[u]}
                  </button>
                ))}
              </div>
            </div>

            {/* Viento (columna 2) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                }}
              >
                {t('unidades.viento2')}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {OPCIONES_VIENTO.map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnidades({ viento2: u })}
                    style={buttonOptionStyle(ajustes.unidades.viento2 === u)}
                  >
                    {SUFIJO_VIENTO[u]}
                  </button>
                ))}
              </div>
            </div>

            {/* Ola */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                }}
              >
                {t('unidades.ola')}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {OPCIONES_OLA.map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnidades({ ola: u })}
                    style={buttonOptionStyle(ajustes.unidades.ola === u)}
                  >
                    {SUFIJO_OLA[u]}
                  </button>
                ))}
              </div>
            </div>

            {/* Temperatura */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                }}
              >
                {t('unidades.temperatura')}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {OPCIONES_TEMPERATURA.map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnidades({ temperatura: u })}
                    style={buttonOptionStyle(ajustes.unidades.temperatura === u)}
                  >
                    {SUFIJO_TEMPERATURA[u]}
                  </button>
                ))}
              </div>
            </div>

            {/* Presión */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                }}
              >
                {t('unidades.presion')}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {OPCIONES_PRESION.map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnidades({ presion: u })}
                    style={buttonOptionStyle(ajustes.unidades.presion === u)}
                  >
                    {SUFIJO_PRESION[u]}
                  </button>
                ))}
              </div>
            </div>

            {/* Corriente */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                }}
              >
                {t('unidades.corriente')}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {OPCIONES_CORRIENTE.map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnidades({ corriente: u })}
                    style={buttonOptionStyle(ajustes.unidades.corriente === u)}
                  >
                    {SUFIJO_CORRIENTE[u]}
                  </button>
                ))}
              </div>
            </div>

            {/* Distancia */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                }}
              >
                {t('unidades.distancia')}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {OPCIONES_DISTANCIA.map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnidades({ distancia: u })}
                    style={buttonOptionStyle(ajustes.unidades.distancia === u)}
                  >
                    {SUFIJO_DISTANCIA[u]}
                  </button>
                ))}
              </div>
            </div>

            {/* Visibilidad */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                }}
              >
                {t('unidades.visibilidad')}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {OPCIONES_DISTANCIA.map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnidades({ visibilidad: u })}
                    style={buttonOptionStyle(ajustes.unidades.visibilidad === u)}
                  >
                    {SUFIJO_DISTANCIA[u]}
                  </button>
                ))}
              </div>
            </div>

            {/* Precipitación */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                }}
              >
                {t('unidades.precipitacion')}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {OPCIONES_PRECIPITACION.map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnidades({ precipitacion: u })}
                    style={buttonOptionStyle(ajustes.unidades.precipitacion === u)}
                  >
                    {SUFIJO_PRECIPITACION[u]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            ℹ️ {t('unidades.note')}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>{t('kayak.myKayaks')}</div>
          {[0, 1].map((slotIndex) => {
            const kayak = slotIndex === 0 ? kayakSlot1 : kayakSlot2;
            return (
              <div
                key={slotIndex}
                style={{
                  padding: 12,
                  backgroundColor: 'var(--bg)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  marginBottom: slotIndex === 0 ? 10 : 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  {kayak ? (
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      title={`${kayak.marca} ${kayak.modelo}`}
                    >
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '1px 5px',
                          borderRadius: 4,
                          flexShrink: 0,
                          backgroundColor:
                            'tipoEmbarcacion' in kayak && kayak.tipoEmbarcacion === 'pato'
                              ? 'rgba(56, 189, 248, 0.15)'
                              : 'tipoEmbarcacion' in kayak && kayak.tipoEmbarcacion === 'canoa'
                              ? 'rgba(234, 179, 8, 0.15)'
                              : 'origen' in kayak && kayak.origen === 'usuario'
                              ? 'rgba(6, 182, 212, 0.15)'
                              : 'rgba(0, 229, 106, 0.15)',
                          color:
                            'tipoEmbarcacion' in kayak && kayak.tipoEmbarcacion === 'pato'
                              ? '#38bdf8'
                              : 'tipoEmbarcacion' in kayak && kayak.tipoEmbarcacion === 'canoa'
                              ? '#eab308'
                              : 'origen' in kayak && kayak.origen === 'usuario'
                              ? '#06b6d4'
                              : 'var(--accent)',
                          border: `1px solid ${
                            'tipoEmbarcacion' in kayak && kayak.tipoEmbarcacion === 'pato'
                              ? 'rgba(56, 189, 248, 0.3)'
                              : 'tipoEmbarcacion' in kayak && kayak.tipoEmbarcacion === 'canoa'
                              ? 'rgba(234, 179, 8, 0.3)'
                              : 'origen' in kayak && kayak.origen === 'usuario'
                              ? 'rgba(6, 182, 212, 0.3)'
                              : 'rgba(0, 229, 106, 0.3)'
                          }`,
                        }}
                      >
                        {'tipoEmbarcacion' in kayak && kayak.tipoEmbarcacion === 'pato'
                          ? 'Pato'
                          : 'tipoEmbarcacion' in kayak && kayak.tipoEmbarcacion === 'canoa'
                          ? 'Canoa'
                          : 'origen' in kayak && kayak.origen === 'usuario'
                          ? t('kayak.editadoBadge')
                          : 'Kayak'}
                      </span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {kayak.marca} {kayak.modelo}
                      </span>
                      <span
                        style={{
                          fontFamily: 'Fira Code, monospace',
                          fontSize: '0.85rem',
                          color: 'var(--accent)',
                          flexShrink: 0,
                        }}
                      >
                        ({'tipoEmbarcacion' in kayak && (kayak.tipoEmbarcacion === 'pato' || kayak.tipoEmbarcacion === 'canoa')
                            ? kayak.categoriaWKF
                            : etiquetaCategoria(kayak as Kayak)})
                      </span>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Slot {slotIndex + 1}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {kayak && (
                    <button
                      onClick={() => setFichaTecnicaKayak(kayak)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        backgroundColor: 'transparent',
                        color: 'var(--accent-2)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      {t('kayak.viewSpec')}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setActiveSlotPicker(slotIndex);
                      setKayakSearchQuery('');
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    {t('kayak.select')}
                  </button>
                  {kayak && (
                    <button
                      onClick={() => handleRemoveKayakSlot(slotIndex)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      {t('common.delete')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Sub-sección: Mis kayaks propios */}
          <div style={{ marginTop: 20, marginBottom: 8 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
              {t('kayak.miKayakPropio')}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {kayaksEditados.map((kPropio) => (
                <div
                  key={kPropio.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    padding: 12,
                    backgroundColor: 'var(--surface)',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      title={`${kPropio.marca} ${kPropio.modelo}`}
                    >
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '1px 5px',
                          borderRadius: 4,
                          flexShrink: 0,
                          backgroundColor: 'rgba(6, 182, 212, 0.15)',
                          color: '#06b6d4',
                          border: '1px solid rgba(6, 182, 212, 0.3)',
                        }}
                      >
                        {t('kayak.editadoBadge')}
                      </span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {kPropio.marca} {kPropio.modelo}
                      </span>
                      <span
                        style={{
                          fontFamily: 'Fira Code, monospace',
                          fontSize: '0.85rem',
                          color: 'var(--accent)',
                          flexShrink: 0,
                        }}
                      >
                        ({etiquetaCategoria(kPropio)})
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setFichaTecnicaKayak(kPropio)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        backgroundColor: 'transparent',
                        color: 'var(--accent-2)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      {t('kayak.viewSpec')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditandoKayakPropio(kPropio)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      {t('kayak.editKayakPropio')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removeKayakEditado(kPropio.id);
                        if (ajustes.kayakIds.includes(kPropio.id)) {
                          setKayakIds(ajustes.kayakIds.filter((id) => id !== kPropio.id));
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      {t('kayak.deleteKayakPropio')}
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                disabled={kayaksEditados.length >= 2}
                onClick={() => setEditandoKayakPropio('nuevo')}
                title={kayaksEditados.length >= 2 ? t('kayak.limiteKayaksPropios') : undefined}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px dashed var(--border)',
                  backgroundColor: 'transparent',
                  color: kayaksEditados.length >= 2 ? 'var(--text-muted)' : 'var(--accent)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: kayaksEditados.length >= 2 ? 'not-allowed' : 'pointer',
                  opacity: kayaksEditados.length >= 2 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                + {t('kayak.addKayakPropio')}
              </button>
            </div>
          </div>

          {activeSlotPicker !== null && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                backgroundColor: 'var(--bg)',
                borderRadius: 8,
                border: '1px solid var(--accent)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  {t('kayak.select')} (Slot {activeSlotPicker + 1})
                </span>
                <button
                  onClick={() => setActiveSlotPicker(null)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
              <input
                type="text"
                value={kayakSearchQuery}
                onChange={(e) => setKayakSearchQuery(e.target.value)}
                placeholder={t('kayak.searchPlaceholder')}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                  marginBottom: 8,
                  boxSizing: 'border-box',
                }}
              />
              <div
                style={{
                  maxHeight: 220,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {filteredKayaks.length === 0 && (
                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontStyle: 'italic',
                      color: 'var(--text-muted)',
                      padding: '8px 4px',
                    }}
                  >
                    {t('kayak.notFound')}
                  </div>
                )}
                {filteredKayaks.map((k) => (
                  <button
                    key={k.id}
                    onClick={() => handleSelectKayak(activeSlotPicker, k)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      color: 'var(--text)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '2px 6px',
                          borderRadius: 4,
                          flexShrink: 0,
                          backgroundColor:
                            k.tipoVaso === 'pato'
                              ? 'rgba(56, 189, 248, 0.15)'
                              : k.tipoVaso === 'canoa'
                              ? 'rgba(234, 179, 8, 0.15)'
                              : k.tipoVaso === 'kayak_propio'
                              ? 'rgba(6, 182, 212, 0.15)'
                              : 'rgba(0, 229, 106, 0.15)',
                          color:
                            k.tipoVaso === 'pato'
                              ? '#38bdf8'
                              : k.tipoVaso === 'canoa'
                              ? '#eab308'
                              : k.tipoVaso === 'kayak_propio'
                              ? '#06b6d4'
                              : 'var(--accent)',
                          border: `1px solid ${
                            k.tipoVaso === 'pato'
                              ? 'rgba(56, 189, 248, 0.3)'
                              : k.tipoVaso === 'canoa'
                              ? 'rgba(234, 179, 8, 0.3)'
                              : k.tipoVaso === 'kayak_propio'
                              ? 'rgba(6, 182, 212, 0.3)'
                              : 'rgba(0, 229, 106, 0.3)'
                          }`,
                        }}
                      >
                        {k.tipoVaso === 'pato'
                          ? 'Pato'
                          : k.tipoVaso === 'canoa'
                          ? 'Canoa'
                          : k.tipoVaso === 'kayak_propio'
                          ? t('kayak.editadoBadge')
                          : 'Kayak'}
                      </span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {k.marca} {k.modelo}
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: 'Fira Code, monospace',
                        fontSize: '0.8rem',
                        color: 'var(--accent)',
                        marginLeft: 8,
                        flexShrink: 0,
                      }}
                    >
                      {k.tipoVaso === 'pato' || k.tipoVaso === 'canoa' ? k.categoriaWKF : etiquetaCategoria(k)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>{t('perfil.title')}</div>
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              {t('perfil.experience')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {NIVELES_EXPERIENCIA.map((lvl) => {
                const active = ajustes.perfil.experiencia === lvl;
                const keySuffix = lvl.charAt(0).toUpperCase() + lvl.slice(1);
                return (
                  <button
                    key={lvl}
                    onClick={() =>
                      setPerfil({ experiencia: lvl as NivelExperiencia })
                    }
                    style={{
                      ...buttonOptionStyle(active),
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      padding: '8px 12px',
                    }}
                  >
                    {t(`perfil.experience${keySuffix}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Peso del kayakista */}
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              {t('perfil.peso')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={pesoTexto}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setPesoTexto(raw);
                  if (raw === '') return;
                  const v = parseInt(raw, 10);
                  if (!Number.isFinite(v)) return;
                  if (v < 40 || v > 160) return;
                  setPerfil({ pesoKayakistaKg: v });
                }}
                onBlur={() => {
                  const v = parseInt(pesoTexto, 10);
                  const clamped = !Number.isFinite(v)
                    ? 90
                    : Math.max(40, Math.min(160, v));
                  setPerfil({ pesoKayakistaKg: clamped });
                  setPesoTexto(String(clamped));
                }}
                style={{
                  width: 90,
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text)',
                  fontFamily: 'Fira Code, monospace',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                kg
              </span>
            </div>
            <div
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                marginTop: 4,
                lineHeight: 1.4,
              }}
            >
              {t('perfil.pesoAyuda')}
            </div>
          </div>

          {/* Peso del equipo */}
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              {t('perfil.pesoEquipo')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={pesoEquipoTexto}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setPesoEquipoTexto(raw);
                  if (raw === '') return;
                  const v = parseInt(raw, 10);
                  if (!Number.isFinite(v)) return;
                  if (v < 0 || v > 500) return;
                  setPerfil({ pesoEquipoKg: v });
                }}
                onBlur={() => {
                  const v = parseInt(pesoEquipoTexto, 10);
                  const clamped = !Number.isFinite(v)
                    ? 0
                    : Math.max(0, Math.min(500, v));
                  setPerfil({ pesoEquipoKg: clamped });
                  setPesoEquipoTexto(String(clamped));
                }}
                style={{
                  width: 90,
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text)',
                  fontFamily: 'Fira Code, monospace',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                kg
              </span>
            </div>
            <div
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                marginTop: 4,
                lineHeight: 1.4,
              }}
            >
              {t('perfil.pesoEquipoAyuda')}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              {t('perfil.equipment')}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}
            >
              {[
                { key: 'vhf', labelKey: 'perfil.equipmentVhf' },
                { key: 'remoRepuesto', labelKey: 'perfil.equipmentRemoRepuesto' },
                { key: 'ropaSeca', labelKey: 'perfil.equipmentRopaSeca' },
                {
                  key: 'compartimentosEstancos',
                  labelKey: 'perfil.equipmentCompartimentos',
                },
              ].map(({ key, labelKey }) => {
                const val = (ajustes.perfil as any)[key] as boolean;
                return (
                  <button
                    key={key}
                    onClick={() => setPerfil({ [key]: !val })}
                    style={{
                      ...buttonOptionStyle(val),
                      fontSize: '0.85rem',
                      padding: '8px 10px',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{t(labelKey)}</span>
                    <span
                      style={{
                        fontFamily: 'Fira Code, monospace',
                        fontSize: '0.8rem',
                      }}
                    >
                      {val ? '✓' : '—'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Motor eléctrico */}
          <div style={{ marginBottom: 14, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              {t('perfil.motorTitulo')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 8, lineHeight: 1.4 }}>
              {t('perfil.motorDescripcion')}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              padding: '10px 12px', backgroundColor: 'var(--bg)', borderRadius: 8,
              border: '1px solid var(--border)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {motorActivoLabel}
                </div>
                {motorSubLabel && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {motorSubLabel}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setModalMotorAbierto(true)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, border: '1px solid var(--accent)',
                    backgroundColor: 'transparent', color: 'var(--accent)', fontSize: '0.8rem',
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {ajustes.perfil.motorElectricoId || ajustes.perfil.motorElectricoCustom ? t('common.edit') : t('common.add')}
                </button>
                {(ajustes.perfil.motorElectricoId || ajustes.perfil.motorElectricoCustom) && (
                  <button
                    type="button"
                    onClick={() => setPerfil({ motorElectricoId: null, motorElectricoCustom: null })}
                    style={{
                      padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
                      backgroundColor: 'transparent', color: 'var(--text-muted)', fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                    title={t('common.delete')}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Batería */}
          <div style={{ marginBottom: 14, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              {t('perfil.motorBateriaTitulo')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 8, lineHeight: 1.4 }}>
              {t('perfil.motorBateriaDescripcion')}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              padding: '10px 12px', backgroundColor: 'var(--bg)', borderRadius: 8,
              border: '1px solid var(--border)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {bateriaActivaLabel}
                </div>
                {bateriaSubLabel && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {bateriaSubLabel}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setModalBateriaAbierto(true)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, border: '1px solid var(--accent)',
                    backgroundColor: 'transparent', color: 'var(--accent)', fontSize: '0.8rem',
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {ajustes.perfil.bateriaElectricaId || ajustes.perfil.bateriaElectricaCustom ? t('common.edit') : t('common.add')}
                </button>
                {(ajustes.perfil.bateriaElectricaId || ajustes.perfil.bateriaElectricaCustom) && (
                  <button
                    type="button"
                    onClick={() => setPerfil({ bateriaElectricaId: null, bateriaElectricaCustom: null })}
                    style={{
                      padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
                      backgroundColor: 'transparent', color: 'var(--text-muted)', fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                    title={t('common.delete')}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              fontStyle: 'italic',
              lineHeight: 1.4,
              borderTop: '1px solid var(--border)',
              paddingTop: 8,
            }}
          >
            {t('perfil.disclaimer')}
          </div>
        </div>

        <div style={cardStyle}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div style={sectionTitleStyle}>{t('franjas.title')}</div>
            <button
              onClick={handleAddFranja}
              disabled={ajustes.franjas.length >= 4}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                color:
                  ajustes.franjas.length >= 4
                    ? 'var(--text-muted)'
                    : 'var(--accent)',
                fontSize: '0.8rem',
                cursor:
                  ajustes.franjas.length >= 4 ? 'not-allowed' : 'pointer',
                opacity: ajustes.franjas.length >= 4 ? 0.5 : 1,
              }}
            >
              + {t('franjas.add')}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ajustes.franjas.map((franja, index) => (
              <div
                key={franja.id || index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg)',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                }}
              >
                <input
                  type="text"
                  value={franja.nombre}
                  onChange={(e) =>
                    handleFranjaChange(index, 'nombre', e.target.value)
                  }
                  style={{
                    flex: 2,
                    padding: '6px 8px',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    color: 'var(--text)',
                    fontSize: '0.85rem',
                  }}
                />
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={franja.inicio}
                    onChange={(e) =>
                      handleFranjaChange(
                        index,
                        'inicio',
                        parseInt(e.target.value, 10) || 0
                      )
                    }
                    style={{
                      width: 48,
                      padding: '6px 4px',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      color: 'var(--text)',
                      fontFamily: 'Fira Code, monospace',
                      fontSize: '0.85rem',
                      textAlign: 'center',
                    }}
                  />
                  <span style={{ color: 'var(--text-muted)' }}>-</span>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={franja.fin}
                    onChange={(e) =>
                      handleFranjaChange(
                        index,
                        'fin',
                        parseInt(e.target.value, 10) || 0
                      )
                    }
                    style={{
                      width: 48,
                      padding: '6px 4px',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      color: 'var(--text)',
                      fontFamily: 'Fira Code, monospace',
                      fontSize: '0.85rem',
                      textAlign: 'center',
                    }}
                  />
                </div>
                <button
                  onClick={() => handleDeleteFranja(index)}
                  disabled={ajustes.franjas.length <= 1}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 4,
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    color:
                      ajustes.franjas.length <= 1
                        ? 'var(--text-muted)'
                        : 'var(--text)',
                    fontSize: '0.75rem',
                    cursor:
                      ajustes.franjas.length <= 1
                        ? 'not-allowed'
                        : 'pointer',
                    opacity: ajustes.franjas.length <= 1 ? 0.4 : 1,
                  }}
                >
                  {t('common.delete')}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>{t('settings.colorTabla')}</div>
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
              margin: '0 0 12px 0',
            }}
          >
            {t('settings.colorTablaDesc')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {OPCIONES_COLOR.map(({ valor, labelKey }) => (
              <button
                key={valor}
                onClick={() => setColorTabla(valor)}
                style={{
                  ...buttonOptionStyle(ajustes.colorTabla === valor),
                  textAlign: 'left',
                }}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>

          <div
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              {t('settings.filtroFranja')}
            </div>
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
                margin: '0 0 8px 0',
              }}
            >
              {t('settings.filtroFranjaDesc')}
            </p>
            <button
              onClick={() => setFiltroFranja(!ajustes.filtroFranja)}
              style={{
                ...buttonOptionStyle(ajustes.filtroFranja),
                textAlign: 'left',
              }}
            >
              {ajustes.filtroFranja ? '✓ ' : ''}
              {t('settings.filtroFranja')}
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>{t('settings.tabsVisibility')}</div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {listaSubpestanasOrdenadas.map(({ id, labelKey, locked }, idx) => {
              const isHidden = ajustes.subpestanasOcultas.includes(id);
              const isVisible = locked ? true : !isHidden;
              const isFirst = idx === 0;
              const isLast = idx === listaSubpestanasOrdenadas.length - 1;

              return (
                <div
                  key={id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: `1px solid ${
                      isVisible ? 'var(--accent)' : 'var(--border)'
                    }`,
                    backgroundColor: isVisible
                      ? 'var(--accent-subtle, rgba(56, 189, 248, 0.12))'
                      : 'var(--bg)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveSubpestana(idx, -1)}
                      title="Mover arriba"
                      style={{
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--surface)',
                        color: isFirst ? 'var(--text-muted)' : 'var(--text)',
                        borderRadius: 4,
                        padding: '3px 6px',
                        fontSize: '0.75rem',
                        cursor: isFirst ? 'default' : 'pointer',
                        opacity: isFirst ? 0.35 : 1,
                        lineHeight: 1,
                      }}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveSubpestana(idx, 1)}
                      title="Mover abajo"
                      style={{
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--surface)',
                        color: isLast ? 'var(--text-muted)' : 'var(--text)',
                        borderRadius: 4,
                        padding: '3px 6px',
                        fontSize: '0.75rem',
                        cursor: isLast ? 'default' : 'pointer',
                        opacity: isLast ? 0.35 : 1,
                        lineHeight: 1,
                      }}
                    >
                      ▼
                    </button>
                  </div>

                  <button
                    disabled={locked}
                    onClick={() => !locked && toggleSubpestana(id)}
                    style={{
                      flex: 1,
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: isVisible ? 'var(--text)' : 'var(--text-muted)',
                      cursor: locked ? 'default' : 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.85rem',
                      opacity: locked ? 0.8 : 1,
                      padding: 0,
                    }}
                  >
                    <span>{t(labelKey)}</span>
                    {locked ? (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-muted)',
                          padding: '2px 6px',
                          borderRadius: 4,
                          border: '1px solid var(--border)',
                        }}
                      >
                        {t('settings.tabLocked')}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontFamily: 'Fira Code, monospace',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
                      >
                        {isVisible ? '✓' : '✕'}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>{t('settings.tutorial')}</div>
          <button
            onClick={onOpenTutorial}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid var(--accent)',
              backgroundColor: 'transparent',
              color: 'var(--accent)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            📖 {t('settings.tutorialExtended')}
          </button>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>{t('settings.data')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={handleExportJson}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              📥 {t('settings.exportJson')}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              📤 {t('settings.importJson')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {feedbackImport && feedbackImport.tipo === 'ok' && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--verdict-favorable)',
                  backgroundColor: 'rgba(0, 229, 106, 0.1)',
                  color: 'var(--verdict-favorable)',
                  fontSize: '0.85rem',
                  lineHeight: 1.4,
                }}
              >
                ✓ {t('import.success', { count: feedbackImport.spots })}
              </div>
            )}
            {feedbackImport && feedbackImport.tipo === 'error' && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--verdict-desaconsejado)',
                  backgroundColor: 'rgba(255, 45, 85, 0.1)',
                  color: 'var(--verdict-desaconsejado)',
                  fontSize: '0.85rem',
                  lineHeight: 1.4,
                }}
              >
                ✕ {t('import.error')}{' '}
                <span style={{ opacity: 0.85 }}>
                  {t(MAPA_MOTIVO_A_CLAVE_I18N[feedbackImport.motivo])}
                </span>
              </div>
            )}
            <button
              onClick={handleClearAll}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #ef4444',
                backgroundColor: 'transparent',
                color: '#ef4444',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                marginTop: 4,
              }}
            >
              ⚠️ {t('settings.clearAll')}
            </button>
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 32 }}>
          <div style={sectionTitleStyle}>{t('settings.about')}</div>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
              margin: '0 0 14px 0',
            }}
          >
            {t('settings.aboutText')}
          </p>

          <div
            style={{
              paddingTop: 12,
              borderTop: '1px solid var(--border)',
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                marginBottom: 8,
              }}
            >
              {t('settings.behindTitle')}
            </div>
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                margin: 0,
                whiteSpace: 'pre-line',
              }}
            >
              {t('settings.behindText')}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {t('settings.version')}
            </span>
            <span
              style={{
                fontFamily: 'Fira Code, monospace',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              v1.025
            </span>
          </div>

          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
              margin: '0 0 10px 0',
            }}
          >
            {t('settings.donateText')}
          </p>
          <a
            href="https://ko-fi.com/xanthar"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg)',
              color: 'var(--accent)',
              fontSize: '0.9rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            ☕ {t('settings.donate')}
          </a>
        </div>
      </div>

      {editandoKayakPropio !== null && (
        <ModalKayakPropio
          inicial={editandoKayakPropio === 'nuevo' ? null : editandoKayakPropio}
          onSave={(datos) => {
            if (editandoKayakPropio === 'nuevo') {
              addKayakEditado(datos);
            } else {
              updateKayakEditado(editandoKayakPropio.id, {
                marca: datos.marca,
                modelo: datos.modelo,
                eslora: datos.entrada.eslora,
                manga: datos.entrada.manga,
                tipoCasco: datos.entrada.tipoCasco,
                autovaciable: datos.entrada.autovaciable,
                timon: datos.entrada.timon,
                compartimentosEstancos: datos.entrada.compartimentosEstancos,
                capacidadCarga: datos.entrada.capacidadCarga,
                propulsion: datos.entrada.propulsion,
                categoriaWKF: deducirCategoriaWKF(datos.entrada),
                pesoKg: datos.entrada.pesoKg,
                pesoFuente: datos.entrada.pesoKg != null ? 'estimado' : undefined,
              });
            }
            setEditandoKayakPropio(null);
          }}
          onCancel={() => setEditandoKayakPropio(null)}
        />
      )}

      {fichaTecnicaKayak && (
        <div
          onClick={() => setFichaTecnicaKayak(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--accent-2)',
              borderRadius: 12,
              padding: 20,
              maxWidth: 520,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'var(--accent-2)',
                  }}
                >
                  {fichaTecnicaKayak.marca} {fichaTecnicaKayak.modelo}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginTop: 2,
                  }}
                >
                  {t('kayak.title')} — {t('kayak.category')}{' '}
                  {fichaTecnicaKayak.categoriaWKF}
                </div>
              </div>
              <button
                onClick={() => setFichaTecnicaKayak(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  padding: '4px 8px',
                }}
              >
                ✕
              </button>
            </div>

            {(() => {
              const esPato = 'tipoEmbarcacion' in fichaTecnicaKayak && fichaTecnicaKayak.tipoEmbarcacion === 'pato';
              if (esPato) {
                const pato = fichaTecnicaKayak as Pato;
                const tp = TECHOS_PATOS[pato.categoriaWKF] ?? TECHOS_PATOS.P1;
                return [
                  { label: t('kayak.length'), val: `${pato.eslora.toFixed(2)} m` },
                  { label: t('kayak.beam'), val: `${pato.manga.toFixed(2)} m` },
                  { label: 'Peso', val: `${pato.peso} kg` },
                  { label: t('kayak.capacity'), val: `${pato.capacidadCarga} kg` },
                  { label: 'Estructura', val: pato.tipoEstructura },
                  { label: 'Material', val: pato.material },
                  { label: t('kayak.category'), val: pato.categoriaWKF },
                  {
                    label: t('kayak.techoAbsoluto'),
                    val: `${tp.vientoMaxBf} Bf / ${tp.olaMaxM.toFixed(1)} m`,
                  },
                  { label: t('kayak.fuente'), val: 'estimado' },
                  {
                    label: t('kayak.certificado'),
                    val: pato.certificado
                      ? t('kayak.certificadoSiWkf')
                      : t('kayak.certificadoNoWkf'),
                  },
                  {
                    label: t('kayak.verificado'),
                    val: pato.verificado ? '✓' : '—',
                  },
                ];
              }

              const kayak = fichaTecnicaKayak as Kayak;
              const filas: Array<{ label: string; val: string }> = [
                {
                  label: t('kayak.length'),
                  val: `${kayak.eslora.toFixed(2)} m`,
                },
                {
                  label: t('kayak.beam'),
                  val: `${kayak.manga.toFixed(2)} m`,
                },
                {
                  label: t('kayak.volume'),
                  val: `${kayak.volumen} L`,
                },
                { label: t('kayak.hull'), val: kayak.tipoCasco },
                {
                  label: t('kayak.sitOnTop'),
                  val: kayak.autovaciable ? '✓' : '—',
                },
                {
                  label: t('kayak.rudder'),
                  val: kayak.timon ? '✓' : '—',
                },
                {
                  label: t('kayak.bulkheads'),
                  val: kayak.compartimentosEstancos ? '✓' : '—',
                },
                {
                  label: t('kayak.capacity'),
                  val: `${kayak.capacidadCarga} kg`,
                },
                {
                  label: t('kayak.propulsion'),
                  val: kayak.propulsion,
                },
                {
                  label: t('kayak.category'),
                  val: kayak.categoriaWKF,
                },
                {
                  label: t('kayak.directiveCategory'),
                  val: kayak.categoriaDirectiva,
                },
              ];

              // Techo absoluto: solo si existe. Los kayaks a pala
              // exentos no lo llevan.
              if (kayak.techoAbsoluto) {
                filas.push({
                  label: t('kayak.techoAbsoluto'),
                  val: `${kayak.techoAbsoluto.vientoMaxBf} Bf / ${kayak.techoAbsoluto.olaMaxM.toFixed(1)} m`,
                });
                filas.push({
                  label: t('kayak.fuente'),
                  val: kayak.techoAbsoluto.fuente,
                });
              } else {
                filas.push({
                  label: t('kayak.techoAbsoluto'),
                  val: t('kayak.sinTecho'),
                });
              }

              filas.push({
                label: t('kayak.certificado'),
                val: kayak.certificado
                  ? t('kayak.certificadoSiWkf')
                  : t('kayak.certificadoNoWkf'),
              });
              filas.push({
                label: t('kayak.verificado'),
                val: kayak.verificado ? '✓' : '—',
              });

              return filas;
            })().map(({ label, val }) => (
              <div key={label} style={fichaRowStyle}>
                <span style={fichaLabelStyle}>{label}</span>
                <span style={fichaValorStyle}>{val}</span>
              </div>
            ))}

            {'certificaciones' in fichaTecnicaKayak && fichaTecnicaKayak.certificaciones && (
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                  }}
                >
                  {t('kayak.certificaciones')}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 6,
                  }}
                >
                  {construirFilasCertificaciones(fichaTecnicaKayak.certificaciones).map(
                    ({ labelKey, activa, valor }) => (
                      <div
                        key={labelKey}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '4px 8px',
                          borderRadius: 4,
                          border: `1px solid ${activa ? 'var(--accent)' : 'var(--border)'}`,
                          backgroundColor: activa
                            ? 'var(--accent-subtle, rgba(0, 229, 106, 0.10))'
                          : 'transparent',
                        fontSize: '0.75rem',
                        color: activa ? 'var(--text)' : 'var(--text-muted)',
                      }}
                    >
                      <span>{t(labelKey)}</span>
                      <span
                        style={{
                          fontFamily: 'Fira Code, monospace',
                          fontWeight: activa ? 700 : 400,
                        }}
                      >
                        {activa ? (valor ?? '✓') : '—'}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

            {!fichaTecnicaKayak.certificado && (
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 10px',
                  backgroundColor: 'rgba(229, 229, 0, 0.1)',
                  border: '1px solid var(--verdict-aceptable)',
                  borderRadius: 6,
                  fontSize: '0.8rem',
                  color: 'var(--verdict-aceptable)',
                }}
              >
                {t('kayak.noCertNote')}
              </div>
            )}

            <div
              style={{
                marginTop: 12,
                padding: '8px 10px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                fontSize: '0.75rem',
                lineHeight: 1.4,
                color: 'var(--text-muted)',
              }}
            >
              {t('kayak.certNotaPie')}
            </div>
          </div>
        </div>
      )}
      {modalMotorAbierto && (
        <ModalSelectorMotor
          motorElectricoIdActual={ajustes.perfil.motorElectricoId}
          motorElectricoCustomActual={ajustes.perfil.motorElectricoCustom}
          onSelect={(datos) => {
            setPerfil(datos);
            setModalMotorAbierto(false);
          }}
          onClose={() => setModalMotorAbierto(false)}
        />
      )}

      {modalBateriaAbierto && (
        <ModalSelectorBateria
          bateriaElectricaIdActual={ajustes.perfil.bateriaElectricaId}
          bateriaElectricaCustomActual={ajustes.perfil.bateriaElectricaCustom}
          onSelect={(datos) => {
            setPerfil(datos);
            setModalBateriaAbierto(false);
          }}
          onClose={() => setModalBateriaAbierto(false)}
        />
      )}
    </div>
  );
};

const ModalKayakPropio: React.FC<{
  inicial: KayakEditado | null;
  onSave: (datos: { marca: string; modelo: string; entrada: EntradaKayakEditado }) => void;
  onCancel: () => void;
}> = ({ inicial, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [marca, setMarca] = useState(inicial?.marca ?? '');
  const [modelo, setModelo] = useState(inicial?.modelo ?? '');
  const [eslora, setEslora] = useState<string>(
    inicial ? String(inicial.eslora) : '4.0'
  );
  const [manga, setManga] = useState<string>(
    inicial ? String(inicial.manga) : '0.75'
  );
  const [tipoCasco, setTipoCasco] = useState<'V' | 'U' | 'plano'>(inicial?.tipoCasco ?? 'U');
  const [autovaciable, setAutovaciable] = useState(inicial?.autovaciable ?? true);
  const [timon, setTimon] = useState(inicial?.timon ?? false);
  const [compartimentosEstancos, setCompartimentosEstancos] = useState(
    inicial?.compartimentosEstancos ?? false
  );
  const [capacidadCarga, setCapacidadCarga] = useState<string>(
    inicial ? String(inicial.capacidadCarga) : '150'
  );
  const [propulsion, setPropulsion] = useState<'pala' | 'pedal_aletas' | 'pedal_helice'>(
    inicial?.propulsion ?? 'pala'
  );
  const [pesoKgTexto, setPesoKgTexto] = useState<string>(
    inicial?.pesoKg != null ? String(inicial.pesoKg) : ''
  );
  const [mostrarManual, setMostrarManual] = useState(false);

  const esloraNum = parseFloat(eslora) || 0;
  const mangaNum = parseFloat(manga) || 0;
  const capacidadCargaNum = parseFloat(capacidadCarga) || 0;
  const pesoKgNum = pesoKgTexto.trim() === '' ? undefined : parseFloat(pesoKgTexto);

  const entrada: EntradaKayakEditado = {
    eslora: esloraNum,
    manga: mangaNum,
    tipoCasco,
    autovaciable,
    timon,
    compartimentosEstancos,
    capacidadCarga: capacidadCargaNum,
    propulsion,
    pesoKg: Number.isFinite(pesoKgNum) ? pesoKgNum : undefined,
  };
  const categoriaDeducida = deducirCategoriaWKF(entrada);
  const pesoEstimado = pesoEstimadoPorCategoria(categoriaDeducida);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text)',
    fontSize: '0.85rem',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginBottom: 4,
    display: 'block',
    fontWeight: 500,
  };

  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
      zIndex: 2000, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        backgroundColor: 'var(--surface)', border: '1px solid var(--accent-2)',
        borderRadius: 12, padding: 20, maxWidth: 520, width: '100%',
        maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700,
            color: 'var(--accent-2)' }}>
            {inicial ? t('kayak.editKayakPropio') : t('kayak.addKayakPropio')}
          </h3>
          <button type="button" onClick={onCancel} style={{
            border: 'none', background: 'transparent',
            color: 'var(--text-dim)', cursor: 'pointer',
            fontSize: '1.2rem', padding: '4px 8px',
          }}>✕</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setMostrarManual(!mostrarManual)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            📖 {mostrarManual ? (t('kayak.manualCerrar') || 'Ocultar manual') : t('kayak.manualTitulo')}
          </button>
        </div>

        {mostrarManual && (
          <div style={{
            marginBottom: 14,
            padding: '12px 14px',
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--accent)',
            borderRadius: 8,
            fontSize: '0.78rem',
            lineHeight: 1.5,
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.85rem' }}>
              {t('kayak.manualTitulo')}
            </div>
            <div>{t('kayak.manualPaso1')}</div>
            <div>{t('kayak.manualPaso2')}</div>
            <div>{t('kayak.manualPaso3')}</div>
            <div>{t('kayak.manualPaso4')}</div>
            <div>{t('kayak.manualPaso5')}</div>
            <div>{t('kayak.manualPaso6')}</div>
            <div>{t('kayak.manualPaso7')}</div>
            <div>{t('kayak.manualPaso8')}</div>
            <div style={{
              marginTop: 4,
              paddingTop: 6,
              borderTop: '1px dashed var(--border)',
              color: 'var(--text-dim)',
              fontStyle: 'italic',
            }}>
              {t('kayak.manualCategoriaAviso')}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>{t('kayak.campoMarca')}</label>
              <input
                type="text"
                autoComplete="off"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Ej. Galaxy, Ocean..."
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{t('kayak.campoModelo')}</label>
              <input
                type="text"
                autoComplete="off"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="Ej. Alborán, Cruz..."
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>{t('kayak.campoEslora')}</label>
              <input
                type="number"
                autoComplete="off"
                step="0.01"
                min="1.0"
                max="10.0"
                value={eslora}
                onChange={(e) => setEslora(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{t('kayak.campoManga')}</label>
              <input
                type="number"
                autoComplete="off"
                step="0.01"
                min="0.3"
                max="2.0"
                value={manga}
                onChange={(e) => setManga(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>{t('kayak.campoCasco')}</label>
              <select
                value={tipoCasco}
                onChange={(e) => setTipoCasco(e.target.value as 'V' | 'U' | 'plano')}
                style={inputStyle}
              >
                <option value="V">V</option>
                <option value="U">U</option>
                <option value="plano">Plano</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('kayak.campoPropulsion')}</label>
              <select
                value={propulsion}
                onChange={(e) => setPropulsion(e.target.value as 'pala' | 'pedal_aletas' | 'pedal_helice')}
                style={inputStyle}
              >
                <option value="pala">{t('kayak.propulsionPaddle')}</option>
                <option value="pedal_aletas">{t('kayak.propulsionFin')}</option>
                <option value="pedal_helice">{t('kayak.propulsionProp')}</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t('kayak.campoCapacidad')}</label>
            <input
              type="number"
              autoComplete="off"
              step="5"
              min="30"
              max="600"
              value={capacidadCarga}
              onChange={(e) => setCapacidadCarga(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Peso del kayak propio (opcional) */}
          <div>
            <label style={labelStyle}>{t('kayak.campoPeso')}</label>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={pesoKgTexto}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                setPesoKgTexto(raw);
              }}
              placeholder={`${pesoEstimado}`}
              style={inputStyle}
            />
            <div
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-dim)',
                marginTop: 4,
                lineHeight: 1.4,
              }}
            >
              {t('kayak.campoPesoAyuda', {
                defaultValue:
                  'Opcional. Si lo dejas vacío, WKF estimará el peso por categoría ({{peso}} kg para tu kayak).',
                peso: pesoEstimado,
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text)',
            }}>
              <span>{t('kayak.campoAutovaciable')}</span>
              <input
                type="checkbox"
                checked={autovaciable}
                onChange={(e) => setAutovaciable(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
            </label>

            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text)',
            }}>
              <span>{t('kayak.campoTimon')}</span>
              <input
                type="checkbox"
                checked={timon}
                onChange={(e) => setTimon(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
            </label>

            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text)',
            }}>
              <span>{t('kayak.campoCompartimentos')}</span>
              <input
                type="checkbox"
                checked={compartimentosEstancos}
                onChange={(e) => setCompartimentosEstancos(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
            </label>
          </div>
        </div>

        <div style={{
          marginTop: 14, padding: '8px 10px',
          backgroundColor: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 6, fontSize: '0.75rem', color: 'var(--text-dim)',
        }}>
          <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
            {t('kayak.categoriaDeducida', { cat: `${categoriaDeducida}e` })}
          </div>
          <div style={{ lineHeight: 1.4 }}>
            {t('kayak.categoriaDeducidaAyuda')}
          </div>
        </div>

        <div style={{
          marginTop: 12,
          padding: '10px 12px',
          backgroundColor: 'rgba(255, 180, 0, 0.08)',
          border: '1px solid rgba(255, 180, 0, 0.35)',
          borderRadius: 6,
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          lineHeight: 1.45,
        }}>
          <div style={{ fontWeight: 700, color: 'var(--accent-2, #f59e0b)', marginBottom: 4 }}>
            ⚠️ {t('kayak.responsabilidadTitulo')}
          </div>
          <div>{t('kayak.responsabilidadTexto')}</div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <button type="button" onClick={onCancel} style={{
            flex: 1, padding: '10px 16px', borderRadius: 8,
            border: '1px solid var(--border)', backgroundColor: 'transparent',
            color: 'var(--text)', fontSize: '0.9rem', cursor: 'pointer',
          }}>{t('kayak.cancelar')}</button>
          <button type="button" onClick={() => {
            const marcaTrim = marca.trim();
            const modeloTrim = modelo.trim();
            let marcaFinal = marcaTrim;
            let modeloFinal = modeloTrim;

            if (!marcaTrim && !modeloTrim) {
              marcaFinal = 'Kayak propio';
              modeloFinal = '';
            } else if (!marcaTrim) {
              marcaFinal = modeloTrim;
              modeloFinal = '';
            }

            onSave({
              marca: marcaFinal,
              modelo: modeloFinal,
              entrada: {
                ...entrada,
                eslora: esloraNum || 4.0,
                manga: mangaNum || 0.75,
                capacidadCarga: capacidadCargaNum || 150,
              },
            });
          }} style={{
            flex: 1, padding: '10px 16px', borderRadius: 8,
            border: 'none', backgroundColor: 'var(--accent)',
            color: '#000', fontSize: '0.9rem', fontWeight: 600,
            cursor: 'pointer',
          }}>{t('kayak.guardarKayakPropio')}</button>
        </div>
      </div>
    </div>
  );
};

const ModalSelectorMotor: React.FC<{
  motorElectricoIdActual: string | null;
  motorElectricoCustomActual: {
    empujeLbs: number;
    voltajeV: number;
    amperajeCruceroA: number | null;
  } | null;
  onSelect: (datos: {
    motorElectricoId: string | null;
    motorElectricoCustom: {
      empujeLbs: number;
      voltajeV: number;
      amperajeCruceroA: number | null;
    } | null;
  }) => void;
  onClose: () => void;
}> = ({ motorElectricoIdActual, motorElectricoCustomActual, onSelect, onClose }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'catalogo' | 'custom'>(
    motorElectricoCustomActual ? 'custom' : 'catalogo'
  );
  const [busqueda, setBusqueda] = useState('');

  const [empujeLbs, setEmpujeLbs] = useState<string>(
    motorElectricoCustomActual?.empujeLbs != null ? String(motorElectricoCustomActual.empujeLbs) : '30'
  );
  const [voltajeV, setVoltajeV] = useState<number>(
    motorElectricoCustomActual?.voltajeV ?? 12
  );
  const [amperajeA, setAmperajeA] = useState<string>(
    motorElectricoCustomActual?.amperajeCruceroA != null
      ? String(motorElectricoCustomActual.amperajeCruceroA)
      : ''
  );

  const empujeLbsNum = parseFloat(empujeLbs) || 0;

  const motoresFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return CATALOGO_MOTORES.filter((m) => {
      if (m.generico) return false;
      if (!q) return true;
      return (
        m.marca.toLowerCase().includes(q) ||
        m.modelo.toLowerCase().includes(q) ||
        `${m.empujeLbs}`.includes(q)
      );
    });
  }, [busqueda]);

  const amperajeEstimado = useMemo(() => {
    return estimarAmperajePorEmpuje(empujeLbsNum, voltajeV);
  }, [empujeLbsNum, voltajeV]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text)',
    fontSize: '0.85rem',
    boxSizing: 'border-box',
    marginTop: 4,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    display: 'block',
    marginTop: 8,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          maxWidth: 520,
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
            {t('perfil.motorTitulo')}
          </h2>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '1.2rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setTab('catalogo')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: `1px solid ${tab === 'catalogo' ? 'var(--accent)' : 'var(--border)'}`,
              backgroundColor: tab === 'catalogo' ? 'var(--accent-subtle, rgba(0,229,106,0.1))' : 'transparent',
              color: tab === 'catalogo' ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '0.82rem',
              fontWeight: tab === 'catalogo' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {t('perfil.motorDelCatalogo')}
          </button>
          <button
            type="button"
            onClick={() => setTab('custom')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: `1px solid ${tab === 'custom' ? 'var(--accent)' : 'var(--border)'}`,
              backgroundColor: tab === 'custom' ? 'var(--accent-subtle, rgba(0,229,106,0.1))' : 'transparent',
              color: tab === 'custom' ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '0.82rem',
              fontWeight: tab === 'custom' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {t('perfil.motorPersonalizado')}
          </button>
        </div>

        {tab === 'catalogo' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <input
              type="text"
              autoComplete="off"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por marca o modelo…"
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text)',
                fontSize: '0.85rem',
                marginBottom: 10,
                boxSizing: 'border-box',
              }}
            />

            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
              <button
                type="button"
                onClick={() => onSelect({ motorElectricoId: null, motorElectricoCustom: null })}
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px dashed var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-dim)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                ✕ {t('perfil.motorSinMotor')}
              </button>

              {motoresFiltrados.map((m) => {
                const activo = motorElectricoIdActual === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelect({ motorElectricoId: m.id, motorElectricoCustom: null })}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${activo ? 'var(--accent)' : 'var(--border)'}`,
                      backgroundColor: activo ? 'var(--accent-subtle, rgba(0,229,106,0.1))' : 'var(--bg)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>
                        {m.marca} {m.modelo}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontFamily: 'Fira Code, monospace',
                        color: 'var(--accent)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor: 'rgba(0,229,106,0.1)',
                      }}>
                        {m.empujeLbs} lbs · {m.voltajeV} V
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Crucero: ~{m.amperajeCruceroA ?? estimarAmperajePorEmpuje(m.empujeLbs, m.voltajeV)} A · {m.potenciaW ?? (m.voltajeV * (m.amperajeCruceroA ?? estimarAmperajePorEmpuje(m.empujeLbs, m.voltajeV)))} W
                    </div>
                    {m.notas && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {m.notas}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'custom' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto' }}>
            <div>
              <label style={labelStyle}>{t('perfil.motorCampoEmpuje')}</label>
              <input
                type="number"
                autoComplete="off"
                min={5}
                max={200}
                value={empujeLbs}
                onChange={(e) => setEmpujeLbs(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>{t('perfil.motorCampoVoltaje')}</label>
              <select
                value={voltajeV}
                onChange={(e) => setVoltajeV(parseInt(e.target.value, 10) || 12)}
                style={inputStyle}
              >
                <option value={12}>12 V</option>
                <option value={24}>24 V</option>
                <option value={36}>36 V</option>
                <option value={48}>48 V</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>{t('perfil.motorCampoAmperaje')}</label>
              <input
                type="number"
                autoComplete="off"
                step="0.5"
                min={0}
                max={150}
                placeholder={`Estimado: ~${amperajeEstimado} A`}
                value={amperajeA}
                onChange={(e) => setAmperajeA(e.target.value)}
                style={inputStyle}
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>
                {t('perfil.motorCampoAmperajeAyuda')} (Estimación WKF: ~{amperajeEstimado} A).
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 14, display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const ampNum = amperajeA.trim() !== '' ? parseFloat(amperajeA) || null : null;
                  onSelect({
                    motorElectricoId: null,
                    motorElectricoCustom: {
                      empujeLbs: empujeLbsNum || 30,
                      voltajeV,
                      amperajeCruceroA: ampNum,
                    },
                  });
                }}
                disabled={empujeLbsNum <= 0}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: 'var(--accent)',
                  color: '#000',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: empujeLbsNum <= 0 ? 'not-allowed' : 'pointer',
                  opacity: empujeLbsNum <= 0 ? 0.5 : 1,
                }}
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ModalSelectorBateria: React.FC<{
  bateriaElectricaIdActual: string | null;
  bateriaElectricaCustomActual: {
    quimica: 'litio' | 'agm' | 'gel';
    voltajeV: number;
    capacidadAh: number;
    pesoKg: number;
  } | null;
  onSelect: (datos: {
    bateriaElectricaId: string | null;
    bateriaElectricaCustom: {
      quimica: 'litio' | 'agm' | 'gel';
      voltajeV: number;
      capacidadAh: number;
      pesoKg: number;
    } | null;
  }) => void;
  onClose: () => void;
}> = ({ bateriaElectricaIdActual, bateriaElectricaCustomActual, onSelect, onClose }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'catalogo' | 'custom'>(
    bateriaElectricaCustomActual ? 'custom' : 'catalogo'
  );

  const [quimica, setQuimica] = useState<'litio' | 'agm' | 'gel'>(
    bateriaElectricaCustomActual?.quimica ?? 'litio'
  );
  const [voltajeV, setVoltajeV] = useState<number>(
    bateriaElectricaCustomActual?.voltajeV ?? 12
  );
  const [capacidadAh, setCapacidadAh] = useState<string>(
    bateriaElectricaCustomActual?.capacidadAh != null
      ? String(bateriaElectricaCustomActual.capacidadAh)
      : '50'
  );
  const [pesoKg, setPesoKg] = useState<string>(
    bateriaElectricaCustomActual?.pesoKg != null
      ? String(bateriaElectricaCustomActual.pesoKg)
      : '10'
  );

  const capacidadAhNum = parseFloat(capacidadAh) || 0;
  const pesoKgNum = parseFloat(pesoKg) || 0;

  const bateriasCatalogo = useMemo(() => {
    return CATALOGO_BATERIAS.filter((b) => b.capacidadAh > 0);
  }, []);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text)',
    fontSize: '0.85rem',
    boxSizing: 'border-box',
    marginTop: 4,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    display: 'block',
    marginTop: 8,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          maxWidth: 520,
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
            {t('perfil.motorBateriaTitulo')}
          </h2>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '1.2rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setTab('catalogo')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: `1px solid ${tab === 'catalogo' ? 'var(--accent)' : 'var(--border)'}`,
              backgroundColor: tab === 'catalogo' ? 'var(--accent-subtle, rgba(0,229,106,0.1))' : 'transparent',
              color: tab === 'catalogo' ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '0.82rem',
              fontWeight: tab === 'catalogo' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {t('perfil.motorDelCatalogo')}
          </button>
          <button
            type="button"
            onClick={() => setTab('custom')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: `1px solid ${tab === 'custom' ? 'var(--accent)' : 'var(--border)'}`,
              backgroundColor: tab === 'custom' ? 'var(--accent-subtle, rgba(0,229,106,0.1))' : 'transparent',
              color: tab === 'custom' ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '0.82rem',
              fontWeight: tab === 'custom' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {t('perfil.motorPersonalizado')}
          </button>
        </div>

        {tab === 'catalogo' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
              <button
                type="button"
                onClick={() => onSelect({ bateriaElectricaId: null, bateriaElectricaCustom: null })}
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px dashed var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-dim)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                ✕ Sin batería
              </button>

              {bateriasCatalogo.map((b) => {
                const activo = bateriaElectricaIdActual === b.id;
                const quimicaLabel = b.quimica === 'litio' ? t('perfil.motorBateriaLitio') : b.quimica === 'agm' ? t('perfil.motorBateriaAGM') : t('perfil.motorBateriaGel');
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onSelect({ bateriaElectricaId: b.id, bateriaElectricaCustom: null })}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${activo ? 'var(--accent)' : 'var(--border)'}`,
                      backgroundColor: activo ? 'var(--accent-subtle, rgba(0,229,106,0.1))' : 'var(--bg)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>
                        {quimicaLabel} {b.capacidadAh} Ah
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontFamily: 'Fira Code, monospace',
                        color: 'var(--accent)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor: 'rgba(0,229,106,0.1)',
                      }}>
                        {b.voltajeV} V · {b.pesoKg} kg
                      </span>
                    </div>
                    {b.notas && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {b.notas}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'custom' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto' }}>
            <div>
              <label style={labelStyle}>{t('perfil.motorBateriaQuimica')}</label>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {(['litio', 'agm', 'gel'] as const).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuimica(q)}
                    style={{
                      flex: 1,
                      padding: '8px 6px',
                      borderRadius: 6,
                      border: `1px solid ${quimica === q ? 'var(--accent)' : 'var(--border)'}`,
                      backgroundColor: quimica === q ? 'var(--accent-subtle, rgba(0,229,106,0.1))' : 'transparent',
                      color: quimica === q ? 'var(--accent)' : 'var(--text-muted)',
                      fontSize: '0.78rem',
                      fontWeight: quimica === q ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {q === 'litio' ? t('perfil.motorBateriaLitio') : q === 'agm' ? t('perfil.motorBateriaAGM') : t('perfil.motorBateriaGel')}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>{t('perfil.motorBateriaCapacidad')}</label>
                <input
                  type="number"
                  autoComplete="off"
                  min={5}
                  max={500}
                  value={capacidadAh}
                  onChange={(e) => setCapacidadAh(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>{t('perfil.motorCampoVoltaje')}</label>
                <select
                  value={voltajeV}
                  onChange={(e) => setVoltajeV(parseInt(e.target.value, 10) || 12)}
                  style={inputStyle}
                >
                  <option value={12}>12 V</option>
                  <option value={24}>24 V</option>
                  <option value={36}>36 V</option>
                  <option value={48}>48 V</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>{t('perfil.motorBateriaPeso')}</label>
              <input
                type="number"
                autoComplete="off"
                step="0.5"
                min={1}
                max={100}
                value={pesoKg}
                onChange={(e) => setPesoKg(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 14, display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelect({
                    bateriaElectricaId: null,
                    bateriaElectricaCustom: {
                      quimica,
                      voltajeV,
                      capacidadAh: capacidadAhNum || 50,
                      pesoKg: pesoKgNum || 10,
                    },
                  });
                }}
                disabled={capacidadAhNum <= 0}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: 'var(--accent)',
                  color: '#000',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: capacidadAhNum <= 0 ? 'not-allowed' : 'pointer',
                  opacity: capacidadAhNum <= 0 ? 0.5 : 1,
                }}
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsScreen;