"""Inspect every supplied Planet Visual acquisition without rewriting any imagery.

python tools/audit_planet_sources.py <resources/dear> --out <temporary inventory.json>
Requires rasterio/numpy only for reading georeferencing and valid-pixel masks.
"""
import argparse,json
from collections import defaultdict
from pathlib import Path
import numpy as np
import rasterio
from rasterio.warp import transform_bounds
from planet_sources import discover_scenes,select_scene,PLANET_DATES


def inventory(source:Path) -> dict:
    selected=defaultdict(list)
    for layer,parts in PLANET_DATES.items():
        for part,day in parts.items():selected[select_scene(source,part,day).path.resolve()].append(layer)
    scenes=[]
    for scene in discover_scenes(source):
        with rasterio.open(scene.path) as raster:
            if raster.count!=4:raise ValueError(f'Expected RGB plus alpha: {scene.path}')
            valid=raster.read(4)>0
            rows,cols=np.nonzero(valid)
            bounds=raster.bounds
            valid_bounds=None
            if rows.size:
                x0,y0=raster.transform*(int(cols.min()),int(rows.min()))
                x1,y1=raster.transform*(int(cols.max())+1,int(rows.max())+1)
                valid_bounds=transform_bounds(raster.crs,'EPSG:4326',min(x0,x1),min(y0,y1),max(x0,x1),max(y0,y1))
            scenes.append({'file':str(scene.path.relative_to(source)).replace('\\','/'),'acquired':scene.acquired,'dayUTC':scene.day,
                'stripId':scene.properties.get('strip_id'),'nativeGsdM':scene.properties.get('gsd'),
                'pixelM':list(raster.res),'crs':str(raster.crs),'shape':list(raster.shape),
                'boundsWgs84':list(transform_bounds(raster.crs,'EPSG:4326',*bounds)),
                'validBoundsWgs84':valid_bounds,'validPixels':int(valid.sum()),
                'sceneCloudPercent':scene.properties.get('cloud_percent'),'sceneClearPercent':scene.properties.get('clear_percent'),
                'usedBy':selected[scene.path.resolve()]})
    return {'kind':'Planet RGB visual imagery; not an elevation time series',
        'coverageMeaning':'Valid alpha coverage is not cloud-free coverage. Provider cloud percentages describe the acquisition, not this cropped AOI.',
        'count':len(scenes),'daysUTC':sorted({s['dayUTC'] for s in scenes}),'scenes':scenes}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('source',type=Path);parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args();result=inventory(args.source);args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(f"{result['count']} scenes, {len(result['daysUTC'])} UTC acquisition days; inventory: {args.out}")
