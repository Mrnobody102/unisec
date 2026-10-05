# Kế hoạch backend

Trạng thái: Đã thống nhất định hướng công nghệ, chưa triển khai hoặc chốt lịch. Cập nhật: 2026-10-05.

Ưu tiên hiện tại là [demo SIC](sic-2026.md). Bản demo tiếp tục deploy độc lập lên Vercel bằng bộ dữ liệu chuẩn bị trước. Backend được bổ sung khi cần nhập, lưu và chia sẻ dữ liệu.

## Phạm vi

| Nhu cầu | Đầu ra cần có |
|---|---|
| Báo ảnh hưởng trên bản đồ | Chọn đoạn đường/vị trí, nhập nguồn và thời gian, gửi báo cáo và xem trạng thái |
| Quản lý dữ liệu | Nhập lớp và metadata theo sự kiện, kiểm tra lỗi, xem trước |
| Phân tích | Tính tác động, tuyến và ưu tiên từ một bộ đầu vào có phiên bản |
| Kiểm tra và công bố | Đối chiếu thay đổi, lưu người kiểm tra và công bố một phiên bản thống nhất |
| Dùng chung | Nhiều người đọc cùng bản đồ, lịch sử còn nguyên sau tải lại hoặc khởi động server |

Luồng, dữ liệu và API dự kiến ở [tiếp nhận và công bố dữ liệu](../architecture/data-ingestion.md). Quy tắc thử nghiệm hiện tại ở [phân tích ứng phó](../architecture/response-analysis.md).

## Công nghệ và kiến trúc

| Thành phần | Công nghệ | Trách nhiệm |
|---|---|---|
| Frontend | Giữ React/TypeScript, Leaflet và Three.js | Bản đồ, nhập dữ liệu, xem kết quả và trạng thái |
| API nghiệp vụ | NestJS/TypeScript | Sự kiện, lớp dữ liệu, báo cáo, phân tích, công bố và quyền truy cập |
| Cơ sở dữ liệu | PostgreSQL/PostGIS | Dữ liệu dùng chung, hình học, lịch sử duyệt và phiên bản |
| Kho file | Kho object tương thích S3, chọn nhà cung cấp khi triển khai | Ảnh/DEM, file gốc và sản phẩm. DB giữ metadata/checksum |
| Worker xử lý ảnh | Python, bổ sung khi tích hợp pipeline | Job dài, phương pháp/version, kết quả và lỗi |

NestJS phù hợp với code TypeScript hiện có. Tách hàm thuần và kiểm thử tuyến/ưu tiên khỏi React để tái sử dụng. Trong chế độ API, server tính kết quả công bố và web đọc cùng phiên bản. Hợp đồng vẫn cần kiểm tra dữ liệu lúc chạy.

Căn cứ: [Nest modules](https://docs.nestjs.com/modules), [Nest validation](https://docs.nestjs.com/techniques/validation), [PostGIS](https://postgis.net/docs/ST_Intersects.html).

Không cần tách microservice cho từng module. Worker chỉ tách khi có tác vụ dài. Chưa đưa Kafka, Kubernetes hoặc hệ thống đồng bộ offline vào đợt đầu.

## Deploy và bản demo

| Chế độ | Deploy | Dữ liệu và giới hạn |
|---|---|---|
| Demo hiện tại | Một project Vite trên Vercel | Gói prepared, không cần backend/DB. Áp dụng tin và xem lịch sử trong phiên trình diễn |
| Demo có nhập/lưu dùng chung | Web trên Vercel; API NestJS có thể là project Vercel thứ hai | PostgreSQL/PostGIS và kho file bên ngoài Functions. Bổ sung sau khi chốt luồng ghi |
| Phân tích ảnh thực | Giữ web trên Vercel; API ở Vercel hoặc dịch vụ riêng, worker Python triển khai theo tài nguyên xử lý | Tác vụ ảnh qua job, không đưa vào request nhập/công bố |

Backend không bắt buộc chạy trên VPS riêng: [Vercel hỗ trợ NestJS qua Functions](https://vercel.com/docs/frameworks/backend/nestjs). Hai project là phương án quản lý deploy, không có nghĩa phải dùng hai nhà cung cấp. Có thể đưa API về đường dẫn `/api` của web bằng [rewrite](https://vercel.com/docs/routing/rewrites).

Ảnh/DEM lớn tải trực tiếp vào kho file qua URL có thời hạn, API nhận metadata và kiểm tra file. Không gửi toàn bộ raster qua Functions vì [giới hạn payload](https://vercel.com/docs/functions/limitations).

Giữ `dataSource: "prepared"` và để trống `VITE_DEAR_API_BASE` cho bản SIC. Sau này có API, bật chế độ API riêng và dùng adapter v2. Lỗi API không tự chuyển sang dữ liệu mô phỏng. Hướng dẫn hiện hành ở [deploy Vercel](../operations/vercel.md).

## Thứ tự triển khai khi bắt đầu

| Đợt | Công việc | Điều kiện hoàn thành |
|---|---|---|
| 1. Chốt nền tảng | NestJS, contract v2, migration PostGIS, seed, tài khoản và quyền | Đọc sự kiện, kiểm quyền ghi, nạp bộ mẫu và kiểm tra lỗi đầu vào |
| 2. Báo ảnh hưởng | Form theo đoạn đang chọn, lưu nguồn/thời gian, chống gửi trùng | Tải lại hoặc khởi động server vẫn còn báo cáo. Bản công bố chưa đổi |
| 3. Kiểm tra và công bố | Chấp nhận/từ chối, xem thay đổi, tính tuyến/ưu tiên, công bố nguyên tử | Hai trình duyệt nhận cùng phiên bản. Tin chưa duyệt không đổi bản đồ. Xung đột không ghi đè im lặng |
| 4. Nhập lớp và AOI | GeoJSON/metadata, phạm vi dữ liệu, yêu cầu phân tích và trạng thái | File sai hoặc vùng thiếu dữ liệu có lỗi cụ thể. Lỗi phân tích giữ bản công bố trước |
| 5. Vận hành thử | Sao lưu/khôi phục, giám sát, bản xuất và kiểm thử quyền | Khôi phục được dữ liệu. Bản đồ, căn cứ và bản xuất cùng phiên bản |

Luồng đầu tiên chỉ dùng một sự kiện và mạng đường đã chuẩn bị. GPM/DMC, SAR, điểm cô lập và điểm rủi ro là các phần tích hợp tiếp theo khi có đầu vào và phương pháp kiểm chứng.

Trước khi bắt đầu, chốt nơi deploy API/DB, dữ liệu mẫu, người kiểm tra nghiệp vụ và tiêu chí cho luồng đầu tiên. Lịch được lập riêng sau quyết định triển khai, không gắn vào mốc SIC hiện tại.
