import { UiIcon } from '../../shared/ui/UiIcon';
import { observationCode } from '../observations/recordIdentity';
import { accessMessages } from './locales';
import type { ScenarioRevision } from './useScenarioRevision';
import { journeyMarkers, useRoadJourney } from '../routes/useRoadJourney';
import { RoadJourneyPanel } from '../routes/RoadJourneyPanel';
import { useMemo, useRef, useState } from 'react';
import type {
  OverlayHit,
  ViewControls,
  BasemapState
} from '../../features/map/mapContracts';
import type { IncidentPacket } from '../../data/incidentPacket';
import type { useTerrainWorkspace } from '../terrain/useTerrainWorkspace';
import type { DemoIdentity } from './demoSession';
import { useGeometrySession } from '../geodata/useGeometrySession';
import { useIncidentWorkspace } from '../incident/useIncidentWorkspace';
import { useMeasurementSession } from '../measurement/useMeasurementSession';
import { Map2D } from '../map/Map2D';
import { defaultLayerAppearance } from '../map/layerAppearance';
import { ObservationEditor } from '../observations/ObservationEditor';
import {
  annotateRecord,
  observationOf,
  type FieldObservation
} from '../observations/model';
import { PhotoGallery } from '../observations/PhotoGallery';
import { observationLabel } from '../observations/labels';
import { validateGeometry } from '../../geo/vector/validateGeometry';
import type { GeometryRecord } from '../../geo/vector/types';
import {
  newSubmission,
  submissionOf,
  canEditSubmission,
  submissionKey,
  type Submission
} from './submissions';
import { MapAttribution } from '../../components/dear/MapAttribution';
import { UserGuide } from '../help/UserGuide';
import './citizen.css';

type Props = {
  published: ScenarioRevision;
  locale: import('../../types/dear').Locale;
  identity: DemoIdentity;
  onSignOut: () => void;
  runtime: ReturnType<typeof useTerrainWorkspace> & { packet: IncidentPacket };
};
export function CitizenWorkspace({
  published,
  locale,
  identity,
  onSignOut,
  runtime
}: Props): JSX.Element {
  const m = accessMessages[locale];
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const { packet, defaultTerrain, manifest, offline } = runtime;
  const snapshot = useIncidentWorkspace(packet, published.applied),
    gis = useGeometrySession();
  const [openSubmission, setOpenSubmission] = useState<string | null>(null);
  const [tab, setTab] = useState<'roads' | 'report' | 'mine'>('roads'),
    [community, setCommunity] = useState(
      identity.communityId ?? packet.communities[0]?.id ?? ''
    );
  const [mapOnMobile, setMapOnMobile] = useState(false),
    [picking, setPicking] = useState(false),
    [help, setHelp] = useState(false),
    [message, setMessage] = useState('');
  const [lat, setLat] = useState(''),
    [lon, setLon] = useState(''),
    [source, setSource] = useState<Submission['locationSource']>('manual');
  const [draftId, setDraftId] = useState(() => crypto.randomUUID()),
    [gpsBusy, setGpsBusy] = useState(false),
    [accuracy, setAccuracy] = useState<number | null>(null),
    [ownSelected, setOwnSelected] = useState<string | null>(null);
  const [ownView, setOwnView] = useState({
    version: 0,
    id: null as string | null
  });
  const [basemap, setBasemap] = useState<BasemapState>({
    status: 'off',
    style: 'satellite',
    loaded: 0,
    total: 0
  });
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<{ center: [number, number]; zoom: number } | null>(
      null
    ),
    controls = useRef<ViewControls | null>(null);
  const { session: measure, dispatch } = useMeasurementSession('2d', false);
  const journey = useRoadJourney(snapshot.roads);
  const routePair = snapshot.routes.get(community),
    route = routePair?.candidate ?? routePair?.direct ?? null;
  const own = gis.records.filter(
    (r) => submissionOf(r)?.authorId === identity.id
  );
  const draft: GeometryRecord = useMemo(
    () => ({
      id: draftId,
      name: m.fieldReport,
      role: 'reference',
      visible: true,
      source: {
        name: m.residentReport,
        format: 'coordinate',
        importedAt: new Date().toISOString()
      },
      feature: {
        type: 'Feature',
        properties: { observer: identity.name },
        geometry: { type: 'Point', coordinates: [Number(lon), Number(lat)] }
      }
    }),
    [draftId, lat, lon, identity.name, locale]
  );
  const position = (
    latitude: number,
    longitude: number,
    kind: Submission['locationSource']
  ) => {
    setLat(latitude.toFixed(6));
    setLon(longitude.toFixed(6));
    setSource(kind);
    if (kind !== 'device') setAccuracy(null);
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
              [submissionKey]: newSubmission(identity, source)
            }
          }
        },
        observation
      );
      gis.add([record]);
      setOwnSelected(record.id);
      setOwnView((v) => ({ version: v.version + 1, id: record.id }));
      setMessage(m.submittedInThisDemoSessionAwaitingCoordinator);
      setTab('mine');
      setDraftId(crypto.randomUUID());
      setLat('');
      setLon('');
      return true;
    } catch {
      setMessage(m.couldNotSaveTheReportCheckCoordinates);
      return false;
    }
  };
  const onHit = (hit: OverlayHit) => {
    if (hit.type === 'community') setCommunity(hit.id);
  };
  return (
    <div
      ref={root}
      className="response-workspace citizen-workspace"
      data-citizen-map={mapOnMobile ? 'true' : undefined}
    >
      <header className="citizen-header">
        <div>
          <strong>DEAR</strong>
          <span>{m.communityInformation}</span>
        </div>
        <span className="citizen-demo-label">{m.demoScenario}</span>
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
              aria-pressed={tab === 'roads'}
              onClick={() => setTab('roads')}
            >
              {m.roadInformation}
            </button>
            <button
              aria-pressed={tab === 'report'}
              onClick={() => {
                setTab('report');
                setMessage('');
              }}
            >
              {m.reportAnObservation}
            </button>
            <button
              aria-pressed={tab === 'mine'}
              onClick={() => setTab('mine')}
            >
              {m.myReports}
            </button>
          </nav>
          <div className="citizen-panel-scroll">
            {message && (
              <p className="citizen-feedback" role="status">
                {message}
              </p>
            )}
            {tab === 'roads' && (
              <section>
                <h1>{m.accessToAnArea}</h1>
                <label className="geodata-field">
                  {m.areaToView}
                  <select
                    value={community}
                    onChange={(e) => setCommunity(e.target.value)}
                  >
                    {snapshot.communities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                {route ? (
                  <>
                    <h2>{t(...route.name)}</h2>
                    <p className="citizen-route-status">
                      {route.status === 'blocked'
                        ? m.includesABlockedSection
                        : route.status === 'uncertain'
                          ? m.includesUnverifiedSections
                          : m.noBlockageRecorded}
                    </p>
                    <p>{route.lengthKm} km</p>
                    <ul className="citizen-road-list">
                      {route.segs.map((road) => (
                        <li key={road.id}>
                          <strong>{t(...road.name)}</strong>
                          {road.status !== 'open' && (
                            <span>
                              {road.status === 'blocked'
                                ? m.blocked
                                : m.needsChecking}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>{m.noMappedRouteInTheCurrentDataset}</p>
                )}
                <button
                  className="button"
                  onClick={() => {
                    journey.setOpen(true);
                    setMapOnMobile(true);
                  }}
                >
                  {m.chooseAnotherJourney}
                </button>
              </section>
            )}
            {tab === 'report' && (
              <section>
                <h1>{m.fieldObservation}</h1>
                <ObservationEditor
                  key={draftId}
                  record={draft}
                  locale={locale}
                  initialEditing
                  compact
                  positionAccuracy={accuracy}
                  locationControl={
                    <fieldset className="citizen-position">
                      <legend>{m.observationLocation}</legend>
                      <div className="geodata-actions">
                        <button
                          className="button"
                          onClick={() => {
                            setPicking(true);
                            setMapOnMobile(true);
                          }}
                        >
                          {m.chooseOnMap}
                        </button>
                        <button
                          className="button"
                          disabled={gpsBusy}
                          onClick={() => {
                            if (!navigator.geolocation) {
                              setMessage(m.locationIsNotAvailable);
                              return;
                            }
                            setGpsBusy(true);
                            navigator.geolocation.getCurrentPosition(
                              (p) => {
                                position(
                                  p.coords.latitude,
                                  p.coords.longitude,
                                  'device'
                                );
                                setAccuracy(p.coords.accuracy);
                                setGpsBusy(false);
                              },
                              () => {
                                setGpsBusy(false);
                                setMessage(m.couldNotObtainLocationChooseOnMap);
                              },
                              {
                                enableHighAccuracy: true,
                                timeout: 10000,
                                maximumAge: 0
                              }
                            );
                          }}
                        >
                          {gpsBusy ? m.locating : m.myLocation}
                        </button>
                      </div>
                      <details className="field-extra">
                        <summary>
                          {lat && lon
                            ? `${Number(lat).toFixed(5)}°, ${Number(lon).toFixed(5)}°`
                            : locale === 'vi'
                              ? 'Nhập tọa độ'
                              : 'Enter coordinates'}
                        </summary>
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
                                setLat(e.target.value);
                                setSource('manual');
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
                                setLon(e.target.value);
                                setSource('manual');
                                setAccuracy(null);
                              }}
                            />
                          </label>
                        </div>
                      </details>
                      {source === 'photo' && (
                        <p className="field-hint">
                          {m.usingCameraGpsAdjustTheLocationIf}
                        </p>
                      )}
                    </fieldset>
                  }
                  submitLabel={m.submitReport}
                  onSave={submit}
                  onPhotosRead={(photos) => {
                    if (lat || lon) return;
                    const photo = photos.find(
                      (p) =>
                        typeof p.exif.latitude === 'number' &&
                        typeof p.exif.longitude === 'number'
                    );
                    if (photo)
                      position(
                        Number(photo.exif.latitude),
                        Number(photo.exif.longitude),
                        'photo'
                      );
                  }}
                />
              </section>
            )}
            {tab === 'mine' && (
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
                        record.name.match(/[A-Z]{2}-[A-Z0-9]{4,}$/)?.[0] ?? '';
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
                                    locale === 'vi' ? 'vi-VN' : 'en-GB',
                                    { dateStyle: 'short', timeStyle: 'short' }
                                  )
                                ]
                                  .filter(Boolean)
                                  .map((value, index) => (
                                    <span key={index}>{value}</span>
                                  ))}
                              </small>
                            </span>
                            <span className={'citizen-review is-' + status}>
                              {status === 'pending'
                                ? m.awaitingReview
                                : status === 'checked'
                                  ? m.reviewed
                                  : status === 'needs-info'
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
                                            status: 'pending',
                                            note: '',
                                            reviewer: '',
                                            reviewedAt: ''
                                          },
                                          previousReview: s.review
                                        }
                                      })
                                    }
                                  />
                                ) : (
                                  <>
                                    {o.note && (
                                      <p className="field-note">{o.note}</p>
                                    )}
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
              gisRecords={own}
              gisSelectedId={ownSelected}
              gisRequest={ownView}
              onGisSelect={(id) => {
                setOwnSelected(id);
                setTab('mine');
                setMapOnMobile(false);
              }}
              pointPickActive={picking || (journey.open && !!journey.picking)}
              onPointPick={(latitude, longitude) =>
                journey.picking
                  ? journey.pick(latitude, longitude)
                  : position(latitude, longitude, 'map')
              }
              journeyEndpoints={journeyMarkers(journey)}
              onSelectOverlayHit={onHit}
              scenarioProps={{
                aoi: packet.aoi,
                communities: snapshot.communities,
                responseSites: snapshot.responseSites,
                hazards: snapshot.hazards,
                roads: snapshot.roads,
                selectedRoute: journey.open ? journey.route : route,
                selectedCommunityId: community,
                selectedObjectId: null,
                layers: {
                  aoi: true,
                  roads: true,
                  status: true,
                  communities: true,
                  route: true,
                  landslide: true,
                  flood: true,
                  staging: true,
                  hlz: false,
                  imagery: true,
                  context: !offline,
                  hillshade: true
                },
                appearance: defaultLayerAppearance
              }}
            />
          </div>
          <div
            className="citizen-map-tools"
            role="group"
            aria-label={locale === 'vi' ? 'Điều khiển bản đồ' : 'Map controls'}
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
          </div>
          {picking && (
            <div className="citizen-pick-hint" role="status">
              {m.chooseTheObservationLocationOnTheMap}
              <button
                className="button"
                onClick={() => {
                  setPicking(false);
                  setMapOnMobile(false);
                }}
              >
                {m.cancel}
              </button>
            </div>
          )}
          {journey.open && (
            <RoadJourneyPanel
              locale={locale}
              journey={journey}
              communities={snapshot.communities}
              sites={snapshot.responseSites}
              roads={snapshot.roads}
            />
          )}
          <MapAttribution
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
