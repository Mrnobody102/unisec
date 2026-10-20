import type { ReactNode } from 'react';
import type { Community, Locale } from '../../types/dear';
import { StatusText } from '../../shared/ui/StatusText';
import { UiIcon } from './UiIcon';

export type KeyFact = { label: string; value: ReactNode; tone?: 'critical' | 'warning' };

/** The few numbers a responder reads first, side by side under the title. */
export function KeyFacts({ items }: { items: KeyFact[] }): JSX.Element | null {
  if (!items.length) return null;
  return <dl className="key-facts">
    {items.map(item => <div key={item.label} className={item.tone ? `is-${item.tone}` : undefined}>
      <dt>{item.label}</dt><dd>{item.value}</dd>
    </div>)}
  </dl>;
}

export const peopleText = (community: Community, locale: Locale) =>
  locale === 'vi' ? `${community.hh} hộ, ${community.pop} người` : `${community.hh} households, ${community.pop} people`;

/** A community affected by the object in view: who lives there and how urgent it is. */
export function CommunityImpactRow({ community, locale, note, onSelect }: {
  community: Community; locale: Locale; note?: string; onSelect: () => void;
}): JSX.Element {
  return <button className="object-row impact-row community-impact-row" onClick={onSelect}>
    <span><strong>{community.name}</strong><small>{peopleText(community, locale)}</small>{note && <small>{note}</small>}</span>
    {community.prio === 1
      ? <StatusText tone="priority" icon="priority">{locale === 'vi' ? 'Ưu tiên cao' : 'High priority'}</StatusText>
      : <UiIcon name="next" size={16}/>}
  </button>;
}
