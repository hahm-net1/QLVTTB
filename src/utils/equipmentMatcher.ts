import { ChiTietVatTu, PhieuGiaoDich } from '../types';

/**
 * Chuẩn hóa chuỗi văn bản tên thiết bị để so sánh linh hoạt
 */
export function normalizeEquipmentName(name?: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu tiếng Việt để so khớp không phân biệt dấu nếu cần
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Chuẩn hóa số Serial Number để so khớp chính xác
 */
export function normalizeSerial(serial?: string): string {
  if (!serial) return '';
  return serial
    .trim()
    .toUpperCase()
    .replace(/[\s\-_/\\.]/g, ''); // Bỏ khoảng trắng, dấu gạch ngang phân tách
}

export interface GenericItem {
  maVT?: string;
  tenVT?: string;
  serialNumber?: string;
  Serial_Number?: string;
  Ten_VT?: string;
  Ma_VT?: string;
}

/**
 * Kiểm tra xem 2 vật tư có khớp CẢ "Tên thiết bị/vật tư" VÀ "Số serial" hay không
 */
export function isEquipmentMatched(
  itemA: GenericItem,
  itemB: GenericItem
): boolean {
  const snA = normalizeSerial(itemA.serialNumber || itemA.Serial_Number);
  const snB = normalizeSerial(itemB.serialNumber || itemB.Serial_Number);

  const nameA = normalizeEquipmentName(itemA.tenVT || itemA.Ten_VT);
  const nameB = normalizeEquipmentName(itemB.tenVT || itemB.Ten_VT);

  // 1. Nếu cả 2 đều có số Serial:
  if (snA && snB) {
    if (snA !== snB) {
      return false;
    }
    // Serial đã khớp tuyệt đối! Giờ kiểm tra Tên thiết bị/vật tư
    if (!nameA || !nameB) {
      return true; // Nếu một trong hai bên thiếu tên thì serial khớp là đủ
    }
    if (nameA === nameB || nameA.includes(nameB) || nameB.includes(nameA)) {
      return true;
    }
    // So sánh các từ khóa chính (độ dài >= 2 ký tự)
    const wordsA = nameA.split(' ').filter((w) => w.length >= 2);
    const wordsB = nameB.split(' ').filter((w) => w.length >= 2);
    const commonWords = wordsA.filter((w) => wordsB.includes(w));
    if (commonWords.length > 0) {
      return true;
    }
    // Nếu cả serial và mã VT đều khớp
    const maA = (itemA.maVT || itemA.Ma_VT || '').trim().toLowerCase();
    const maB = (itemB.maVT || itemB.Ma_VT || '').trim().toLowerCase();
    if (maA && maB && maA === maB) {
      return true;
    }
    return false;
  }

  // 2. Nếu cả 2 không có Serial (vật tư phụ, cáp, măng xông...):
  if (!snA && !snB) {
    if (!nameA || !nameB) return false;
    if (nameA === nameB) return true;
    const maA = (itemA.maVT || itemA.Ma_VT || '').trim().toLowerCase();
    const maB = (itemB.maVT || itemB.Ma_VT || '').trim().toLowerCase();
    if (maA && maB && maA === maB) return true;
    return false;
  }

  return false;
}

export interface PendingBBBGItem {
  bbbgId: string;
  soBBBG: string;
  ngayTiepNhan: string;
  donViLienQuan: string;
  canBoTiepNhan: string;
  item: ChiTietVatTu;
}

/**
 * Kiểm tra xem một BBBG đã hoàn tất toàn bộ gán PNK hay chưa.
 * BBBG được coi là hoàn thành khi:
 * tất cả các vật tư đều ở trạng thái "Đã gán" kèm số PNK không rỗng.
 */
export function isBBBGCompleted(voucher: PhieuGiaoDich): boolean {
  if (voucher.loaiChungTu !== 'BBBG' && (voucher.loaiChungTu as string) !== 'GUI_MUON') {
    return false;
  }
  const items = voucher.danhSachVatTu || [];
  if (items.length === 0) return false;
  return items.every(
    (it) =>
      it.trangThaiHienTai === 'Đã gán' &&
      Boolean(it.soPNKHoanTat && it.soPNKHoanTat.trim() !== '')
  );
}

/**
 * Lấy toàn bộ danh sách các vật tư của các BBBG chưa có trạng thái hoàn thành gán.
 * (Những vật tư đang có trạng thái "Tạm nhận" hoặc chưa có số PNK).
 */
export function getAllPendingBBBGItems(vouchers: PhieuGiaoDich[]): PendingBBBGItem[] {
  const result: PendingBBBGItem[] = [];

  vouchers.forEach((v) => {
    const isBBBGType = v.loaiChungTu === 'BBBG' || (v.loaiChungTu as string) === 'GUI_MUON';
    if (!isBBBGType) return;

    // Nếu BBBG này chưa hoàn thành gán:
    if (!isBBBGCompleted(v)) {
      (v.danhSachVatTu || []).forEach((it) => {
        // Chỉ lấy những vật tư chưa được gán (Tạm nhận hoặc chưa có số PNK)
        const isAssigned =
          it.trangThaiHienTai === 'Đã gán' &&
          Boolean(it.soPNKHoanTat && it.soPNKHoanTat.trim() !== '');

        if (!isAssigned) {
          result.push({
            bbbgId: v.id,
            soBBBG: v.soChungTu,
            ngayTiepNhan: v.ngayTiepNhan,
            donViLienQuan: v.donViLienQuan,
            canBoTiepNhan: v.canBoTiepNhan,
            item: it,
          });
        }
      });
    }
  });

  return result;
}

/**
 * Cập nhật gán PNK cho danh sách vật tư của 1 phiếu BBBG:
 * - Các vật tư có id trong selectedItemIds: chuyển thành 'Đã gán' và soPNKHoanTat = pnkNumber.
 * - Các vật tư chưa chọn:
 *   + Nếu trước đó đã được gán thì giữ nguyên.
 *   + Nếu chưa được gán thì giữ nguyên 'Tạm nhận' và soPNKHoanTat = ''.
 * - Nếu tất cả vật tư trên BBBG đều là 'Đã gán' + có PNK thì tự động thêm ghi chú "Đã hoàn thành nhập kho đơn vị".
 */
export function updateBBBGVoucherWithAssignment(
  voucher: PhieuGiaoDich,
  selectedItemIds: string[],
  pnkNumber: string
): PhieuGiaoDich {
  const trimmedPNK = pnkNumber.trim();
  const selectedSet = new Set(selectedItemIds);

  const updatedItems = (voucher.danhSachVatTu || []).map((it) => {
    if (selectedSet.has(it.id)) {
      return {
        ...it,
        soPNKHoanTat: trimmedPNK,
        trangThaiHienTai: 'Đã gán',
      };
    }
    const isPreviouslyAssigned =
      it.trangThaiHienTai === 'Đã gán' && Boolean(it.soPNKHoanTat && it.soPNKHoanTat.trim() !== '');
    return {
      ...it,
      soPNKHoanTat: isPreviouslyAssigned ? it.soPNKHoanTat : '',
      trangThaiHienTai: isPreviouslyAssigned ? 'Đã gán' : 'Tạm nhận',
    };
  });

  const allAssigned =
    updatedItems.length > 0 &&
    updatedItems.every(
      (it) => it.trangThaiHienTai === 'Đã gán' && Boolean(it.soPNKHoanTat && it.soPNKHoanTat.trim() !== '')
    );

  let newGhiChu = voucher.ghiChu || '';
  const completedMsg = 'Đã hoàn thành nhập kho đơn vị';
  if (allAssigned) {
    if (!newGhiChu.includes(completedMsg)) {
      newGhiChu = newGhiChu.trim() ? `${newGhiChu.trim()}\n${completedMsg}` : completedMsg;
    }
  } else {
    newGhiChu = newGhiChu.replace(new RegExp(`\\n?${completedMsg}`, 'g'), '').trim();
  }

  return {
    ...voucher,
    danhSachVatTu: updatedItems,
    ghiChu: newGhiChu,
    updatedAt: new Date().toISOString(),
  };
}
