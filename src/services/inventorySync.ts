import {
  collection,
  doc,
  onSnapshot,
  writeBatch,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { InventoryItem, InventoryLog, PhieuGiaoDich, ChiTietVatTu } from '../types';

const ITEMS_COLLECTION = 'inventory_items';
const LOGS_COLLECTION = 'inventory_logs';
const VOUCHERS_COLLECTION = 'vouchers';

function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export function subscribeToInventoryItems(
  onData: (items: InventoryItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, ITEMS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: InventoryItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as InventoryItem;
        if (data && data.id && data.tenVT) {
          list.push({
            ...data,
            soLuongTon: Math.max(0, Number(data.soLuongTon ?? 0)),
            soLuongBanDau: Math.max(0, Number(data.soLuongBanDau ?? data.soLuongTon ?? 1)),
            phanLoai: data.phanLoai || 'CHUA_PHAN_LOAI',
            hangSanXuat: data.hangSanXuat || '',
            dongThietBi: data.dongThietBi || '',
            viTriKho: data.viTriKho || '',
            donViTinh: data.donViTinh || 'Cái',
          });
        }
      });
      list.sort((a, b) => {
        const tA = new Date(a.updatedAt || a.createdAt || a.ngayNhap || 0).getTime();
        const tB = new Date(b.updatedAt || b.createdAt || b.ngayNhap || 0).getTime();
        return tB - tA;
      });
      onData(list);
    },
    (error) => {
      console.error('Lỗi lắng nghe inventory_items:', error);
      if (onError) onError(error);
    }
  );
}

export function subscribeToInventoryLogs(
  onData: (logs: InventoryLog[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, LOGS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: InventoryLog[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as InventoryLog;
        if (data && data.id && data.itemId) {
          list.push(data);
        }
      });
      list.sort((a, b) => {
        const tA = new Date(a.timestamp || 0).getTime();
        const tB = new Date(b.timestamp || 0).getTime();
        return tB - tA;
      });
      onData(list);
    },
    (error) => {
      console.error('Lỗi lắng nghe inventory_logs:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Commit batches cleanly (respecting Firestore 500-op batch limit)
 */
async function commitOperationsInChunks(
  ops: Array<
    | { type: 'set'; path: string; id: string; data: Record<string, unknown> }
    | { type: 'delete'; path: string; id: string }
  >
): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const chunk = ops.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      const ref = doc(db, op.path, op.id);
      if (op.type === 'set') {
        batch.set(ref, sanitizeForFirestore(op.data), { merge: true });
      } else {
        batch.delete(ref);
      }
    }
    await batch.commit();
  }
}

export function buildInventoryFromVoucherItems(
  voucher: PhieuGiaoDich,
  itemsToConvert: ChiTietVatTu[],
  options: { isMigration?: boolean } = {}
): { items: InventoryItem[]; logs: InventoryLog[] } {
  const now = new Date().toISOString();
  const isMigration = Boolean(options.isMigration);

  const items: InventoryItem[] = [];
  const logs: InventoryLog[] = [];

  itemsToConvert.forEach((it, idx) => {
    const qty = Math.max(1, Number(it.soLuong) || 1);
    const deterministicId = isMigration
      ? `inv-mig-${voucher.id}-${it.id}`.replace(/[^a-zA-Z0-9_-]/g, '_')
      : `inv-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`;

    const logId = isMigration
      ? `log-mig-${voucher.id}-${it.id}`.replace(/[^a-zA-Z0-9_-]/g, '_')
      : `log-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`;

    const cleanNoteParts: string[] = [];
    if (it.ghiChuVatTu && it.ghiChuVatTu.trim()) {
      cleanNoteParts.push(it.ghiChuVatTu.replace(/#lab(?:\b|$)/gi, '').trim());
    }
    if (voucher.ghiChu && voucher.ghiChu.trim()) {
      const vNote = voucher.ghiChu.replace(/#lab(?:\b|$)/gi, '').trim();
      if (vNote && !cleanNoteParts.includes(vNote)) {
        cleanNoteParts.push(vNote);
      }
    }

    const defaultLocation =
      voucher.donViLienQuan && voucher.donViLienQuan !== 'Chờ phân bổ sau sửa chữa'
        ? voucher.donViLienQuan
        : 'Kho tồn & Tài sản';

    const invItem: InventoryItem = {
      id: deterministicId,
      maVT: (it.maVT || '').trim(),
      tenVT: (it.tenVT || 'Vật tư không tên').trim(),
      serialNumber: (it.serialNumber || '').trim(),
      soLuongTon: qty,
      soLuongBanDau: qty,
      donViTinh: 'Cái',
      phanLoai: 'CHUA_PHAN_LOAI',
      hangSanXuat: '',
      dongThietBi: '',
      viTriKho: defaultLocation,
      soChungTuGoc: voucher.soChungTu || '',
      loaiChungTuGoc: voucher.loaiChungTu,
      ngayNhap: voucher.ngayTiepNhan || now.slice(0, 10),
      canBoNhap: voucher.canBoTiepNhan || '',
      ghiChu: cleanNoteParts.join(' • '),
      privateNote: it.privateNote || '',
      ...(isMigration
        ? {
            migratedFromVoucherId: voucher.id,
            migratedFromItemId: it.id,
          }
        : {}),
      createdAt: voucher.createdAt || now,
      updatedAt: now,
    };

    const logEntry: InventoryLog = {
      id: logId,
      itemId: deterministicId,
      loaiBienDong: isMigration ? 'NHAP_CHUYEN_DOI' : 'NHAP_MOI',
      maVT: invItem.maVT,
      tenVT: invItem.tenVT,
      serialNumber: invItem.serialNumber,
      hangSanXuat: invItem.hangSanXuat,
      dongThietBi: invItem.dongThietBi,
      denPhanLoai: 'CHUA_PHAN_LOAI',
      soLuongThayDoi: qty,
      tonTruoc: 0,
      tonSau: qty,
      nguoiThucHien: voucher.canBoTiepNhan || 'Hệ thống',
      soChungTuThamChieu: voucher.soChungTu || '',
      lyDo: isMigration
        ? `Tự động chuyển đổi từ phiếu #lab cũ (${voucher.soChungTu})`
        : `Nhập mới từ phiếu ${voucher.soChungTu} (#lab)`,
      timestamp: isMigration ? voucher.createdAt || now : now,
    };

    items.push(invItem);
    logs.push(logEntry);
  });

  return { items, logs };
}

export async function saveInventoryItemsAndLogsToCloud(
  items: InventoryItem[],
  logs: InventoryLog[]
): Promise<void> {
  if (items.length === 0 && logs.length === 0) return;
  try {
    const ops = [
      ...items.map((item) => ({
        type: 'set' as const,
        path: ITEMS_COLLECTION,
        id: item.id,
        data: item as unknown as Record<string, unknown>,
      })),
      ...logs.map((log) => ({
        type: 'set' as const,
        path: LOGS_COLLECTION,
        id: log.id,
        data: log as unknown as Record<string, unknown>,
      })),
    ];
    await commitOperationsInChunks(ops);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, ITEMS_COLLECTION);
  }
}

export async function deleteInventoryItemFromCloud(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, ITEMS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ITEMS_COLLECTION}/${id}`);
  }
}

/**
 * Migrate legacy #lab vouchers from /vouchers into /inventory_items and /inventory_logs
 * Idempotent: skips items already present in Firestore inventory_items.
 */
export async function migrateLabVouchersToCloud(
  vouchersToMigrate: PhieuGiaoDich[]
): Promise<{
  migratedVoucherIds: string[];
  createdItems: InventoryItem[];
  createdLogs: InventoryLog[];
  updatedPartialVouchers: PhieuGiaoDich[];
  deletedVoucherIds: string[];
}> {
  if (!vouchersToMigrate.length) {
    return {
      migratedVoucherIds: [],
      createdItems: [],
      createdLogs: [],
      updatedPartialVouchers: [],
      deletedVoucherIds: [],
    };
  }

  try {
    // Check existing inventory_items in Firestore to ensure zero duplicates across browsers
    const existingSnap = await getDocs(collection(db, ITEMS_COLLECTION));
    const existingIds = new Set<string>();
    existingSnap.forEach((d) => existingIds.add(d.id));

    const ops: Array<
      | { type: 'set'; path: string; id: string; data: Record<string, unknown> }
      | { type: 'delete'; path: string; id: string }
    > = [];

    const createdItems: InventoryItem[] = [];
    const createdLogs: InventoryLog[] = [];
    const migratedVoucherIds: string[] = [];
    const updatedPartialVouchers: PhieuGiaoDich[] = [];
    const deletedVoucherIds: string[] = [];

    for (const v of vouchersToMigrate) {
      const labItems = v.isLab
        ? v.danhSachVatTu || []
        : (v.danhSachVatTu || []).filter((it) => Boolean(it.isLab));
      const nonLabItems = v.isLab
        ? []
        : (v.danhSachVatTu || []).filter((it) => !it.isLab);

      if (labItems.length === 0 && !v.isLab) continue;

      const { items, logs } = buildInventoryFromVoucherItems(v, labItems, { isMigration: true });

      items.forEach((item, idx) => {
        if (!existingIds.has(item.id)) {
          createdItems.push(item);
          createdLogs.push(logs[idx]);
          ops.push({
            type: 'set',
            path: ITEMS_COLLECTION,
            id: item.id,
            data: item as unknown as Record<string, unknown>,
          });
          ops.push({
            type: 'set',
            path: LOGS_COLLECTION,
            id: logs[idx].id,
            data: logs[idx] as unknown as Record<string, unknown>,
          });
        }
      });

      if (v.isLab || nonLabItems.length === 0) {
        deletedVoucherIds.push(v.id);
        ops.push({ type: 'delete', path: VOUCHERS_COLLECTION, id: v.id });
      } else {
        const cleanedVoucher: PhieuGiaoDich = {
          ...v,
          isLab: false,
          danhSachVatTu: nonLabItems,
          updatedAt: new Date().toISOString(),
        };
        updatedPartialVouchers.push(cleanedVoucher);
        ops.push({
          type: 'set',
          path: VOUCHERS_COLLECTION,
          id: v.id,
          data: cleanedVoucher as unknown as Record<string, unknown>,
        });
      }
      migratedVoucherIds.push(v.id);
    }

    if (ops.length > 0) {
      await commitOperationsInChunks(ops);
    }

    return {
      migratedVoucherIds,
      createdItems,
      createdLogs,
      updatedPartialVouchers,
      deletedVoucherIds,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, ITEMS_COLLECTION);
  }
}
