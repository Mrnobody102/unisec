/** Print the rendered snapshot, including its legend, provenance and assessment.
 * Browser print offers PDF saving without uploading data or loading remote assets.
 */
export async function printDecision(imageUrl: string, title: string): Promise<void> {
  const frame = document.createElement('iframe');
  frame.title = title;
  frame.style.cssText = 'position:fixed;width:1px;height:1px;left:-10000px;border:0';
  document.body.appendChild(frame);
  const documentToPrint = frame.contentDocument!;
  documentToPrint.open();
  documentToPrint.write('<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:8mm}html,body{margin:0;padding:0}img{display:block;width:100%;height:auto;max-height:190mm;object-fit:contain}</style></head><body></body></html>');
  documentToPrint.close(); documentToPrint.title = title;
  const image = documentToPrint.createElement('img'); image.alt = title;
  const loaded = new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Print image unavailable')); });
  image.src = imageUrl; documentToPrint.body.appendChild(image);
  try {
    await loaded;
    const cleanup = () => { frame.remove(); clearTimeout(timeout); };
    const timeout = setTimeout(cleanup, 300000);
    frame.contentWindow!.addEventListener('afterprint', cleanup, { once: true });
    frame.contentWindow!.focus(); frame.contentWindow!.print();
  } catch (error) { frame.remove(); throw error; }
}
