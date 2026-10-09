export type LoaiChungTu = 'PXK' | 'PNK' | 'GUI_MUON';

export type TrangThaiSauSua = 'TOT' | 'HONG' | 'LOI';

export type TrangThaiHienTaiPreset = 'DANG_SUA_CHUA' | 'DA_NHAP_KHO' | 'DA_XUAT_DI';

export interface ChiTietVatTu {
  id: string;
  maVT: string;
  tenVT: string;
  serialNumber: string;
  trangThaiSauSua: TrangThaiSauSua;
  soPNKHoanTat: string;
  trangThaiHienTai: string; // Có thể chọn preset hoặc nhập tự do
  ghiChuVatTu?: string;
}

export interface PhieuGiaoDich {
  id: string;
  soChungTu: string;
  loaiChungTu: LoaiChungTu;
  ngayTiepNhan: string; // YYYY-MM-DD
  donViLienQuan: string;
  canBoTiepNhan: string;
  ghiChu: string;
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
