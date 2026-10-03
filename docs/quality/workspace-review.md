# Rà soát giao diện và luồng ứng phó

Cập nhật: 2026-10-03. Phạm vi: web React, gói Chế Tạo v0.2 và API snapshot cục bộ. Chưa thử với người trực thực tế.

## Kết quả nghiệp vụ

| Người dùng cần biết | Đã có | Cần bổ sung |
|---|---|---|
| Sự kiện và phạm vi đánh giá | Trigger, snapshot, AOI và số địa bàn trong vùng | AOI và nguồn sự kiện được duyệt |
| Địa bàn cần ưu tiên | Quy tắc từ ảnh hưởng, liên lạc, nhu cầu khẩn cấp. Có lý do và việc cần xử lý | Duyệt chính sách, Community Isolation Score |
| Đường cản trở tiếp cận | Trạng thái đoạn, bản ghi nguồn, giờ quan sát và nhận tin | Bằng chứng gốc, kiểm tra hiện trường |
| Phương án tiếp cận | Dijkstra trên mạng đường, khoảng cách, ETA có điều kiện | Mạng đường đủ vùng, tốc độ và phương tiện được kiểm chứng |
| Tin mới thay đổi gì | Đọc không đổi dữ liệu. Áp dụng tin tạo lại đường, tuyến và ưu tiên | Feed, duyệt công bố, lưu lịch sử |
| Địa hình dọc tuyến | Mặt cắt theo hình tuyến, vị trí nối bản đồ, độ dốc DEM, khoảng thiếu | Nguồn DEM, vertical datum, kiểm chứng độ cao |
| Ký hiệu theo proposal | Địa bàn, đường, điểm ảnh hưởng, tập kết, H đề xuất | Polygon sạt lở/ngập, xác nhận đi được hoặc cô lập |
| Chia sẻ nhận định | Xem trước, PNG bản đồ 2D, JSON có phiên bản và căn cứ | Duyệt dữ liệu/nguồn, thử trên máy trình chiếu |

Ưu tiên cứu hộ không đồng nghĩa cô lập. Chưa ghi nhận chặn không đồng nghĩa đã xác nhận đi được. H là vị trí mô phỏng chưa khảo sát. Quy tắc và giả định ở [phân tích ứng phó](../architecture/response-analysis.md).

## Thiết kế hiện hành

| Thành phần | Cách tổ chức |
|---|---|
| Panel | Cố định bên trái, dùng toàn bộ chiều cao, rộng 320–560 px tùy diện tích màn hình. Chi tiết đóng về ngữ cảnh đã mở |
| Địa bàn | Tiếp cận, Tuyến, Căn cứ. Màn chính giữ trạng thái, phương án, thời gian có điều kiện và việc cần xử lý |
| Đoạn đường | Tình trạng, chiều dài, quan sát, việc cần kiểm tra và địa bàn liên quan. Bỏ phần tham chiếu chỉ có mã |
| Nguồn | Nhận định, nguồn, giờ quan sát/nhận tin, ảnh hưởng và giới hạn. Đoạn liên quan mở được từ bản ghi |
| Bản đồ | 2D mặc định, 3D tải khi cần. Nhóm điểm gần nhau, nhãn tránh chồng, chú giải tách lớp. 2D chỉ Bắc thật, 3D chỉ Bắc lưới |
| Attribution | Nút thông tin mở nguồn và giấy phép. Giữ dòng credit tối thiểu khi dùng nền ngoài |
| Tìm kiếm | Tên/mã hoặc tiếng Việt không dấu, chọn kết quả bằng bàn phím, mở chi tiết và đưa vào vùng nhìn |
| Bản xuất | Snapshot được sao chép khi mở xem trước. PNG không phụ thuộc GPU hoặc Internet |

![Tiếp cận Nậm Khắt](assets/workspace-summary.png)

![Bản ghi ảnh hưởng tại cầu](assets/workspace-evidence.png)

[Xem bản xuất PNG](assets/decision-map.png). Ảnh có cùng tuyến, thời điểm và nhận định với bản xem trước trong ứng dụng.

Ảnh từ bản build khi chặn Internet. Khoảng trống ngoài ảnh địa hình là vùng thiếu nền cục bộ, không phải vùng đã xác nhận không có thiên tai.

## Kiểm tra kỹ thuật

| Kiểm tra | Kết quả |
|---|---|
| TypeScript và build | Đạt. Gói JavaScript đầu vào còn khoảng 1,3 MB trước gzip |
| TypeScript unit tests | 99 kiểm thử đạt, gồm tìm kiếm, snapshot không giữ tham chiếu mutable, đổi tuyến và áp dụng tin |
| Python | 8 kiểm thử gói dữ liệu và 2 kiểm thử HTTP API đạt |
| Chrome: prepared và API | Sự kiện, AOI, địa bàn, tuyến, nguồn, đọc/áp dụng tin và mặt cắt đạt |
| Chrome: lỗi dữ liệu và GPU | Chặn Internet, lỗi GLB, không có WebGL, mất context 3D: 2D tiếp tục dùng được. API lỗi không hiện dữ liệu mô phỏng thay thế |
| Chrome: thao tác và bố cục | Kéo/đổi độ rộng bằng bàn phím, khôi phục độ rộng, nhóm điểm, nhãn. Desktop 1440/1366/1024 px và mobile 390/320 px không tràn ngang |
| Chrome: tìm kiếm và bản xuất | Tìm không dấu và mã đường, xem trước, tải PNG/JSON, thời điểm và tuyến khớp trước/sau tin mới |

Kiểm tra trình duyệt có thể chạy lại bằng `scripts/check_workspace.py` sau khi mở bản build qua HTTP. Cần Python Playwright và Chromium hoặc tham số `--chrome` trỏ đến Chrome đã cài.

Chưa tích hợp xử lý ảnh vệ tinh, ảnh trước/sau, xuất PDF/GIS, backend vận hành hoặc nghiệm thu dữ liệu. Chưa đo mục tiêu 3–6 giờ hay độ ổn định phiên dài. Tiến độ ở [công việc SIC](../tasks/sic-2026.md), thao tác trình diễn ở [demo](../operations/demo.md).
