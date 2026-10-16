// src/App.tsx
// WKF — Componente raíz. Sin cambios funcionales en v1.010.

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from './state/store.ts';
import { FirstRun } from './screens/FirstRun.tsx';
import { Home } from './screens/Home.tsx';

export const App: React.FC = () => {
  const { i18n } = useTranslation();
  const firstRunDone = useAppStore((state) => state.firstRunDone);
  const theme = useAppStore((state) => state.theme);
  const language = useAppStore((state) => state.language);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  return firstRunDone ? <Home /> : <FirstRun />;
};

export default App;