"""Build a bounded, reproducible local map from supplied RGB rasters and open terrain.

The display context never enters the DEM analysis grids. No Esri/Google tiles are cached.
Requires rasterio, numpy and Pillow only while preparing the release.
"""
import argparse,hashlib,io,json,math,time,urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timezone
from pathlib import Path
import numpy as np
import rasterio
from rasterio.warp import reproject,Resampling,transform_bounds
from rasterio.transform import from_bounds
from PIL import Image

R=20037508.342789244

def tile_range(bounds,z):
    west,south,east,north=bounds;n=2**z
    def y(lat):return (1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n
    return (math.floor((west+180)/360*n),math.floor(y(north)),math.floor((east+180)/360*n),math.floor(y(south)))

def mercator_bounds(z,x,y):
    span=2*R/2**z
    return (-R+x*span,R-(y+1)*span,-R+(x+1)*span,R-y*span)

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def prepare(sources,output,cache,bounds=None,imagery_metadata=None,require_coverage=False):
    if (output/'map.json').exists():
        raise ValueError('Use an empty output directory to avoid mixing map versions')
    output.mkdir(parents=True,exist_ok=True);cache.mkdir(parents=True,exist_ok=True)
    rasters=[];provenance=[]
    for path in sources:
        with rasterio.open(path) as src:
            if src.count<3 or src.dtypes[0]!='uint8':raise ValueError('Expected original 8-bit RGB imagery')
            rasters.append((src.read([1,2,3]),src.transform,src.crs))
            provenance.append(dict(file=path.name,sha256=digest(path),boundsWgs84=list(transform_bounds(src.crs,'EPSG:4326',*src.bounds)),pixelSize=list(src.res)))
    b=np.array([p['boundsWgs84'] for p in provenance]);bounds=bounds or [float(b[:,0].min()-.16),float(b[:,1].min()-.16),float(b[:,2].max()+.16),float(b[:,3].max()+.16)]
    if len(bounds)!=4 or not all(math.isfinite(v) for v in bounds) or not (-180<=bounds[0]<bounds[2]<=180 and -85<bounds[1]<bounds[3]<85):
        raise ValueError('Invalid map bounds')
    imagery_record=json.loads(imagery_metadata.read_text(encoding='utf8')) if imagery_metadata else None
    if imagery_record and (len(sources)!=1 or imagery_record.get('sha256')!=digest(sources[0])):
        raise ValueError('Context imagery provenance does not match input')
    z=11;x0,y0,x1,y1=tile_range(bounds,z)
    terrain_tiles=[dict(z=z,x=x,y=y) for y in range(y0,y1+1) for x in range(x0,x1+1)]
    if len(terrain_tiles)>128:raise ValueError('Bounded terrain budget exceeded')
    height=np.full(((y1-y0+1)*256,(x1-x0+1)*256),np.nan,dtype=np.float32)
    records=[]
    def download(tile):
        x,y=tile['x'],tile['y'];url=f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
        saved=cache/f'{z}-{x}-{y}.png'
        if not saved.exists():
            for attempt in range(3):
                try:
                    with urllib.request.urlopen(url,timeout=40) as response:data=response.read()
                    image=Image.open(io.BytesIO(data));image.load()
                    if image.size!=(256,256):raise ValueError('Invalid terrain tile')
                    saved.write_bytes(data);break
                except Exception:
                    if attempt==2:raise
                    time.sleep(1+attempt)
        image=np.asarray(Image.open(saved).convert('RGBA'))
        values=image[:,:,0].astype(np.float32)*256+image[:,:,1]+image[:,:,2]/256-32768
        if np.any(image[:,:,3]==0) or np.any((values< -11000)|(values>9000)):raise ValueError('Incomplete terrain snapshot')
        target=output/f'elevation/{z}/{x}/{y}.png';target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(saved.read_bytes())
        return x,y,values,dict(url=url,sha256=digest(saved))
    with ThreadPoolExecutor(max_workers=4) as pool:
        for x,y,values,record in pool.map(download,terrain_tiles):
            height[(y-y0)*256:(y-y0+1)*256,(x-x0)*256:(x-x0+1)*256]=values;records.append(record)
    mb0=mercator_bounds(z,x0,y1);mb1=mercator_bounds(z,x1,y0)
    transform=from_bounds(mb0[0],mb0[1],mb1[2],mb1[3],height.shape[1],height.shape[0])
    gy,gx=np.gradient(height,abs(transform.e),transform.a)
    shade=np.clip((1-.55*gx+.65*gy)/np.sqrt(1+gx*gx+gy*gy),0,1)
    background=np.stack([115+shade*30,123+shade*30,115+shade*28]).astype(np.uint8)
    files={}
    for zoom in range(7,15):
        a,b,c,d=tile_range(bounds,zoom)
        for y in range(b,d+1):
            for x in range(a,c+1):
                affine=from_bounds(*mercator_bounds(zoom,x,y),256,256)
                terrain=np.zeros((3,256,256),dtype=np.uint8)
                for band in range(3):reproject(background[band],terrain[band],src_transform=transform,src_crs='EPSG:3857',dst_transform=affine,dst_crs='EPSG:3857',resampling=Resampling.bilinear)
                rgb=terrain.copy();occupied=np.zeros((256,256),bool)
                for source,source_transform,crs in rasters:
                    patch=np.zeros_like(rgb)
                    for band in range(3):reproject(source[band],patch[band],src_transform=source_transform,src_crs=crs,dst_transform=affine,dst_crs='EPSG:3857',resampling=Resampling.bilinear)
                    valid=np.any(patch>0,axis=0)&~occupied;rgb[:,valid]=patch[:,valid];occupied|=valid
                if require_coverage:
                    # Test pixel centres inside the declared package, not the
                    # padded edges of the XYZ tiles intersecting its boundary.
                    lon=(affine.c+(np.arange(256)+.5)*affine.a)/R*180
                    lat=np.degrees(np.arctan(np.sinh((affine.f+(np.arange(256)+.5)*affine.e)/R*math.pi)))
                    inside=(lat[:,None]>=bounds[1])&(lat[:,None]<=bounds[3])&(lon[None,:]>=bounds[0])&(lon[None,:]<=bounds[2])
                    if np.any(inside&~occupied):raise ValueError(f'Missing imagery at {zoom}/{x}/{y}; refusing an incomplete satellite basemap')
                for kind,data in [('imagery',rgb),('terrain',terrain)]:
                    path=output/f'{kind}/{zoom}/{x}/{y}.webp';path.parent.mkdir(parents=True,exist_ok=True)
                    Image.fromarray(data.transpose(1,2,0)).save(path,quality=90,method=4)
        print(f'Prepared local map zoom {zoom}',flush=True)
    Image.new('RGB',(256,256),(232,234,226)).save(output/'blank.webp',quality=90)
    for path in sorted(output.rglob('*')):
        if path.is_file() and path.name!='map.json':files[path.relative_to(output).as_posix()]=dict(sha256=digest(path),byteLength=path.stat().st_size)
    catalog=dict(schemaVersion=1,bounds=bounds,
        imagery=dict(url='/offline-map/imagery/{z}/{x}/{y}.webp',maxZoom=14,name=imagery_record['name'] if imagery_record else 'Sentinel-2 (cục bộ)',credit=(imagery_record['credit'] if imagery_record else 'Copernicus Sentinel-2')+'; Terrain © Mapzen / USGS'),
        terrain=dict(url='/offline-map/terrain/{z}/{x}/{y}.webp',maxZoom=14),elevation=dict(url='/offline-map/elevation/{z}/{x}/{y}.png',tiles=terrain_tiles),
        provenance=dict(createdAt=datetime.now(timezone.utc).isoformat(),imagery=provenance,terrain=records,
            context=imagery_record,completeImageryCoverage=require_coverage,
            terrainAttribution='Mapzen Terrain Tiles; global GMTED2010 and SRTM courtesy of USGS',
            terrainLicense='https://github.com/tilezen/joerd/blob/master/docs/attribution.md',
            interpretation='RGB is prepared Sentinel-2 context, not Planet. Where RGB is absent, neutral hillshade shows real terrain. Context relief is display only; never an analysis grid or a confirmed current observation.'),files=files)
    (output/'map.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(f'Prepared {len(files)} local assets, {len(terrain_tiles)} terrain tiles: {output}',flush=True)
    return catalog

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--rgb',type=Path,nargs='+',required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--cache',type=Path,required=True);p.add_argument('--bounds',type=float,nargs=4);p.add_argument('--imagery-metadata',type=Path);p.add_argument('--require-coverage',action='store_true')
    a=p.parse_args();prepare(a.rgb,a.output,a.cache,a.bounds,a.imagery_metadata,a.require_coverage)
