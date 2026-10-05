# Rà soát nguồn

> Trạng thái: Hiện hành · Phụ trách: PO / RS / SW · Cập nhật: 2026-09-24

## Kết quả chính

- Phạm vi demo bám S02/S03; chung kết 2026-10-26 khớp [UNISEC](https://unisec-global.org/sic.html).
- Proposal có thông số cần diễn giải lại và lỗi trích dẫn trong các bảng dưới. PDF gốc giữ nguyên.
- Nghiên cứu đã công bố chưa chứng minh chất lượng DEAR; cần kiểm tra trên dữ liệu của tình huống chọn.

## Dữ liệu và phương pháp

| Nội dung | Đối chiếu nguồn | Áp dụng cho DEAR |
|---|---|---|
| AW3D30 | Là DSM, có ảnh hưởng cây/công trình. [JAXA](https://www.eorc.jaxa.jp/ALOS/en/dataset/aw3d30/aw3d30_e.htm) | Ghi loại mô hình độ cao; không suy độ dốc mặt đường/khả năng xe đi từ DSM |
| “SAR khoảng 10 m” | Sentinel-1 IW GRD HR có pixel 10 × 10 m, độ phân giải khoảng 20 × 22 m. [ESA](https://sentiwiki.copernicus.eu/web/s1-products) | Ghi riêng pixel và độ phân giải; không dùng ngưỡng 500 m² chung cho mọi nguồn |
| Chu kỳ vệ tinh | Sentinel-1: 12 ngày/vệ tinh; phối hợp vệ tinh và lịch chụp ảnh hưởng lượt quan sát. ALOS-2: 14 ngày. [ESA](https://sentiwiki.copernicus.eu/web/s1-mission), [JAXA](https://www.eorc.jaxa.jp/ALOS-2/en/about/overview.htm) | Kiểm tra lịch chụp và thời gian nhận ảnh tại khu vực; chu kỳ không bảo đảm ảnh sẵn sau thiên tai |
| Mưa GPM | IMERG Early có độ trễ tối thiểu khoảng 4 giờ, lưới 0,1°, bước nửa giờ. [NASA](https://gpm.nasa.gov/data/imerg), [latency](https://gpm.nasa.gov/taxonomy/term/1357) | Chốt sản phẩm cụ thể; chưa coi là cảnh báo tức thời cấp thôn/xã |
| DMC / Sentinel Asia | Yêu cầu chụp khẩn cấp qua đầu mối đủ điều kiện trong mạng lưới JPT. [Sentinel Asia](https://sentinel-asia.org/e-learning/Emergency_Observation_Request.html) | Xác định DMC và quyền truy cập; chưa coi là API sẵn dùng |
| Bản đồ offline | Máy chủ tiles OSM công cộng không cho tải để dùng offline. [OSMF](https://operations.osmfoundation.org/policies/tiles/) | Tự tạo tiles hoặc dùng nguồn cho phép lưu; kiểm tra riêng ảnh và 3D |
| Khác biệt sản phẩm | Copernicus EMS đã có bản đồ thiệt hại và giao thông. [CEMS](https://mapping.emergency.copernicus.eu/about/rapid-mapping-portfolio/) | Tập trung vào cộng đồng, bằng chứng, so tuyến và bàn giao; không mô tả hệ thống khác là chỉ cung cấp ảnh thô |

## Trích dẫn cần hiệu chỉnh

| Mục trong proposal | Thông tin đối chiếu | Xử lý |
|---|---|---|
| Nava 2025, NHESS 25, 2371–2381 | Trang đúng **2371–2377**; DOI `10.5194/nhess-25-2371-2025`. [Bài gốc](https://nhess.copernicus.org/articles/25/2371/2025/) | Sửa số trang; thời gian trong bài tính từ ảnh được thu nhận, không từ lúc thiên tai xảy ra |
| Ganerød 2025, “Understanding Landslide Expression…” | Tác giả đầu **Erin Lindsay**; Remote Sensing 17(19), 3313; DOI `10.3390/rs17193313`. [Nhà xuất bản](https://www.mdpi.com/2072-4292/17/19/3313) | Sửa tác giả đầu |
| Mondini 2025, “A progressive learning approach” | **Prakash, Manconi & Mondini**; Applied Computing and Geosciences **25, 100224**; DOI `10.1016/j.acags.2025.100224`. [ETH Zürich](https://www.research-collection.ethz.ch/items/b065b005-aa2b-48e3-858e-c5bf3a237cb6) | Sửa tác giả/tạp chí; phương pháp cần nhãn ban đầu, chưa hoàn toàn tự động |
| Isya 2020, “CNN-Based Semantic Change Detection…”, CVPR Workshops | Bài gần tên nhất: **Gupta, Welburn, Watson & Yin**, ICANN **2019**; DOI `10.1007/978-3-030-30493-5_61`. [University of Manchester](https://research.manchester.ac.uk/en/publications/cnn-based-semantic-change-detection-in-satellite-imagery/) | Tác giả proposal xác nhận có đúng nguồn định trích dẫn trước khi thay |
| Hasegawa 2025, “Automatic Extraction of Road Networks…”, IEEE Access | Chưa tìm được bản ghi khớp tên/tác giả/nơi xuất bản | Cần DOI/bản gốc; chưa dùng làm căn cứ kỹ thuật |

Các mục có bản ghi phù hợp: [Coluzzi 2025](https://www.nature.com/articles/s41598-025-89542-8), [Nava 2022](https://kclpure.kcl.ac.uk/portal/en/publications/improving-landslide-detection-on-sar-data-through-deep-learning/), [Bai 2023](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2023.1287577/full), [Petricola 2022](https://link.springer.com/article/10.1186/s12942-022-00315-2). Petricola là tập 21, bài 14. Đây là kiểm tra trích dẫn, chưa tái lập kết quả nghiên cứu.

## Chưa đủ căn cứ

| Nội dung | Cần bổ sung |
|---|---|
| Sự kiện/khu vực demo | Bản tin và dữ liệu theo ngày/sự kiện; link chung tới ReliefWeb/VDDMA chưa đủ |
| Mục tiêu 3–6 giờ | Định nghĩa điểm bắt đầu/kết thúc; số đo thời gian chờ ảnh, xử lý và duyệt |
| QTT và các hợp phần S04 | Xác nhận đầu mối, đơn vị ban hành và phạm vi hợp tác; [Vingroup](https://vingroup.net/vi/linh-vuc-hoat-dong/thien-nguyen-br-xa-hoi/2476/quy-thien-tam) xác nhận hoạt động cứu trợ, chưa xác nhận vai trò vận hành cảnh báo |

Người phụ trách và việc cần làm tiếp được quản lý tại [nguồn tham chiếu](../sources.md) và [danh sách công việc](../tasks/sic-2026.md).
