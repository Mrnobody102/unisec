# Danh mục trường dữ liệu

> Trạng thái: Đề xuất · Phụ trách: SW / AI · Cập nhật: 2026-09-24

Tên trường cho schema v0.1; dùng cùng [quy tắc dữ liệu](data-contract.md). Đây là danh mục thiết kế, chưa phải JSON Schema thực thi.

## Đối tượng và trường

Mỗi đối tượng có các nhóm trường dưới đây. Dùng null kèm lý do khi chưa biết/không áp dụng; trường duyệt/công bố chỉ cần có giá trị ở trạng thái tương ứng.

| Đối tượng | Nội dung | Tên trường |
|---|---|---|
| Manifest | Định danh, phiên bản | `schemaVersion`, `scenarioId`, `datasetVersion`, `dataMode` |
| Manifest | Công bố | `publicationStatus`, `publishedAt`, `reviewedBy`, `reviewedAt` |
| Manifest | Phạm vi và file | `aoi`, `assetIndex`, `capabilities`, `limitations` |
| Source | Nguồn và quyền dùng | `id`, `title`, `provider`, `reference`, `licenseOrPermission`, `attribution` |
| Source | Thời gian, tọa độ, chất lượng | `acquiredAt`, `receivedAt`, `nativeCrs`, `pixelSpacing`, `spatialResolution`, `limitations` |
| Incident | Sự kiện | `id`, `name`, `eventTimeRange`, `aoiGeometry`, `adminBoundaryVersion`, `defaultViewBounds`, `sourceIds` |
| Layer | Nội dung hiển thị | `id`, `kind`, `group`, `temporalRole`, `assetRef`, `bounds`, `legend`, `sourceIds` |
| Layer | Thời gian và duyệt | `observedAt`, `processedAt`, `reviewStatus`, `qualityNotes` |
| Community | GeoJSON và dân số | `id`, `name`, `population`, `populationAsOf`, `populationSourceId` |
| Community | Đánh giá tiếp cận | `priorityReasons`, `accessSummary`, `claimIds`, `evidenceIds` |
| Evidence | Bằng chứng | `id`, `type`, `sourceIds`, `assetRef`, `location`, `observedAt`, `validUntil` |
| Evidence | Chất lượng và duyệt | `qualityNotes`, `reviewStatus`, `reviewedBy`, `reviewedAt` |
| Hazard | Loại, hình học, căn cứ | `id`, `kind`, `geometry`, `sourceIds`, `observedAt`, `basis`, `reviewStatus`, `evidenceIds` |
| Claim | Nhận định và căn cứ | `id`, `subjectId`, `statement`, `basis`, `evidenceIds` |
| Claim | Mức chắc chắn và duyệt | `confidence`, `confidenceRationale`, `reviewStatus`, `reviewedBy`, `reviewedAt`, `limitations` |
| RoadSegment | GeoJSON và tình trạng đường | `id`, `roadName`, `roadRef`, `roadRefAuthority`, `scenarioRoadCode`, `assessment`, `evidenceIds`, `observedAt`, `validUntil`, `vehicleMode`, `limitations` |
| ResponsePoint | GeoJSON và điểm ứng phó | `id`, `type`, `sourceIds`, `observedAt`, `status`, `capacity`, `evidenceIds` |
| Route | Tuyến | `id`, `originId`, `destinationId`, `vehicleMode`, `geometryRef`, `roadSegmentIds`, `profileRef` |
| Route | Chỉ số và duyệt | `distanceM`, `eta`, `assessment`, `claimIds`, `reviewedBy`, `reviewedAt` |
| Briefing | Bản xuất | `id`, `createdAt`, `scenarioId`, `datasetVersion`, `appVersion` |
| Briefing | Nội dung tại lúc xuất | `selection`, `viewBounds`, `layerIds`, `claimIds`, `sources`, `assumptions`, `limitations` |

`id` là khóa ổn định của đoạn đường trong dữ liệu; `roadName` là tên hiển thị; `roadRef` là số hiệu đường có nguồn xác nhận từ cơ quan quản lý (`roadRefAuthority`). `scenarioRoadCode` chỉ dùng cho dữ liệu mô phỏng, không đưa vào `roadRef`. Một phương án tiếp cận có thể đi qua nhiều đường, nên ID phương án không đồng nghĩa với số hiệu của một đường.

Trong [kiểu dữ liệu web hiện tại](../../DEM_to_3D/viewer/src/types/dear.ts), `Hazard.kind` phân biệt `landslide`, `flood`, `bridge`, `crossing`; `observation` phân biệt `suspected` và `reported`. Đây là điểm tọa độ chiếu kèm mô tả, chưa phải vùng ảnh hưởng GeoJSON. `reported` không đồng nghĩa với `field_verified` của schema đề xuất.

## File ảnh và biểu đồ độ cao

| Phần | Thông tin bắt buộc ghi lại |
|---|---|
| `assetIndex` | Đường dẫn, loại file, số byte, checksum; đường dẫn lấy từ manifest |
| Lớp ảnh | URL template, tile scheme, min/max zoom, vùng chất lượng kém; sensor, thời gian chụp, mức xử lý, footprint và cách căn chỉnh/resampling |
| Vùng nghi tác động | Phương pháp, scene IDs, processing version, hạn chế |
| Profile | Nguồn DEM/checksum, CRS, vertical datum, `heightModel`, khoảng lấy mẫu, smoothing, processing version |
| Mẫu profile | `distanceM`, `lon`, `lat`, `elevationM`, `gradePct`, `quality`; sắp theo chiều dài tăng dần |
| Tóm tắt profile | Chiều dài, tổng lên/xuống, độ dốc tuyệt đối trung bình/lớn nhất, đoạn dốc, tỷ lệ thiếu dữ liệu |
| ETA | Mô hình, phương tiện, khoảng tốc độ, chậm trễ giả định, cận dưới/trên tính bằng giây, giới hạn |

## Mốc đo thời gian

`ProcessingRun` là phần bổ sung khi đo hiệu năng xử lý. Ghi input/output IDs, pipeline version và các mốc sau; thiếu mốc thì giữ null.

| Trường | Mốc |
|---|---|
| `eventDetectedAt` | Phát hiện sự kiện |
| `imageryAcquiredAt` | Chụp ảnh |
| `imageryAvailableAt` | Nhóm nhận/truy cập được ảnh |
| `processingStartedAt` | Bắt đầu xử lý |
| `processingFinishedAt` | Xử lý xong |
| `reviewedAt` | Duyệt xong |
| `publishedAt` | Công bố bản dữ liệu |

Khi báo thời gian, nêu rõ hai mốc dùng để tính. Thời gian model chạy không bao gồm thời gian chờ ảnh và duyệt.
