# Gói demo offline

Gói Windows x64 dùng trên laptop cá nhân, không cần Node.js, Python cài sẵn hoặc Internet. Cần Chrome/Edge và tăng tốc đồ họa để xem 3D, xuất MP4. Dữ liệu nghiệp vụ demo vẫn có phần mô phỏng/chưa duyệt; nguồn ảnh và dữ liệu đo đạc được giữ riêng.

## Mở tại buổi thi

1. Giải nén **toàn bộ** `DEAR-Offline-Windows-x64.zip` vào thư mục có quyền ghi trên ổ máy, không chạy bên trong ZIP.
2. Mở `Start-DEAR.cmd`. Launcher kiểm tra SHA-256 toàn bộ tệp rồi mở cửa sổ Chrome/Edge với hồ sơ riêng của gói, mặc định **English** ở lần mở đầu; sau đó nhớ lựa chọn **English/Tiếng Việt** trong **Settings → Language**. Chọn **Response coordinator → Enter app** để trình diễn điều phối, hoặc **Resident** để gửi ghi nhận.
3. Nếu trình duyệt không tự mở, vào `http://127.0.0.1:5212/`. Giữ cửa sổ server đang chạy; Ctrl+C để dừng.
4. Nếu cổng đang được chương trình khác dùng, chạy `powershell -ExecutionPolicy Bypass -File .\Start.ps1 -Port 5213`. Launcher không tắt tiến trình khác.

Không mở `dist/index.html` bằng double click. Có thể mở lại launcher để quay về app đang chạy; nó chỉ nhận server cùng mã gói. Nếu checksum sai/thiếu tệp, giải nén lại từ ZIP gốc.

Trước ngày thi, thử đúng laptop và màn chiếu với Wi-Fi tắt, đóng/mở lại app rồi thực hiện luồng trình diễn. Mang ZIP và MP4 dự phòng trên USB. Giữ nguồn điện laptop, bật tăng tốc đồ họa trong Chrome/Edge. Bản Vercel vẫn là phương án online riêng.

## Phạm vi offline

| Thành phần | Nguồn và hành vi |
|---|---|
| Tình huống, tuyến, GIS, mặt cắt | Dữ liệu đóng gói; mặt cắt chỉ dùng DEM phân tích có sẵn |
| Ảnh Planet và hiện trường | Tệp gốc đã chuẩn bị kèm ngày/nguồn; có so ảnh, xem ảnh lớn |
| Nền 2D, 3D và GIS | XYZ cục bộ từ ba raster RGB Sentinel-2 có sẵn, mức zoom 7–14; không tải Esri/Google để đóng gói |
| Địa hình xung quanh | Mapzen Terrain Tiles (SRTM/GMTED2010), lưu cục bộ; chỉ để hiển thị, không đưa vào lưới phân tích |
| Ngoài vùng RGB | Hillshade trung tính từ địa hình thật; không giả ảnh vệ tinh |
| Ngoài phạm vi bản đồ đóng gói | Nền trung tính; không tự gọi Internet. Giới hạn và checksum ở `dist/offline-map/map.json` |
| Video | Hành trình 25 giây, ba vùng sạt chính, ảnh hiện trường và góc tổng quan cuối; xuất MP4 qua trình duyệt |
| Ghi nhận/GIS | Lưu trên trình duyệt của máy này, không tự đồng bộ sang máy khác; xuất dữ liệu trước khi đặt lại phiên |
| PDF | Dùng In / lưu PDF của trình duyệt |

RGB Sentinel-2 làm nền bối cảnh, không phải ảnh Planet mới nhất. Không suy luận ngày quan sát từ nền ghép hoặc dùng địa hình bối cảnh thay DEM khi đo đạc. Hồ sơ trình duyệt nằm trong `user-data/browser`; sao lưu phần này nếu cần giữ phiên làm việc.

## Tạo gói

Chạy trong `DEM_to_3D/viewer`, chọn manifest ở `public/workspace-config.json`. Máy chuẩn bị cần Node theo `.nvmrc`, Python 3.11+, rasterio/numpy/Pillow cho nền cục bộ. Chỉ máy chuẩn bị cần Internet để tải runtime chính thức và địa hình công khai. Thư mục đầu ra của `prepare_offline_map.py` phải mới/trống để tránh trộn hai phiên bản nền.

```powershell
npm ci
npm test
python -m unittest discover -s scripts -p 'test_*.py'
npm run build
python scripts/prepare_demo_runtime.py --output "$env:TEMP/dear-runtime/python-3.13.17-embed-amd64.zip"
python ../tools/prepare_offline_map.py --rgb ../che_tao_v2_tex.tif ../lao_chai_v2_tex.texture.tif ../pung_luong_v2_tex.texture.tif --output dist-release/offline-map --cache "$env:TEMP/dear-offline-elevation"
python scripts/package_workspace.py --output dist-release/DEAR-Offline-Windows-x64.zip --local-map dist-release/offline-map --runtime "$env:TEMP/dear-runtime/python-3.13.17-embed-amd64.zip"
```

Runtime tải từ python.org, xác minh SHA-256 theo bản SPDX chính thức. Giấy phép Python và thư viện được giữ trong gói. `release.json` ghi commit, trạng thái cây nguồn, dữ liệu và checksum từng tệp. Đối với gói đa nền tảng không kèm runtime/nền vùng rộng, bỏ hai tham số `--runtime` và `--local-map`; máy chạy gói đó cần Python 3.11+.

## Kiểm tra bản phát hành

Máy kiểm thử cần Python Playwright và Chrome. Kiểm tra portable phải chạy trên Windows để thực sự dùng `runtime/python.exe` trong gói:

```powershell
python scripts/check_offline_package.py dist-release/DEAR-Offline-Windows-x64.zip --chrome 'C:/Program Files/Google/Chrome/Application/chrome.exe'
python scripts/check_demo_package.py dist-release/DEAR-Offline-Windows-x64.zip --chrome 'C:/Program Files/Google/Chrome/Application/chrome.exe' --video dist-release/DEAR-hanh-trinh-25s.mp4
```

Bộ kiểm tra giải nén mới vào đường dẫn có dấu/khoảng trắng, kiểm checksum, chạy bằng runtime đi kèm từ thư mục khác, thử mở launcher hai lần, chặn Internet và xác nhận không có yêu cầu ngoài localhost. Luồng kiểm tra gồm phản ứng/PNG/reset, 2D/3D, GIS sửa/áp dụng/bỏ nháp, ảnh Planet/ảnh hiện trường và phục hồi lỗi tải, mặt cắt, camera hành trình, ảnh/ghi âm/báo cáo người dân. MP4 được giải mã để kiểm tra bản đồ chuyển động và đủ ba ảnh tương ứng.

Kiểm thử phần mềm không thay nghiệm thu dữ liệu hoặc thử phần cứng trình chiếu. Xác thực, đồng bộ nhiều máy và tiếp nhận tin thực tế thuộc giai đoạn vận hành, xem [kiến trúc](../architecture/overview.md).
