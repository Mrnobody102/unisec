import {describe,expect,it} from 'vitest';
import catalog from '../../../public/scenarios/che-tao/field-photos/photos.json';
import type {VectorFeature} from '../../geo/vector/types';
import {fieldRecords} from './fieldDataset';
import {validatePhotoCatalog} from '../fieldPhotos/preparedPhotos';
import {areaDisplayName,areaPhotoEvidence} from './areaEvidence';

// Survey coordinates copied from the supplied KML; the browser check uses the full import.
const features:VectorFeature[]=[
  {
    "type": "Feature",
    "properties": {
      "name": "Scar 1 [0830]"
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        104.0467911061554,
        21.75744467431061,
        1782.874820916556
      ]
    }
  },
  {
    "type": "Feature",
    "properties": {
      "name": "Scar 2 [0850]"
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        104.0455555339436,
        21.76333815072582,
        1979.752291418078
      ]
    }
  },
  {
    "type": "Feature",
    "properties": {
      "name": "Scar 3 [0926]"
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        104.0443985889399,
        21.78370568781054,
        1625.005220182346
      ]
    }
  },
  {
    "type": "Feature",
    "properties": {
      "name": "Talus 3"
    },
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [
            104.0448990099397,
            21.78382217475437,
            0.0
          ],
          [
            104.0448216432861,
            21.78373485582452,
            0.0
          ],
          [
            104.0447705482026,
            21.78370325744722,
            0.0
          ],
          [
            104.0446920094782,
            21.78369313632021,
            0.0
          ],
          [
            104.0446331196419,
            21.78369305000116,
            0.0
          ],
          [
            104.0445373850485,
            21.78370401316754,
            0.0
          ],
          [
            104.0444633313784,
            21.78370349144001,
            0.0
          ],
          [
            104.0444228999774,
            21.7836896789252,
            0.0
          ],
          [
            104.0444043284972,
            21.7836829901476,
            0.0
          ],
          [
            104.044497955342,
            21.78356860526163,
            0.0
          ],
          [
            104.0445188894577,
            21.78353898593599,
            0.0
          ],
          [
            104.0445622560784,
            21.7835101790814,
            0.0
          ],
          [
            104.0446080804816,
            21.78350674280301,
            0.0
          ],
          [
            104.0446536972128,
            21.78350122850155,
            0.0
          ],
          [
            104.044697776035,
            21.78350147356717,
            0.0
          ],
          [
            104.0447434235529,
            21.78350175290183,
            0.0
          ],
          [
            104.0448071363745,
            21.78351794377651,
            0.0
          ],
          [
            104.0448541801689,
            21.78355494973954,
            0.0
          ],
          [
            104.0449050945776,
            21.78360762765953,
            0.0
          ],
          [
            104.0449368299876,
            21.78365998195898,
            0.0
          ],
          [
            104.044946228847,
            21.7837425850637,
            0.0
          ],
          [
            104.0448990099397,
            21.78382217475437,
            0.0
          ]
        ]
      ]
    }
  }
];
const records=fieldRecords(features,'a'.repeat(64),'CheTao-Landslide-Scars.kml','network','2026-10-20T00:00:00Z');
const photos=new Map(validatePhotoCatalog(catalog,'/photos/photos.json').map(point=>[point.hazardId,point]));
const talus=records.find(record=>record.feature.properties.sourceName==='Talus 3')!;

describe('survey photographs related to mapped extents',()=>{
  it('relates the real Talus 3 boundary to the Scar 3 station and its five photographs',()=>{
    const result=areaPhotoEvidence(talus,records,photos)!;
    expect(result.point.surveyName).toBe('Scar 3 [0926]');
    expect(result.point.photos).toHaveLength(5);
    expect(result.distanceM).toBeLessThan(150);
    expect(result.explicit).toBe(false);
    expect(areaDisplayName(talus,'vi')).toBe('Vùng tích tụ vật liệu 3');
    expect(talus.name).toBe('Talus 3');
  });
  it('does not assign photographs from a different group, source, or distant station',()=>{
    expect(areaPhotoEvidence({...talus,feature:{...talus.feature,properties:{...talus.feature.properties,sourceName:'Talus 1'}}},records,photos)).toBeUndefined();
    expect(areaPhotoEvidence({...talus,feature:{...talus.feature,properties:{...talus.feature.properties,sourceDatasetId:'other'}}},records,photos)).toBeUndefined();
    const far=records.map(record=>record.feature.geometry.type==='Point'?{...record,feature:{...record.feature,geometry:{type:'Point' as const,coordinates:[104,21]}}}:record);
    expect(areaPhotoEvidence(talus,far,photos)).toBeUndefined();
    expect(areaPhotoEvidence(talus,records)).toBeUndefined();
  });
  it('preserves renamed areas and refuses ambiguous survey stations',()=>{
    expect(areaDisplayName({...talus,name:'Vùng tích tụ cạnh cầu'},'vi')).toBe('Vùng tích tụ cạnh cầu');
    const station=records.find(record=>record.feature.properties.sourceName==='Scar 3 [0926]')!;
    expect(areaPhotoEvidence(talus,[...records,{...station,id:'duplicate'}],photos)).toBeUndefined();
  });
});
