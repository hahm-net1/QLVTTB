import { ThietBiMau, PhieuGiaoDich } from '../types';

export const THIET_BI_MAU: ThietBiMau[] = [
  { maVT: 'ONT-GW040H', tenVT: 'ONT iGate GW040-H Băng tần kép 2.4/5GHz', loai: 'Thiết bị đầu cuối', donViTinh: 'Chiếc' },
  { maVT: 'ONT-GW020', tenVT: 'ONT GPON iGate GW020 2 Cổng GE', loai: 'Thiết bị đầu cuối', donViTinh: 'Chiếc' },
  { maVT: 'MESH-EW12SX', tenVT: 'Bộ phát Wifi Mesh iGate EW12SX', loai: 'Thiết bị Wifi', donViTinh: 'Chiếc' },
  { maVT: 'MESH-EW12ST', tenVT: 'Bộ mở rộng sóng EW12ST AC1200', loai: 'Thiết bị Wifi', donViTinh: 'Chiếc' },
  { maVT: 'OLT-ZTE-C300', tenVT: 'Khung OLT GPON ZTE C300 10U', loai: 'Hạ tầng GPON', donViTinh: 'Khung' },
  { maVT: 'SFP-GPON-C+', tenVT: 'Module quang SFP GPON OLT Class C+', loai: 'Phụ kiện quang', donViTinh: 'Cái' },
  { maVT: 'SW-CISCO-2960', tenVT: 'Switch Cisco Catalyst 2960-24TC-L', loai: 'Thiết bị chuyển mạch', donViTinh: 'Chiếc' },
  { maVT: 'ADP-12V15A', tenVT: 'Adapter nguồn 12V - 1.5A chính hãng iGate', loai: 'Phụ kiện nguồn', donViTinh: 'Cái' },
  { maVT: 'FIBER-2FO-DROP', tenVT: 'Cáp quang thuê bao treo kim loại 2FO (Cuộn 1000m)', loai: 'Cáp quang', donViTinh: 'Cuộn' },
  { maVT: 'COMWAY-C6', tenVT: 'Máy hàn cáp quang Comway C6 kèm pin', loai: 'Dụng cụ thi công', donViTinh: 'Bộ' },
  { maVT: 'FC-6S-CLEAVER', tenVT: 'Dao cắt sợi quang chính xác Sumitomo FC-6S', loai: 'Dụng cụ thi công', donViTinh: 'Cái' },
  { maVT: 'SET-TOP-BOX-4K', tenVT: 'Đầu thu Smartbox MyTV 4K Android', loai: 'Thiết bị truyền hình', donViTinh: 'Chiếc' },
];

export const DON_VI_GOI_Y = [
  'Trung tâm Viễn thông 1',
  'Đội Điều hành Ngoại vi - TT Mạng lưới',
  'Kho Quản lý Thiết bị Tỉnh / Thành phố',
  'Phòng Điều hành Đầu tư - Chi nhánh Địa bàn',
  'Tổ Hỗ trợ Khách hàng Khu vực 2',
  'Trung tâm Điều hành Thông tin (NOC)',
  'Phân xưởng Đo kiểm & Sửa chữa Thiết bị số 3',
];

export const CAN_BO_GOI_Y = [
  'Nguyễn Văn Hùng',
  'Trần Anh Tuấn',
  'Lê Hoàng Nam',
  'Phạm Minh Đức',
  'Vũ Thị Bích Ngọc',
];

export const TRANG_THAI_HIEN_TAI_OPTIONS = [
  'Tiếp nhận mới',
  'NK tốt',
  'NK hỏng',
  'Kiểm tra thêm',
];

export const SAMPLE_INITIAL_DATA: PhieuGiaoDich[] = [];

export const OCR_SAMPLE_PRESETS = [
  {
    name: 'Mẫu 1: Phiếu nhập kho (PNK chuẩn: 9325/N/26/KTTC-C1-KH04)',
    type: 'PNK',
    text: `TẬP ĐOÀN BƯU CHÍNH VIỄN THÔNG VIỆT NAM
TRUNG TÂM KỸ THUẬT & DỊCH VỤ VIỄN THÔNG
PHIẾU NHẬP KHO VẬT TƯ THIẾT BỊ
Số: 9325/N/26/KTTC-C1-KH04
Ngày 09 tháng 10 năm 2026
Vị trí kho: KTTC-C1 | Phân đoạn kho: KH04
Đơn vị giao: Đội Điều hành Viễn thông Khu vực 1
Cán bộ kỹ thuật tiếp nhận: Nguyễn Văn Hùng
Lý do nhập kho: Nhập thu hồi thiết bị sau sửa chữa & kiểm thử định kỳ

BẢNG KÊ THIẾT BỊ VẬT TƯ NHẬP KHO:
1. ONT iGate GW040-H Băng tần kép 2.4/5GHz | Mã VT: ONT-GW040H | S/N: VNPT26H932501 | Trạng thái kỹ thuật: Tốt | Trạng thái hiện tại: NK tốt
2. Bộ phát Wifi Mesh iGate EW12SX | Mã VT: MESH-EW12SX | S/N: MESH26E932502 | Trạng thái kỹ thuật: Tốt | Trạng thái hiện tại: NK tốt
3. ONT GPON iGate GW020 2 Cổng | Mã VT: ONT-GW020 | S/N: GW020VN26932503 | Trạng thái kỹ thuật: Hỏng | Trạng thái hiện tại: NK hỏng
4. Switch Cisco Catalyst 2960-24TC-L | Mã VT: SW-CISCO-2960 | S/N: FCW2618L932504 | Trạng thái kỹ thuật: Lỗi | Trạng thái hiện tại: Kiểm tra thêm`,
  },
  {
    name: 'Mẫu 2: Phiếu xuất kho (PXK chuẩn: 14853/X/26/KTTC-C1-KH01)',
    type: 'PXK',
    text: `TẬP ĐOÀN BƯU CHÍNH VIỄN THÔNG VIỆT NAM
TRUNG TÂM KỸ THUẬT & DỊCH VỤ VIỄN THÔNG
PHIẾU XUẤT KHO THIẾT BỊ ĐIỀU PHỐI
Số: 14853/X/26/KTTC-C1-KH01
Ngày 10 tháng 10 năm 2026
Vị trí kho xuất: KTTC-C1 | Phân đoạn xuất: KH01
Đơn vị nhận: Trung tâm Viễn thông Địa bàn 2
Người nhận bàn giao: Trần Anh Tuấn
Ghi chú: Xuất điều phối vật tư thiết bị mạng cho tổ ứng cứu khẩn cấp

BẢNG KÊ DANH MỤC THIẾT BỊ XUẤT KHO:
1. ONT iGate GW040-H Băng tần kép 2.4/5GHz | S/N: VNPT26X148531 | Tình trạng: Tốt | Trạng thái hiện tại: Đã xuất đi
2. Bộ phát Wifi Mesh iGate EW12SX AC1200 | S/N: MESH26X148532 | Tình trạng: Tốt | Trạng thái hiện tại: Đã xuất đi
3. Adapter nguồn 12V - 1.5A chính hãng iGate | S/N: ADP26X148533 | Tình trạng: Tốt | Trạng thái hiện tại: Đã xuất đi`,
  },
  {
    name: 'Mẫu 3: Biên bản bàn giao thiết bị đo kiểm & hàn nối quang',
    type: 'GUI_MUON',
    text: `ĐỘI ỨNG CỨU SỰ CỐ & BẢO TRÌ TUYẾN QUANG
BIÊN BẢN BÀN GIAO GỬI MƯỢN THIẾT BỊ
Số: 1042/BBBG/26/KTTC-C1
Ngày lập: 09/10/2026
Kho xuất: KTTC-C1
Bên nhận: Phân xưởng Đo kiểm & Sửa chữa Thiết bị số 3
Cán bộ kỹ thuật phụ trách: Phạm Minh Đức
Nội dung: Mượn máy hàn quang và dao cắt phục vụ xử lý sự cố đứt cáp

DANH SÁCH THIẾT BỊ BÀN GIAO:
1. Máy hàn cáp quang Comway C6 kèm pin | S/N: CMW6-2610421 | Trạng thái: Tốt | Trạng thái hiện tại: Đã xuất đi
2. Dao cắt sợi quang chính xác Sumitomo FC-6S | S/N: FC6S-2610422 | Trạng thái: Tốt | Trạng thái hiện tại: Đã xuất đi`,
  },
];
