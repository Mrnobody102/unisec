import './field-photos.css';
import { useEffect, useRef, useState } from 'react';
import type { Locale } from '../../types/dear';
import { PhotoLightbox, type LightboxPhoto } from '../observations/PhotoLightbox';
import { headingLabel, photoUrl, type PreparedPhoto, type PreparedPhotoPoint } from './preparedPhotos';

const day = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${y}`; };

function lightboxPhoto(photo: PreparedPhoto, preview: string, point: PreparedPhotoPoint, locale: Locale): LightboxPhoto {
  const facts = [photo.headingDeg !== null && (locale === 'en' ? 'facing ' : 'hướng ') + headingLabel(photo.headingDeg, locale),
    photo.accuracyM !== null && `GPS ±${Math.round(photo.accuracyM)} m`].filter(Boolean).join(', ');
  return {
    recordId: point.id, recordName: point.surveyName,
    photo: { id: photo.image.sha256, name: facts ? `${photo.name}, ${facts}` : photo.name, mime: 'image/webp', bytes: photo.image.byteLength,
      width: photo.image.width, height: photo.image.height, preview, sha256: photo.image.sha256, addedAt: photo.capturedAt,
      exif: { DateTimeOriginal: photo.capturedAt.slice(0, 19).replace(/^(\d{4})-(\d{2})-(\d{2})T/, '$1:$2:$3 '), OffsetTimeOriginal: photo.capturedAt.slice(19), Model: photo.camera } }
  };
}

/** Survey photos of one hazard. The visit date is stated because it may postdate the incident snapshot. */
export function FieldPhotoStrip({ point, locale, context }: { point: PreparedPhotoPoint; locale: Locale; context?: string }): JSX.Element {
  const t = (vi: string, en: string) => locale === 'en' ? en : vi;
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [error,setError]=useState(false),[opening,setOpening]=useState(false),[attempt,setAttempt]=useState(0);
  const generation=useRef(0);
  const [open, setOpen] = useState<{ index: number; photos: LightboxPhoto[] } | null>(null);
  useEffect(() => {
    const ticket=++generation.current;
    setThumbs([]);setOpen(null);setError(false);setOpening(false);
    void Promise.all(point.photos.map(photo => photoUrl(photo.thumb))).then(
      urls => {if(generation.current===ticket)setThumbs(urls);},
      () => {if(generation.current===ticket)setError(true);},
    );
    return () => {generation.current++;};
  }, [point,attempt]);
  const show = async (index: number) => {
    const ticket=generation.current;setOpening(true);setError(false);
    try {
      const previews = await Promise.all(point.photos.map(photo => photoUrl(photo.image)));
      if(generation.current===ticket)setOpen({ index, photos: point.photos.map((photo, i) => lightboxPhoto(photo, previews[i], point, locale)) });
    } catch {if(generation.current===ticket)setError(true);}
    finally {if(generation.current===ticket)setOpening(false);}
  };
  const days = [...new Set(point.photos.map(photo => day(photo.capturedAt)))].join(', ');
  return <section className="workflow-section field-photo-strip">
    <h3>{t('Ảnh hiện trường', 'Field photos')}<small>{point.photos.length}</small></h3>
    <p className="field-photo-strip-note">{context && <>{context}<br/></>}{t(`Chụp ${days}`, `Taken ${days}`)}</p>
    {error && <p className="field-photo-strip-note" role="status">{t('Chưa tải được ảnh.','Could not load photos.')} <button type="button" className="text-button" onClick={()=>setAttempt(value=>value+1)}>{t('Thử lại','Retry')}</button></p>}
    <div className="field-photo-strip-grid" aria-busy={opening}>
      {point.photos.slice(0, 4).map((photo, index) => <button key={photo.thumb.sha256} type="button" disabled={opening} onClick={() => void show(index)}
        aria-label={t('Xem ảnh ', 'View photo ') + photo.name}>
        {thumbs[index] ? <img src={thumbs[index]} alt="" width={photo.thumb.width} height={photo.thumb.height} loading="lazy"/> : null}
        {index === 3 && point.photos.length > 4 && <span className="field-photo-more" aria-hidden="true">+{point.photos.length - 4}</span>}
      </button>)}
    </div>
    {open && <PhotoLightbox photos={open.photos} index={open.index} locale={locale} onIndex={index => setOpen({ ...open, index })} onClose={() => setOpen(null)}/>}
  </section>;
}
