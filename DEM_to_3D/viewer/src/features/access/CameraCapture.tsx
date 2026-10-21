import { useEffect, useRef, useState } from "react";
import type { Locale } from "../../types/dear";
import { UiIcon } from "../../shared/ui/UiIcon";
import { useNativeDialog } from "../../shared/hooks/useNativeDialog";

/** Browsers that ignore `<input capture>` (desktop) can still take a photo through the camera stream. */
export const canStreamCamera = () =>
  typeof window !== "undefined" && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;

/** Live camera view with one shutter button; the frame is returned as a JPEG file. */
export function CameraCapture({ locale, onCapture, onClose }: {
  locale: Locale;
  onCapture: (file: File) => void;
  onClose: () => void;
}): JSX.Element {
  const t = (vi: string, en: string) => (locale === "vi" ? vi : en);
  const video = useRef<HTMLVideoElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const active = useRef(false);
  const [state, setState] = useState<"opening" | "live" | "capturing" | "error">("opening");
  useNativeDialog(dialog);
  useEffect(() => {
    active.current = true;
    let stream: MediaStream | null = null, alive = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
      .then((value) => {
        if (!alive) { value.getTracks().forEach((track) => track.stop()); return; }
        stream = value;
        if (video.current) video.current.srcObject = value;
      }, () => alive && setState("error"));
    return () => {
      active.current = false;
      alive = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  const take = () => {
    const source = video.current;
    if (state !== "live" || !source || !source.videoWidth) return;
    setState("capturing");
    const canvas = document.createElement("canvas");
    canvas.width = source.videoWidth; canvas.height = source.videoHeight;
    canvas.getContext("2d")?.drawImage(source, 0, 0);
    canvas.toBlob((blob) => {
      if (!active.current) return;
      if (!blob) { setState("error"); return; }
      const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
      onCapture(new File([blob], `anh-hien-truong-${stamp}.jpg`, { type: "image/jpeg", lastModified: Date.now() }));
      onClose();
    }, "image/jpeg", 0.9);
  };
  return (
    <dialog ref={dialog} className="camera-capture-overlay" aria-label={t("Chụp ảnh hiện trường", "Take a field photo")}
      onCancel={(event) => {event.preventDefault();onClose();}}
      onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="camera-capture">
        <div className="camera-capture-view">
          <video ref={video} autoPlay playsInline muted aria-hidden="true" onLoadedData={() => setState("live")} onError={() => setState("error")}/>
          {state === "opening" && <p role="status">{t("Đang mở camera", "Opening camera")}</p>}
          {state === "error" && (
            <p role="alert">{t("Không mở được camera. Cho phép dùng camera hoặc chọn ảnh có sẵn.", "Camera unavailable. Allow camera access or choose an existing photo.")}</p>
          )}
        </div>
        <div className="camera-capture-actions">
          <button type="button" className="button" onClick={onClose}>{t("Hủy", "Cancel")}</button>
          <button type="button" className="camera-shutter" disabled={state !== "live"} onClick={take}
            aria-label={t("Chụp", "Take photo")} title={t("Chụp", "Take photo")}>
            <UiIcon name="camera" size={24} />
          </button>
          <span aria-hidden="true" />
        </div>
      </div>
    </dialog>
  );
}
