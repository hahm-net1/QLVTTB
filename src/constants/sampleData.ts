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

export const TRANG_THAI_HIEN_TAI_OPTIONS = [
  'Tiếp nhận mới',
  'Tạm nhận',
  'NK tốt',
  'NK hỏng',
  'Kiểm tra thêm',
];

export const SAMPLE_INITIAL_DATA: PhieuGiaoDich[] = [];

export const OCR_SAMPLE_PRESETS = [
  {
    name: 'Mẫu 1: Phiếu nhập kho (PNK chuẩn: 9325/N/26/KTTC-C1-KH04)',
    type: 'PNK',
    soChungTu: '9325/N/26/KTTC-C1-KH04',
    text: `TẬP ĐOÀN BƯU CHÍNH VIỄN THÔNG VIỆT NAM
TRUNG TÂM KỸ THUẬT & DỊCH VỤ VIỄN THÔNG
PHIẾU NHẬP KHO VẬT TƯ THIẾT BỊ
Số: 9325/N/26/KTTC-C1-KH04
Ngày 09 tháng 10 năm 2026
Vị trí kho: KTTC-C1 | Phân đoạn kho: KH04
Lý do nhập kho: Nhập thu hồi thiết bị sau sửa chữa & kiểm thử định kỳ

BẢNG KÊ DANH MỤC THIẾT BỊ VẬT TƯ:
1. Tên nhãn hiệu quy cách phẩm chất vật tư ( sản phẩm hàng hóa): ONT iGate GW040-H Băng tần kép 2.4/5GHz | Mã VT: ONT-GW040H | Serial: VNPT26H932501 | Trạng thái: Tiếp nhận mới
2. Tên nhãn hiệu quy cách phẩm chất vật tư ( sản phẩm hàng hóa): Bộ phát Wifi Mesh iGate EW12SX | Mã VT: MESH-EW12SX | Serial: MESH26E932502 | Trạng thái: Tiếp nhận mới
3. Tên nhãn hiệu quy cách phẩm chất vật tư ( sản phẩm hàng hóa): ONT GPON iGate GW020 2 Cổng | Mã VT: ONT-GW020 | Serial: GW020VN26932503 | Trạng thái: Tiếp nhận mới
4. Tên nhãn hiệu quy cách phẩm chất vật tư ( sản phẩm hàng hóa): Switch Cisco Catalyst 2960-24TC-L | Mã VT: SW-CISCO-2960 | Serial: FCW2618L932504 | Trạng thái: Tiếp nhận mới`,
  },
  {
    name: 'Mẫu 2: Phiếu xuất kho (PXK chuẩn: 14853/X/26/KTTC-C1-KH01)',
    type: 'PXK',
    soChungTu: '14853/X/26/KTTC-C1-KH01',
    text: `TẬP ĐOÀN BƯU CHÍNH VIỄN THÔNG VIỆT NAM
TRUNG TÂM KỸ THUẬT & DỊCH VỤ VIỄN THÔNG
PHIẾU XUẤT KHO THIẾT BỊ ĐIỀU PHỐI
Số: 14853/X/26/KTTC-C1-KH01
Ngày 10 tháng 10 năm 2026
Vị trí kho xuất: KTTC-C1 | Phân đoạn xuất: KH01
Ghi chú: Xuất điều phối vật tư thiết bị mạng cho tổ ứng cứu khẩn cấp

BẢNG KÊ DANH MỤC THIẾT BỊ XUẤT KHO:
1. Tên nhãn hiệu quy cách phẩm chất vật tư ( sản phẩm hàng hóa): ONT iGate GW040-H Băng tần kép 2.4/5GHz | Mã VT: ONT-GW040H | Serial: VNPT26X148531 | Trạng thái: Tiếp nhận mới
2. Tên nhãn hiệu quy cách phẩm chất vật tư ( sản phẩm hàng hóa): Bộ phát Wifi Mesh iGate EW12SX AC1200 | Mã VT: MESH-EW12SX | Serial: MESH26X148532 | Trạng thái: Tiếp nhận mới
3. Tên nhãn hiệu quy cách phẩm chất vật tư ( sản phẩm hàng hóa): Adapter nguồn 12V - 1.5A chính hãng iGate | Mã VT: ADP-12V15A | Serial: ADP26X148533 | Trạng thái: Tiếp nhận mới`,
  },
  {
    name: 'Mẫu 3: Phiếu nhập kho (PNK chuẩn: THA-KHO28-PNK9506)',
    type: 'PNK',
    soChungTu: 'THA-KHO28-PNK9506',
    text: `TẬP ĐOÀN BƯU CHÍNH VIỄN THÔNG VIỆT NAM
VIỄN THÔNG THANH HÓA - KHO 28
PHIẾU NHẬP KHO THIẾT BỊ VẬT TƯ
Số: THA-KHO28-PNK9506
Ngày 10 tháng 10 năm 2026
Kho: KHO28
Lý do nhập kho: Nhập kho thiết bị thu hồi và vật tư dự phòng kỹ thuật

BẢNG KÊ DANH MỤC THIẾT BỊ VẬT TƯ NHẬP KHO:
1. Tên nhãn hiệu quy cách phẩm chất vật tư ( sản phẩm hàng hóa): ONT iGate GW040-H Băng tần kép 2.4/5GHz | Mã VT: ONT-GW040H | Serial: VNPT26H950601 | Trạng thái: Tiếp nhận mới
2. Tên nhãn hiệu quy cách phẩm chất vật tư ( sản phẩm hàng hóa): Bộ phát Wifi Mesh iGate EW12SX AC1200 | Mã VT: MESH-EW12SX | Serial: MESH26E950602 | Trạng thái: Tiếp nhận mới
3. Tên nhãn hiệu quy cách phẩm chất vật tư ( sản phẩm hàng hóa): ONT GPON iGate GW020 2 Cổng GE | Mã VT: ONT-GW020 | Serial: GW020VN26950603 | Trạng thái: Tiếp nhận mới
4. Tên nhãn hiệu quy cách phẩm chất vật tư ( sản phẩm hàng hóa): Switch Cisco Catalyst 2960-24TC-L | Mã VT: SW-CISCO-2960 | Serial: FCW2618L950604 | Trạng thái: Tiếp nhận mới`,
  },
];
