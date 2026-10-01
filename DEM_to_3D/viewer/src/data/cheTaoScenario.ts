import type {
  Community,
  Hazard,
  IncidentModel,
  RoadSegment,
  ScenarioRoute
} from '../types/dear';

export const cheTaoIncident: IncidentModel = {
  id: 'INC-2026-0412',
  mode: 'prepared',
  schemaVersion: '0.1',
  triggeredAt: '2026-09-29T03:40:00+07:00',
  asOf: '2026-09-29T09:31:00+07:00',
  asOfUpdated: '2026-09-29T09:45:00+07:00',
  areaKm2: 214,
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
      'Phân tích vùng ảnh hưởng',
      'Hazard analysis',
      'Nhận diện các vết sạt lở LS-01, LS-02 và vùng nghi ngập ven suối',
      'Detected landslides LS-01, LS-02 and riparian flood extent'
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
      'Xác định 2 tuyến cho Nậm Khắt, chờ xác minh đoạn qua khe U-1',
      'Identified 2 routes for Nậm Khắt; U-1 gully crossing requires verification'
    ]
  ],
  sources: [
    {
      id: 'radar',
      name: ['Ảnh radar SAR', 'SAR radar imagery'],
      observedAt: '2026-09-29T06:12:00+07:00',
      time: '06:12',
      note: ['Thu nhận ảnh vệ tinh', 'Satellite acquisition']
    },
    {
      id: 'hazard',
      name: ['Phân tích sạt lở', 'Landslide analysis'],
      observedAt: '2026-09-29T07:05:00+07:00',
      time: '07:05',
      note: ['Hoàn tất phân tích tự động', 'Automated analysis completed']
    },
    {
      id: 'field',
      name: ['Tin hiện trường U-1', 'U-1 field report'],
      observedAt: '2026-09-29T08:58:00+07:00',
      time: '08:58',
      note: ['Thời điểm quan sát hiện trường', 'Field observation timestamp']
    },
    {
      id: 'route',
      name: ['Phương án tiếp cận', 'Access options'],
      observedAt: '2026-09-29T09:31:00+07:00',
      time: '09:31',
      note: ['Mô hình tính toán mạng đường', 'Road network routing calculation']
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
      'Đường chính bị chặn, mất liên lạc',
      'Main road blocked, communication disrupted'
    ],
    facts: [
      [
        'Đường chính NR-18 bị chặn tại LS-02',
        'Main road NR-18 blocked at LS-02',
        'Hiện trường · 07:40',
        'Field report · 07:40'
      ],
      [
        'Mất liên lạc từ 04:10; chưa rõ nhu cầu hỗ trợ cụ thể',
        'No contact since 04:10; relief needs unconfirmed',
        'Tin từ xã · 09:14',
        'Commune focal point · 09:14'
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
      'Cầu ngập, đường vào cần xác minh',
      'Flooded bridge, access road uncertain'
    ],
    facts: [
      [
        'Cầu B-2 có tin báo ngập; chưa có cập nhật mới',
        'Bridge B-2 reported flooded; no newer observation',
        'Hiện trường · 03:55',
        'Field report · 03:55'
      ],
      [
        'Phát hiện vết sạt lở nghi ngờ LS-03 trên đường vào bản',
        'Possible landslide LS-03 on village access road',
        'Phân tích SAR · 07:05',
        'SAR analysis · 07:05'
      ]
    ],
    projected: { x: 393500, y: 2402500 }
  },
  {
    id: 'NL',
    name: 'Nậm Lắt',
    commune: 'Nậm Lắt',
    prio: 1,
    pop: 290,
    hh: 64,
    desc: [
      'Có hộ trong vùng nghi ngập lũ quét',
      'Households within mapped flood extent'
    ],
    facts: [
      [
        'Ước tính 64 hộ trong vùng nghi ngập, chưa xác minh hiện trường',
        'Estimated 64 households in flood extent, not field verified',
        'Phân tích SAR · 06:12',
        'SAR analysis · 06:12'
      ],
      [
        'Tình trạng cầu B-2 trên đường tiếp cận chưa rõ',
        'Bridge B-2 accessibility is uncertain',
        'Tin hiện trường · 03:55',
        'Field report · 03:55'
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
      'Đường chính bị chặn, có đường mòn thay thế',
      'Main road blocked, alternative mountain track'
    ],
    facts: [
      [
        'NR-18 có điểm chặn sạt lở tại LS-01',
        'NR-18 blocked by landslide at LS-01',
        'Phân tích SAR · 07:05',
        'SAR analysis · 07:05'
      ],
      [
        'Đường thay thế đi qua đường mòn T-5',
        'Alternative path follows mountain track T-5',
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
      'Tiếp cận gián đoạn, chưa có tin mới',
      'Access disrupted, limited field updates'
    ],
    facts: [
      [
        'Đường tiếp cận đi qua vùng có điểm sạt lở sườn dốc',
        'Access road crosses hill slope landslide zone',
        'Mạng đường + SAR · 07:05',
        'Road network + SAR · 07:05'
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
      'Phụ thuộc vào tình trạng cầu B-2',
      'Access entirely depends on bridge B-2'
    ],
    facts: [
      [
        'Phương án tiếp cận bắt buộc đi qua cầu B-2',
        'Primary access option relies on bridge B-2',
        'Mạng đường kịch bản',
        'Scenario road network'
      ],
      [
        'Chưa rõ khả năng xe bán tải đi qua cầu sau lũ',
        'Bridge vehicle clearance unknown post-flood',
        'Tin hiện trường · 03:55',
        'Field report · 03:55'
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
      'Chưa ghi nhận điểm chặn',
      'No recorded blockage on road'
    ],
    facts: [
      [
        'Chưa ghi nhận điểm chặn trên tuyến đường liên thôn',
        'No blockage recorded on inter-village road',
        'Phân tích mạng đường · 09:31',
        'Network analysis · 09:31'
      ],
      [
        'Chưa có xác nhận toàn tuyến theo phương tiện cơ giới',
        'No end-to-end motor vehicle verification',
        'Cần kiểm tra trước khi điều động',
        'Verification required prior to dispatch'
      ]
    ],
    projected: { x: 407500, y: 2396500 }
  }
];

export const initialHazards: Hazard[] = [
  {
    id: 'LS-01',
    kind: 'landslide',
    area: 4.8,
    src: ['Ảnh radar Sentinel-1 SAR', 'Sentinel-1 SAR imagery'],
    detected: '07:05 29/09/2026',
    projected: { x: 396800, y: 2396800 }
  },
  {
    id: 'LS-02',
    kind: 'landslide',
    area: 7.2,
    src: ['Hiện trường 07:40 · SAR 06:12', 'Field 07:40 · SAR 06:12'],
    detected: '07:40 29/09/2026',
    projected: { x: 403000, y: 2401500 }
  },
  {
    id: 'LS-03',
    kind: 'landslide',
    area: 3.1,
    src: ['Phân tích SAR · 07:05', 'SAR analysis · 07:05'],
    detected: '07:05 29/09/2026',
    projected: { x: 394200, y: 2401800 }
  },
  {
    id: 'U-1',
    kind: 'landslide',
    area: 1.5,
    src: ['Tin hiện trường · 08:58', 'Field report · 08:58'],
    detected: '08:58 29/09/2026',
    projected: { x: 401500, y: 2403500 }
  },
  {
    id: 'B-2',
    kind: 'bridge',
    area: 0.8,
    src: ['Tin hiện trường · 03:55', 'Field report · 03:55'],
    detected: '03:55 29/09/2026',
    projected: { x: 395000, y: 2401000 }
  }
];

export const initialRoadSegments: RoadSegment[] = [
  {
    id: 'E1',
    ref: ['Đường trục chính NR-18 (Đoạn 1)', 'Main Highway NR-18 (Seg 1)'],
    cls: 'primary',
    len: 4.2,
    status: 'open',
    fromKm: 0.0,
    toKm: 4.2,
    points: [
      { x: 399500, y: 2397000 },
      { x: 400800, y: 2398500 },
      { x: 402000, y: 2400000 }
    ]
  },
  {
    id: 'E8',
    ref: ['Đường trục chính NR-18 (Điểm sạt lở)', 'Main Highway NR-18 (Landslide Cut)'],
    cls: 'primary',
    len: 3.6,
    status: 'blocked',
    hz: 'LS-02',
    note: [
      'Đất đá sạt lở taluy dương vùi lấp 80m mặt đường tại Km 6+200',
      'Landslide covered 80m of roadway at Km 6+200'
    ],
    fromKm: 4.2,
    toKm: 7.8,
    points: [
      { x: 402000, y: 2400000 },
      { x: 403000, y: 2401500 },
      { x: 404200, y: 2403000 }
    ]
  },
  {
    id: 'E9',
    ref: ['Đường trục chính NR-18 vào Nậm Khắt', 'Main Highway NR-18 to Nậm Khắt'],
    cls: 'primary',
    len: 2.8,
    status: 'open',
    fromKm: 7.8,
    toKm: 10.6,
    points: [
      { x: 404200, y: 2403000 },
      { x: 405500, y: 2404500 }
    ]
  },
  {
    id: 'E12',
    ref: ['Đường sườn núi PR-7 (Đoạn sườn nam)', 'Ridge Road PR-7 (South Flank)'],
    cls: 'secondary',
    len: 5.5,
    status: 'open',
    fromKm: 0.0,
    toKm: 5.5,
    points: [
      { x: 399500, y: 2397000 },
      { x: 399800, y: 2399500 },
      { x: 400500, y: 2401800 }
    ]
  },
  {
    id: 'E13',
    ref: ['Đường sườn núi PR-7 (Qua khe U-1)', 'Ridge Road PR-7 (Gully Crossing U-1)'],
    cls: 'secondary',
    len: 2.7,
    status: 'uncertain',
    hz: 'U-1',
    note: [
      'Có tin báo đất đá tại chỗ vượt khe; chưa xác nhận xe bán tải đi qua được',
      'Debris reported at gully crossing; 4WD vehicle passage unconfirmed'
    ],
    fromKm: 5.5,
    toKm: 8.2,
    points: [
      { x: 400500, y: 2401800 },
      { x: 401500, y: 2403500 },
      { x: 403200, y: 2404000 }
    ]
  },
  {
    id: 'E14',
    ref: ['Đường liên xã vào Nậm Khắt', 'Inter-commune Road to Nậm Khắt'],
    cls: 'secondary',
    len: 2.9,
    status: 'open',
    fromKm: 8.2,
    toKm: 11.1,
    points: [
      { x: 403200, y: 2404000 },
      { x: 404500, y: 2404200 },
      { x: 405500, y: 2404500 }
    ]
  },
  {
    id: 'E3',
    ref: ['Đường tỉnh lộ vào Khau Mang (Qua cầu B-2)', 'Road to Khau Mang (Bridge B-2)'],
    cls: 'secondary',
    len: 6.8,
    status: 'uncertain',
    hz: 'B-2',
    note: [
      'Cầu ngập sâu 0.6m lúc rạng sáng, dòng chảy xiết',
      'Bridge submerged 0.6m at dawn, fast-moving flow'
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
    ref: ['Đường mòn T-5 qua Lao Mải', 'Mountain Track T-5 to Lao Mải'],
    cls: 'track',
    len: 5.2,
    status: 'uncertain',
    note: [
      'Đường cấp phối sỏi đá dốc >18%, trơn trượt sau mưa lớn',
      'Unpaved mountain track with grade >18%, slippery post-rain'
    ],
    points: [
      { x: 399500, y: 2397000 },
      { x: 397500, y: 2396500 },
      { x: 395000, y: 2396000 }
    ]
  }
];

export function buildScenarioRoutes(segments: RoadSegment[]): Map<string, { candidate: ScenarioRoute; direct: ScenarioRoute | null }> {
  const segMap = new Map(segments.map((s) => [s.id, s]));

  const segE1 = segMap.get('E1')!;
  const segE8 = segMap.get('E8')!;
  const segE9 = segMap.get('E9')!;
  const segE12 = segMap.get('E12')!;
  const segE13 = segMap.get('E13')!;
  const segE14 = segMap.get('E14')!;
  const segE3 = segMap.get('E3')!;
  const segE5 = segMap.get('E5')!;

  const directNK: ScenarioRoute = {
    id: 'RT-NK-DIRECT',
    type: 'direct',
    communityId: 'NK',
    name: ['Đường chính NR-18 trực tiếp', 'Direct Highway NR-18'],
    lengthKm: 10.6,
    status: 'blocked',
    segs: [segE1, segE8, segE9],
    points: [...segE1.points, ...segE8.points.slice(1), ...segE9.points.slice(1)]
  };

  const candidateNK: ScenarioRoute = {
    id: 'RT-NK-CANDIDATE',
    type: 'candidate',
    communityId: 'NK',
    name: ['Tuyến đề xuất sườn núi PR-7', 'Suggested Ridge Route PR-7'],
    lengthKm: 11.1,
    status: segE13.status === 'blocked' ? 'blocked' : 'uncertain',
    segs: [segE12, segE13, segE14],
    points: [...segE12.points, ...segE13.points.slice(1), ...segE14.points.slice(1)]
  };

  const routes = new Map<string, { candidate: ScenarioRoute; direct: ScenarioRoute | null }>();
  routes.set('NK', { candidate: candidateNK, direct: directNK });

  // Other communities fallback routes
  routes.set('KM', {
    candidate: {
      id: 'RT-KM-CANDIDATE',
      type: 'candidate',
      communityId: 'KM',
      name: ['Tuyến qua cầu B-2', 'Route via Bridge B-2'],
      lengthKm: 6.8,
      status: segE3.status,
      segs: [segE3],
      points: segE3.points
    },
    direct: null
  });

  routes.set('LM', {
    candidate: {
      id: 'RT-LM-CANDIDATE',
      type: 'candidate',
      communityId: 'LM',
      name: ['Đường mòn T-5', 'Track T-5'],
      lengthKm: 5.2,
      status: segE5.status,
      segs: [segE5],
      points: segE5.points
    },
    direct: null
  });

  routes.set('NL', {
    candidate: {
      id: 'RT-NL-CANDIDATE',
      type: 'candidate',
      communityId: 'NL',
      name: ['Tuyến tránh vùng trũng', 'Riparian Bypass Route'],
      lengthKm: 5.8,
      status: 'uncertain',
      segs: [segE1],
      points: [{ x: 399500, y: 2397000 }, { x: 402000, y: 2398000 }, { x: 404000, y: 2398500 }]
    },
    direct: null
  });

  routes.set('PH', {
    candidate: {
      id: 'RT-PH-CANDIDATE',
      type: 'candidate',
      communityId: 'PH',
      name: ['Đường đèo Púng Hốc', 'Púng Hốc Pass Road'],
      lengthKm: 8.5,
      status: 'uncertain',
      segs: [segE12],
      points: [{ x: 399500, y: 2397000 }, { x: 399800, y: 2401000 }, { x: 398000, y: 2405000 }]
    },
    direct: null
  });

  routes.set('TP', {
    candidate: {
      id: 'RT-TP-CANDIDATE',
      type: 'candidate',
      communityId: 'TP',
      name: ['Tuyến vòng phía tây', 'Western Perimeter Route'],
      lengthKm: 7.9,
      status: 'uncertain',
      segs: [segE3],
      points: [{ x: 399500, y: 2397000 }, { x: 395000, y: 2398000 }, { x: 392000, y: 2399000 }]
    },
    direct: null
  });

  routes.set('HC', {
    candidate: {
      id: 'RT-HC-CANDIDATE',
      type: 'candidate',
      communityId: 'HC',
      name: ['Đường liên thôn Háng Cơ', 'Háng Cơ Village Road'],
      lengthKm: 8.2,
      status: 'open',
      segs: [segE1],
      points: [{ x: 399500, y: 2397000 }, { x: 403000, y: 2396800 }, { x: 407500, y: 2396500 }]
    },
    direct: null
  });

  return routes;
}
