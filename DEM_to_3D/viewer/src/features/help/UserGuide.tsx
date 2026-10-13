import { useNativeDialog } from '../../shared/hooks/useNativeDialog';
import { useId, useRef, useState } from 'react';
import type { Locale } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import { guideContent } from './locales';
import './help.css';

/** Modal guide: the page behind it is inert until the guide closes. */
export function UserGuide({
  locale,
  onClose,
  audience = 'manager'
}: {
  locale: Locale;
  onClose: () => void;
  audience?: 'resident' | 'manager';
}): JSX.Element {
  const content = guideContent[locale],
    id = useId(),
    ref = useRef<HTMLDialogElement>(null);
  const topics = content.topics.filter((topic) => topic.audience === audience);
  const [index, setIndex] = useState(0);
  const [missing, setMissing] = useState<Record<string, boolean>>({});
  const topic = topics[Math.min(index, topics.length - 1)];
  useNativeDialog(ref);
  return (
    <dialog
      ref={ref}
      className="user-guide"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header className="user-guide-heading">
        <h2 id={id}>{content.title}</h2>
        <button
          className="icon-button"
          aria-label={content.close}
          onClick={onClose}
        >
          <UiIcon name="close" />
        </button>
      </header>
      <div className="user-guide-body">
        <nav aria-label={content.topicsLabel}>
          {topics.map((item, position) => (
            <button
              key={item.id}
              aria-current={position === index ? 'step' : undefined}
              onClick={() => setIndex(position)}
            >
              <span className="user-guide-index">{position + 1}</span>
              {item.title}
            </button>
          ))}
        </nav>
        <article key={topic.id} aria-live="polite">
          <h3>{topic.title}</h3>
          {!missing[topic.image] && (
            <figure className="user-guide-shot">
              <a
                href={import.meta.env.BASE_URL + topic.image}
                target="_blank"
                rel="noreferrer"
                aria-label={content.fullImage}
              >
                <img
                  key={topic.image}
                  src={import.meta.env.BASE_URL + topic.image}
                  alt={topic.title}
                  onError={() =>
                    setMissing((value) => ({ ...value, [topic.image]: true }))
                  }
                />
              </a>
            </figure>
          )}
          <ol className="user-guide-steps">
            {topic.steps.map((step) => (
              <li key={step.title}>
                <span className="user-guide-icon" aria-hidden="true">
                  <UiIcon name={step.icon} />
                </span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>
      </div>
      <footer className="user-guide-footer">
        <span>
          {content.stepOf
            .replace('{n}', String(index + 1))
            .replace('{total}', String(topics.length))}
        </span>
        <button
          className="button"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          <UiIcon name="back" size={16} />
          {content.previous}
        </button>
        <button
          className="button primary"
          disabled={index === topics.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          {content.next}
          <UiIcon name="next" size={16} />
        </button>
      </footer>
    </dialog>
  );
}
