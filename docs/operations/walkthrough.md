# Luồng trình diễn DEAR

Cập nhật: 2026-10-05. Thời lượng: sáu phút. Dữ liệu Chế Tạo hiện là mô phỏng, chưa dùng để điều phối thực địa.

Mở đầu: “This walkthrough uses a prepared, synthetic incident to demonstrate access assessment and rescue prioritisation.”

| Thời gian | Thao tác | Nội dung trình bày bằng tiếng Anh |
|---|---|---|
| 00:00–00:40 | Sự kiện, thời điểm và AOI | Rainfall triggers an assessment. The map shows the assessment area and information available at 09:31. Terrain coverage is separate from the assessment boundary. |
| 00:40–01:30 | Chọn Nậm Khắt trong địa bàn ưu tiên | A blocked access road and lost contact place Nậm Khắt at high priority. The panel explains the reason and the next check. Priority does not prove isolation. |
| 01:30–02:30 | Tab Tuyến, chọn đường chính rồi đường vòng | The main road is blocked. The mountain bypass includes an unverified gully crossing. Its 40 to 85 minute estimate assumes passage and excludes inspection or clearance. |
| 02:30–03:20 | Mở đoạn vượt khe và bản ghi nguồn | We can trace the road status to an observation, its receipt time and its limitations. The operator must verify the crossing before using the route. |
| 03:20–04:20 | Chuông, Xem chi tiết, Cập nhật bản đồ | Reading a report does not change the map. Applying the 09:45 report recalculates access. Both known routes now contain blocked sections, so the travel estimate is removed. |
| 04:20–05:10 | Mốc dữ liệu trên header, xem bản ban đầu rồi về bản mới | Each view keeps road status, evidence and route assessment together. Reviewing the earlier map does not discard the accepted report. |
| 05:10–06:00 | Lưu đánh giá, PNG hoặc In / lưu PDF | The output preserves the selected route, timestamp, sources and unresolved checks. GeoJSON is available for GIS review. The application supports a decision; it does not authorise deployment. |

| Khi được hỏi thêm | Cách trình diễn |
|---|---|
| Địa hình | Chọn tuyến, mở mặt cắt, đổi 3D/2D. Độ dốc DEM không thay độ dốc mặt đường khảo sát |
| So ảnh | Chỉ mở khi có cặp GeoTIFF trước/sau với nguồn và thời gian phù hợp. Không trình bày ảnh kiểm thử như bằng chứng thiên tai |
| Hạ cánh | H là vị trí đề xuất, chưa khảo sát hoặc chấp thuận sử dụng |
| Mất mạng/lỗi 3D | Dữ liệu cục bộ tiếp tục chạy. 2D không cần WebGL. Nguồn ngoài phạm vi ảnh cục bộ không được suy diễn |
| Lặp lại demo | Cài đặt → Đặt lại phiên làm việc |

Trước buổi trình diễn, thử trên máy trình chiếu và duyệt nội dung với RS/PO. Cách chạy: [gói offline](offline.md). Cách tính: [phân tích ứng phó](../architecture/response-analysis.md). [Kịch bản ngày 03/10](demo.md) giữ để đối chiếu buổi trước.
