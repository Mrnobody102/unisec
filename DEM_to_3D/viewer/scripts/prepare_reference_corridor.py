"""Prepare an imagery corridor from an OSM XML snapshot; never invent road geometry.
Run with the QGIS Python launcher for the metric AOI buffer (GDAL/OGR).
"""
import argparse
import collections
from datetime import datetime, timezone
import hashlib
import heapq
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET

START = (104.0896197, 21.8516123)  # OSM place node 369492075, Mu Cang Chai
END = (104.03196, 21.72206)  # GeoNames 8526472: Ban Che Tao, centre-area reference, not a verified office pin
REQUIRED = (104.03000, 21.74146)  # User's imagery interpretation point, not a commune centre
HIGHWAYS = {'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'service', 'track'}


def distance(a, b):
    lat1, lat2 = math.radians(a[1]), math.radians(b[1])
    h = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(math.radians(b[0]-a[0])/2)**2
    return 6371008.8 * 2 * math.asin(min(1, math.sqrt(h)))


def reference_path(xml):
    root = ET.fromstring(xml)
    nodes = {n.attrib['id']: (float(n.attrib['lon']), float(n.attrib['lat'])) for n in root.findall('node')}
    graph, ways = collections.defaultdict(list), {}
    for way in root.findall('way'):
        tags = {t.attrib['k']: t.attrib['v'] for t in way.findall('tag')}
        if tags.get('highway') not in HIGHWAYS or tags.get('access') in {'no', 'private'} or tags.get('motor_vehicle') == 'no':
            continue
        wid = way.attrib['id']
        ways[wid] = {**tags, 'osmVersion': int(way.attrib['version']), 'osmTimestamp': way.attrib['timestamp']}
        ids = [n.attrib['ref'] for n in way.findall('nd')]
        for a, b in zip(ids, ids[1:]):
            if a not in nodes or b not in nodes:
                continue
            length = distance(nodes[a], nodes[b])
            if tags.get('oneway') != '-1': graph[a].append((b, length, wid))
            if tags.get('oneway') not in {'yes', 'true', '1'}: graph[b].append((a, length, wid))
    if not graph: raise ValueError('No eligible OSM roads')
    start = min(graph, key=lambda n: distance(nodes[n], START))
    end = min(graph, key=lambda n: distance(nodes[n], END))
    if max(distance(nodes[start], START), distance(nodes[end], END)) > 500:
        raise ValueError('An endpoint is more than 500 m from mapped road nodes')
    queue, costs, previous = [(0, start)], {start: 0}, {}
    while queue:
        cost, node = heapq.heappop(queue)
        if node == end: break
        if cost > costs[node]: continue
        for other, length, wid in graph[node]:
            candidate = cost + length
            if candidate < costs.get(other, math.inf):
                costs[other], previous[other] = candidate, (node, wid)
                heapq.heappush(queue, (candidate, other))
    if end not in costs: raise ValueError('OSM network is disconnected; no straight-line replacement is permitted')
    path, way_ids = [end], []
    while path[-1] != start:
        node, wid = previous[path[-1]]
        path.append(node); way_ids.append(wid)
    path.reverse(); way_ids.reverse()
    return [nodes[n] for n in path], path, way_ids, ways


def prepare(source, output, buffer_m=500):
    from osgeo import ogr, osr
    # Merge overlapping source extracts by stable OSM ID and newest version.
    root, elements, snapshots = ET.Element('osm', version='0.6'), {}, []
    for path in source:
        xml = Path(path).read_bytes()
        snapshots.append({'file': Path(path).name, 'sha256': hashlib.sha256(xml).hexdigest()})
        for element in ET.fromstring(xml):
            if element.tag not in {'node', 'way', 'relation'}: continue
            key = element.tag, element.get('id')
            if key not in elements or int(element.get('version', '0')) > int(elements[key].get('version', '0')):
                elements[key] = element
    for element in elements.values(): root.append(element)
    xml = ET.tostring(root, encoding='utf-8')
    coordinates, node_ids, way_ids, ways = reference_path(xml)
    wgs, utm = osr.SpatialReference(), osr.SpatialReference()
    wgs.ImportFromEPSG(4326); utm.ImportFromEPSG(32648)
    for crs in [wgs, utm]: crs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    line = ogr.CreateGeometryFromJson(json.dumps({'type': 'LineString', 'coordinates': coordinates}))
    line.Transform(osr.CoordinateTransformation(wgs, utm))
    area = line.Buffer(buffer_m)
    point = ogr.CreateGeometryFromJson(json.dumps({'type': 'Point', 'coordinates': REQUIRED}))
    point.Transform(osr.CoordinateTransformation(wgs, utm))
    if not area.Contains(point):
        # The imagery point is independent of the route; expand the image request,
        # never divert the road or connect it with an invented road segment.
        area = area.Union(point.Buffer(buffer_m))
    area.Transform(osr.CoordinateTransformation(utm, wgs))
    retrieved = datetime.now(timezone.utc).isoformat()
    def feature(id, name, geometry, properties):
        return {'type': 'Feature', 'id': id, 'properties': {'name': name, **properties}, 'geometry': geometry}
    features = [
        feature('osm-corridor', 'Mù Cang Chải – Chế Tạo', {'type': 'LineString', 'coordinates': coordinates}, {
            'referenceKind': 'road-corridor', 'sourceName': 'OpenStreetMap contributors',
            'sourceUrl': 'https://www.openstreetmap.org/copyright', 'license': 'ODbL-1.0',
            'reviewStatus': 'unverified', 'lengthM': round(line.Length(), 2),
            'sourceWayIds': list(dict.fromkeys(way_ids)), 'sourceNodeIds': node_ids,
            'sourceWayVersions': {wid: ways[wid] for wid in dict.fromkeys(way_ids)},
            'retrievedAt': retrieved, 'osmSnapshots': snapshots,
            'sourceUrlQueries': ['https://api.openstreetmap.org/api/0.6/map?bbox=103.99,21.72,104.15,21.88', 'https://api.openstreetmap.org/api/0.6/map?bbox=104.025,21.695,104.06,21.745', 'https://api.openstreetmap.org/api/0.6/map?bbox=104.02,21.65,104.105,21.73'],
            'destinationReference': 'https://www.geonames.org/8526472/ban-che-tao.html',
            'startGapM': round(distance(START, coordinates[0]), 2), 'endGapM': round(distance(END, coordinates[-1]), 2),
            'note': 'Đường tham chiếu OSM tới khu vực bản Chế Tạo (GeoNames 8526472). Điểm đến đại diện khu vực trung tâm, chưa xác minh vị trí trụ sở xã. Chưa kiểm tra khả năng đi qua, không gán trạng thái chặn hoặc ETA.'}),
        feature('imagery-required-point', 'Điểm bắt buộc có ảnh', {'type': 'Point', 'coordinates': REQUIRED}, {
            'referenceKind': 'required-imagery-point', 'sourceName': 'Yêu cầu ảnh Mù Cang Chải – Chế Tạo',
            'requiredCoverage': True, 'latitude': REQUIRED[1], 'longitude': REQUIRED[0],
            'note': 'Giữ nguyên tọa độ yêu cầu. GeoTIFF phải có pixel dữ liệu hợp lệ tại điểm này; bbox hoặc footprint chứa điểm chưa đủ.'}),
        feature('mu-cang-chai', 'Mù Cang Chải', {'type': 'Point', 'coordinates': START}, {
            'sourceName': 'OpenStreetMap contributors', 'sourceUrl': 'https://www.openstreetmap.org/node/369492075', 'referenceKind': 'reference-place'}),
        feature('che-tao-centre', 'Khu vực trung tâm Chế Tạo', {'type': 'Point', 'coordinates': END}, {
            'referenceKind': 'destination-place', 'sourceName': 'GeoNames',
            'sourceUrl': 'https://www.geonames.org/8526472/ban-che-tao.html', 'license': 'CC-BY-4.0',
            'sourceFeatureId': 8526472, 'reviewStatus': 'unverified',
            'note': 'Mốc tham chiếu bản Chế Tạo từ GeoNames; chưa xác minh vị trí trụ sở xã.'}),
        feature('imagery-corridor', 'Phạm vi yêu cầu ảnh theo đường tham chiếu', json.loads(area.ExportToJson()), {
            'referenceKind': 'imagery-aoi', 'sourceName': 'Yêu cầu ảnh; đường tham chiếu OpenStreetMap',
            'bufferM': buffer_m, 'bufferCrs': 'EPSG:32648', 'requiredPoint': REQUIRED,
            'dateRange': None, 'sensor': None, 'coverageValidated': False})
    ]
    result = {'type': 'FeatureCollection', 'name': 'Tuyến tham chiếu và yêu cầu ảnh Mù Cang Chải – Chế Tạo', 'features': features}
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    Path(output).write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8', newline='\n')
    print(f'Prepared {len(coordinates)} original OSM vertices, {line.Length()/1000:.2f} km; imagery coverage remains unchecked')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--osm', required=True, type=Path, nargs='+')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    prepare(args.osm, args.output)
