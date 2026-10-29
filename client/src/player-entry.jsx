import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from './i18n.jsx';
import { AuthProvider } from './auth.jsx';
import { UiProvider } from './ui.jsx';
import GameShell from './games/GameShell.jsx';
import './styles.css';

const activity = window.__ACTIVITY__;
let theme = 'light';
try { theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch { /* افتراضي */ }
document.documentElement.dataset.theme = theme;

createRoot(document.getElementById('root')).render(
  <I18nProvider>
    <UiProvider>
      <AuthProvider>
        <div className="play-page"><GameShell activity={activity} standalone /></div>
      </AuthProvider>
    </UiProvider>
  </I18nProvider>,
);
