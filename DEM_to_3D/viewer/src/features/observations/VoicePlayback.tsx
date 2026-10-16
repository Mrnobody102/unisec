import type { FieldVoice } from "./voice";
export function VoicePlayback({
  voice,
  locale,
}: {
  voice: FieldVoice | undefined;
  locale: "vi" | "en";
}): JSX.Element | null {
  return voice ? (
    <div className="field-voice">
      <span>{locale === "vi" ? "Ghi âm" : "Voice message"}</span>
      <audio
        controls
        preload="none"
        src={voice.data}
        aria-label={locale === "vi" ? "Nghe ghi âm" : "Play voice message"}
      />
    </div>
  ) : null;
}
