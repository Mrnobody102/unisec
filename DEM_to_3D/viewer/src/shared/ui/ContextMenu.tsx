import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import './context-menu.css';

export type ContextMenuItem =
  | {
      id: string;
      label: string;
      icon?: ReactNode;
      /** Right-aligned secondary text, e.g. a shortcut or a value. */
      detail?: string;
      tone?: 'danger';
      disabled?: boolean;
      onSelect: () => void;
    }
  | 'separator';

export type ContextMenuRequest = { x: number; y: number; title?: string; items: ContextMenuItem[] };

/**
 * Desktop context menu: opens at the pointer, stays inside the viewport, closes on outside
 * press, scroll, resize or Escape, and is keyboard operable (arrows, Home/End, Enter, Tab).
 */
export function ContextMenu({
  request,
  label,
  onClose
}: {
  request: ContextMenuRequest;
  label: string;
  onClose: () => void;
}): JSX.Element | null {
  const menu = useRef<HTMLDivElement>(null);
  const restore = useRef<Element | null>(null);
  const [position, setPosition] = useState({ left: request.x, top: request.y });
  useLayoutEffect(() => {
    restore.current = document.activeElement;
    const node = menu.current;
    if (!node) return;
    node.showPopover?.();
    const margin = 8;
    setPosition({
      left: Math.max(margin, Math.min(request.x, innerWidth - node.offsetWidth - margin)),
      top: Math.max(margin, Math.min(request.y, innerHeight - node.offsetHeight - margin))
    });
    node.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus({ preventScroll: true });
    return () => {
      if (node.matches(':popover-open')) node.hidePopover?.();
    };
  }, [request]);
  const close = useCallback(() => {
    onClose();
    if (restore.current instanceof HTMLElement && restore.current.isConnected) restore.current.focus({ preventScroll: true });
  }, [onClose]);
  useEffect(() => {
    const outside = (event: Event) => {
      if (!(event.target instanceof Node && menu.current?.contains(event.target))) onClose();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('wheel', outside, { capture: true, passive: true });
    document.addEventListener('scroll', outside, true);
    document.addEventListener('keydown', escape, true);
    addEventListener('resize', onClose);
    addEventListener('blur', onClose);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('wheel', outside, true);
      document.removeEventListener('scroll', outside, true);
      document.removeEventListener('keydown', escape, true);
      removeEventListener('resize', onClose);
      removeEventListener('blur', onClose);
    };
  }, [close, onClose]);
  const move = (from: Element, step: number | 'first' | 'last') => {
    const buttons = [...(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])];
    if (!buttons.length) return;
    const index = buttons.indexOf(from as HTMLButtonElement);
    const next = step === 'first' ? 0 : step === 'last' ? buttons.length - 1 : (index + step + buttons.length) % buttons.length;
    buttons[next].focus();
  };
  if (!request.items.some((item) => item !== 'separator')) return null;
  return (
    <div
      ref={menu}
      {...{ popover: 'manual' }}
      className="context-menu"
      role="menu"
      aria-label={label}
      style={position}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        const target = event.target as Element;
        if (event.key === 'ArrowDown') move(target, 1);
        else if (event.key === 'ArrowUp') move(target, -1);
        else if (event.key === 'Home') move(target, 'first');
        else if (event.key === 'End') move(target, 'last');
        else if (event.key === 'Tab') close();
        else return;
        event.preventDefault();
      }}
    >
      {request.title && <div className="context-menu-title">{request.title}</div>}
      {request.items.map((item, index) =>
        item === 'separator' ? (
          <div key={`separator-${index}`} className="context-menu-separator" role="separator" />
        ) : (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className="context-menu-item"
            data-tone={item.tone}
            disabled={item.disabled}
            onClick={() => {
              close();
              item.onSelect();
            }}
          >
            <span className="context-menu-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="context-menu-label">{item.label}</span>
            {item.detail && <span className="context-menu-detail">{item.detail}</span>}
          </button>
        )
      )}
    </div>
  );
}
