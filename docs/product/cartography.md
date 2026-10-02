# Hiển thị bản đồ

Cập nhật: 2026-10-02. Quy tắc cho bản đồ ứng phó DEAR, đối chiếu proposal trang 2–3.

## Ký hiệu và tỷ lệ

| Đối tượng | Thể hiện | Điều kiện |
|---|---|---|
| Đường bị chặn | Đỏ, nét liền | Có báo cáo đoạn bị chặn |
| Đường chưa rõ | Vàng, nét đứt | Cần kiểm tra khả năng đi qua |
| Chưa ghi nhận chặn | Nét trung tính | Không suy ra là đường đi được |
| Tuyến đang xem | Xanh dương | Đoạn bị chặn/chưa rõ vẫn giữ màu cảnh báo, viền trung tính |
| Cộng đồng | Nhóm người màu xanh | Có tọa độ địa bàn |
| Cộng đồng ưu tiên | Nhóm người màu nâu vàng | Mức ưu tiên, không phải kết luận cô lập |
| Sạt lở được báo | Núi/đá màu đỏ | Báo cáo hiện trường có thời điểm |
| Nghi sạt lở | Núi/đá viền đỏ nét đứt | Nhận định chưa kiểm chứng |
| Cầu, điểm vượt khe, điểm tập kết | Ký hiệu riêng | Không dùng cùng dấu chấm than cho mọi loại điểm |

- Điểm dùng biểu tượng 28 px, không mô tả kích thước thật. Zoom làm thay đổi vị trí và mật độ nhãn, không phóng icon theo địa hình.
- Nhãn ưu tiên đối tượng đang chọn, cộng đồng ưu tiên, điểm tập kết, rồi địa danh khác. Đo độ rộng theo font thực, thử nhiều vị trí, ẩn nhãn khi không còn chỗ. Tránh đè marker, nhãn và điều khiển.
- Polygon phải bám hình học thật. Chỉ có tọa độ điểm thì không vẽ vòng tròn/ellipse giả làm phạm vi sạt lở hoặc ngập.
- Lớp bản đồ ở góc trên trái. Chú giải ở góc dưới trái, chỉ liệt kê lớp đang hiện. Bản gọn giữ tình trạng đường, lựa chọn, ưu tiên và sạt lở. Hai chức năng có nút riêng.
- Hướng N là Bắc lưới của CRS, xoay theo camera. Thước 2D biểu thị khoảng cách ngang tại tâm bản đồ, thay đổi khi zoom. Không dùng thước này cho góc nhìn nghiêng 3D.

## Địa hình dọc tuyến

| Đại lượng | Phương pháp |
|---|---|
| Khoảng cách | Cộng chiều dài các đoạn của hình tuyến trong CRS theo mét. Panel và mặt cắt dùng cùng hình học |
| Độ cao | Lấy mẫu DEM dọc hình tuyến bằng nội suy song tuyến tính trong vùng hợp lệ. Bước lấy mẫu theo kích thước ô lưới |
| Độ dốc dọc DEM | `100 × chênh cao / khoảng cách ngang` giữa hai mẫu hợp lệ liền nhau. Có dấu lên/xuống, đơn vị % |
| Tổng lên/xuống | Cộng chênh cao dương/âm. Chỉ trình bày tổng toàn tuyến khi có đủ DEM |
| Thiếu dữ liệu | Để trống đoạn biểu đồ, không nối qua nodata hoặc ngoại suy ngoài DEM. Không tính độ dốc qua khoảng thiếu |
| Tương tác | Rê chuột lên biểu đồ hoặc dùng thanh vị trí. Biểu đồ, dữ kiện tại vị trí và điểm trên bản đồ cùng đọc một mẫu |

Biểu đồ có trục độ cao (m), khoảng cách (km), vùng dưới đường và vạch vị trí. Mở mặt cắt không vẽ thêm đường xanh che tình trạng đường. Độ dốc DEM không phải độ dốc mặt đường đã khảo sát. Nguồn gốc DEM hiện chưa được xác nhận trong metadata.

## Đối chiếu Hình 2 của proposal

| Yếu tố | Hiện tại | Dữ liệu cần bổ sung |
|---|---|---|
| Ảnh nền, cộng đồng, ưu tiên, đường, phương án | Có | Xác minh tên và tọa độ trước sử dụng thực tế |
| Đường xanh lá đi được | Chưa có xác nhận | Kiểm tra hiện trường, phương tiện, thời điểm |
| Đường vàng khó đi nhưng đi được | Chưa có trạng thái này | Tách khỏi chưa rõ, có bằng chứng về khả năng đi qua |
| Vùng sạt lở và ngập | Chỉ có điểm ảnh hưởng | Polygon, vùng quan sát hợp lệ, ngày ảnh và nguồn |
| Khu cô lập | Chưa kết luận | Đủ mạng đường và điều kiện tiếp cận. Hai tuyến có đoạn bị chặn chưa chứng minh hoàn toàn cô lập |
| Bãi đáp trực thăng H | Chưa có | Vị trí, độ dốc, vật cản và đánh giá phù hợp |
| AOI và phạm vi phân tích | Chưa có ranh giới chuẩn | AOI, footprint ảnh và vùng hợp lệ. Ranh giới DEM không thay thế AOI |

## Căn cứ

| Nguồn | Phạm vi áp dụng |
|---|---|
| [QCVN 70:2022/BTNMT, bản hợp nhất có sửa đổi 2025](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/01/96-vbhn-bnnmt.pdf) | Quy chuẩn cho bản đồ địa hình quốc gia 1:50.000 và 1:100.000. Phân biệt ký hiệu theo tỷ lệ, nửa theo tỷ lệ và không theo tỷ lệ. Không coi đây là chứng nhận cho web ứng phó |
| [Mapbox: bố trí nhãn](https://docs.mapbox.com/help/dive-deeper/optimize-map-label-placement/) | Thứ tự ưu tiên, nhiều vị trí nhãn, tránh chồng lấn. Áp dụng nguyên tắc cho renderer Three.js |
| [Google Earth: mặt cắt theo đường](https://support.google.com/earth/answer/148134?hl=en) | Độ cao theo khoảng cách, đọc vị trí tương ứng trên đường |
| [UNOSAT Nepal, 01/10/2024](https://unosat.org/static/unosat_filesystem/3990/UNOSAT_A3_Natural_Protrait_FL20240928NPL_01Oct2024.pdf) | Phân biệt vùng nước theo ngày, nước thường xuyên, phạm vi phân tích, nguồn và kiểm chứng. Đây là sản phẩm khác ảnh Nepal 2026 do người dùng cung cấp |

Chưa có cơ sở xác nhận tuân thủ toàn bộ quy chuẩn Việt Nam hoặc tiêu chuẩn quốc tế. Nghiệm thu bản đồ cần kiểm tra dữ liệu, hệ tọa độ, độ chính xác và mục đích công bố, bên cạnh chất lượng giao diện.
