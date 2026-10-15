import { useCallback, useEffect, useRef, useState } from "react";

export type Notice = { id: number; text: [string, string] };

/** Success feedback is local to the workspace that performed the action. */
export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const serial = useRef(0);
  const owner = useRef({});
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setNotice(null);
  }, []);
  const notify = useCallback((text: [string, string]) => {
    document.dispatchEvent(
      new CustomEvent("dear:notice", { detail: owner.current }),
    );
    clearTimeout(timer.current);
    setNotice({ id: ++serial.current, text });
    timer.current = setTimeout(() => setNotice(null), 6000);
  }, []);
  useEffect(() => {
    const onNotice = (event: Event) => {
      if ((event as CustomEvent).detail !== owner.current) dismiss();
    };
    document.addEventListener("dear:notice", onNotice);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener("dear:notice", onNotice);
    };
  }, [dismiss]);
  return { notice, notify, dismiss };
}
