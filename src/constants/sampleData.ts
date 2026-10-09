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
    name: 'Mẫu 1: Phiếu xuất kho ONT & Wifi Mesh (Ảnh chụp/Text biên bản)',
    type: 'PXK',
    text: `HỆ THỐNG QUẢN LÝ VẬT TƯ THIẾT BỊ QLVT-TB
TRUNG TÂM ĐIỀU HÀNH THÔNG TIN - PHÂN XƯỞNG THIẾT BỊ
PHIẾU XUẤT KHO THIẾT BỊ SỬA CHỮA
Số chứng từ: PXK-20261009-088
Ngày lập/tiếp nhận: 09/10/2026
Đơn vị giao/nhận: Trung tâm Viễn thông 2
Cán bộ phụ trách: Nguyễn Văn Hùng
Ghi chú: Xuất kho trả thiết bị đã xử lý xong sau bảo dưỡng định kỳ quý 3.

DANH MỤC THIẾT BỊ VẬT TƯ:
1. ONT iGate GW040-H Băng tần kép | S/N: VT24H-882910 | Trạng thái: Tốt | Số PNK hoàn tất: PNK-20261007-12 | Trạng thái hiện tại: Đã xuất đi
2. Bộ phát Wifi Mesh iGate EW12SX | S/N: MESH12S-772819 | Trạng thái: Tốt | Số PNK hoàn tất: PNK-20261007-12 | Trạng thái hiện tại: Đã xuất đi
3. ONT GPON iGate GW020 | S/N: VT20G-993812 | Trạng thái: Hỏng | Số PNK hoàn tất:  | Trạng thái hiện tại: Đang sửa chữa
4. Adapter 12V-1.5A iGate | S/N: ADP-VT-4421 | Trạng thái: Tốt | Số PNK hoàn tất: PNK-20261007-12 | Trạng thái hiện tại: Đã xuất đi`,
  },
  {
    name: 'Mẫu 2: Biên bản tiếp nhận thu hồi thiết bị hỏng (PNK)',
    type: 'PNK',
    text: `TRUNG TÂM MẠNG LƯỚI NGOẠI VI
BIÊN BẢN BÀN GIAO TIẾP NHẬN THIẾT BỊ SỬA CHỮA
Số phiếu: PNK-20261009-105
Ngày tiếp nhận: 2026-10-09
Đơn vị giao: Đội Điều hành Ngoại vi số 4
Người tiếp nhận: Trần Anh Tuấn
Nội dung: Tiếp nhận vật tư hỏng do sét đánh lan truyền tuyến cáp nhánh 5.

Chi tiết vật tư:
- Mã VT: ONT-GW040H - Tên: ONT iGate GW040-H - S/N: SN-GW040-332901 - Kết quả: Lỗi - Tình trạng: Đang sửa chữa
- Mã VT: MESH-EW12SX - Tên: Bộ phát Wifi Mesh EW12SX - S/N: SN-EW12-554109 - Kết quả: Tốt - PNK hoàn tất: PNK-20261009-105 - Tình trạng: Đã nhập kho
- Mã VT: SW-CISCO-2960 - Tên: Switch Cisco Catalyst 2960 - S/N: FCW2138L0AA - Kết quả: Lỗi - Tình trạng: Đang sửa chữa`,
  },
  {
    name: 'Mẫu 3: Phiếu Gửi/Mượn máy móc thi công cáp quang',
    type: 'GUI_MUON',
    text: `ĐỘI ỨNG CỨU SỰ CỐ
GIẤY ĐỀ NGHỊ GỬI MƯỢN THIẾT BỊ THI CÔNG
Số hiệu: GM-20261009-019
Ngày mượn: 09/10/2026
Bên mượn: Phân xưởng Đo kiểm & Sửa chữa Thiết bị số 3
Cán bộ nhận bàn giao: Phạm Minh Đức
Ghi chú: Mượn phục vụ thi công tuyến cáp trục liên xã khẩn cấp.

Danh sách:
1. COMWAY-C6 | Máy hàn cáp quang Comway C6 kèm pin | Serial: CMW6-778899 | Trạng thái: Tốt | Số PNK: PNK-GM-99 | Trạng thái hiện tại: Đã xuất đi
2. FC-6S-CLEAVER | Dao cắt sợi quang Sumitomo FC-6S | Serial: SMT-FC6S-1122 | Trạng thái: Tốt | Số PNK: PNK-GM-99 | Trạng thái hiện tại: Đã xuất đi`,
  },
];
