import { LoaiChungTu, TrangThaiSauSua } from '../types';

export function getLoaiChungTuLabel(type: LoaiChungTu): string {
  switch (type) {
    case 'PXK':
      return 'Phiếu xuất kho';
    case 'PNK':
      return 'Phiếu nhập kho';
    case 'GUI_MUON':
    case 'BBBG':
      return 'Biên bản bàn giao (BBBG)';
    default:
      return type;
  }
}

export function getLoaiChungTuBadge(type: LoaiChungTu): { label: string; bg: string; text: string; border: string } {
  switch (type) {
    case 'PXK':
      return {
        label: 'Xuất kho',
        bg: 'bg-blue-50 text-blue-700',
        text: 'text-blue-700',
        border: 'border-blue-200',
      };
    case 'PNK':
      return {
        label: 'Nhập kho',
        bg: 'bg-emerald-50 text-emerald-700',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
      };
    case 'GUI_MUON':
    case 'BBBG':
    default:
      return {
        label: 'BBBG',
        bg: 'bg-amber-50 text-amber-700',
        text: 'text-amber-700',
        border: 'border-amber-200',
      };
  }
}

export function getTrangThaiSauSuaBadge(status: TrangThaiSauSua): { label: string; badgeClass: string; dotClass: string } {
  switch (status) {
    case 'TOT':
      return {
        label: 'Tốt',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold',
        dotClass: 'bg-emerald-500',
      };
    case 'HONG':
      return {
        label: 'Hỏng',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
        dotClass: 'bg-rose-500',
      };
    case 'LOI':
      return {
        label: 'Lỗi',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
        dotClass: 'bg-amber-500',
      };
  }
}

export function getVoucherPrefix(type: LoaiChungTu): string {
  switch (type) {
    case 'PNK':
      return 'PNK-';
    case 'PXK':
      return 'PXK-';
    case 'GUI_MUON':
    case 'BBBG':
      return 'BBBG-';
    default:
      return 'PXK-';
  }
}

export function generateSoChungTu(type: LoaiChungTu): string {
  return getVoucherPrefix(type);
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateVN(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function getItemStatusBadge(status: string): { label: string; bg: string; text: string; border: string } {
  if (status && (status.startsWith('PNK-') || status.startsWith('PNK') || status.includes('/N/'))) {
    return {
      label: status,
      bg: 'bg-indigo-50 text-indigo-700 font-mono font-bold',
      text: 'text-indigo-700',
      border: 'border-indigo-300',
    };
  }

  switch (status) {
    case 'Tạm nhận':
      return {
        label: 'Tạm nhận',
        bg: 'bg-amber-100 text-amber-900 font-bold',
        text: 'text-amber-900',
        border: 'border-amber-400',
      };
    case 'NK tốt':
      return {
        label: 'NK tốt',
        bg: 'bg-emerald-50 text-emerald-700',
        text: 'text-emerald-700',
        border: 'border-emerald-300',
      };
    case 'NK hỏng':
      return {
        label: 'NK hỏng',
        bg: 'bg-rose-50 text-rose-700',
        text: 'text-rose-700',
        border: 'border-rose-300',
      };
    case 'Kiểm tra thêm':
      return {
        label: 'Kiểm tra thêm',
        bg: 'bg-amber-50 text-amber-700',
        text: 'text-amber-700',
        border: 'border-amber-300',
      };
    case 'Tiếp nhận mới':
    default:
      return {
        label: status || 'Tiếp nhận mới',
        bg: 'bg-blue-50 text-blue-700',
        text: 'text-blue-700',
        border: 'border-blue-200',
      };
  }
}
