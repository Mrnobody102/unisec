# Bản xuất đánh giá

Cập nhật: 2026-10-05.

| Nội dung | Quy tắc |
|---|---|
| Điểm bắt đầu | **Lưu đánh giá** trong phần Tiếp cận của chi tiết địa bàn |
| Phiên bản | Sao chép snapshot khi mở xem trước. Giữ sự kiện, phiên bản, thời điểm, tin đã áp dụng và tuyến đang chọn |
| PNG | Bố cục 2D, bản đồ và nhận định. Có đường, địa bàn, điểm ảnh hưởng, điểm ứng phó, AOI, chú giải, hướng Bắc và tỷ lệ |
| JSON | Snapshot gồm quy tắc, giả định tốc độ, hình tuyến, trạng thái đường, căn cứ và checksum tài sản địa hình |
| PDF | **Định dạng khác → In / lưu PDF**. In cùng bản đồ và nhận định đang xem trước, khổ A4 ngang. Trình duyệt lưu PDF |
| GeoJSON | **Định dạng khác → Tải GeoJSON**. AOI, đường, địa bàn, điểm ảnh hưởng, điểm ứng phó và tuyến đang chọn. Giữ trạng thái, căn cứ, thời điểm và giả định |
| Thiếu dữ liệu | Không tạo ảnh nếu thiếu nền phù hợp. JSON vẫn tải được. Tuyến bị chặn không có ETA |
| Dữ liệu mô phỏng | Ghi trạng thái trong bản xuất, không bỏ để tạo cảm giác dữ liệu đã được duyệt |

Renderer dùng ảnh cục bộ và chiếu lại sang EPSG:3857, không chụp DOM hoặc phụ thuộc WebGL/nền EOX. Tỷ lệ đo theo vĩ độ giữa bản đồ. Dữ liệu JSON giữ tọa độ nguồn EPSG:32648. Bản xuất hiện chứa toàn bộ lớp nghiệp vụ, không sao chép mức zoom hoặc trạng thái bật/tắt lớp của màn thao tác.

GeoJSON theo [RFC 7946](https://datatracker.ietf.org/doc/html/rfc7946): WGS84, thứ tự kinh độ/vĩ độ, polygon khép kín và vòng ngoài ngược chiều kim đồng hồ. Sạt lở vẫn là điểm khi chưa có polygon. PDF dùng [bản in của trình duyệt](https://developer.mozilla.org/en-US/docs/Web/API/Window/print), không gửi dữ liệu đến dịch vụ ngoài. GeoPackage chưa thuộc đầu ra hiện hành.

PNG dùng [Canvas `toBlob`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob). Mã nằm trong [features/briefing](../../DEM_to_3D/viewer/src/features/briefing/decisionSnapshot.ts). Quy tắc đánh giá tại [response-analysis.md](response-analysis.md).
