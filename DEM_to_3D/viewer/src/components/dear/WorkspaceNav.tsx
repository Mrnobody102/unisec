import React from 'react';
import type { Locale, WorkspaceView } from '../../types/dear';

type Props = {
  view: WorkspaceView;
  locale: Locale;
  onChangeView: (view: WorkspaceView) => void;
};

export const WorkspaceNav: React.FC<Props> = ({ view, locale, onChangeView }) => {
  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);

  const navItems: Array<{ id: WorkspaceView; vi: string; en: string }> = [
    { id: 'incident', vi: 'Sự kiện', en: 'Incident' },
    { id: 'impact', vi: 'Đường sá', en: 'Roads' },
    { id: 'priority', vi: 'Địa bàn', en: 'Communities' }
  ];

  return (
    <nav className="workspace-nav" aria-label={t('Nghiệp vụ ứng phó', 'Response workspace')}>
      {navItems.map((item) => (
        <button
          key={item.id}
          data-view={item.id}
          aria-current={view === item.id ? 'page' : 'false'}
          onClick={() => onChangeView(item.id)}
        >
          {t(item.vi, item.en)}
        </button>
      ))}
    </nav>
  );
};
