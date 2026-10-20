"""Fit display-only basemap tones to Planet, preserving all Planet RGB evidence.

Only paired vegetated pixels away from supplied KML extents enter the fit. This is
an RGB presentation adjustment, not sensor harmonisation or a cloud classifier.
Remote reference tiles are cached outside the checkout. No raster evidence is rewritten.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timezone
import hashlib,io,json,math,re,urllib.request,xml.etree.ElementTree as ET
from pathlib import Path
import numpy as np
from PIL import Image
from rasterio.features import rasterize
from rasterio.transform import from_bounds
from rasterio.warp import transform,transform_geom


def canopy(rgb):
    rgb=rgb.astype(float)
    r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]
    return (g>r*1.06)&(g>b*1.06)&(g>28)&(g<150)&((2*g-r-b)>12)&(np.min(rgb,axis=-1)>12)


def fit_tone(source,target,valid):
    selected=valid&canopy(source)&canopy(target)
    a,b=source[selected].astype(float),target[selected].astype(float)
    if len(a)<500:raise ValueError('Insufficient paired canopy samples')
    # Robust interquartile fit: local cloud/haze, shadows and changed surfaces are not targets.
    low,high=np.percentile(a,[5,95],axis=0)
    keep=np.all((a>=low)&(a<=high),axis=1)
    low,high=np.percentile(b,[5,95],axis=0)
    keep&=np.all((b>=low)&(b<=high),axis=1)
    a,b=a[keep],b[keep]
    sa=np.percentile(a,[25,50,75],axis=0);sb=np.percentile(b,[25,50,75],axis=0)
    # Monotone per-channel gamma curves preserve black/white endpoints and never
    # clip dark forest pixels to black, unlike an unconstrained offset fit.
    gamma=np.clip(np.log(np.maximum(1,sb[1])/255)/np.log(np.maximum(1,sa[1])/255),.7,1.8)
    after=255*np.power(a/255,gamma)
    return {'gamma':gamma.round(6).tolist(),'samples':len(a),
            'medianCanopyDifferenceBefore':float(np.mean(np.abs(sa[1]-sb[1]))),
            'medianCanopyDifferenceAfter':float(np.mean(np.abs(np.median(after,axis=0)-sb[1])))}



def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('viewer',type=Path);parser.add_argument('kml',type=Path);parser.add_argument('--cache',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();args.cache.mkdir(parents=True,exist_ok=True)
    folder=args.viewer/'public/scenarios/che-tao/imagery';catalog=json.loads((folder/'imagery.json').read_text(encoding='utf-8'))
    post=next(x for x in catalog['layers'] if x['id']=='planet-post');asset=post['mosaic']['web']
    rgba=np.asarray(Image.open(folder/asset['url']).convert('RGBA'))
    [[south,west],[north,east]]=asset['latLngBounds'];height,width=rgba.shape[:2]
    # A 12 m sampling grid is adequate for fitting canopy colours and bounded in memory.
    stride=4;rgba=rgba[::stride,::stride];height,width=rgba.shape[:2]
    lat=np.linspace(north,south,height,endpoint=False)+(south-north)/height/2
    lon=np.linspace(west,east,width,endpoint=False)+(east-west)/width/2
    longitude,latitude=np.meshgrid(lon,lat)
    zoom=14;n=2**zoom
    tx=(longitude+180)/360*n;ty=(1-np.arcsinh(np.tan(np.radians(latitude)))/math.pi)/2*n
    xs=range(math.floor(tx.min()),math.floor(tx.max())+1);ys=range(math.floor(ty.min()),math.floor(ty.max())+1)
    reference=np.zeros((len(ys)*256,len(xs)*256,3),dtype=np.uint8);hashes=[]
    template='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    def tile(key):
        x,y=key;path=args.cache/f'{zoom}-{x}-{y}.jpg'
        if not path.exists():
            request=urllib.request.Request(template.format(z=zoom,x=x,y=y),headers={'User-Agent':'DEAR display colour review'})
            with urllib.request.urlopen(request,timeout=30) as response:path.write_bytes(response.read())
        data=path.read_bytes();pixels=np.asarray(Image.open(io.BytesIO(data)).convert('RGB'))
        if pixels.shape!=(256,256,3):raise ValueError('Unexpected basemap tile size')
        return x,y,pixels,hashlib.sha256(data).hexdigest()
    with ThreadPoolExecutor(max_workers=4) as pool:
        for x,y,pixels,digest in pool.map(tile,[(x,y) for y in ys for x in xs]):
            reference[(y-ys.start)*256:(y-ys.start+1)*256,(x-xs.start)*256:(x-xs.start+1)*256]=pixels
            hashes.append({'z':zoom,'x':x,'y':y,'sha256':digest})
    base=reference[np.clip(((ty-ys.start)*256).astype(int),0,reference.shape[0]-1),np.clip(((tx-xs.start)*256).astype(int),0,reference.shape[1]-1)]
    # Buffer every original outline by ~60 m through a conservative raster-mask dilation.
    geometries=[]
    root=ET.parse(args.kml).getroot();ns={'k':'http://www.opengis.net/kml/2.2'}
    for polygon in root.findall('.//k:Polygon',ns):
        rings=[]
        for ring in polygon.findall('.//k:LinearRing/k:coordinates',ns):
            rings.append([[float(m[1]),float(m[2])] for m in re.finditer(r'(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)',ring.text or '')])
        if rings:geometries.append({'type':'Polygon','coordinates':rings})
    mask=rasterize([(geometry,1) for geometry in geometries],out_shape=(height,width),transform=from_bounds(west,south,east,north,width,height),all_touched=True)
    expanded=mask.copy()
    for dy in range(-5,6):
        for dx in range(-5,6):
            shifted=np.zeros_like(mask);a,b=max(0,dy),min(height,height+dy);c,d=max(0,dx),min(width,width+dx)
            shifted[a:b,c:d]=mask[a-dy:b-dy,c-dx:d-dx];expanded|=shifted
    valid=(rgba[...,3]==255)&(expanded==0)
    esri=fit_tone(base,rgba[...,:3],valid)
    meta=json.loads((args.viewer/'public/terrain/che_tao_v2_tex.terrain.json').read_text(encoding='utf-8'))
    local=np.asarray(Image.open(args.viewer/'public/terrain/che_tao_v2_tex.image.png').convert('RGB'))
    x,y=transform('EPSG:4326','EPSG:32648',longitude.ravel(),latitude.ravel());x=np.asarray(x).reshape(height,width);y=np.asarray(y).reshape(height,width)
    t=meta['grid_transform'];rows,cols=meta['grid']['shape'];c=(x-t['c'])/t['a']/cols*local.shape[1];r=(y-t['f'])/t['e']/rows*local.shape[0]
    inside=(c>=0)&(c<local.shape[1])&(r>=0)&(r<local.shape[0]);sentinel=local[np.clip(r.astype(int),0,local.shape[0]-1),np.clip(c.astype(int),0,local.shape[1]-1)]
    local_fit=fit_tone(sentinel,rgba[...,:3],valid&inside)
    result={'schema':'dear-basemap-tone/v1','purpose':'Display-only basemap RGB to Planet canopy; Planet source pixels unchanged',
        'planetSha256':asset['sha256'],'bounds':asset['latLngBounds'],'reference':{'url':template,'retrievedAt':datetime.now(timezone.utc).isoformat(),'tiles':hashes},
        'exclusions':'Both images: dark, bright, non-green pixels; original KML extents buffered by ~60 m. RGB heuristics, not a certified cloud mask.',
        'esri':esri,'prepared':local_fit,'preparedAssetId':meta['asset_id']}
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'esri':esri,'prepared':local_fit},indent=2))

if __name__=='__main__':main()
