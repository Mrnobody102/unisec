import type { FontChoice, Locale } from '../../types/dear';

type Props = {
  locale: Locale;
  value: FontChoice;
  onChange: (font: FontChoice) => void;
};

/** Font choices use the workspace's existing compact, keyboard-accessible select. */
export function FontSelector({ locale, value, onChange }: Props): JSX.Element {
  const label = locale === 'vi' ? 'Kiểu chữ' : 'Typography';
  return (
    <label className="settings-font">
      <span className="settings-label">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value as FontChoice)}>
        <option value="classic">Inter</option>
        <option value="plex">IBM Plex Sans</option>
        <option value="modern">{locale === 'vi' ? 'Be Vietnam Pro' : 'Space Grotesk'}</option>
      </select>
    </label>
  );
}
