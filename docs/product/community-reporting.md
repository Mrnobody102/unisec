# Ghi nhận hiện trường và hai vai trò demo

Mục tiêu: người dân gửi ảnh tại nơi họ đang quan sát; điều phối viên kiểm tra nguồn, vị trí và nội dung trước khi dùng làm căn cứ. Đây là phần bổ sung đầu vào thực địa cho chuỗi tình huống, phân tích, kiểm tra và công bố trong proposal. Không thay luồng ứng phó chính.

## Quyền và trách nhiệm

| Thao tác | Người dân | Điều phối ứng phó |
|---|---|---|
| Xem tình trạng đường và chọn hành trình | Có | Có |
| Gửi ảnh tại nơi cư trú hoặc khu vực khác | Có | Có |
| Bổ sung ghi nhận | Ghi nhận của mình đang chờ kiểm tra hoặc cần bổ sung | Mọi hồ sơ trong phiên demo |
| Xem ảnh của người khác | Không có trong màn người dân | Có trong Ghi nhận gửi đến |
| Kiểm tra ghi nhận, yêu cầu bổ sung, không sử dụng | Không | Có, kèm nhận xét |
| Khoanh vùng nghi ảnh hưởng và quản lý GIS | Không | Có |
| Đổi tên địa bàn và đoạn đường | Không | Có, giữ ID và dữ liệu gốc |
| Thay bản đánh giá đường chính thức | Không | Qua bước cập nhật riêng của tình huống prepared |

Đăng nhập là lựa chọn vai trò mô phỏng. Tên hiển thị nhận diện người thử trong cùng trình duyệt, không phải xác thực. Có thể vào nhanh màn điều phối bằng `?demoRole=manager`; đây không phải token. Dữ liệu lưu tại trình duyệt, không có máy chủ nhận ảnh, đồng bộ giữa thiết bị hoặc bảo vệ tài khoản thật. Quét QR trên hai điện thoại tạo hai phiên độc lập.

## Form ngắn, dữ liệu có nguồn

1. Thêm ảnh. JPEG, PNG, WebP, AVIF, HEIC/HEIF được đọc tại máy. HEIC tải bộ giải mã khi cần; ảnh gốc giữ tên, kích thước, metadata và checksum, ảnh hiển thị là JPEG thu nhỏ.
2. Kiểm tra vị trí. Ưu tiên GPS trong ảnh nếu người dùng chưa chọn nơi khác; có thể lấy vị trí thiết bị, chạm bản đồ hoặc mở ô nhập tọa độ. Vị trí máy ảnh có thể khác nơi xảy ra hiện tượng.
3. Gửi ghi nhận. Chỉ cần ảnh hoặc mô tả và vị trí hợp lệ. Loại ghi nhận, mô tả, người ghi nhận và giờ chụp không bắt nhập hết. Trường bổ sung thu gọn mặc định.

Giờ chụp đọc từ EXIF khi có. Không lấy ngày sửa tệp làm ngày chụp, không tự suy múi giờ của máy ảnh. Thời điểm gửi được lưu riêng. Sai số lấy từ thiết bị khi dùng định vị, không yêu cầu người dân đoán. Không có metadata không đồng nghĩa ảnh giả; thông tin cần kiểm tra vẫn được lưu là chưa biết.

Cách lấy EXIF được tham khảo từ [Survey123 media questions](https://doc.arcgis.com/en/survey123/create/main/xlsformmedia.htm). Đây là dữ liệu hỗ trợ đối chiếu, không phải bằng chứng xác thực tuyệt đối. Điều phối viên đọc ảnh, thời gian, GPS và mô tả rồi ghi kết quả: Đã kiểm tra, Cần bổ sung hoặc Không sử dụng. Kết quả này không tự biến thành trạng thái đường hoặc vùng sạt lở đã xác nhận.

## Điểm, vùng và tên

- ID đầy đủ là UUID, giữ liên kết giữa điểm, ảnh và vùng khoanh. Mã ngắn `GN-XXXXXXXX` chỉ để nhận biết trên giao diện; không dùng thay khóa dữ liệu.
- Tên trong KML/GeoJSON được giữ theo nguồn. Tên hiển thị được sửa riêng; không đổi ID, tọa độ hoặc tên tệp gốc.
- Tên mới nên mô tả địa điểm hoặc nội dung quan sát: “Đất đá trên đường vào Nậm Khắt”. Không bắt người dân chọn đúng phân loại chuyên môn trước khi gửi.
- Vùng khoanh thủ công gắn vào điểm là vùng nghi ảnh hưởng, không phải sản phẩm phát hiện tự động hoặc AOI phân tích.

[GeoJSON RFC 7946](https://www.rfc-editor.org/rfc/rfc7946.html#section-3.2) quy định định danh Feature có thể là chuỗi hoặc số; không quy định một mẫu tên điểm hiện trường dùng chung toàn cầu. `GN-...` là quy ước của demo, không được giới thiệu là chuẩn quốc tế.

## GIS và hành trình

GIS là công cụ trong DEAR: giữ header chung, danh sách bên trái, hồ sơ được chọn bên phải. Ở màn hẹp, hồ sơ thay danh sách và có nút quay lại. Có lọc theo tên/tệp, ẩn hoặc hiện nhóm, chọn nhiều để xóa và hoàn tác; xóa điểm bao gồm ảnh và vùng liên quan.

AOI có tên sửa được. Khi sửa ranh giới, đường viền đi theo điểm đang kéo; tay nắm ở giữa di chuyển toàn vùng. Hút vào điểm gần là hỗ trợ đặt đỉnh khớp điểm đã có. Bản nháp chỉ lưu khi Áp dụng; Hủy và Hoàn tác giữ vai trò rõ ràng.

Công cụ hình tuyến đường chọn hai điểm bất kỳ trên mạng đường đã có, hoặc chọn điểm tập kết, địa bàn và đối tượng GIS. Điểm ngoài đường nối tới vị trí gần nhất trong phạm vi 5 km để tham chiếu; khoảng cách thẳng tới đường hiển thị riêng và không cộng vào chiều dài hành trình. Đoạn nối này không phải đường đã khảo sát. Khoảng cách tính dọc các đoạn nối được; không tự nối đường giao nhau trên hình nhưng thiếu kết nối trong dữ liệu. Mặt cắt dùng DEM hiện có, có giới hạn phủ và độ phân giải. Chưa ghi nhận bị chặn không xác nhận đường an toàn.

## Khi triển khai dùng chung

Cần xác thực thật, API tiếp nhận, kho ảnh gốc riêng tư, cơ sở dữ liệu điểm/vùng, phân quyền ở server và lịch sử xét duyệt. Chỉ công bố thông tin đã được người có quyền duyệt; dữ liệu cá nhân và ảnh gốc không mặc định công khai. Phần này thuộc EO Platform/DEAR vận hành, chưa có trong bản web tĩnh.
