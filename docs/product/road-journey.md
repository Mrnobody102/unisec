# Hành trình giữa hai điểm

## Quy tắc đang chạy

A/B là hai vị trí được chọn. Giữ tọa độ gốc và mã nguồn; điểm nối vào đường là dữ liệu dẫn xuất. Khi bật **Tránh đoạn bị chặn**, cả bước tìm điểm nối và bước tính đường đều dùng các đoạn không bị chặn. Thay đổi lựa chọn này hoặc sửa hình học/trạng thái đường phải tính lại điểm nối và tuyến. Mặc định bật tránh chặn.

Điểm chọn ngoài đường được đối chiếu với mạng đã có trong phạm vi 5 km. Đây là giới hạn hiển thị/phân tích của demo, không phải sai số GPS hay xác nhận có lối đi. Các nét đứt chỉ là khoảng cách thẳng từ tọa độ gốc tới điểm nối; không đưa các nét đó vào graph và không tính chúng như đường đi đã có. Nếu không tìm được điểm nối hợp lệ, giữ vị trí vừa chọn, bỏ kết quả cũ và báo lỗi tại A/B. Preset chọn từ GIS/vùng là tọa độ tại lúc chọn; muốn chọn một vị trí mới thì chọn lại hoặc bấm lên bản đồ.

Mạng đường tình huống dùng mặt bằng UTM/WGS84, EPSG:32648, đơn vị m. Chiều dài theo hình học đường, không lấy số `len` hiển thị cũ hoặc đường thẳng nối A/B. Chế độ này tối ưu chiều dài trên mạng đủ điều kiện; đoạn cần xác minh vẫn mang trạng thái cần xác minh, không tự cộng hệ số phạt ẩn. Chính sách ưu tiên nghiệp vụ của các phương án ứng phó chuẩn bị sẵn là một luồng riêng, có hệ số bất định được khai báo trong `routingPolicy`.

Chỉ kết nối tại nút đã có trong mạng chuẩn bị. Hai đường cắt nhau trên hình không tự tạo nút giao. Dữ liệu demo hiện coi các đoạn là hai chiều, chưa mô hình hóa đường một chiều, cấm rẽ hoặc khả năng đi qua theo loại xe. Không gọi kết quả này là chỉ dẫn giao thông trực tiếp. Ngưỡng 1 mm chỉ ổn định tính toán tại đỉnh; không phải độ chính xác thực địa.

## Kết quả và nguyên nhân

- Hai tọa độ A/B trùng nhau: báo trùng vị trí.
- Hai tọa độ khác nhau nhưng cùng điểm nối vào đường: báo cùng điểm nối; không trả quãng đường A/B bằng 0 hoặc gọi hai nơi là trùng nhau.
- Chỉ có đường bị chặn trong phạm vi tìm: báo tại điểm không có kết nối đủ điều kiện.
- Mạng có đường nối nhưng tất cả phải qua đoạn bị chặn: báo rõ điều kiện tránh chặn loại toàn bộ phương án.
- Không có kết nối trong mạng kể cả khi xem đoạn bị chặn: báo thiếu kết nối trong dữ liệu. Không suy ra hai vị trí bị cô lập ngoài thực tế.
- Có tuyến: hiển thị độ dài phần theo đường và trạng thái của các đoạn. Khoảng cách thẳng A tới đường/đường tới B nằm riêng; không có một số tổng giả định cho toàn hành trình ngoài đường.

Các đoạn cắt giữ `sourceRoadId` trỏ tới đoạn gốc. Bộ vẽ 2D/3D tô chính hình học được chọn, giữ trạng thái chặn/cần xác minh; click đoạn cắt mở đoạn gốc. Không tô toàn bộ đoạn nguồn khi chỉ chọn một phần.

GIS Point giữ nguyên vị trí. Polygon/MultiPolygon/LineString dùng một **điểm đại diện** nằm trên đối tượng, có nhãn rõ trong danh sách; không lấy trung bình đỉnh có thể nằm ngoài vùng/đường. Tới điểm đại diện không đồng nghĩa đã xác nhận tiếp cận toàn khu vực.

**Xem A, B và tuyến** tính khung nhìn gồm hai vị trí, điểm nối và hình học tuyến, có chừa chỗ cho panel. Trên điện thoại nút này thu gọn chi tiết; mở rộng để sửa A/B. Thu gọn không xóa tuyến. Một yêu cầu fit cũ không tác động khi đã đóng hành trình.

## Đối chiếu và kiểm thử

[QGIS network analysis](https://docs.qgis.org/3.44/en/docs/user_manual/processing_algs/qgis/networkanalysis.html) tách giới hạn khoảng cách điểm–mạng, topology tolerance, chiến lược ngắn nhất/nhanh nhất và hướng di chuyển. [Turf pointOnFeature](https://turfjs.org/docs/api/pointOnFeature) cung cấp điểm nằm trên đối tượng. Các giới hạn và chính sách riêng của demo phía trên là lựa chọn sản phẩm, không phải một tiêu chuẩn quốc tế mặc định.

Case hồi quy chính: A `21.74276, 104.05581`, B `21.72291, 104.08018`. Mã cũ nối B vào E8 bị chặn, cách đầu E9 khoảng 19 m, rồi báo không có tuyến. Khi tránh chặn, bản sửa nối B vào E9 và tính tuyến qua phần E13, E14, E9: khoảng 4,95 km trên đường. Hai vị trí gốc và các đoạn nối thẳng ngoài đường vẫn giữ riêng. Dữ liệu nền là tình huống demo, không phải xác nhận hiện trạng thiên tai.

Kiểm thử thuần trong `journeyAnalysis.test.ts`, `selectedRoadJourney.test.ts`, `journeyPlaces.test.ts`, `routeRoadDisplay.test.ts`; kiểm thử trình duyệt trong `scripts/check_route_logic.py` và luồng người dân/điều phối hiện có.

Đóng công cụ, đổi A/B, xóa điểm hoặc nhấn Escape đều hủy chế độ chọn điểm. Các điều khiển bản đồ, overview và popup không được coi là tọa độ A/B khi người dùng đang chọn điểm.
## Tuyến Mù Cang Chải – Chế Tạo và yêu cầu ảnh

Phạm vi cần bao phủ cả đường từ Mù Cang Chải đến Chế Tạo, không dừng tại ranh giới xã. Điểm giải đoán bắt buộc là **21.74146° N, 104.03000° E**, lưu GeoJSON theo thứ tự `[104.03, 21.74146]`. Tuyến đi tiếp tới khu vực trung tâm xã Chế Tạo; điểm yêu cầu ảnh không phải điểm kết thúc. GeoTIFF đầu ra phải có pixel hợp lệ tại điểm này; bbox/footprint và ảnh KML nhúng dạng placeholder không chứng minh đủ ảnh. Chưa chốt ngày ảnh/cảm biến thì không tự điền.

Lớp tham chiếu `public/scenarios/che-tao/reference/mcc-chetao.geojson` giữ hình học OSM tới khu vực bản Chế Tạo (GeoNames 8526472, `[104.03196, 21.72206]`), mã node/way, phiên bản nguồn và sai lệch hai đầu. AOI ảnh đệm 500 m được tính trong EPSG:32648, là phạm vi đặt yêu cầu, không phải vùng sạt lở. Tạo lại bằng QGIS Python: `scripts/prepare_reference_corridor.py --osm <north.osm> <centre.osm> <south.osm> --output <corridor.geojson>`. Mốc GeoNames đại diện khu vực trung tâm, chưa xác minh tọa độ trụ sở xã. Không làm trơn hoặc nắn đường cho khớp tình huống.

Bộ 8 đoạn đường, địa bàn/dân số, sự cố và trạng thái chặn trong `v0.2/incident.json` vẫn là tình huống giả lập; lớp OSM không thay thế ngầm graph này. Không gắn các chặn đường/ETA giả lập lên đường OSM. Đường tham chiếu chưa được kiểm tra khả năng đi qua hoặc đầy đủ cấm rẽ/điều kiện phương tiện. Proposal mô tả hành trình hơn 35 km; đường tới **điểm giải đoán** chưa phải toàn tuyến đó. Cần chốt điểm cuối và đối chiếu dấu vết thực địa/ảnh trước khi dùng một mạng đường thực cho nghiệp vụ.
