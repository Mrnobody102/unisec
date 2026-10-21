import { useEffect, useState } from 'react';
import { photoUrl, type PreparedPhoto } from './preparedPhotos';

/** A verified survey thumbnail; keeps its box while the bytes load so rows do not shift. */
export function PhotoThumb({ photo, className }: { photo?: PreparedPhoto; className?: string }): JSX.Element {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let live = true;
    setUrl(undefined);
    if (photo) void photoUrl(photo.thumb).then(value => { if (live) setUrl(value); }, () => undefined);
    return () => { live = false; };
  }, [photo]);
  return <span className={'photo-thumb ' + (className ?? '')} aria-hidden="true">{url && <img src={url} alt="" loading="lazy"/>}</span>;
}
