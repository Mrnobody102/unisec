import { useId, type CSSProperties } from 'react';
import './choice-group.css';

/** One choice among a few options, shown at once. Native radios keep arrow keys and screen readers. */
export function ChoiceGroup<T extends string>({ label, options, value, onChange, disabled, columns = 3 }: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
  columns?: number;
}): JSX.Element {
  const name = useId();
  return <fieldset className="choice-group" style={{ '--choice-columns': columns } as CSSProperties} disabled={disabled}>
    <legend>{label}</legend>
    {options.map(option => <label key={option.value} className="choice-group-option">
      <input type="radio" name={name} value={option.value} checked={option.value === value} onChange={() => onChange(option.value)}/>
      <span>{option.label}</span>
    </label>)}
  </fieldset>;
}
