import { useEffect, useLayoutEffect, useState } from 'react';
import type { FontChoice, Locale } from '../types/dear';

export function useWorkspacePreferences() {
  const [locale, setLocale] = useState<Locale>(() => {
    try { return window.localStorage.getItem('dear.locale') === 'en' ? 'en' : 'vi'; }
    catch { return 'vi'; }
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return window.localStorage.getItem('dear.theme') === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  });
  const [fontChoice, setFontChoice] = useState<FontChoice>(() => {
    try {
      const saved = window.localStorage.getItem('dear.font-choice');
      return saved === 'classic' || saved === 'plex' || saved === 'modern' || saved === 'source' ? saved : 'source';
    } catch { return 'source'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--header-bg').trim());
    try { window.localStorage.setItem('dear.theme', theme); } catch { /* Session preference remains available. */ }
  }, [theme]);
  useLayoutEffect(() => {
    document.documentElement.dataset.font = fontChoice;
    try { window.localStorage.setItem('dear.font-choice', fontChoice); } catch { /* Session preference remains available. */ }
  }, [fontChoice]);
  useEffect(() => {
    document.documentElement.lang = locale;
    try { window.localStorage.setItem('dear.locale', locale); } catch { /* Session preference remains available. */ }
    const geodata = new URLSearchParams(window.location.search).get('workspace') === 'geodata';
    document.title = geodata ? (locale === 'vi' ? 'DEAR | Dữ liệu GIS' : 'DEAR | GIS data')
      : (locale === 'vi' ? 'DEAR | Bản đồ ứng phó' : 'DEAR | Response map');
  }, [locale]);
  return { locale, setLocale, theme, setTheme, fontChoice, setFontChoice };
}
