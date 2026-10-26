export type LoaiChungTu = 'PXK' | 'PNK' | 'GUI_MUON' | 'BBBG';

export type TrangThaiSauSua = 'TOT' | 'HONG' | 'LOI';

export type TrangThaiHienTaiPreset = 'DANG_SUA_CHUA' | 'DA_NHAP_KHO' | 'DA_XUAT_DI';

export interface ChiTietVatTu {
  id: string;
  maVT: string;
  tenVT: string;
  serialNumber: string;
  soLuong?: number; // Số lượng (mặc định 1 cho kho sửa chữa, cho phép > 1 cho kho Lab)
  trangThaiSauSua: TrangThaiSauSua;
  soPNKHoanTat: string;
  trangThaiHienTai: string; // Có thể chọn preset hoặc nhập tự do
  ghiChuVatTu?: string;
  privateNote?: string; // Ghi chú riêng tư (mã hóa client-side với mã PIN của người dùng khi lưu Firestore)
  isLab?: boolean; // Vật tư thuộc Kho Lab (khi nhập ghi chú có từ khóa ẩn #lab)
  updatedAt?: string;
}

export interface PhieuGiaoDich {
  id: string;
  soChungTu: string;
  loaiChungTu: LoaiChungTu;
  ngayTiepNhan: string; // YYYY-MM-DD
  donViLienQuan: string;
  canBoTiepNhan: string;
  ghiChu: string;
  privateNote?: string; // Ghi chú riêng tư cấp phiếu (nếu có)
  isLab?: boolean; // Đánh dấu phiếu thuộc Kho Lab (nhập liệu trong suốt qua từ khóa #lab trong ghi chú)
  danhSachVatTu: ChiTietVatTu[];
  createdAt: string;
  updatedAt: string;
}

export interface ThietBiMau {
  maVT: string;
  tenVT: string;
  loai: string;
  donViTinh: string;
}

export interface AIOCRExtractResult {
  soChungTu?: string;
  loaiChungTu?: LoaiChungTu;
  ngayTiepNhan?: string;
  donViLienQuan?: string;
  canBoTiepNhan?: string;
  ghiChu?: string;
  viTriKho?: string;
  soPhieuGoc?: string;
  namChungTu?: string;
  phanDoanKho?: string;
  danhSachVatTu?: Array<{
    maVT?: string;
    tenVT?: string;
    serialNumber?: string;
    soLuong?: number;
    SOLUONG?: number;
    Ma_VT?: string;
    Ten_VT?: string;
    Serial_Number?: string;
    trangThaiSauSua?: TrangThaiSauSua;
    soPNKHoanTat?: string;
    trangThaiHienTai?: string;
  }>;
  confidenceScore?: number;
  extractedText?: string;
}
