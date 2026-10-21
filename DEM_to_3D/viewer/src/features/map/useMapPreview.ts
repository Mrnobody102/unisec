import { useEffect, useRef } from "react";
export type MapPreview = {
  id: string;
  point: { x: number; y: number };
  name: string;
};
export function useMapPreview(
  scope: React.RefObject<HTMLElement>,
  resolve: (id: string) => Omit<MapPreview, "id"> | null,
): void {
  const latest = useRef(resolve);
  latest.current = resolve;
  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let activated = false;
    const emit = (id: string | null, focus = false) => {
      const value = id ? latest.current(id) : null;
      document.dispatchEvent(
        new CustomEvent("dear:map-preview", {
          detail: { scope: root, id: value ? id : null, ...value, focus },
        }),
      );
    };
    const node = (target: EventTarget | null) =>
      target instanceof Element
        ? target.closest<HTMLElement>("[data-map-preview]")
        : null;
    const enter = (event: Event) => {
      if (activated && event instanceof PointerEvent) return;
      const target = node(event.target);
      if (
        !target ||
        !root.contains(target) ||
        target.closest(".geodata-workspace,.workspace,.citizen-workspace") !==
          root
      )
        return;
      if (event instanceof PointerEvent && node(event.relatedTarget) === target)
        return;
      clearTimeout(timer);
      const id = target.dataset.mapPreview!;
      emit(id);
      timer = setTimeout(() => {
        const marker = [
          ...root.querySelectorAll<HTMLElement>("[data-map-object]"),
        ].find((n) => n.dataset.mapObject === id);
        if (!marker || marker.hidden || !marker.getBoundingClientRect().width)
          emit(id, true);
      }, 180);
    };
    const leave = (event: Event) => {
      const target = node(event.target);
      if (
        !target ||
        target.closest(".geodata-workspace,.workspace,.citizen-workspace") !==
          root
      )
        return;
      if (event instanceof PointerEvent && node(event.relatedTarget) === target)
        return;
      clearTimeout(timer);
      emit(null);
    };
    // Selection owns the camera after activation. A pending hover preview must
    // not interrupt the framing animation while its marker is still moving.
    const activate = () => {
      activated = true;
      clearTimeout(timer);
      emit(null);
    };
    const move = (event: PointerEvent) => {
      if (!activated) return;
      activated = false;
      enter(event);
    };
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerdown", activate);
    root.addEventListener("click", activate);
    root.addEventListener("pointerover", enter);
    root.addEventListener("pointerout", leave);
    root.addEventListener("focusin", enter);
    root.addEventListener("focusout", leave);
    return () => {
      clearTimeout(timer);
      emit(null);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerdown", activate);
      root.removeEventListener("click", activate);
      root.removeEventListener("pointerover", enter);
      root.removeEventListener("pointerout", leave);
      root.removeEventListener("focusin", enter);
      root.removeEventListener("focusout", leave);
    };
  }, [scope]);
}
