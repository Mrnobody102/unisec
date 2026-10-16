export const voiceLimit = { bytes: 800_000, seconds: 60 } as const;
export type FieldVoice = {
  id: string;
  mime: string;
  bytes: number;
  data: string;
  sha256: string;
  addedAt: string;
  duration: number;
};
const audioMimes = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
];
export function validVoice(raw: unknown): raw is FieldVoice {
  if (!raw || typeof raw !== "object") return false;
  const v = raw as FieldVoice;
  if (
    typeof v.id !== "string" ||
    !v.id ||
    v.id.length > 160 ||
    !audioMimes.includes(v.mime) ||
    !Number.isSafeInteger(v.bytes) ||
    v.bytes < 1 ||
    v.bytes > voiceLimit.bytes ||
    !Number.isFinite(v.duration) ||
    v.duration <= 0 ||
    v.duration > voiceLimit.seconds + 0.5 ||
    typeof v.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(v.sha256) ||
    typeof v.addedAt !== "string" ||
    !Number.isFinite(Date.parse(v.addedAt)) ||
    typeof v.data !== "string"
  )
    return false;
  const prefix = "data:" + v.mime + ";base64,",
    payload = v.data.slice(prefix.length);
  if (
    !v.data.startsWith(prefix) ||
    payload.length > Math.ceil(voiceLimit.bytes / 3) * 4 ||
    payload.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(payload)
  )
    return false;
  return (
    (payload.length / 4) * 3 -
      (payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0) ===
    v.bytes
  );
}
export async function readFieldVoice(
  blob: Blob,
  duration: number,
): Promise<FieldVoice> {
  const declared = blob.type.split(";")[0].toLowerCase();
  // File pickers commonly assign video/webm to an audio-only .webm container.
  const mime = declared === "video/webm" ? "audio/webm" : declared;
  if (
    !audioMimes.includes(mime) ||
    blob.size > voiceLimit.bytes ||
    !blob.size ||
    duration <= 0 ||
    duration > voiceLimit.seconds + 0.5
  )
    throw new Error("Invalid audio");
  const bytes = new Uint8Array(await blob.arrayBuffer()),
    head = String.fromCharCode(...bytes.slice(0, 12));
  const signature =
    mime === "audio/webm"
      ? bytes[0] === 0x1a &&
        bytes[1] === 0x45 &&
        bytes[2] === 0xdf &&
        bytes[3] === 0xa3
      : mime === "audio/ogg"
        ? head.startsWith("OggS")
        : mime === "audio/mp4"
          ? head.slice(4, 8) === "ftyp"
          : head.startsWith("RIFF") && head.slice(8, 12) === "WAVE";
  if (!signature) throw new Error("Unsupported audio file");
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const v = {
    id: crypto.randomUUID(),
    mime,
    bytes: bytes.length,
    data: "data:" + mime + ";base64," + btoa(binary),
    sha256: Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join(""),
    addedAt: new Date().toISOString(),
    duration,
  };
  if (!validVoice(v)) throw new Error("Invalid audio");
  return v;
}
export function voiceFileDuration(
  file: File,
  signal?: AbortSignal,
): Promise<number> {
  if (signal?.aborted)
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file),
      audio = document.createElement("audio");
    let done = false;
    const timer = setTimeout(
      () => finish(new Error("Audio metadata unavailable")),
      5000,
    );
    const abort = () => finish(new DOMException("Aborted", "AbortError"));
    const finish = (error?: Error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      const duration = audio.duration;
      audio.onloadedmetadata = null;
      audio.ondurationchange = null;
      audio.ontimeupdate = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(url);
      error ? reject(error) : resolve(duration);
    };
    const check = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0)
        finish(
          audio.duration <= voiceLimit.seconds
            ? undefined
            : new Error("Audio too long"),
        );
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      // Streaming WebM recordings often omit Duration. A seek makes the decoder read
      // the final timestamp; the byte/time caps bound the work and reject unknown lengths.
      if (audio.duration === Infinity) {
        audio.currentTime = Number.MAX_SAFE_INTEGER;
        return;
      }
      if (!Number.isFinite(audio.duration) || audio.duration <= 0)
        finish(new Error("Invalid audio duration"));
      else check();
    };
    audio.ondurationchange = check;
    audio.ontimeupdate = check;
    audio.onerror = () => finish(new Error("Invalid audio"));
    signal?.addEventListener("abort", abort, { once: true });
    audio.src = url;
  });
}
