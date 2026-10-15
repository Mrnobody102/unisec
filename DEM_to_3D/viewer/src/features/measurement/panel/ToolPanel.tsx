import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { UiIcon } from '../../../shared/ui/UiIcon';
import { useFloatingPanel } from '../../../shared/hooks/useFloatingPanel';
import './tool-panel.css';

type Props = {
  /** The map workspace; tool windows live there, outside the map's drawing surface. */
  workspace: Element;
  panelKey: string;
  className: string;
  headingClassName?: string;
  label: string;
  title: string;
  stage: 'drawing' | 'editing' | 'finished';
  collapsed: boolean;
  onCollapsed: (collapsed: boolean) => void;
  text: { position: string; move: string; collapse: string; expand: string; close: string };
  onClose: () => void;
  headerActions?: ReactNode;
  compact: ReactNode;
  children: ReactNode;
};

/** Floating window shared by map tools: a draggable heading, collapse and close; content scrolls inside. */
export function ToolPanel(props: Props): JSX.Element {
  const root = useRef<HTMLElement>(null);
  const floating = useFloatingPanel(root, props.panelKey, true);
  const { text } = props;
  return createPortal(<section ref={root} className={`map-tool-panel ${props.className}`} data-collapsed={props.collapsed} data-stage={props.stage} aria-label={props.label}>
    <div className={`map-tool-heading floating-panel-handle ${props.headingClassName ?? ''}`} {...floating} tabIndex={0} role="group" aria-label={text.position} aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home" title={text.move}>
      <strong>{props.title}</strong>
      {props.headerActions}
      <button className="icon-button" aria-label={props.collapsed ? text.expand : text.collapse} aria-expanded={!props.collapsed} onClick={() => props.onCollapsed(!props.collapsed)}><UiIcon name={props.collapsed ? 'expand' : 'collapse'} size={16}/></button>
      <button className="icon-button" aria-label={text.close} onClick={props.onClose}><UiIcon name="close" size={16}/></button>
    </div>
    {props.collapsed ? props.compact : props.children}
  </section>, props.workspace);
}
