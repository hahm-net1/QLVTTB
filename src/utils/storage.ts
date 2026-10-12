import { PhieuGiaoDich } from '../types';
import { SAMPLE_INITIAL_DATA } from '../constants/sampleData';

const STORAGE_KEY = 'vnpt_qlvttb_vouchers_clean_v2';

export function loadVouchers(): PhieuGiaoDich[] {
  try {
    // Purge old storage key if exists
    localStorage.removeItem('vnpt_qlvttb_vouchers_v1');

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveVouchers([]);
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Remove any legacy sample records
      const filtered = parsed.filter(
        (v) => v && v.id !== 'phieu-001' && v.id !== 'phieu-002' && v.id !== 'phieu-003'
      );
      if (filtered.length !== parsed.length) {
        saveVouchers(filtered);
      }
      return filtered;
    }
    saveVouchers([]);
    return [];
  } catch (e) {
    console.error('Error loading vouchers from localStorage:', e);
    return [];
  }
}

export function saveVouchers(vouchers: PhieuGiaoDich[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vouchers));
  } catch (e) {
    console.error('Error saving vouchers to localStorage:', e);
  }
}

export function saveOrUpdateVoucher(voucher: PhieuGiaoDich): PhieuGiaoDich[] {
  const current = loadVouchers();
  const existingIndex = current.findIndex((item) => item.id === voucher.id);
  let updated: PhieuGiaoDich[];
  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = {
      ...voucher,
      updatedAt: new Date().toISOString(),
    };
  } else {
    updated = [
      {
        ...voucher,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ...current,
    ];
  }
  saveVouchers(updated);
  return updated;
}

export function saveOrUpdateMultipleVouchers(vouchersToSave: PhieuGiaoDich[]): PhieuGiaoDich[] {
  const current = loadVouchers();
  const currentMap = new Map<string, PhieuGiaoDich>();
  current.forEach((v) => currentMap.set(v.id, v));

  const now = new Date().toISOString();
  vouchersToSave.forEach((v) => {
    currentMap.set(v.id, {
      ...v,
      updatedAt: now,
      createdAt: v.createdAt || now,
    });
  });

  const updated = Array.from(currentMap.values());
  saveVouchers(updated);
  return updated;
}

export function deleteVoucher(id: string): PhieuGiaoDich[] {
  const current = loadVouchers();
  const updated = current.filter((item) => item.id !== id);
  saveVouchers(updated);
  return updated;
}

export function clearAllVouchers(): PhieuGiaoDich[] {
  saveVouchers([]);
  return [];
}

export function resetToSampleData(): PhieuGiaoDich[] {
  saveVouchers(SAMPLE_INITIAL_DATA);
  return SAMPLE_INITIAL_DATA;
}

export function exportVouchersToJSON(vouchers: PhieuGiaoDich[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(vouchers, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `QLVT_DuLieu_VatTu_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function exportVouchersToCSV(vouchers: PhieuGiaoDich[], isBBBGOnly?: boolean): void {
  const isOnlyBBBG =
    isBBBGOnly !== undefined
      ? isBBBGOnly
      : vouchers.length > 0 &&
        vouchers.every((v) => v.loaiChungTu === 'BBBG' || (v.loaiChungTu as string) === 'GUI_MUON');
  const pnkHeader = isOnlyBBBG ? 'Số PNK' : 'Số PNK hoàn tất';

  const rows: string[][] = [
    isOnlyBBBG
      ? [
          'Số chứng từ',
          'Loại phiếu',
          'Ngày tiếp nhận',
          'Đơn vị liên quan',
          'Cán bộ tiếp nhận',
          'Mã VT',
          'Tên VT',
          'Serial Number (S/N)',
          'Hiện trạng',
          'Số PNK',
          'Ghi chú thiết bị',
          'Ghi chú phiếu',
        ]
      : [
          'Số chứng từ',
          'Loại phiếu',
          'Ngày tiếp nhận',
          'Đơn vị liên quan',
          'Cán bộ tiếp nhận',
          'Mã VT',
          'Tên VT',
          'Serial Number (S/N)',
          'Trạng thái sau sửa',
          pnkHeader,
          'Trạng thái hiện tại',
          'Ghi chú thiết bị',
          'Ghi chú phiếu',
        ],
  ];

  vouchers.forEach((v) => {
    const isVoucherBBBG = v.loaiChungTu === 'BBBG' || (v.loaiChungTu as string) === 'GUI_MUON';
    if (v.danhSachVatTu.length === 0) {
      rows.push(
        isOnlyBBBG
          ? [
              v.soChungTu,
              v.loaiChungTu,
              v.ngayTiepNhan,
              v.donViLienQuan,
              v.canBoTiepNhan,
              '',
              '',
              '',
              '',
              '',
              '',
              v.ghiChu,
            ]
          : [
              v.soChungTu,
              v.loaiChungTu,
              v.ngayTiepNhan,
              v.donViLienQuan,
              v.canBoTiepNhan,
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              v.ghiChu,
            ]
      );
    } else {
      v.danhSachVatTu.forEach((item) => {
        rows.push(
          isOnlyBBBG
            ? [
                v.soChungTu,
                v.loaiChungTu,
                v.ngayTiepNhan,
                v.donViLienQuan,
                v.canBoTiepNhan,
                item.maVT,
                item.tenVT,
                item.serialNumber,
                item.trangThaiHienTai || 'Tạm nhận',
                item.soPNKHoanTat || '',
                item.ghiChuVatTu || '',
                v.ghiChu,
              ]
            : [
                v.soChungTu,
                v.loaiChungTu,
                v.ngayTiepNhan,
                v.donViLienQuan,
                v.canBoTiepNhan,
                item.maVT,
                item.tenVT,
                item.serialNumber,
                isVoucherBBBG ? '' : (item.trangThaiSauSua === 'TOT' ? 'Tốt' : item.trangThaiSauSua === 'HONG' ? 'Hỏng' : item.trangThaiSauSua === 'LOI' ? 'Lỗi' : item.trangThaiSauSua || ''),
                item.soPNKHoanTat || '',
                item.trangThaiHienTai || (isVoucherBBBG ? 'Tạm nhận' : 'Tiếp nhận mới'),
                item.ghiChuVatTu || '',
                v.ghiChu,
              ]
        );
      });
    }
  });

  const csvContent =
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((cell) => {
            const clean = (cell || '').replace(/"/g, '""');
            return `"${clean}"`;
          })
          .join(',')
      )
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute(
    'download',
    `${isOnlyBBBG ? 'QLVT_BBBG_VatTu' : 'QLVT_BaoCao_VatTu'}_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportSingleVoucherToCSV(voucher: PhieuGiaoDich): void {
  const isBBBG = voucher.loaiChungTu === 'BBBG' || (voucher.loaiChungTu as string) === 'GUI_MUON';
  const pnkHeader = isBBBG ? 'Số PNK' : 'Số PNK hoàn tất';

  const rows: string[][] = [
    isBBBG
      ? [
          'Số chứng từ',
          'Loại phiếu',
          'Ngày tiếp nhận',
          'Đơn vị liên quan',
          'Cán bộ tiếp nhận',
          'Mã VT',
          'Tên VT',
          'Serial Number (S/N)',
          'Hiện trạng',
          'Số PNK',
          'Ghi chú thiết bị',
          'Ghi chú phiếu',
        ]
      : [
          'Số chứng từ',
          'Loại phiếu',
          'Ngày tiếp nhận',
          'Đơn vị liên quan',
          'Cán bộ tiếp nhận',
          'Mã VT',
          'Tên VT',
          'Serial Number (S/N)',
          'Trạng thái sau sửa',
          pnkHeader,
          'Trạng thái hiện tại',
          'Ghi chú thiết bị',
          'Ghi chú phiếu',
        ],
  ];

  if (voucher.danhSachVatTu.length === 0) {
    rows.push(
      isBBBG
        ? [
            voucher.soChungTu,
            voucher.loaiChungTu,
            voucher.ngayTiepNhan,
            voucher.donViLienQuan,
            voucher.canBoTiepNhan,
            '',
            '',
            '',
            '',
            '',
            '',
            voucher.ghiChu,
          ]
        : [
            voucher.soChungTu,
            voucher.loaiChungTu,
            voucher.ngayTiepNhan,
            voucher.donViLienQuan,
            voucher.canBoTiepNhan,
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            voucher.ghiChu,
          ]
    );
  } else {
    voucher.danhSachVatTu.forEach((item) => {
      rows.push(
        isBBBG
          ? [
              voucher.soChungTu,
              voucher.loaiChungTu,
              voucher.ngayTiepNhan,
              voucher.donViLienQuan,
              voucher.canBoTiepNhan,
              item.maVT,
              item.tenVT,
              item.serialNumber,
              item.trangThaiHienTai || 'Tạm nhận',
              item.soPNKHoanTat || '',
              item.ghiChuVatTu || '',
              voucher.ghiChu,
            ]
          : [
              voucher.soChungTu,
              voucher.loaiChungTu,
              voucher.ngayTiepNhan,
              voucher.donViLienQuan,
              voucher.canBoTiepNhan,
              item.maVT,
              item.tenVT,
              item.serialNumber,
              item.trangThaiSauSua === 'TOT' ? 'Tốt' : item.trangThaiSauSua === 'HONG' ? 'Hỏng' : item.trangThaiSauSua === 'LOI' ? 'Lỗi' : item.trangThaiSauSua || '',
              item.soPNKHoanTat || '',
              item.trangThaiHienTai || 'Tiếp nhận mới',
              item.ghiChuVatTu || '',
              voucher.ghiChu,
            ]
      );
    });
  }

  const csvContent =
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((cell) => {
            const clean = (cell || '').replace(/"/g, '""');
            return `"${clean}"`;
          })
          .join(',')
      )
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute(
    'download',
    `${isBBBG ? 'BBBG' : 'Phieu'}_${voucher.soChungTu.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
