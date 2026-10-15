import { useEffect, useRef, useState } from "react";
import {
  readFieldVoice,
  voiceFileDuration,
  voiceLimit,
  type FieldVoice,
} from "./voice";
import { VoicePlayback } from "./VoicePlayback";
export function VoiceRecorder({
  voice,
  onChange,
  locale,
  active = true,
  disabled = false,
  onBusyChange,
}: {
  voice?: FieldVoice;
  onChange: (value: FieldVoice | undefined) => void;
  locale: "vi" | "en";
  active?: boolean;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}): JSX.Element {
  const t = (vi: string, en: string) => (locale === "vi" ? vi : en);
  const [state, setState] = useState<
      "idle" | "permission" | "recording" | "saving"
    >("idle"),
    [seconds, setSeconds] = useState(0),
    [error, setError] = useState("");
  const version = useRef(0),
    alive = useRef(true),
    stream = useRef<MediaStream | null>(null),
    recorder = useRef<MediaRecorder | null>(null),
    timer = useRef<ReturnType<typeof setInterval> | null>(null),
    deadline = useRef<ReturnType<typeof setTimeout> | null>(null),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    onBusyChange?.(state !== "idle");
  }, [state, onBusyChange]);
  const fileAbort = useRef<AbortController | null>(null);
  const clear = () => {
    fileAbort.current?.abort();
    fileAbort.current = null;
    if (timer.current) clearInterval(timer.current);
    if (deadline.current) clearTimeout(deadline.current);
    timer.current = null;
    deadline.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  const cancel = () => {
    version.current++;
    const r = recorder.current;
    recorder.current = null;
    if (r && r.state !== "inactive") r.stop();
    clear();
    if (alive.current) setState("idle");
  };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      cancel();
    };
  }, []);
  useEffect(() => {
    if (!active) cancel();
  }, [active]);
  async function start() {
    if (state !== "idle" || disabled) return;
    setError("");
    setState("permission");
    const id = ++version.current;
    try {
      if (
        !window.isSecureContext ||
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error("unsupported");
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current || id !== version.current) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = s;
      const mime = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((m) => MediaRecorder.isTypeSupported(m));
      const r = new MediaRecorder(
        s,
        mime
          ? { mimeType: mime, audioBitsPerSecond: 32000 }
          : { audioBitsPerSecond: 32000 },
      );
      recorder.current = r;
      const chunks: Blob[] = [];
      let size = 0,
        failed = false;
      const began = performance.now();
      r.ondataavailable = (e) => {
        if (e.data.size) {
          chunks.push(e.data);
          size += e.data.size;
        }
        if (size > voiceLimit.bytes) {
          failed = true;
          r.stop();
        }
      };
      r.onerror = () => {
        failed = true;
        if (r.state !== "inactive") r.stop();
      };
      r.onstop = async () => {
        clear();
        if (!alive.current || id !== version.current) return;
        recorder.current = null;
        setState("saving");
        try {
          if (failed) throw new Error("size");
          const value = await readFieldVoice(
            new Blob(chunks, { type: r.mimeType }),
            Math.min(voiceLimit.seconds, (performance.now() - began) / 1000),
          );
          if (alive.current && id === version.current) onChange(value);
        } catch {
          if (alive.current && id === version.current)
            setError(
              t(
                "Không lưu được ghi âm. Thử lại hoặc nhập chữ.",
                "Could not save recording. Retry or type a message.",
              ),
            );
        } finally {
          if (alive.current && id === version.current) setState("idle");
        }
      };
      r.start(500);
      setSeconds(0);
      setState("recording");
      timer.current = setInterval(
        () =>
          setSeconds(
            Math.min(60, Math.floor((performance.now() - began) / 1000)),
          ),
        250,
      );
      deadline.current = setTimeout(() => {
        if (r.state !== "inactive") r.stop();
      }, voiceLimit.seconds * 1000);
    } catch (e) {
      clear();
      if (alive.current && id === version.current) {
        setState("idle");
        setError(
          t(
            "Chưa bật được micro. Cho phép dùng micro hoặc chọn tệp ghi âm.",
            "Microphone unavailable. Allow access or choose an audio file.",
          ),
        );
      }
    }
  }
  async function attach(file: File) {
    if (disabled || state !== "idle") return;
    const id = ++version.current;
    setState("saving");
    setError("");
    try {
      if (file.size > voiceLimit.bytes) throw new Error("size");
      const abort = new AbortController();
      fileAbort.current = abort;
      const duration = await voiceFileDuration(file, abort.signal);
      const value = await readFieldVoice(file, duration);
      if (alive.current && id === version.current) onChange(value);
    } catch {
      if (alive.current && id === version.current)
        setError(
          t(
            "Chọn ghi âm WebM, M4A, Ogg hoặc WAV, tối đa 1 phút và 800 KB.",
            "Choose WebM, M4A, Ogg or WAV audio, up to 1 minute and 800 KB.",
          ),
        );
    } finally {
      if (alive.current && id === version.current) {
        fileAbort.current = null;
        setState("idle");
      }
    }
  }
  return (
    <div className="citizen-voice">
      <div className="geodata-actions">
        {state === "recording" ? (
          <button
            type="button"
            className="button"
            onClick={() => recorder.current?.stop()}
          >
            {t("Dừng ghi âm", "Stop recording")} · {seconds}s
          </button>
        ) : (
          <button
            type="button"
            className="button"
            disabled={disabled || state !== "idle"}
            onClick={() => void start()}
          >
            {state === "permission"
              ? t("Đang mở micro…", "Opening microphone…")
              : state === "saving"
                ? t("Đang lưu…", "Saving…")
                : voice
                  ? t("Ghi lại", "Record again")
                  : t("Ghi âm", "Record voice")}
          </button>
        )}
        {state === "recording" || state === "permission" ? (
          <button type="button" className="text-button" onClick={cancel}>
            {t("Hủy", "Cancel")}
          </button>
        ) : (
          <button
            type="button"
            className="text-button"
            disabled={disabled || state !== "idle"}
            onClick={() => input.current?.click()}
          >
            {t("Chọn tệp ghi âm", "Choose audio file")}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="audio/webm,audio/ogg,audio/mp4,audio/wav,audio/x-wav,.m4a"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void attach(f);
        }}
        aria-label={t("Tệp ghi âm", "Audio file")}
      />
      {state === "recording" && (
        <p role="status">
          {t("Đang ghi âm · tối đa 1 phút", "Recording · up to 1 minute")}
        </p>
      )}
      <VoicePlayback voice={voice} locale={locale} />
      {voice && state === "idle" && (
        <button
          type="button"
          className="text-button"
          disabled={disabled}
          onClick={() => onChange(undefined)}
        >
          {t("Xóa ghi âm", "Remove recording")}
        </button>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
