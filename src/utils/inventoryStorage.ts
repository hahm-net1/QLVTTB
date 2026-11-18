import { InventoryItem, InventoryLog } from '../types';
import { INVENTORY_STATUS_META, INVENTORY_LOG_TYPE_LABELS } from './inventoryClassifier';

const INVENTORY_ITEMS_KEY = 'qlvt_inventory_items_v1';
const INVENTORY_LOGS_KEY = 'qlvt_inventory_logs_v1';
const MIGRATED_VOUCHERS_KEY = 'qlvt_migrated_lab_voucher_ids_v1';

export function loadInventoryItems(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(INVENTORY_ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error loading inventory items:', e);
    return [];
  }
}

export function saveInventoryItems(items: InventoryItem[]): void {
  try {
    localStorage.setItem(INVENTORY_ITEMS_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving inventory items:', e);
  }
}

export function loadInventoryLogs(): InventoryLog[] {
  try {
    const raw = localStorage.getItem(INVENTORY_LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error loading inventory logs:', e);
    return [];
  }
}

export function saveInventoryLogs(logs: InventoryLog[]): void {
  try {
    localStorage.setItem(INVENTORY_LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Error saving inventory logs:', e);
  }
}

export function getMigratedVoucherIds(): Set<string> {
  try {
    const raw = localStorage.getItem(MIGRATED_VOUCHERS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function markVouchersAsMigrated(voucherIds: string[]): void {
  if (!voucherIds.length) return;
  try {
    const existing = getMigratedVoucherIds();
    voucherIds.forEach((id) => existing.add(id));
    localStorage.setItem(MIGRATED_VOUCHERS_KEY, JSON.stringify(Array.from(existing)));
  } catch (e) {
    console.error('Error saving migrated voucher IDs:', e);
  }
}

export function exportInventoryToCSV(
  items: InventoryItem[],
  decryptedNotesMap: Record<string, string> = {}
): void {
  const headers = [
    'STT',
    'Mã VT',
    'Tên thiết bị / Vật tư',
    'Hãng SX',
    'Dòng thiết bị',
    'Phân loại',
    'Serial Number (S/N)',
    'Tồn hiện tại',
    'SL ban đầu',
    'ĐVT',
    'Vị trí / Người giữ',
    'Số chứng từ gốc',
    'Ngày nhập',
    'Cán bộ nhập',
    'Ghi chú chung',
    'Ghi chú riêng tư',
  ];

  const rows = items.map((it, idx) => {
    const statusLabel = INVENTORY_STATUS_META[it.phanLoai]?.label || it.phanLoai;
    const plainPrivate = decryptedNotesMap[it.id] || '';
    return [
      String(idx + 1),
      it.maVT || '',
      it.tenVT || '',
      it.hangSanXuat || '',
      it.dongThietBi || '',
      statusLabel,
      it.serialNumber || '',
      String(it.soLuongTon ?? 0),
      String(it.soLuongBanDau ?? 0),
      it.donViTinh || 'Cái',
      it.viTriKho || '',
      it.soChungTuGoc || '',
      it.ngayNhap || '',
      it.canBoNhap || '',
      it.ghiChu || '',
      plainPrivate,
    ];
  });

  const csvContent =
    '\uFEFF' +
    [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `Kho_Ton_Tai_San_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportInventoryLogsToCSV(logs: InventoryLog[]): void {
  const headers = [
    'STT',
    'Thời gian',
    'Loại biến động',
    'Mã VT',
    'Tên thiết bị / Vật tư',
    'Hãng SX',
    'Dòng thiết bị',
    'Serial Number',
    'Thay đổi',
    'Tồn trước',
    'Tồn sau',
    'Người nhận / Sử dụng',
    'Số CT tham chiếu',
    'Lý do / Diễn giải',
    'Người thực hiện',
  ];

  const rows = logs.map((log, idx) => [
    String(idx + 1),
    log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : '',
    INVENTORY_LOG_TYPE_LABELS[log.loaiBienDong] || log.loaiBienDong,
    log.maVT || '',
    log.tenVT || '',
    log.hangSanXuat || '',
    log.dongThietBi || '',
    log.serialNumber || '',
    String(log.soLuongThayDoi),
    String(log.tonTruoc),
    String(log.tonSau),
    log.nguoiNhan || '',
    log.soChungTuThamChieu || '',
    log.lyDo || '',
    log.nguoiThucHien || '',
  ]);

  const csvContent =
    '\uFEFF' +
    [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `Lich_Su_Kho_Ton_Tai_San_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
