import { useState } from "react";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { roadHazardIds, roadsForHazard } from "../incident/roadHazards";
import type { ScenarioChange } from "../access/scenarioEdits";
import type { ScenarioOverlay, ScenarioTarget } from "./scenarioOverlay";
import type { Locale } from "../../types/dear";
export function ScenarioLinksEditor({
  scenario,
  target,
  locale,
  readOnly,
  onSave,
}: {
  scenario: ScenarioOverlay;
  target: ScenarioTarget;
  locale: Locale;
  readOnly: boolean;
  onSave: (c: ScenarioChange, note: string) => boolean;
}) {
  const t = (vi: string, en: string) => (locale === "vi" ? vi : en),
    pick = (name: [string, string]) => t(...name);
  const hazard =
    target.type === "hazard"
      ? scenario.hazards.find((h) => h.id === target.id)
      : undefined;
  const road =
    target.type === "road"
      ? scenario.roads.find((r) => r.id === target.id)
      : undefined;
  const original = hazard
    ? roadsForHazard(scenario.roads, hazard.id).map((r) => r.id)
    : road
      ? roadHazardIds(road)
      : [];
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(original),
    [note, setNote] = useState(""),
    [review, setReview] = useState(false),
    [error, setError] = useState("");
  if (!hazard && !road) return null;
  const options = hazard ? scenario.roads : scenario.hazards;
  return (
    <div className="scenario-card-block scenario-links">
      <h3>
        {hazard
          ? t("Đoạn đường liên quan", "Linked road sections")
          : t("Sự cố liên quan", "Linked hazards")}
      </h3>
      {hazard?.roadLinksNeedReview && (
        <p className="scenario-card-error" role="status">
          {t(
            "Vị trí đã đổi. Kiểm tra lại các đoạn đường liên quan.",
            "Position changed. Review the linked road sections.",
          )}
        </p>
      )}
      {!editing ? (
        <>
          <ul className="scenario-linked-list">
            {options
              .filter((v) => original.includes(v.id))
              .map((v) => (
                <li key={v.id}>{pick(v.name)}</li>
              ))}
          </ul>
          {!original.length && (
            <p className="scenario-card-empty">
              {t("Chưa liên kết.", "No links.")}
            </p>
          )}
          {!readOnly && (
            <button
              className="button"
              onClick={() => {
                setDraft(original);
                setEditing(true);
              }}
            >
              {t("Sửa liên kết", "Edit links")}
            </button>
          )}
        </>
      ) : (
        <>
          <div className="scenario-link-options">
            {options.map((v) => (
              <label key={v.id}>
                <input
                  type="checkbox"
                  checked={draft.includes(v.id)}
                  onChange={(e) =>
                    setDraft((ids) =>
                      e.target.checked
                        ? [...ids, v.id]
                        : ids.filter((id) => id !== v.id),
                    )
                  }
                />
                <span>{pick(v.name)}</span>
              </label>
            ))}
          </div>
          <p className="geodata-hint">
            {t(
              "Liên kết ghi nhận quan hệ; tình trạng đường được cập nhật riêng.",
              "Links record the relationship. Road status is updated separately.",
            )}
          </p>
          <label className="scenario-card-field">
            {t("Căn cứ liên kết", "Reason for linking")}
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="scenario-card-actions">
            <button
              className="button primary"
              onClick={() => {
                if (!note.trim()) {
                  setError(t("Ghi căn cứ liên kết.", "Add a reason."));
                  return;
                }
                setError("");
                setReview(true);
              }}
            >
              {t("Kiểm tra và lưu", "Review and save")}
            </button>
            <button
              className="button"
              onClick={() => {
                setEditing(false);
                setError("");
              }}
            >
              {t("Hủy", "Cancel")}
            </button>
          </div>
          {error && (
            <p role="alert" className="scenario-card-error">
              {error}
            </p>
          )}
        </>
      )}
      {review && (
        <ConfirmDialog
          title={t("Cập nhật liên kết", "Update links")}
          locale={locale}
          confirmLabel={t("Lưu liên kết", "Save links")}
          onCancel={() => setReview(false)}
          onConfirm={() => {
            if (
              onSave({ kind: "links", from: original, to: draft }, note.trim())
            ) {
              setReview(false);
              setEditing(false);
              setNote("");
            } else
              setError(t("Không lưu được liên kết.", "Could not save links."));
          }}
          error={error}
        >
          <ul>
            {options
              .filter((v) => draft.includes(v.id))
              .map((v) => (
                <li key={v.id}>{pick(v.name)}</li>
              ))}
          </ul>
          {!draft.length && (
            <p>
              {t(
                "Bỏ mọi liên kết của đối tượng này.",
                "Remove all links for this feature.",
              )}
            </p>
          )}
          <p>{note}</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
