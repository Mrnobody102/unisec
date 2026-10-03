import { useEffect, useRef, useState } from 'react';
import type { Locale } from '../../types/dear';
import type { SearchResult } from './searchIndex';
import { UiIcon } from '../../components/dear/UiIcon';

export function MapSearch({ locale, results, query, onQuery, onSelect, disabled }: {
  locale: Locale; results: SearchResult[]; query: string; onQuery: (query: string) => void;
  onSelect: (result: SearchResult) => void; disabled: boolean;
}): JSX.Element {
  const [open, setOpen] = useState(false), [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  useEffect(() => {
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  const choose = (result: SearchResult) => { onSelect(result); setOpen(false); };
  return <div ref={root} className="map-search">
    <div className="map-search-field">
      <UiIcon name="search"/>
      <input role="combobox" aria-label={t('Tìm trên bản đồ', 'Search map')} aria-expanded={open && Boolean(query.trim())}
        aria-controls="map-search-results" aria-autocomplete="list" aria-activedescendant={open && results[active] ? `map-result-${active}` : undefined}
        placeholder={t('Tìm địa bàn, đường, điểm…', 'Search places, roads, sites…')} value={query} disabled={disabled}
        onFocus={() => setOpen(true)} onBlur={event => { if (!root.current?.contains(event.relatedTarget as Node | null)) setOpen(false); }}
        onChange={event => { onQuery(event.target.value); setOpen(true); setActive(0); }}
        onKeyDown={event => {
          if (event.key === 'Escape') { setOpen(false); event.stopPropagation(); }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive(index => results.length ? (index + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length : 0); }
          if (event.key === 'Enter' && results[active]) { event.preventDefault(); choose(results[active]); }
        }}/>
      {query && <button className="icon-button" aria-label={t('Xóa tìm kiếm', 'Clear search')} onClick={() => { onQuery(''); setActive(0); root.current?.querySelector('input')?.focus(); }}><UiIcon name="close" size={16}/></button>}
    </div>
    {open && query.trim() && <div id="map-search-results" className="map-search-results" role="listbox" aria-label={t('Kết quả tìm kiếm', 'Search results')}>
      {!results.length && <p>{t('Không tìm thấy kết quả', 'No results found')}</p>}
      {results.map((result, index) => <button key={result.key} id={`map-result-${index}`} role="option" aria-selected={index === active}
        onPointerMove={() => setActive(index)} onClick={() => choose(result)}><strong>{result.name}</strong><small>{result.category}</small></button>)}
    </div>}
  </div>;
}
