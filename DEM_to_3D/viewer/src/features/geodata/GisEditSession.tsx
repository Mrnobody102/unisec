import { useEffect, useMemo, useState, type ReactNode } from "react";
import { areaPublicationIssue, landslideAreaKey, landslideAreaOf } from '../landslides/landslideAreas';
import { areaLabel } from '../landslides/areaLabels';
import type { Locale } from "../../types/dear";
import type { GeometryRecord } from "../../geo/vector/types";
import {
  useScenarioEdits,
  type ScenarioEdits,
  validEdit,
} from "../access/scenarioEdits";
import { useGeometrySession } from "./useGeometrySession";
import { gisValueKey, publishGisDraft } from "./publishedGis";
import type { ScenarioOverlay, ScenarioTarget } from "./scenarioOverlay";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { useNotice } from "../../shared/hooks/useNotice";
import { NoticeToast } from "../../shared/ui/NoticeToast";
import "./gis-edit-session.css";
type DraftProps = {
  session: ReturnType<typeof useGeometrySession>;
  scenario?: ScenarioOverlay;
  scenarioEdits?: ScenarioEdits;
  publication: ReactNode;
  onClose: () => void;
  onResponse?: (id: string) => void;
  onResponseScenario?: (target: ScenarioTarget) => void;
};
export function GisEditSession({
  published,
  edits,
  scenario,
  annotationProperties,
  locale,
  onClose,
  onResponse,
  onResponseScenario,
  children,
}: {
  published: ReturnType<typeof useGeometrySession>;
  edits?: ScenarioEdits;
  scenario?: ScenarioOverlay;
  annotationProperties?: (
    id: string,
    records: GeometryRecord[],
  ) => Record<string, unknown>;
  locale: Locale;
  onClose: () => void;
  onResponse?: (id: string) => void;
  onResponseScenario?: (target: ScenarioTarget) => void;
  children: (props: DraftProps) => ReactNode;
}): JSX.Element {
  const t = (vi: string, en: string) => (locale === "vi" ? vi : en);
  const [base, setBase] = useState(() => ({
    records: published.records,
    edits: edits?.edits ?? [],
    packet: edits?.packet ? { ...edits.packet, ...scenario } : null,
  }));
  const session = useGeometrySession({
      draft: true,
      initialRecords: base.records,
      initialSelectedId: published.selectedId,
    }),
    pending = useScenarioEdits(base.packet, edits?.identity ?? null, {
      draft: true,
    });
  const [review, setReview] = useState<"publish" | "discard" | "exit" | null>(
      null,
    ),
    [exitAction, setExitAction] = useState<(() => void) | null>(null),
    [error, setError] = useState("");
  const { notice, notify, dismiss } = useNotice();
  const changes = useMemo(() => {
    const original = new Map(base.records.map((r) => [r.id, r])),
      next = new Map(session.records.map((r) => [r.id, r]));
    return [
      ...base.records
        .filter((r) => !next.has(r.id))
        .map((r) => t("Xóa: ", "Delete: ") + r.name),
      ...session.records
        .filter((r) => {
          const old = original.get(r.id);
          return (
            !old || (old !== r && gisValueKey(old) !== gisValueKey(r))
          );
        })
        .map(
          (r) =>
            (original.has(r.id) ? t("Sửa: ", "Edit: ") : t("Thêm: ", "Add: ")) +
            r.name,
        ),
    ];
  }, [base.records, session.records, locale]);
  const targets = useMemo(() => {
    const unique = new Map(
      pending.edits.map((edit) => [
        edit.target.type + ":" + edit.target.id,
        edit.target,
      ]),
    );
    return [...unique.values()].map((target) => {
      const packet = pending.packet;
      const feature =
        target.type === "community"
          ? packet?.communities.find((item) => item.id === target.id)
          : target.type === "road"
            ? packet?.roads.find((item) => item.id === target.id)
            : target.type === "hazard"
              ? packet?.hazards.find((item) => item.id === target.id)
              : packet?.responseSites.find((item) => item.id === target.id);
      const next =
        typeof feature?.name === "string"
          ? feature.name
          : feature?.name?.[locale === "vi" ? 0 : 1];
      return next && next !== target.name
        ? t(`${target.name} đổi thành ${next}`, `${target.name} renamed ${next}`)
        : (next ?? target.name);
    });
  }, [pending.edits, pending.packet, locale]);
  const dirty = changes.length > 0 || pending.edits.length > 0;
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  const requestExit = (action: () => void) => {
    if (!dirty) {
      action();
      return;
    }
    setExitAction(() => action);
    setReview("exit");
    setError("");
  };
  const publish = () => {
    for (const record of session.records) {
      if (record.feature.properties[landslideAreaKey] == null) continue;
      const area = landslideAreaOf(record), issue = area && areaPublicationIssue(area, pending.packet?.roads ?? scenario?.roads, pending.packet?.datasetVersion ?? scenario?.datasetVersion);
      if (!area || issue) {
        setError(record.name + ': ' + (!area ? t('Dữ liệu vùng sạt lở không hợp lệ.', 'Invalid landslide area metadata.') : areaLabel(issue === 'imagery' ? 'image' : issue!, locale)));
        return false;
      }
    }
    try {
      if (session.busy || session.error || !pending.edits.every(validEdit))
        throw new Error("Invalid draft");
      const all = [...base.edits, ...pending.edits],
        version = base.packet?.datasetVersion ?? "";
      publishGisDraft(version, base.records, base.edits, session.records, all);
      published.accept(session.records);
      if (session.selectedId) published.select(session.selectedId);
      edits?.accept(all);
      setBase({ records: session.records, edits: all, packet: pending.packet });
      pending.accept([]);
      // Saving establishes the published baseline; Undo may create a new draft.
      session.accept(session.records, { preserveHistory: true });
      setError("");
      setReview(null);
      notify(["Đã áp dụng thay đổi GIS.", "GIS changes applied."]);
      return true;
    } catch (e) {
      setError(
        e instanceof Error && e.message === "GIS_CONFLICT"
          ? t(
              "Dữ liệu đã được thay đổi ở nơi khác. Giữ bản nháp và mở lại dữ liệu mới.",
              "The saved data changed elsewhere. Keep this draft and reopen the latest data.",
            )
          : t(
              "Chưa áp dụng được. Bản nháp và dữ liệu đang dùng vẫn được giữ.",
              "Could not apply. Your draft and the current data are retained.",
            ),
      );
      return false;
    }
  };
  const discard = () => {
    session.accept(base.records);
    pending.accept([]);
    setReview(null);
    setError("");
  };
  // The bar exists only when there is something to apply or discard.
  const publication = dirty ? (
    <div className="gis-draft-bar">
      <div>
        <strong>{t("Bản nháp GIS", "GIS draft")}</strong>
        <span>
          {t(
            `${changes.length + targets.length} đối tượng đã sửa`,
            `${changes.length + targets.length} edited features`,
          )}
        </span>
      </div>
      <button
        type="button"
        className="button"
        disabled={session.busy}
        onClick={() => {
          setReview("discard");
          setError("");
        }}
      >
        {t("Bỏ bản nháp", "Discard draft")}
      </button>
      <button
        type="button"
        className="button primary"
        disabled={session.busy}
        onClick={() => {
          setReview("publish");
          setError("");
        }}
      >
        {t("Áp dụng thay đổi", "Apply changes")}
      </button>
    </div>
  ) : null;
  return (
    <>
      {children({
        session: annotationProperties
          ? {
              ...session,
              annotate: (id, value, properties = {}) =>
                session.annotate(id, value, {
                  ...annotationProperties(id, session.records),
                  ...properties,
                }),
            }
          : session,
        scenario: pending.packet
          ? {
              datasetVersion: pending.packet.datasetVersion,
              communities: pending.packet.communities.map((c) => ({
                ...c,
                prio:
                  scenario?.communities.find((v) => v.id === c.id)?.prio ?? 2,
              })),
              roads: pending.packet.roads,
              hazards: pending.packet.hazards,
              responseSites: pending.packet.responseSites,
            }
          : scenario,
        scenarioEdits: edits
          ? { ...pending, edits: [...base.edits, ...pending.edits] }
          : undefined,
        publication,
        onClose: () => requestExit(onClose),
        onResponse: onResponse
          ? (id) => requestExit(() => onResponse(id))
          : undefined,
        onResponseScenario: onResponseScenario
          ? (target) => requestExit(() => onResponseScenario(target))
          : undefined,
      })}
      {review && (
        <ConfirmDialog
          locale={locale}
          title={
            review === "discard"
              ? t("Bỏ bản nháp GIS?", "Discard GIS draft?")
              : review === "exit"
                ? t("Còn thay đổi chưa áp dụng", "Unapplied changes")
                : t("Áp dụng thay đổi GIS?", "Apply GIS changes?")
          }
          destructive={review === "discard"}
          confirmLabel={
            review === "discard"
              ? t("Bỏ bản nháp", "Discard draft")
              : review === "exit"
                ? t("Áp dụng và đóng", "Apply and close")
                : t("Áp dụng", "Apply")
          }
          error={error}
          onCancel={() => {
            setReview(null);
            setExitAction(null);
          }}
          onConfirm={() => {
            if (review === "discard") {
              discard();
              return;
            }
            const action = review === "exit" ? exitAction : null;
            if (publish()) action?.();
          }}
        >
          <p>
            {review === "discard"
              ? t(
                  "Dữ liệu đang dùng không thay đổi.",
                  "The current data stays unchanged.",
                )
              : t(
                  "Áp dụng lên bản đồ điều phối và thông tin người dân.",
                  "Apply to the response map and resident information.",
                )}
          </p>
          <ul className="gis-change-summary">
            {[...targets, ...changes].slice(0, 12).map((name, index) => (
              <li key={index}>{name}</li>
            ))}
          </ul>
          {review === "exit" && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                const action = exitAction;
                discard();
                action?.();
              }}
            >
              {t("Bỏ bản nháp và đóng", "Discard and close")}
            </button>
          )}
        </ConfirmDialog>
      )}
      <NoticeToast notice={notice} locale={locale} onDismiss={dismiss} />
    </>
  );
}
