import { LandslideFillControl } from '../landslides/LandslideFillControl';
import pointOnFeature from '@turf/point-on-feature';
import { useAnalysisImagery } from '../imagery/useAnalysisImagery';
import { analysisSourceInfo } from '../imagery/analysisImagery';
import { supportsBasemapTone } from '../imagery/basemapTone';
import { CitizenPlaceCard } from "./CitizenPlaceCard";
import { routeChainage } from "./routeChainage";
import { roadsForHazard } from "../incident/roadHazards";
import { usePreparedPhotos } from "../fieldPhotos/preparedPhotos";
import { visibleMapRecords } from "../map/visibleMapRecords";
import { landslideAreaOf } from "../landslides/landslideAreas";
import type { ScenarioEdit } from "./scenarioEdits";
import { UiIcon } from "../../shared/ui/UiIcon";
import { observationCode } from "../observations/recordIdentity";
import { accessMessages } from "./locales";
import type { ScenarioRevision } from "./useScenarioRevision";
import { journeyMarkers, useRoadJourney } from "../routes/useRoadJourney";
import { CitizenDirections } from "./CitizenDirections";
import { CitizenReportForm } from "./CitizenReportForm";
import { VoicePlayback } from "../observations/VoicePlayback";
import { useDeviceLocation } from "../../shared/hooks/useDeviceLocation";
import { roadGeographic } from "../routes/selectedRoadJourney";
import { recommendRoute, routeProblems } from "../routes/routeAdvice";
import { CitizenRouteCard } from "./CitizenRouteCard";
import { useMemo, useRef, useState } from "react";
import type {
  OverlayHit,
  ViewControls,
  BasemapState,
} from "../../features/map/mapContracts";
import type { IncidentPacket } from "../../data/incidentPacket";
import type { useTerrainWorkspace } from "../terrain/useTerrainWorkspace";
import type { DemoIdentity } from "./demoSession";
import { useGeometrySession } from "../geodata/useGeometrySession";
import { useIncidentWorkspace } from "../incident/useIncidentWorkspace";
import { useMeasurementSession } from "../measurement";
import { Map2D } from "../map/Map2D";
import { defaultLayerAppearance } from "../map/layerAppearance";
import { ObservationEditor } from "../observations/ObservationEditor";
import {
  annotateRecord,
  observationOf,
  type FieldObservation,
} from "../observations/model";
import { PhotoGallery } from "../observations/PhotoGallery";
import { observationLabel } from "../observations/labels";
import { validateGeometry } from "../../geo/vector/validateGeometry";
import type { GeometryRecord } from "../../geo/vector/types";
import {
  newSubmission,
  submissionOf,
  canEditSubmission,
  submissionKey,
  type Submission,
} from "./submissions";
import { MapAttribution } from "../../components/dear/MapAttribution";
import { UserGuide } from "../help/UserGuide";
import "./citizen.css";

type Props = {
  published: ScenarioRevision;
  scenarioEdits?: ScenarioEdit[];
  locale: import("../../types/dear").Locale;
  identity: DemoIdentity;
  onSignOut: () => void;
  runtime: ReturnType<typeof useTerrainWorkspace> & { packet: IncidentPacket };
};
export function CitizenWorkspace({
  published,
  scenarioEdits,
  locale,
  identity,
  onSignOut,
  runtime,
}: Props): JSX.Element {
  const m = accessMessages[locale];
  const t = (vi: string, en: string) => (locale === "vi" ? vi : en);
  const { packet, defaultTerrain, manifest, offline } = runtime;
  const snapshot = useIncidentWorkspace(
      packet,
      published.applied,
      scenarioEdits,
      published.at,
    ),
    gis = useGeometrySession({prepared: runtime.fieldDataset});
  const [openSubmission, setOpenSubmission] = useState<string | null>(null);
  const [tab, setTab] = useState<"roads" | "report" | "mine">("roads"),
    [community, setCommunity] = useState(
      identity.communityId ?? packet.communities[0]?.id ?? "",
    );
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  // A landslide point opened on the map, and a route section shown from the route card.
  const [selectedHazardId, setSelectedHazardId] = useState<string | null>(null);
  const [shownRoadId, setShownRoadId] = useState<string | null>(null);
  const fieldPhotos = usePreparedPhotos(manifest?.fieldPhotos);
  const [layerOptions, setLayerOptions] = useState({landslide:true,status:true,communities:true,imagery:true});
  const analysisImagery=useAnalysisImagery(manifest?.analysisImagery);
  // The Planet scene is brighter and greener than the basemap; tone the basemap to it, as the coordinator map does.
  const analysisDisplay=useMemo(()=>({rasters:layerOptions.imagery?analysisImagery.rasters:[],opacity:1,
    balanceBasemap:supportsBasemapTone(analysisImagery.layers)&&analysisImagery.layers.some(layer=>layer.id===analysisImagery.selection.layer&&layer.kind==='optical')}),
    [analysisImagery.rasters,analysisImagery.layers,analysisImagery.selection.layer,layerOptions.imagery]);
  // The village access route is the default answer; a free A to B search is the other mode.
  const [roadMode, setRoadMode] = useState<"village" | "journey">("village");
  const [mapOnMobile, setMapOnMobile] = useState(false),
    [picking, setPicking] = useState(false),
    [help, setHelp] = useState(false),
    [message, setMessage] = useState("");
  const [lat, setLat] = useState(""),
    [lon, setLon] = useState(""),
    [source, setSource] = useState<Submission["locationSource"]>("manual");
  const [draftId, setDraftId] = useState(() => crypto.randomUUID()),
    [locationCommunity, setLocationCommunity] = useState(""),
    [accuracy, setAccuracy] = useState<number | null>(null),
    [ownSelected, setOwnSelected] = useState<string | null>(null);
  const [ownView, setOwnView] = useState({
    version: 0,
    id: null as string | null,
  });
  const [basemap, setBasemap] = useState<BasemapState>({
    status: "off",
    style: "satellite",
    loaded: 0,
    total: 0,
  });
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<{ center: [number, number]; zoom: number } | null>(
      null,
    ),
    controls = useRef<ViewControls | null>(null);
  const { session: measure, dispatch } = useMeasurementSession("2d", false);
  const journey = useRoadJourney(snapshot.roads);
  const gps = useDeviceLocation();
  const [locationRequest, setLocationRequest] = useState(0);
  const advice = recommendRoute(snapshot.routes.get(community)),
    route = advice.best;
  const own = useMemo(
    () => gis.records.filter((r) => submissionOf(r)?.authorId === identity.id),
    [gis.records, identity.id],
  );
  const reportPosition = useRef({ lat, lon });
  reportPosition.current = { lat, lon };
  const citizenLayers = useMemo(
    () => ({
      aoi: false,
      gis: true,
      crossings: true,
      roads: true,
      route: true,
      flood: true,
      staging: true,
      hlz: false,
      context: !offline,
      hillshade: true,
      ...layerOptions,
    }),
    [offline, layerOptions],
  );
  const draft: GeometryRecord = useMemo(
    () => ({
      id: draftId,
      name: m.fieldReport,
      role: "reference",
      visible: true,
      source: {
        name: m.residentReport,
        format: "coordinate",
        importedAt: new Date().toISOString(),
      },
      feature: {
        type: "Feature",
        properties: { observer: identity.name },
        geometry: { type: "Point", coordinates: [Number(lon), Number(lat)] },
      },
    }),
    [draftId, lat, lon, identity.name, locale],
  );
  const mapRecords = useMemo(() => visibleMapRecords(
    gis.records.filter(record => landslideAreaOf(record) || own.some(item => item.id === record.id)),
    citizenLayers, packet.datasetVersion
  ), [gis.records, own, citizenLayers, packet.datasetVersion]);
  const selectedArea = mapRecords.find(record => record.id === selectedAreaId && landslideAreaOf(record));
  const chainage = useMemo(() => routeChainage(route), [route]);
  const routeOrigin = snapshot.responseSites.find(site => site.kind === "staging");
  const originName = routeOrigin ? t(...routeOrigin.name).replace(/^Điểm tập kết /, "").replace(/ staging point$/i, "") : undefined;
  // A nearby incident is not evidence that it represents the selected polygon.
  const placeHazard = snapshot.hazards.find(h => h.id === selectedHazardId);
  const placeArea = selectedArea ? landslideAreaOf(selectedArea) ?? undefined : undefined;
  const placeRoad = (() => {
    const road = placeHazard ? roadsForHazard(snapshot.roads, placeHazard.id)[0]
      : placeArea?.networkVersion === packet.datasetVersion ? snapshot.roads.find(r => placeArea.roadLinks.some(link => link.roadId === r.id)) : undefined;
    return road && { road, km: chainage.get(road.id), origin: originName };
  })();
  const reportAt = (point: { x: number; y: number }) => {
    const p = roadGeographic(point);
    setSelectedHazardId(null); setSelectedAreaId(null);
    gps.cancel(); setPicking(false); journey.setPicking(null);
    setTab("report"); setMessage("");
    position(p.latitude, p.longitude, "map");
  };
  const roadView = tab === "roads";
  const showRoadMode = (mode: "village" | "journey") => {
    gps.cancel();
    journey.setPicking(null);
    journey.setOpen(mode === "journey");
    setRoadMode(mode);
  };
  const gpsError = gps.error ? (
    <p className="field-error" role="alert">
      {gps.error === "denied"
        ? t("Chưa được phép lấy vị trí. Bật quyền vị trí trong trình duyệt hoặc chọn trên bản đồ.", "Location permission is denied. Enable browser permission or choose on the map.")
        : gps.error === "insecure"
          ? t("Định vị cần mở ứng dụng qua HTTPS. Bạn vẫn có thể chọn trên bản đồ.", "Location requires HTTPS. You can still choose on the map.")
          : t("Chưa lấy được vị trí. Thử lại hoặc chọn trên bản đồ.", "Location unavailable. Retry or choose on the map.")}
    </p>
  ) : null;
  const position = (
    latitude: number,
    longitude: number,
    kind: Submission["locationSource"],
  ) => {
    if (kind !== "device") gps.cancel();
    setLat(latitude.toFixed(6));
    setLon(longitude.toFixed(6));
    setSource(kind);
    if (kind !== "device") setAccuracy(null);
    setPicking(false);
    setMapOnMobile(false);
  };
  const submit = (observation: FieldObservation): boolean => {
    if (!lat || !lon) {
      setMessage(m.chooseAReportLocationBeforeSubmitting);
      return false;
    }
    try {
      const record = annotateRecord(
        {
          ...draft,
          name: `${observationLabel(observation.kind, locale)} ${observationCode(draft.id)}`,
          feature: {
            ...draft.feature,
            geometry: validateGeometry(draft.feature.geometry),
            properties: {
              ...draft.feature.properties,
              [submissionKey]: {
                ...newSubmission(identity, source),
                ...(source === "community"
                  ? { locationCommunityId: locationCommunity }
                  : {}),
              },
            },
          },
        },
        observation,
      );
      gis.add([record]);
      gps.cancel();
      setOwnSelected(record.id);
      setOwnView((v) => ({ version: v.version + 1, id: record.id }));
      setMessage(m.submittedInThisDemoSessionAwaitingCoordinator);
      setTab("mine");
      setDraftId(crypto.randomUUID());
      setLat("");
      setLon("");
      setAccuracy(null);
      setSource("manual");
      setLocationCommunity("");
      return true;
    } catch {
      setMessage(m.couldNotSaveTheReportCheckCoordinates);
      return false;
    }
  };
  const switchTab = (value: "roads" | "report" | "mine") => {
    gps.cancel();
    setPicking(false);
    journey.setPicking(null);
    setMapOnMobile(false);
    setSelectedAreaId(null);
    setSelectedHazardId(null);
    setTab(value);
  };
  const onHit = (hit: OverlayHit) => {
    if (hit.type === "hazard") {
      setSelectedAreaId(null);
      setSelectedHazardId(hit.id);
      return;
    }
    if (hit.type === "community") {
      setSelectedAreaId(null);
      setSelectedHazardId(null);
      journey.close();
      setCommunity(hit.id);
      setTab("roads");
      setRoadMode("village");
      setMapOnMobile(false);
    }
  };
  return (
    <div
      ref={root}
      className="response-workspace citizen-workspace"
      data-citizen-map={mapOnMobile ? "true" : undefined}
    >
      <header className="citizen-header">
        <div>
          <strong>DEAR</strong>
          <span>{m.communityInformation}</span>
        </div>
        <button className="button" onClick={() => setHelp(true)}>
          {m.help}
        </button>
        <button className="button" onClick={onSignOut} title={identity.name}>
          {m.switchRole}
        </button>
      </header>
      <main className="citizen-body">
        <aside className="citizen-panel">
          <nav aria-label={m.residentTasks}>
            <button
              aria-pressed={tab === "roads"}
              onClick={() => switchTab("roads")}
            >
              <UiIcon name="route" size={18} />
              {m.roadInformation}
            </button>
            <button
              aria-pressed={tab === "report"}
              onClick={() => {
                switchTab("report");
                setMessage("");
              }}
            >
              <UiIcon name="camera" size={18} />
              {m.reportAnObservation}
            </button>
            <button
              aria-pressed={tab === "mine"}
              onClick={() => switchTab("mine")}
            >
              <UiIcon name="history" size={18} />
              {m.myReports}
            </button>
          </nav>
          <div className="citizen-panel-scroll">
            {message && (
              <p className="citizen-feedback" role="status">
                {message}
              </p>
            )}
            {tab === "roads" && (
              <section className="citizen-roads">
                <h1 className="visually-hidden">{m.accessToAnArea}</h1>
                <div className="citizen-segments" role="group" aria-label={t("Cách xem đường", "Road view")}>
                  <button type="button" aria-pressed={roadMode === "village"} onClick={() => showRoadMode("village")}>
                    <UiIcon name="home" size={16} />
                    {t("Đường về thôn, bản", "Village access")}
                  </button>
                  <button type="button" aria-pressed={roadMode === "journey"} onClick={() => showRoadMode("journey")}>
                    <UiIcon name="route" size={16} />
                    {t("Tìm đường", "Find a route")}
                  </button>
                </div>
                {roadMode === "village" ? (
                  <section className="citizen-card citizen-village" aria-label={t("Đường về thôn, bản", "Village access")}>
                    {snapshot.communities.length > 1 && (
                      <label className="geodata-field">
                        {m.areaToView}
                        <select value={community} onChange={(e) => setCommunity(e.target.value)}>
                          {snapshot.communities.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    {route ? (
                      <CitizenRouteCard
                        route={route}
                        avoided={advice.avoided}
                        problems={routeProblems(route)}
                        chainage={chainage}
                        origin={originName}
                        hazardCount={(road) => snapshot.hazards.filter(h => roadsForHazard(snapshot.roads, h.id).some(r => r.id === road.id)).length}
                        locale={locale}
                        onShowMap={() => { setShownRoadId(null); setMapOnMobile(true); }}
                        onShowSection={(road) => {
                          setShownRoadId(road.id);
                          controls.current?.frameProjected?.(road.points);
                          setMapOnMobile(true);
                        }}
                      />
                    ) : (
                      <p className="citizen-direction-note">{m.noMappedRouteInTheCurrentDataset}</p>
                    )}
                  </section>
                ) : (
                  <CitizenDirections
                    journey={journey}
                    communities={snapshot.communities}
                    sites={snapshot.responseSites.filter((site) => site.kind === "staging")}
                    locale={locale}
                    gps={gps}
                    gpsError={gpsError}
                    onPick={(side) => {
                      gps.cancel();
                      setPicking(false);
                      journey.setPicking(side);
                      setMapOnMobile(true);
                    }}
                    onMap={() => setMapOnMobile(true)}
                  />
                )}
              </section>
            )}
            <section hidden={tab !== "report"}>
              <h1 className="visually-hidden">{m.fieldObservation}</h1>
              <CitizenReportForm
                key={draftId}
                locale={locale}
                observer={identity.name}
                active={tab === "report" && !mapOnMobile}
                accuracy={accuracy}
                onSave={submit}
                onPhotosRead={(photos) => {
                  if (reportPosition.current.lat || reportPosition.current.lon)
                    return;
                  const photo = photos.find(
                    (p) =>
                      typeof p.exif.latitude === "number" &&
                      typeof p.exif.longitude === "number",
                  );
                  if (photo)
                    position(
                      Number(photo.exif.latitude),
                      Number(photo.exif.longitude),
                      "photo",
                    );
                }}
                locationControl={
                  <fieldset className="citizen-card citizen-position">
                    <legend>{m.observationLocation}</legend>
                    <div className="citizen-capture-actions">
                      <button
                        type="button"
                        className="button"
                        disabled={gps.busy}
                        onClick={async () => {
                          const p = await gps.request();
                          if (p) {
                            position(p.latitude, p.longitude, "device");
                            setAccuracy(p.accuracy);
                          }
                        }}
                      >
                        <UiIcon name="myLocation" size={20} />
                        {gps.busy ? m.locating : m.myLocation}
                      </button>
                      <button
                        type="button"
                        className="button"
                        onClick={() => {
                          gps.cancel();
                          journey.setPicking(null);
                          setPicking(true);
                          setMapOnMobile(true);
                        }}
                      >
                        <UiIcon name="map" size={20} />
                        {m.chooseOnMap}
                      </button>
                    </div>
                    {gpsError}
                    {lat && lon && (
                      <p className="citizen-position-value">
                        <UiIcon name="check" size={16} />
                        <span>
                        <strong>{source === "community"
                          ? t(
                              "Vị trí gần đúng theo thôn/bản",
                              "Approximate village location",
                            )
                          : source === "device"
                            ? t("Vị trí hiện tại", "Current location")
                            : source === "photo"
                              ? t(
                                  "Vị trí lưu trong ảnh",
                                  "Location stored in photo",
                                )
                              : t("Vị trí đã chọn", "Selected location")}
                        {accuracy !== null
                          ? t(", sai số ±", ", accuracy ±") + Math.round(accuracy) + " m"
                          : ""}</strong>
                        <small>{Number(lat).toFixed(5)}, {Number(lon).toFixed(5)}</small>
                        </span>
                      </p>
                    )}
                    <label className="geodata-field">
                      {t(
                        "Hoặc chọn thôn, bản nơi xảy ra",
                        "Or choose the village where it happened",
                      )}
                      <select
                        value={source === "community" ? locationCommunity : ""}
                        onChange={(e) => {
                          const c = snapshot.communities.find(
                            (c) => c.id === e.target.value,
                          );
                          if (c) {
                            const p = roadGeographic(c.projected);
                            position(p.latitude, p.longitude, "community");
                            setLocationCommunity(c.id);
                          } else {
                            setLat("");
                            setLon("");
                            setLocationCommunity("");
                            setAccuracy(null);
                          }
                        }}
                      >
                        <option value="">{m.notSelected}</option>
                        {snapshot.communities.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <details className="field-extra">
                      <summary>{t("Nhập tọa độ", "Enter coordinates")}</summary>
                      <div className="catalog-dates">
                        <label className="geodata-field">
                          {m.latitude}
                          <input
                            aria-label={m.reportLatitude}
                            type="number"
                            min="-85.05112878"
                            max="85.05112878"
                            step="any"
                            value={lat}
                            onChange={(e) => {
                              gps.cancel();
                              setLat(e.target.value);
                              setSource("manual");
                              setAccuracy(null);
                            }}
                          />
                        </label>
                        <label className="geodata-field">
                          {m.longitude}
                          <input
                            aria-label={m.reportLongitude}
                            type="number"
                            min="-180"
                            max="180"
                            step="any"
                            value={lon}
                            onChange={(e) => {
                              gps.cancel();
                              setLon(e.target.value);
                              setSource("manual");
                              setAccuracy(null);
                            }}
                          />
                        </label>
                      </div>
                    </details>
                  </fieldset>
                }
              />
            </section>
            {tab === "mine" && (
              <section>
                <h1>{m.submittedObservations}</h1>
                {!own.length ? (
                  <p className="citizen-empty">
                    {m.youHaveNotSubmittedAReport}
                  </p>
                ) : (
                  <ul className="citizen-submissions">
                    {own.map((record) => {
                      const s = submissionOf(record)!,
                        o = observationOf(record),
                        open = openSubmission === record.id;
                      const code =
                        record.name.match(/[A-Z]{2}-[A-Z0-9]{4,}$/)?.[0] ?? "";
                      const status = s.review.status;
                      return (
                        <li
                          key={record.id}
                          className="citizen-submission"
                          data-open={open || undefined}
                        >
                          <button
                            type="button"
                            className="citizen-submission-head"
                            aria-expanded={open}
                            onClick={() =>
                              setOpenSubmission(open ? null : record.id)
                            }
                          >
                            {o?.photos[0] ? (
                              <img src={o.photos[0].preview} alt="" />
                            ) : (
                              <span
                                className="citizen-submission-thumb"
                                aria-hidden="true"
                              >
                                <UiIcon name="image" />
                              </span>
                            )}
                            <span className="citizen-submission-text">
                              <strong>
                                {o
                                  ? observationLabel(o.kind, locale)
                                  : record.name}
                              </strong>
                              <small>
                                {[
                                  code,
                                  new Date(s.submittedAt).toLocaleString(
                                    locale === "vi" ? "vi-VN" : "en-GB",
                                    { dateStyle: "short", timeStyle: "short" },
                                  ),
                                ]
                                  .filter(Boolean)
                                  .map((value, index) => (
                                    <span key={index}>{value}</span>
                                  ))}
                              </small>
                            </span>
                            <span className={"citizen-review is-" + status}>
                              {status === "pending"
                                ? m.awaitingReview
                                : status === "checked"
                                  ? m.reviewed
                                  : status === "needs-info"
                                    ? m.moreInformationNeeded
                                    : m.notUsed}
                            </span>
                          </button>
                          {open && (
                            <div className="citizen-submission-body">
                              {s.review.note && (
                                <p className="citizen-review-note">
                                  {s.review.note}
                                </p>
                              )}
                              {o &&
                                (canEditSubmission(identity, record) ? (
                                  <ObservationEditor
                                    record={record}
                                    key={record.id + o.updatedAt}
                                    locale={locale}
                                    compact
                                    onSave={(value) =>
                                      gis.annotate(record.id, value, {
                                        [submissionKey]: {
                                          ...s,
                                          review: {
                                            status: "pending",
                                            note: "",
                                            reviewer: "",
                                            reviewedAt: "",
                                          },
                                          previousReview: s.review,
                                        },
                                      })
                                    }
                                  />
                                ) : (
                                  <>
                                    {o.note && (
                                      <p className="field-note">{o.note}</p>
                                    )}
                                    <VoicePlayback
                                      voice={o.voice}
                                      locale={locale}
                                    />
                                    <PhotoGallery
                                      photos={o.photos}
                                      locale={locale}
                                    />
                                  </>
                                ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}
          </div>
        </aside>
        <section className="map-area citizen-map" aria-label={m.communityMap}>
          <div className="map-canvas">
            <Map2D
              analysisImagery={analysisDisplay}
              userLocation={gps.location}
              userLocationRequest={locationRequest}
              onBasemapState={setBasemap}
              locale={locale}
              terrain={defaultTerrain}
              imageUrl={manifest?.terrain.image?.url}
              viewportRef={viewport}
              viewControlRef={controls}
              profileOpen={false}
              locationOpen={false}
              locationPoint={null}
              onLocation={() => {}}
              measurementOpen={false}
              onCloseMeasurement={() => {}}
              measureSession={measure}
              dispatchMeasureSession={dispatch}
              gisRecords={mapRecords}
              gisSelectedId={selectedArea?.id ?? (tab === "mine" ? ownSelected : null)}
              gisRequest={ownView}
              onGisSelect={(id) => {
                if (gis.records.some(record => record.id === id && landslideAreaOf(record))) {
                  setSelectedHazardId(null);
                  setSelectedAreaId(id);
                } else {setSelectedHazardId(null);setSelectedAreaId(null);setOwnSelected(id);setTab("mine");setMapOnMobile(false);}
              }}
              pointPickActive={picking || (journey.open && !!journey.picking)}
              onPointPick={(latitude, longitude) => {
                if (journey.picking) {
                  journey.pick(latitude, longitude);
                  setMapOnMobile(false);
                } else position(latitude, longitude, "map");
              }}
              journeyEndpoints={roadView ? journeyMarkers(journey) : []}
              journeyFitRequest={journey.fitSequence}
              onSelectOverlayHit={onHit}
              scenarioProps={{
                datasetVersion: packet.datasetVersion,
                aoi: packet.aoi,
                communities: snapshot.communities,
                responseSites: snapshot.responseSites,
                hazards: snapshot.hazards,
                roads: snapshot.roads,
                selectedRoute: !roadView ? null : roadMode === "journey" ? journey.route : route,
                // In a search the A and B pins mark the places; a second selected pin would cover them.
                selectedCommunityId: roadView && roadMode === "village" ? community : null,
                selectedObjectId: placeHazard ? `hazard:${placeHazard.id}` : shownRoadId && roadView ? `road:${shownRoadId}` : null,
                layers: citizenLayers,
                appearance: defaultLayerAppearance,
              }}
            />
          </div>
          <div
            className="citizen-map-tools"
            role="group"
            aria-label={locale === "vi" ? "Điều khiển bản đồ" : "Map controls"}
          >
            <button
              className="icon-button"
              onClick={() => controls.current?.zoomIn()}
              aria-label={m.zoomIn}
              title={m.zoomIn}
            >
              <UiIcon name="zoomIn" />
            </button>
            <button
              className="icon-button"
              onClick={() => controls.current?.zoomOut()}
              aria-label={m.zoomOut}
              title={m.zoomOut}
            >
              <UiIcon name="zoomOut" />
            </button>
            <button
              className="icon-button"
              onClick={() => controls.current?.resetView()}
              aria-label={m.overview}
              title={m.overview}
            >
              <UiIcon name="fit" />
            </button>
            <button
              className="icon-button"
              disabled={gps.busy}
              aria-label={m.myLocation}
              title={m.myLocation}
              onClick={async () => {
                const p = await gps.request();
                if (p) setLocationRequest((v) => v + 1);
              }}
            >
              <UiIcon name="location" />
            </button>
          </div>
          {(picking || journey.picking) && (
            <div className="citizen-pick-hint" role="status">
              {picking
                ? m.chooseTheObservationLocationOnTheMap
                : journey.picking === "start"
                  ? t(
                      "Chọn nơi xuất phát trên bản đồ",
                      "Choose the starting point on the map",
                    )
                  : t(
                      "Chọn nơi đến trên bản đồ",
                      "Choose the destination on the map",
                    )}
              <button
                className="button"
                onClick={() => {
                  setPicking(false);
                  journey.setPicking(null);
                  setMapOnMobile(false);
                }}
              >
                {m.cancel}
              </button>
            </div>
          )}
          <details className="citizen-map-layers">
            <summary><UiIcon name="layers" size={18}/>{t('Lớp', 'Layers')}</summary>
            <fieldset aria-label={t('Lớp bản đồ người dân', 'Resident map layers')}>
              {([['landslide',t('Vùng và điểm sạt lở','Landslide areas and points')],['status',t('Tình trạng đường','Road status')],['communities',t('Thôn, bản','Communities')],['imagery',t('Ảnh nền','Imagery')]] as const).map(([key,label]) => <label key={key}><input type="checkbox" checked={layerOptions[key]} onChange={() => setLayerOptions(previous => ({...previous,[key]:!previous[key]}))}/>{label}</label>)}
              <LandslideFillControl locale={locale} disabled={!layerOptions.landslide}/>
            </fieldset>
          </details>
          {(placeHazard || placeArea) && !picking && !journey.picking && <CitizenPlaceCard
            key={placeHazard?.id ?? selectedAreaId ?? ""}
            hazard={placeHazard} area={placeHazard ? undefined : placeArea} road={placeRoad}
            photos={placeHazard ? fieldPhotos.get(placeHazard.id) : undefined} locale={locale}
            onReport={() => {
              if (placeHazard) reportAt(placeHazard.projected);
              else if (selectedArea) {
                const [longitude, latitude] = pointOnFeature(selectedArea.feature).geometry.coordinates;
                setSelectedAreaId(null); setTab("report"); setMessage(""); position(latitude, longitude, "map");
              }
            }}
            onClose={() => { setSelectedHazardId(null); setSelectedAreaId(null); }}/>}
          <MapAttribution
            analysisSource={layerOptions.imagery?analysisSourceInfo(analysisImagery.layers,analysisImagery.selection,locale):undefined}
            locale={locale}
            state={basemap}
            onRetry={() => controls.current?.retryBasemap()}
          />
        </section>
      </main>
      <nav className="citizen-mobile-switch">
        <button
          aria-pressed={!mapOnMobile}
          onClick={() => setMapOnMobile(false)}
        >
          {m.information}
        </button>
        <button aria-pressed={mapOnMobile} onClick={() => setMapOnMobile(true)}>
          {m.map}
        </button>
      </nav>
      {help && (
        <UserGuide
          audience="resident"
          locale={locale}
          onClose={() => setHelp(false)}
        />
      )}
    </div>
  );
}
