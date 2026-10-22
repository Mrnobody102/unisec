import type {Locale} from '../types/dear';

/** An explicit presentation link overrides a saved language for this launch. */
export function initialLocale(search: string, saved: () => string | null): Locale {
  const requested = new URLSearchParams(search).get('lang');
  if (requested === 'en' || requested === 'vi') return requested;
  try { return saved() === 'vi' ? 'vi' : 'en'; }
  catch { return 'en'; }
}
