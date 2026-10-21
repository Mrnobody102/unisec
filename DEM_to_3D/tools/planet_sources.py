"""Planet input identity and explicit scene selection, separate from raster rendering."""
from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path

PLANET_DATES = {
    'planet-post': {'RoadPart1':'2026-09-01','RoadPart2':'2026-09-12','RoadPart3':'2026-09-12'},
    'planet-pre': {'RoadPart1':'2026-04-12','RoadPart2':'2026-04-12','RoadPart3':'2026-04-12'},
    'planet-sep01': {'RoadPart1':'2026-09-01','RoadPart2':'2026-09-01'},
}

@dataclass(frozen=True)
class PlanetScene:
    path: Path
    acquired: str
    properties: dict

    @property
    def day(self) -> str:
        return datetime.fromisoformat(self.acquired.replace('Z','+00:00')).astimezone(timezone.utc).date().isoformat()


def read_scene(path:Path) -> PlanetScene:
    metadata=path.with_name(path.stem.replace('_3B_Visual_clip','')+'_metadata.json')
    properties=json.loads(metadata.read_text(encoding='utf8'))['properties']
    acquired=properties['acquired']
    if datetime.fromisoformat(acquired.replace('Z','+00:00')).tzinfo is None:
        raise ValueError(f'Missing acquisition timezone: {path.name}')
    return PlanetScene(path,acquired,properties)


def discover_scenes(source:Path) -> list[PlanetScene]:
    """All four supplied folders, including multiple strips from the same day."""
    return [read_scene(path) for path in sorted((source/'planet').glob('CheTao_*_psscene_visual/**/*.tif'))]


def select_scene(source:Path,part:str,day:str,strip_id:str|None=None) -> PlanetScene:
    if part not in {'RoadPart1','RoadPart2','RoadPart3'}:
        raise ValueError(f'Unknown road part: {part}')
    folder=source/'planet'/f'CheTao_{part}_strip_psscene_visual'
    if part=='RoadPart1' and day=='2026-04-12':
        folder=source/'planet'/'CheTao_RoadPart1_strip_add_psscene_visual'/'PSScene'
    candidates=[read_scene(path) for path in sorted(folder.rglob('*.tif'))]
    matches=[scene for scene in candidates if scene.day==day and (strip_id is None or str(scene.properties.get('strip_id'))==strip_id)]
    if len(matches)!=1:
        raise ValueError(f'{part}, {day}: expected one scene, found {len(matches)}; choose an explicit strip_id. Candidates: '+', '.join(scene.path.name for scene in matches))
    return matches[0]
