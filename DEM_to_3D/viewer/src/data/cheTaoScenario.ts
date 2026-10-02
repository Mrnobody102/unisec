import type {
  Community,
  Hazard,
  IncidentModel,
  RoadSegment,
  ScenarioRoute,
  ScenarioRoutePair
} from '../types/dear';
import { projectedPathLength } from '../terrain/pathGeometry';

export const cheTaoIncident: IncidentModel = {
  id: 'INC-2026-0412',
  mode: 'prepared',
  schemaVersion: '0.1',
  triggeredAt: '2026-09-29T03:40:00+07:00',
  asOf: '2026-09-29T09:31:00+07:00',
  asOfUpdated: '2026-09-29T09:45:00+07:00',
  timeline: [
    [
      '03:40',
      'Kích hoạt sự kiện',
      'Incident triggered',
      'Mưa cực đoan trong vùng có nguy cơ sạt lở cao tại thung lũng Nậm Kha',
      'Extreme rainfall in landslide-prone area of Nậm Kha valley'
    ],
    [
      '04:05',
      'Yêu cầu ảnh sau sự kiện',
      'Post-event imagery requested',
      'Ưu tiên ảnh radar Sentinel-1 và dữ liệu địa hình DEM',
      'Prioritised Sentinel-1 radar and DEM terrain data'
    ],
    [
      '06:12',
      'Có dữ liệu ảnh radar',
      'Radar imagery available',
      'Mốc thu nhận ảnh vệ tinh SAR trong kịch bản',
      'Scenario SAR satellite acquisition timestamp'
    ],
    [
      '07:05',
      'Đánh dấu điểm ảnh hưởng',
      'Affected sites mapped',
      'Ghi nhận điểm sạt lở và vị trí cần kiểm tra. Chưa có phạm vi ngập',
      'Landslide sites and locations to review recorded. Flood extent unavailable'
    ],
    [
      '08:10',
      'Đánh giá mức ưu tiên',
      'Priority assessment',
      'Kết hợp tác động thực địa và khả năng tiếp cận từng thôn bản',
      'Combined hazard impact with commune accessibility'
    ],
    [
      '09:31',
      'Có phương án tiếp cận',
      'Access options available',
      'Đường chính vào Nậm Khắt bị chặn. Điểm vượt khe trên đường vòng cần xác minh',
      'The main road to Nậm Khắt is blocked. The bypass gully crossing needs verification'
    ]
  ],
  sources: [
    {
      id: 'radar',
      name: ['Ảnh radar SAR', 'SAR radar imagery'],
      observedAt: '2026-09-29T06:12:00+07:00',
      note: ['Thu nhận ảnh vệ tinh', 'Satellite acquisition']
    },
    {
      id: 'hazard',
      name: ['Phân tích sạt lở', 'Landslide analysis'],
      observedAt: '2026-09-29T07:05:00+07:00',
      note: ['Kết quả phân tích trong bộ dữ liệu', 'Analysis result in the dataset']
    },
    {
      id: 'field',
      name: ['Tin tại điểm vượt khe', 'Gully crossing report'],
      observedAt: '2026-09-29T08:58:00+07:00',
      observedAtUpdated: '2026-09-29T09:40:00+07:00',
      note: ['Thời điểm quan sát hiện trường', 'Field observation timestamp']
    },
    {
      id: 'route',
      name: ['Phương án tiếp cận', 'Access options'],
      observedAt: '2026-09-29T09:31:00+07:00',
      note: ['Phương án trong bộ dữ liệu mô phỏng', 'Option in the simulated dataset']
    }
  ]
};

export const stagingPoint = {
  id: 'TOWN',
  name: { vi: 'Sở chỉ huy tiền phương Nậm Kha', en: 'Nậm Kha FOB staging point' },
  commune: 'Nậm Kha',
  projected: { x: 399500, y: 2397000 }
};

export const initialCommunities: Community[] = [
  {
    id: 'NK',
    name: 'Nậm Khắt',
    commune: 'Nậm Khắt',
    prio: 1,
    pop: 640,
    hh: 142,
    desc: [
      'Mất liên lạc từ 04:10. Chưa rõ nhu cầu hỗ trợ',
      'No contact since 04:10. Relief needs unconfirmed'
    ],
    facts: [
      [
        'Đường chính vào bản bị chặn do sạt lở',
        'Main access road blocked by a landslide',
        'Hiện trường, 07:40',
        'Field report, 07:40'
      ],
      [
        'Mất liên lạc từ 04:10. Chưa rõ nhu cầu hỗ trợ cụ thể',
        'No contact since 04:10. Relief needs unconfirmed',
        'Tin từ xã, 09:14',
        'Commune focal point, 09:14'
      ]
    ],
    projected: { x: 405500, y: 2404500 }
  },
  {
    id: 'KM',
    name: 'Khau Mang',
    commune: 'Khau Mang',
    prio: 1,
    pop: 410,
    hh: 88,
    desc: [
      'Cầu được báo ngập lúc 03:55',
      'Bridge reported flooded at 03:55'
    ],
    facts: [
      [
        'Cầu trên đường vào bản có tin báo ngập. Chưa có cập nhật mới',
        'Access bridge reported flooded. No newer observation',
        'Hiện trường, 03:55',
        'Field report, 03:55'
      ],
      [
        'Có điểm nghi sạt lở gần đường vào bản',
        'Possible landslide near the village access road',
        'Phân tích SAR, 07:05',
        'SAR analysis, 07:05'
      ]
    ],
    projected: { x: 393500, y: 2402500 }
  },
  {
    id: 'NL',
    name: 'Nậm Lắt',
    commune: 'Nậm Lắt',
    prio: 2,
    pop: 290,
    hh: 64,
    desc: [
      'Chưa có phạm vi ngập. Đường vào cần xác minh',
      'Flood extent unavailable. Access needs verification'
    ],
    facts: [
      [
        'Chưa có vùng ngập được khoanh trên bản đồ. Số hộ bị ảnh hưởng chưa xác định',
        'No mapped flood extent. Affected households are unknown',
        'Bộ dữ liệu hiện tại',
        'Current dataset'
      ],
      [
        'Tình trạng cầu trên đường tiếp cận chưa rõ',
        'Condition of the access bridge is uncertain',
        'Tin hiện trường, 03:55',
        'Field report, 03:55'
      ]
    ],
    projected: { x: 404000, y: 2398500 }
  },
  {
    id: 'LM',
    name: 'Lao Mải',
    commune: 'Lao Chải',
    prio: 2,
    pop: 530,
    hh: 115,
    desc: [
      'Có điểm nghi sạt lở gần bản. Đường mòn cần kiểm tra',
      'Possible landslide near the village. Mountain track needs checking'
    ],
    facts: [
      [
        'Có điểm nghi sạt lở gần Lao Mải. Chưa xác nhận đường chính bị chặn',
        'Possible landslide near Lao Mải. Blockage of the main road is unconfirmed',
        'Phân tích SAR, 07:05',
        'SAR analysis, 07:05'
      ],
      [
        'Đường tiếp cận khác là đường mòn qua sườn núi',
        'Another access path follows a mountain track',
        'Mạng đường kịch bản',
        'Scenario road network'
      ]
    ],
    projected: { x: 395000, y: 2396000 }
  },
  {
    id: 'PH',
    name: 'Púng Hốc',
    commune: 'Púng Luông',
    prio: 2,
    pop: 380,
    hh: 82,
    desc: [
      'Chưa đủ dữ liệu đường vào và tin hiện trường',
      'Access road and field information are insufficient'
    ],
    facts: [
      [
        'Chưa có hình tuyến đường vào bản để đánh giá khả năng tiếp cận',
        'No mapped access route is available for assessment',
        'Mạng đường kịch bản',
        'Scenario road network'
      ],
      [
        'Chưa có tin mới về nhu cầu y tế và cứu trợ tại bản',
        'No recent update on medical and relief needs',
        'Chưa có xác minh hiện trường',
        'No field verification'
      ]
    ],
    projected: { x: 398000, y: 2405000 }
  },
  {
    id: 'TP',
    name: 'Tà Phình',
    commune: 'Chế Tạo',
    prio: 2,
    pop: 490,
    hh: 104,
    desc: [
      'Chưa rõ đường vào và khả năng qua cầu',
      'Access route and bridge passage are uncertain'
    ],
    facts: [
      [
        'Chưa có hình tuyến xác nhận đường vào bản đi qua cầu',
        'No mapped route confirms that access to the village crosses the bridge',
        'Mạng đường kịch bản',
        'Scenario road network'
      ],
      [
        'Cần kiểm tra tình trạng cầu trong khu vực trước khi chọn đường vào',
        'Check the nearby bridge before selecting an access route',
        'Tin hiện trường, 03:55',
        'Field report, 03:55'
      ]
    ],
    projected: { x: 392000, y: 2399000 }
  },
  {
    id: 'HC',
    name: 'Háng Cơ',
    commune: 'Chế Tạo',
    prio: 3,
    pop: 210,
    hh: 46,
    desc: [
      'Chưa có tuyến tiếp cận được đối chiếu',
      'No access route has been checked against the road data'
    ],
    facts: [
      [
        'Bộ dữ liệu chưa có hình tuyến vào Háng Cơ. Không thể kết luận đường thông',
        'The dataset has no mapped route to Háng Cơ. Passability cannot be inferred',
        'Mạng đường kịch bản',
        'Scenario road network'
      ],
      [
        'Chưa có báo cáo xác minh khả năng phương tiện đi qua',
        'No report verifies vehicle passage',
        'Chưa có xác minh hiện trường',
        'No field verification'
      ]
    ],
    projected: { x: 407500, y: 2396500 }
  }
];

export const initialHazards: Hazard[] = [
  {
    id: 'LS-01',
    name: ['Điểm nghi sạt lở gần Lao Mải', 'Possible landslide near Lao Mải'],
    kind: 'landslide',
    observation: 'suspected',
    area: 4.8,
    src: ['Ảnh radar Sentinel-1 SAR', 'Sentinel-1 SAR imagery'],
    detected: '07:05 29/09/2026',
    projected: { x: 396800, y: 2396800 }
  },
  {
    id: 'LS-02',
    name: ['Sạt lở trên đường chính vào Nậm Khắt', 'Landslide on the main road to Nậm Khắt'],
    kind: 'landslide',
    observation: 'reported',
    area: 7.2,
    src: ['Hiện trường 07:40, SAR 06:12', 'Field 07:40, SAR 06:12'],
    detected: '07:40 29/09/2026',
    projected: { x: 403000, y: 2401500 }
  },
  {
    id: 'LS-03',
    name: ['Điểm nghi sạt lở gần Khau Mang', 'Possible landslide near Khau Mang'],
    kind: 'landslide',
    observation: 'suspected',
    area: 3.1,
    src: ['Phân tích SAR, 07:05', 'SAR analysis, 07:05'],
    detected: '07:05 29/09/2026',
    projected: { x: 394200, y: 2401800 }
  },
  {
    id: 'U-1',
    name: ['Điểm vượt khe trên đường vòng', 'Gully crossing on the bypass'],
    kind: 'crossing',
    observation: 'reported',
    src: ['Tin hiện trường, 08:58', 'Field report, 08:58'],
    detected: '08:58 29/09/2026',
    projected: { x: 401500, y: 2403500 }
  },
  {
    id: 'B-2',
    name: ['Cầu trên đường vào Khau Mang', 'Bridge on the road to Khau Mang'],
    kind: 'bridge',
    observation: 'reported',
    src: ['Tin hiện trường, 03:55', 'Field report, 03:55'],
    detected: '03:55 29/09/2026',
    projected: { x: 395000, y: 2401000 }
  }
];

export function scenarioHazards(updated: boolean): Hazard[] {
  if (!updated) return initialHazards;
  return initialHazards.map(hazard => hazard.id === 'U-1'
    ? {
        ...hazard,
        kind: 'landslide' as const,
        name: ['Bùn đá tại điểm vượt khe', 'Debris at the gully crossing'],
        src: ['Tin hiện trường, 09:40', 'Field report, 09:40'],
        detected: '09:40 29/09/2026'
      }
    : hazard);
}

const roadSegments: Array<Omit<RoadSegment, 'len'>> = [
  {
    id: 'E1',
    name: ['Đường chính vào Nậm Khắt, đoạn đầu', 'Main road to Nậm Khắt, first section'],
    scenarioRoadCode: 'NR-18',
    cls: 'primary',
    status: 'open',
    points: [
      { x: 399500, y: 2397000 },
      { x: 400800, y: 2398500 },
      { x: 402000, y: 2400000 }
    ]
  },
  {
    id: 'E8',
    name: ['Đường chính vào Nậm Khắt, đoạn sạt lở', 'Main road to Nậm Khắt, landslide section'],
    scenarioRoadCode: 'NR-18',
    cls: 'primary',
    status: 'blocked',
    hz: 'LS-02',
    note: [
      'Đất đá sạt lở taluy dương vùi lấp 80m mặt đường tại Km 6+200',
      'Landslide covered 80m of roadway at Km 6+200'
    ],
    points: [
      { x: 402000, y: 2400000 },
      { x: 403000, y: 2401500 },
      { x: 404200, y: 2403000 }
    ]
  },
  {
    id: 'E9',
    name: ['Đường chính vào Nậm Khắt, đoạn gần bản', 'Main road to Nậm Khắt, village section'],
    scenarioRoadCode: 'NR-18',
    cls: 'primary',
    status: 'open',
    points: [
      { x: 404200, y: 2403000 },
      { x: 405500, y: 2404500 }
    ]
  },
  {
    id: 'E12',
    name: ['Đường vòng qua sườn núi, đoạn đầu', 'Mountain bypass, first section'],
    scenarioRoadCode: 'PR-7',
    cls: 'secondary',
    status: 'open',
    points: [
      { x: 399500, y: 2397000 },
      { x: 399800, y: 2399500 },
      { x: 400500, y: 2401800 }
    ]
  },
  {
    id: 'E13',
    name: ['Đường vòng qua sườn núi, đoạn vượt khe', 'Mountain bypass, gully crossing'],
    scenarioRoadCode: 'PR-7',
    cls: 'secondary',
    status: 'uncertain',
    hz: 'U-1',
    note: [
      'Có tin báo đất đá tại chỗ vượt khe. Chưa xác nhận xe bán tải đi qua được',
      'Debris reported at gully crossing. 4WD vehicle passage unconfirmed'
    ],
    points: [
      { x: 400500, y: 2401800 },
      { x: 401500, y: 2403500 },
      { x: 403200, y: 2404000 }
    ]
  },
  {
    id: 'E14',
    name: ['Đường vòng qua sườn núi, đoạn vào bản', 'Mountain bypass, village section'],
    cls: 'secondary',
    status: 'open',
    points: [
      { x: 403200, y: 2404000 },
      { x: 404500, y: 2404200 },
      { x: 405500, y: 2404500 }
    ]
  },
  {
    id: 'E3',
    name: ['Đường vào Khau Mang qua cầu', 'Road to Khau Mang via the bridge'],
    cls: 'secondary',
    status: 'uncertain',
    hz: 'B-2',
    note: [
      'Tin 03:55: mặt cầu ngập khoảng 0,6 m. Chưa có cập nhật khả năng đi qua',
      'Report at 03:55: bridge deck under about 0.6 m of water. Passability not updated'
    ],
    points: [
      { x: 399500, y: 2397000 },
      { x: 397000, y: 2399000 },
      { x: 395000, y: 2401000 },
      { x: 393500, y: 2402500 }
    ]
  },
  {
    id: 'E5',
    name: ['Đường mòn vào Lao Mải', 'Mountain track to Lao Mải'],
    scenarioRoadCode: 'T-5',
    cls: 'track',
    status: 'uncertain',
    note: [
      'Đường mòn. Chưa có kiểm tra độ dốc và khả năng phương tiện đi qua',
      'Mountain track. Grade and vehicle passage have not been checked'
    ],
    points: [
      { x: 399500, y: 2397000 },
      { x: 397500, y: 2396500 },
      { x: 395000, y: 2396000 }
    ]
  }
];

export const initialRoadSegments: RoadSegment[] = roadSegments.map(segment => ({
  ...segment, len: Number((projectedPathLength(segment.points) / 1000).toFixed(2)),
}));

function assembleRoute(input: Omit<ScenarioRoute, 'points' | 'lengthKm' | 'status'>): ScenarioRoute {
  const points = input.segs.flatMap((segment, index) => index ? segment.points.slice(1) : segment.points);
  const status = input.segs.some(segment => segment.status === 'blocked') ? 'blocked'
    : input.segs.some(segment => segment.status === 'uncertain') ? 'uncertain' : 'open';
  return { ...input, status, points, lengthKm: Number((projectedPathLength(points) / 1000).toFixed(2)) };
}

export function buildScenarioRoutes(segments: RoadSegment[]): Map<string, ScenarioRoutePair> {
  const segMap = new Map(segments.map((s) => [s.id, s]));

  const segE1 = segMap.get('E1')!;
  const segE8 = segMap.get('E8')!;
  const segE9 = segMap.get('E9')!;
  const segE12 = segMap.get('E12')!;
  const segE13 = segMap.get('E13')!;
  const segE14 = segMap.get('E14')!;
  const segE3 = segMap.get('E3')!;
  const segE5 = segMap.get('E5')!;

  const directNK = assembleRoute({
    id: 'RT-NK-DIRECT',
    type: 'direct',
    communityId: 'NK',
    name: ['Đường chính vào Nậm Khắt', 'Main road to Nậm Khắt'],
    segs: [segE1, segE8, segE9]
  });

  const candidateNK = assembleRoute({
    id: 'RT-NK-CANDIDATE',
    type: 'candidate',
    communityId: 'NK',
    name: ['Đường vòng qua sườn núi', 'Mountain bypass'],
    segs: [segE12, segE13, segE14]
  });

  const routes = new Map<string, ScenarioRoutePair>();
  routes.set('NK', { candidate: candidateNK, direct: directNK });

  // Routes with road geometry matching the mapped access path.
  routes.set('KM', {
    candidate: assembleRoute({
      id: 'RT-KM-CANDIDATE',
      type: 'candidate',
      communityId: 'KM',
      name: ['Đường vào Khau Mang qua cầu', 'Road to Khau Mang via the bridge'],
      segs: [segE3]
    }),
    direct: null
  });

  routes.set('LM', {
    candidate: assembleRoute({
      id: 'RT-LM-CANDIDATE',
      type: 'candidate',
      communityId: 'LM',
      name: ['Đường mòn vào Lao Mải', 'Mountain track to Lao Mải'],
      segs: [segE5]
    }),
    direct: null
  });

  // These communities have findings, but no route geometry backed by matching road segments.
  for (const id of ['NL', 'PH', 'TP', 'HC']) routes.set(id, { candidate: null, direct: null });

  return routes;
}
