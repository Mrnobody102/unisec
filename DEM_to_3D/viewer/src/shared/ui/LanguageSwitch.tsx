import type {Locale} from '../../types/dear';
import './language-switch.css';

export function LanguageSwitch({locale, onChange, compact = false}: {
  locale: Locale; onChange: (locale: Locale) => void; compact?: boolean;
}) {
  const label = locale === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh';
  return <button type="button" className="button language-switch" title={label} aria-label={label}
    onClick={() => onChange(locale === 'en' ? 'vi' : 'en')}>
    {compact ? (locale === 'en' ? 'VI' : 'EN') : (locale === 'en' ? 'Tiếng Việt' : 'English')}
  </button>;
}
