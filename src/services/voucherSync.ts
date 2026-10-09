import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { PhieuGiaoDich } from '../types';

const COLLECTION_NAME = 'vouchers';

/**
 * Realtime listener for all vouchers stored in Firestore.
 * Automatically synchronizes changes across tabs and devices in real-time.
 */
export function subscribeToCloudVouchers(
  onData: (vouchers: PhieuGiaoDich[]) => void,
  onError?: (err: Error) => void
): () => void {
  const vouchersCol = collection(db, COLLECTION_NAME);
  
  const unsubscribe = onSnapshot(
    vouchersCol,
    (snapshot) => {
      const list: PhieuGiaoDich[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as PhieuGiaoDich;
        if (data && data.id && data.soChungTu) {
          list.push(data);
        }
      });
      // Sort by creation or receipt date descending
      list.sort((a, b) => {
        const tA = new Date(a.updatedAt || a.createdAt || a.ngayTiepNhan).getTime();
        const tB = new Date(b.updatedAt || b.createdAt || b.ngayTiepNhan).getTime();
        return tB - tA;
      });
      onData(list);
    },
    (error) => {
      console.error('Lỗi lắng nghe dữ liệu Firebase Firestore:', error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Save or update a voucher in Firestore.
 */
export async function saveVoucherToCloud(voucher: PhieuGiaoDich): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, voucher.id);
  const now = new Date().toISOString();
  const payload: PhieuGiaoDich = {
    ...voucher,
    updatedAt: now,
    createdAt: voucher.createdAt || now,
  };
  await setDoc(docRef, payload, { merge: true });
}

/**
 * Delete a voucher from Firestore.
 */
export async function deleteVoucherFromCloud(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

/**
 * Clear all vouchers from Firestore.
 */
export async function clearAllCloudVouchers(): Promise<void> {
  const colRef = collection(db, COLLECTION_NAME);
  const snapshot = await getDocs(colRef);
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => {
    batch.delete(d.ref);
  });
  await batch.commit();
}
