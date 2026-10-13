import { useId, useRef, useState, type ReactNode } from 'react';
import { UiIcon } from './UiIcon';
import './file-drop-zone.css';

type IconName = Parameters<typeof UiIcon>[0]['name'];

/** True when a dropped file matches an `accept` list of extensions and MIME patterns. */
export function acceptsFile(file: File, accept: string): boolean {
  if (!accept) return true;
  const name = file.name.toLowerCase(),
    type = file.type.toLowerCase();
  return accept
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .some((token) =>
      token.startsWith('.')
        ? name.endsWith(token)
        : token.endsWith('/*')
          ? type.startsWith(token.slice(0, -1))
          : type === token
    );
}

/** One file picker for the app: click or drag files onto it. */
export function FileDropZone({
  title,
  inputLabel = title,
  hint,
  accept,
  multiple = false,
  disabled = false,
  icon = 'plus',
  compact = false,
  files,
  onFiles,
  onRejected
}: {
  title: string;
  inputLabel?: string;
  hint?: ReactNode;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  icon?: IconName;
  compact?: boolean;
  /** Names of the files currently chosen, shown instead of the hint. */
  files?: string[];
  onFiles: (files: File[]) => void;
  /** Called with dropped files that do not match `accept`. */
  onRejected?: (files: File[]) => void;
}): JSX.Element {
  const input = useRef<HTMLInputElement>(null),
    id = useId();
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const take = (list: FileList | null) => {
    const all = [...(list ?? [])];
    const valid = all.filter((file) => acceptsFile(file, accept));
    const rejected = all.filter((file) => !valid.includes(file));
    if (rejected.length) onRejected?.(rejected);
    if (valid.length) onFiles(multiple ? valid : valid.slice(0, 1));
  };
  return (
    <div
      className={'file-drop' + (compact ? ' is-compact' : '')}
      data-over={over || undefined}
      data-disabled={disabled || undefined}
      onDragEnter={(event) => {
        if (disabled || !event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        depth.current++;
        setOver(true);
      }}
      onDragOver={(event) => {
        if (disabled || !event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={() => {
        if (--depth.current <= 0) {
          depth.current = 0;
          setOver(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (disabled) return;
        depth.current = 0;
        setOver(false);
        take(event.dataTransfer.files);
      }}
    >
      <button
        type="button"
        className="file-drop-target"
        disabled={disabled}
        aria-describedby={hint || files?.length ? id : undefined}
        onClick={() => input.current?.click()}
      >
        <span className="file-drop-icon" aria-hidden="true">
          <UiIcon name={icon} />
        </span>
        <span className="file-drop-text">
          <strong>{title}</strong>
          {files?.length ? (
            <small id={id} className="file-drop-files">
              {files.join(', ')}
            </small>
          ) : (
            hint && <small id={id}>{hint}</small>
          )}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        aria-label={inputLabel}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        hidden
        tabIndex={-1}
        onChange={(event) => {
          take(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
