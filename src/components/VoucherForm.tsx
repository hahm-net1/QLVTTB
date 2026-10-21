import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Layers, 
  Plus, 
  Trash2, 
  Copy, 
  Sparkles, 
  Camera, 
  Search, 
  Save, 
  CheckCircle, 
  AlertTriangle, 
  Check, 
  X,
  Calendar,
  Building2,
  User,
  Hash,
  ChevronDown,
  Info,
  Warehouse,
  Lock
} from 'lucide-react';
import { usePrivateVault } from '../context/PrivateVaultContext';
import { 
  PhieuGiaoDich, 
  ChiTietVatTu, 
  LoaiChungTu, 
  TrangThaiSauSua 
} from '../types';
import { 
  getVoucherPrefix, 
  getTodayDateString, 
  getTrangThaiSauSuaBadge,
  formatDateVN 
} from '../utils/formatters';
import { 
  DON_VI_GOI_Y, 
  TRANG_THAI_HIEN_TAI_OPTIONS 
} from '../constants/sampleData';
import { loadVouchers } from '../utils/storage';
import { getAllPendingBBBGItems, isBBBGCompleted } from '../utils/equipmentMatcher';
import { EquipmentCatalogModal } from './EquipmentCatalogModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { BBBGIntakeModal } from './BBBGIntakeModal';

interface VoucherFormProps {
  initialData?: PhieuGiaoDich | null;
  existingVouchers?: PhieuGiaoDich[];
  onSave: (voucher: PhieuGiaoDich) => void;
  onCancel: () => void;
  onOpenSmartScan: () => void;
  onDelete?: (id: string) => void;
  onUpdateMultipleVouchers?: (updatedVouchers: PhieuGiaoDich[]) => void;
}

export const VoucherForm: React.FC<VoucherFormProps> = ({
  initialData,
  existingVouchers,
  onSave,
  onCancel,
  onOpenSmartScan,
  onDelete,
  onUpdateMultipleVouchers,
}) => {
  // Master State
  const [loaiChungTu, setLoaiChungTu] = useState<LoaiChungTu>(
    initialData?.loaiChungTu || 'PXK'
  );
  const [soChungTu, setSoChungTu] = useState<string>(
    initialData?.soChungTu || ''
  );
  const [ngayTiepNhan, setNgayTiepNhan] = useState<string>(
    initialData?.ngayTiepNhan || getTodayDateString()
  );
  const [donViLienQuan, setDonViLienQuan] = useState<string>(
    initialData?.donViLienQuan || ''
  );
  const [canBoTiepNhan, setCanBoTiepNhan] = useState<string>(
    initialData?.canBoTiepNhan || ''
  );
  const [ghiChu, setGhiChu] = useState<string>(initialData?.ghiChu || '');

  const { isUnlocked, activePin, encryptNote, decryptNote } = usePrivateVault();

  // Detail Items State (clean blank default, no sample items)
  const isInitialBBBG = loaiChungTu === 'BBBG' || (loaiChungTu as string) === 'GUI_MUON';
  const [danhSachVatTu, setDanhSachVatTu] = useState<ChiTietVatTu[]>(
    initialData?.danhSachVatTu && initialData.danhSachVatTu.length > 0
      ? initialData.danhSachVatTu
      : [
          {
            id: `vt-${Date.now()}-1`,
            maVT: '',
            tenVT: '',
            serialNumber: '',
            trangThaiSauSua: 'TOT',
            soPNKHoanTat: '',
            trangThaiHienTai: isInitialBBBG ? 'Tạm nhận' : 'Tiếp nhận mới',
            ghiChuVatTu: '',
            privateNote: '',
          },
        ]
  );

  // Automatically decrypt encrypted private notes when unlocked
  useEffect(() => {
    if (isUnlocked && activePin && initialData?.danhSachVatTu) {
      let hasEncrypted = false;
      const promises = initialData.danhSachVatTu.map(async (it) => {
        if (it.privateNote && it.privateNote.startsWith('ENC1:')) {
          hasEncrypted = true;
          const plain = await decryptNote(it.privateNote);
          return { ...it, privateNote: plain || '' };
        }
        return it;
      });

      if (hasEncrypted) {
        Promise.all(promises).then((decryptedList) => {
          setDanhSachVatTu(decryptedList);
        });
      }
    }
  }, [isUnlocked, activePin, initialData, decryptNote]);

  // Modals state
  const [catalogModalIndex, setCatalogModalIndex] = useState<number | null>(null);
  const [scannerModalIndex, setScannerModalIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [isBBBGIntakeOpen, setIsBBBGIntakeOpen] = useState(false);
  const [bbbgAssignToast, setBbbgAssignToast] = useState<string | null>(null);

  // Danh sách toàn bộ vật tư của các BBBG chưa hoàn thành gán trên hệ thống
  const pendingBBBGList = useMemo(() => {
    return getAllPendingBBBGItems(existingVouchers || loadVouchers());
  }, [existingVouchers]);

  // Xử lý sau khi gán PNK từ modal BBBG thành công
  const handleBBBGAssignSuccess = (
    assignedItems: ChiTietVatTu[],
    updatedBBBGVouchers: PhieuGiaoDich[],
    pnkNumber: string
  ) => {
    // 1. Chuyển loại chứng từ sang PNK và điền số chứng từ nếu chưa có
    if (!soChungTu || soChungTu === 'PXK-' || soChungTu === 'BBBG-') {
      setSoChungTu(pnkNumber);
    }
    setLoaiChungTu('PNK');

    // 2. Thêm các vật tư đã gán vào form phiếu nhập kho
    setDanhSachVatTu((prev) => {
      const isBlank =
        prev.length === 1 &&
        !prev[0].tenVT.trim() &&
        !prev[0].serialNumber.trim();
      if (isBlank) {
        return assignedItems;
      }
      return [...prev, ...assignedItems];
    });

    // 3. Đồng bộ cập nhật các phiếu BBBG gốc (chuyển vật tư sang Đã gán + Số PNK)
    if (onUpdateMultipleVouchers) {
      onUpdateMultipleVouchers(updatedBBBGVouchers);
    }

    setBbbgAssignToast(
      `Đã gán thành công ${assignedItems.length} vật tư từ BBBG vào phiếu nhập ${pnkNumber}!`
    );
    setTimeout(() => setBbbgAssignToast(null), 3500);
  };

  // Helper get prefix format: PNK- | PXK- | BBBG-
  const getPrefix = (type: LoaiChungTu): string => {
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
  };

  // Helper check duplicate equipment:
  // Nghiệp vụ kiểm tra trùng lặp vật tư theo Serial (Vòng đời vật tư: Tiếp nhận mới -> NK tốt/NK hỏng -> Nhập kho tái sử dụng nhiều lần)
  // 1. Cho phép một Serial xuất hiện trong nhiều phiếu nhập/BBBG khác nhau theo thời gian (tạo lịch sử vòng đời), không báo lỗi trùng lặp mã serial nữa.
  // 2. Chỉ cảnh báo/chặn khi Serial đó đang trong trạng thái chưa hoàn thành quy trình trước đó (ví dụ: đang ở trong BBBG có trạng thái chưa "Hoàn thành nhập kho đơn vị", hoặc đang ở trạng thái "Tiếp nhận mới").
  // 3. Trên cùng 1 form BBBG hoặc PNK/PXK cảnh báo/chặn khi Serial và Tên VT cùng trùng lặp đồng thời.
  // 4. Cập nhật trạng thái vật tư linh hoạt theo từng chu kỳ nhập mới.
  const getDuplicateInfo = (index: number) => {
    const item = danhSachVatTu[index];
    const ten = (item.tenVT || '').trim().toLowerCase();
    const sn = (item.serialNumber || '').trim().toUpperCase();

    // Nếu không có Serial, không kiểm tra trùng lặp theo Serial
    if (!sn) {
      return { isDuplicate: false, sameLines: [], otherVouchers: [] };
    }

    // 1. Trùng lặp trên cùng 1 form BBBG hoặc PNK/PXK:
    // Cảnh báo/chặn khi Serial và Tên VT cùng trùng lặp đồng thời
    const sameLines: number[] = [];
    if (ten) {
      danhSachVatTu.forEach((other, oIdx) => {
        if (oIdx !== index) {
          const oTen = (other.tenVT || '').trim().toLowerCase();
          const oSn = (other.serialNumber || '').trim().toUpperCase();
          if (oSn === sn && oTen === ten) {
            sameLines.push(oIdx + 1);
          }
        }
      });
    }

    // 2. Kiểm tra với các phiếu khác trên hệ thống (tạo lịch sử vòng đời theo thời gian):
    // Chỉ cảnh báo/chặn khi Serial đó đang trong trạng thái CHƯA HOÀN THÀNH quy trình trước đó:
    // - Đang ở trong BBBG có trạng thái chưa "Hoàn thành nhập kho đơn vị" (hoặc vật tư còn đang "Tạm nhận", chưa gán PNK)
    // - Hoặc đang ở trạng thái "Tiếp nhận mới" (chưa hoàn tất nhập kho / sửa chữa)
    const allVouchers = existingVouchers || loadVouchers();
    const otherVouchers: { soChungTu: string; ngayTiepNhan: string; lyDo: string }[] = [];

    allVouchers.forEach((v: PhieuGiaoDich) => {
      if (initialData && v.id === initialData.id) return;

      const isVoucherBBBG = v.loaiChungTu === 'BBBG' || (v.loaiChungTu as string) === 'GUI_MUON';
      const isBBBGDone = isBBBGCompleted(v) || Boolean(v.ghiChu && v.ghiChu.includes('Đã hoàn thành nhập kho đơn vị'));

      v.danhSachVatTu.forEach((other: ChiTietVatTu) => {
        const oSn = (other.serialNumber || '').trim().toUpperCase();
        if (oSn !== sn) return;

        let isIncomplete = false;
        let lyDo = '';

        if (isVoucherBBBG) {
          const isAssigned = other.trangThaiHienTai === 'Đã gán' && Boolean(other.soPNKHoanTat && other.soPNKHoanTat.trim() !== '');
          if (!isBBBGDone || !isAssigned || other.trangThaiHienTai === 'Tạm nhận') {
            isIncomplete = true;
            lyDo = 'BBBG chưa hoàn thành nhập kho đơn vị';
          }
        } else {
          const st = (other.trangThaiHienTai || '').trim();
          if (!st || st === 'Tiếp nhận mới' || st === 'Đang sửa chữa' || st === 'Kiểm tra thêm' || st === 'DANG_SUA_CHUA') {
            isIncomplete = true;
            lyDo = `Đang ở trạng thái "${st || 'Tiếp nhận mới'}"`;
          }
        }

        if (isIncomplete) {
          if (!otherVouchers.some((ov) => ov.soChungTu === v.soChungTu)) {
            otherVouchers.push({
              soChungTu: v.soChungTu,
              ngayTiepNhan: v.ngayTiepNhan,
              lyDo,
            });
          }
        }
      });
    });

    const isDuplicate = sameLines.length > 0 || otherVouchers.length > 0;
    return {
      isDuplicate,
      sameLines,
      otherVouchers,
    };
  };

  // Change voucher type
  const handleTypeChange = (newType: LoaiChungTu) => {
    const oldPrefix = getPrefix(loaiChungTu);
    const newPrefix = getPrefix(newType);
    setLoaiChungTu(newType);
    const isNewTypeBBBG = newType === 'BBBG' || (newType as string) === 'GUI_MUON';
    
    // Nếu chuyển sang BBBG và các dòng hiện tại đang là "Tiếp nhận mới" chưa sửa, chuyển sang "Tạm nhận"
    if (isNewTypeBBBG) {
      setDanhSachVatTu((prev) =>
        prev.map((item) =>
          item.trangThaiHienTai === 'Tiếp nhận mới' || !item.trangThaiHienTai
            ? { ...item, trangThaiHienTai: 'Tạm nhận' }
            : item
        )
      );
    }

    if (!initialData) {
      if (!soChungTu || soChungTu === oldPrefix || soChungTu === 'PXK-' || soChungTu === 'PNK-' || soChungTu === 'BBBG-') {
        setSoChungTu('');
      } else if (soChungTu.startsWith(oldPrefix)) {
        setSoChungTu(newPrefix + soChungTu.slice(oldPrefix.length));
      }
    }
  };

  // Item handlers
  const handleAddItem = () => {
    const isBBBG = loaiChungTu === 'BBBG' || (loaiChungTu as string) === 'GUI_MUON';
    const newItem: ChiTietVatTu = {
      id: `vt-${Date.now()}-${danhSachVatTu.length + 1}`,
      maVT: '',
      tenVT: '',
      serialNumber: '',
      trangThaiSauSua: 'TOT',
      soPNKHoanTat: '',
      trangThaiHienTai: isBBBG ? 'Tạm nhận' : 'Tiếp nhận mới',
      ghiChuVatTu: '',
    };
    setDanhSachVatTu([...danhSachVatTu, newItem]);
  };

  const handleDuplicateItem = (index: number) => {
    const target = danhSachVatTu[index];
    const cloned: ChiTietVatTu = {
      ...target,
      id: `vt-${Date.now()}-${Math.random()}`,
      serialNumber: target.serialNumber ? `${target.serialNumber}-COPY` : '',
    };
    const updated = [...danhSachVatTu];
    updated.splice(index + 1, 0, cloned);
    setDanhSachVatTu(updated);
  };

  const handleRemoveItem = (index: number) => {
    if (danhSachVatTu.length === 1) {
      alert('Phiếu cần có ít nhất 1 dòng chi tiết vật tư.');
      return;
    }
    const updated = danhSachVatTu.filter((_, idx) => idx !== index);
    setDanhSachVatTu(updated);
  };

  const handleUpdateItem = (index: number, field: keyof ChiTietVatTu, value: any) => {
    const updated = [...danhSachVatTu];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setDanhSachVatTu(updated);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const errors: string[] = [];

    if (!soChungTu.trim()) {
      errors.push(`Vui lòng nhập Số chứng từ (gợi ý dạng ${getPrefix(loaiChungTu)}).`);
    }
    if (!canBoTiepNhan.trim()) {
      errors.push('Vui lòng nhập Cán bộ tiếp nhận.');
    }

    if (danhSachVatTu.length === 0) {
      errors.push('Phiếu phải có ít nhất 1 thiết bị/vật tư.');
    }

    // Check at least equipment name
    danhSachVatTu.forEach((item, idx) => {
      if (!item.tenVT.trim()) {
        errors.push(`Vật tư dòng #${idx + 1} chưa có tên thiết bị.`);
      }
    });

    if (errors.length > 0) {
      setFormErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Kiểm tra và cảnh báo nếu có thiết bị bị trùng thông tin theo nghiệp vụ vòng đời Serial
    const duplicateList = danhSachVatTu
      .map((_, i) => ({ index: i, item: danhSachVatTu[i], info: getDuplicateInfo(i) }))
      .filter((d) => d.info.isDuplicate);

    if (duplicateList.length > 0) {
      const dupDetails = duplicateList.map((d) => {
        const label = `#${d.index + 1} (${d.item.tenVT || 'Chưa có tên'} - S/N: ${d.item.serialNumber})`;
        if (d.info.sameLines.length > 0) {
          return `${label}: Trùng đồng thời Serial và Tên VT với dòng #${d.info.sameLines.join(', #')} trên cùng form`;
        }
        if (d.info.otherVouchers.length > 0) {
          const vNames = d.info.otherVouchers.map((v) => `${v.soChungTu} (${v.lyDo})`).join(', ');
          return `${label}: Serial đang chưa hoàn thành quy trình trước đó tại: ${vNames}`;
        }
        return label;
      }).join('\n• ');

      const confirmSave = window.confirm(
        `⚠️ CẢNH BÁO TRÙNG LẶP VẬT TƯ / SERIAL:\n\n` +
        `Có ${duplicateList.length} thiết bị có cảnh báo trùng lặp:\n• ${dupDetails}\n\n` +
        `Bạn có chắc chắn muốn tiếp tục lưu phiếu này không?`
      );
      if (!confirmSave) {
        return;
      }
    }

    setFormErrors([]);

    // Xử lý mã hóa Private Note nếu đang ở chế độ mở khóa bảo mật
    let finalDanhSachVatTu = danhSachVatTu;
    if (isUnlocked && activePin) {
      finalDanhSachVatTu = await Promise.all(
        danhSachVatTu.map(async (item) => {
          if (item.privateNote && item.privateNote.trim()) {
            const cipher = await encryptNote(item.privateNote.trim());
            return { ...item, privateNote: cipher };
          }
          return { ...item, privateNote: '' };
        })
      );
    } else {
      // Giữ nguyên ghi chú đã mã hóa trước đó nếu người dùng khác sửa phiếu ở chế độ khóa
      finalDanhSachVatTu = danhSachVatTu.map((item) => {
        const prev = initialData?.danhSachVatTu?.find((old) => old.id === item.id);
        return {
          ...item,
          privateNote: prev?.privateNote || item.privateNote || '',
        };
      });
    }

    const payload: PhieuGiaoDich = {
      id: initialData?.id || `phieu-${Date.now()}`,
      soChungTu: soChungTu.trim(),
      loaiChungTu,
      ngayTiepNhan,
      donViLienQuan: initialData?.donViLienQuan || donViLienQuan.trim() || 'Chờ phân bổ sau sửa chữa',
      canBoTiepNhan: canBoTiepNhan.trim(),
      ghiChu: ghiChu.trim(),
      danhSachVatTu: finalDanhSachVatTu,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(payload);
    // Clear all input fields for next entry
    setSoChungTu('');
    setLoaiChungTu('PXK');
    setNgayTiepNhan(getTodayDateString());
    setCanBoTiepNhan('');
    setDonViLienQuan('');
    setGhiChu('');
    setDanhSachVatTu([
      {
        id: `vt-${Date.now()}-1`,
        maVT: '',
        tenVT: '',
        serialNumber: '',
        trangThaiSauSua: 'TOT',
        soPNKHoanTat: '',
        trangThaiHienTai: loaiChungTu === 'BBBG' || (loaiChungTu as string) === 'GUI_MUON' ? 'Tạm nhận' : 'Tiếp nhận mới',
        ghiChuVatTu: '',
      },
    ]);
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  // Summary counts
  const totalItems = danhSachVatTu.length;
  const duplicateItemsCount = danhSachVatTu.filter((_, idx) => getDuplicateInfo(idx).isDuplicate).length;

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Toast alert */}
      {saveSuccessNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="w-5 h-5 text-white" />
          <span className="text-sm font-bold">Lưu phiếu giao dịch thành công!</span>
        </div>
      )}

      {/* Toast alert gán từ BBBG */}
      {bbbgAssignToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-indigo-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 border border-indigo-400">
          <Warehouse className="w-5 h-5 text-indigo-200" />
          <span className="text-sm font-bold">{bbbgAssignToast}</span>
        </div>
      )}

      {/* Validation alert */}
      {formErrors.length > 0 && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-800 text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-bold mb-1 text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Vui lòng hoàn thiện các thông tin sau:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-2">
            {formErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ========================================================
            PHẦN 1: THÔNG TIN CHUNG CHỨNG TỪ (PHIEU_GIAO_DICH)
            ======================================================== */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header of Section 1 */}
          <div className="bg-gradient-to-r from-[#004b93] to-[#003870] text-white px-4 sm:px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#00a3e0] flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-sm sm:text-base leading-tight">
                  Phần 1: Thông tin chung chứng từ
                </h2>
                <p className="text-[11px] text-cyan-100">
                  {initialData ? `Đang sửa: ${initialData.soChungTu}` : 'Phiếu giao dịch & tiếp nhận'}
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2">
              {/* Nút tiện ích gán PNK từ BBBG chưa hoàn thành */}
              {pendingBBBGList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsBBBGIntakeOpen(true)}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Gán PNK từ các vật tư của BBBG chưa hoàn thành (thủ công hoặc nạp file Excel/PDF/ảnh)"
                >
                  <Warehouse className="w-3.5 h-3.5 text-indigo-100" />
                  <span className="hidden sm:inline">Gán từ BBBG ({pendingBBBGList.length} Tạm nhận)</span>
                  <span className="sm:hidden">BBBG ({pendingBBBGList.length})</span>
                </button>
              )}

              {/* AI OCR Shortcut */}
              <button
                type="button"
                onClick={onOpenSmartScan}
                className="flex items-center gap-1.5 bg-[#00a3e0] hover:bg-cyan-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
                title="Trích xuất thông minh từ Ảnh, PDF hoặc tệp Excel"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span className="hidden sm:inline">Quét AI / Excel</span>
                <span className="sm:hidden">AI / Excel</span>
              </button>
            </div>
          </div>

          {/* Banner gợi ý gán PNK khi chọn loại phiếu PNK */}
          {loaiChungTu === 'PNK' && pendingBBBGList.length > 0 && (
            <div className="mx-4 sm:mx-5 mt-4 p-3 bg-gradient-to-r from-indigo-50/90 via-blue-50/80 to-indigo-50/90 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-lg shrink-0 shadow-xs">
                  <Warehouse className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-indigo-900 block sm:inline">
                    Tạo phiếu nhập từ BBBG tạm nhận:
                  </span>{' '}
                  <span>
                    Hệ thống có <b>{pendingBBBGList.length}</b> vật tư "Tạm nhận" từ các BBBG chưa hoàn thành đang chờ gán PNK chính thức.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBBBGIntakeOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs active:scale-95"
              >
                <Warehouse className="w-3.5 h-3.5" />
                <span>Gán vật tư BBBG (Checklist / File)</span>
              </button>
            </div>
          )}

          <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Loại chứng từ */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <span>Loại chứng từ</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={loaiChungTu === 'GUI_MUON' ? 'BBBG' : loaiChungTu}
                  onChange={(e) => handleTypeChange(e.target.value as LoaiChungTu)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a3e0] appearance-none"
                >
                  <option value="PXK">Phiếu xuất kho</option>
                  <option value="PNK">Phiếu nhập kho</option>
                  <option value="BBBG">BBBG</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Số chứng từ */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-[#004b93]" />
                <span>Số chứng từ</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={soChungTu}
                onChange={(e) => setSoChungTu(e.target.value)}
                placeholder={getPrefix(loaiChungTu)}
                className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-[#004b93] placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#00a3e0]"
              />
            </div>

            {/* Ngày tiếp nhận */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#004b93]" />
                <span>Ngày tiếp nhận</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={ngayTiepNhan}
                onChange={(e) => setNgayTiepNhan(e.target.value)}
                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a3e0]"
              />
            </div>

            {/* Cán bộ tiếp nhận */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#004b93]" />
                  <span>Cán bộ tiếp nhận</span>
                  <span className="text-rose-500">*</span>
                </label>
              </div>
              <input
                type="text"
                value={canBoTiepNhan}
                onChange={(e) => setCanBoTiepNhan(e.target.value)}
                placeholder="Nhập họ tên cán bộ tiếp nhận"
                className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a3e0]"
              />
            </div>

            {/* Ghi chú chung chứng từ - Thiết kế gọn gàng, thuận tiện thao tác trên điện thoại */}
            <div className="col-span-1 sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-[#004b93]" />
                  <span>Ghi chú chứng từ</span>
                </label>
                <span className="text-[11px] text-slate-400 font-normal">Tùy chọn</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={ghiChu}
                  onChange={(e) => setGhiChu(e.target.value)}
                  placeholder="Ghi chú đợt giao nhận, yêu cầu kỹ thuật, bàn giao (VD: Thiết bị thu hồi đợt 1...)"
                  className="w-full h-11 px-3.5 pr-9 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a3e0] transition-colors"
                />
                {ghiChu && (
                  <button
                    type="button"
                    onClick={() => setGhiChu('')}
                    className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer transition-colors"
                    title="Xóa nhanh ghi chú"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            PHẦN 2: CHI TIẾT VẬT TƯ GẮN VỚI PHIẾU
            ======================================================== */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header of Section 2 */}
          <div className="bg-gradient-to-r from-[#003870] to-[#004b93] text-white px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-400 text-slate-900 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4 text-[#003870]" />
              </div>
              <div>
                <h2 className="font-bold text-sm sm:text-base leading-tight">
                  Phần 2: Chi tiết vật tư gắn với phiếu
                </h2>
                <p className="text-[11px] text-cyan-100">
                  Nhập số liệu thiết bị đầu vào tiếp nhận
                </p>
              </div>
            </div>

            {/* Total count badge & duplicate warning badge */}
            <div className="flex items-center gap-2 text-xs font-bold">
              {duplicateItemsCount > 0 && (
                <span className="bg-amber-400 text-slate-900 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{duplicateItemsCount} vật tư trùng lặp</span>
                </span>
              )}
              <span className="bg-white/20 px-3 py-1 rounded-lg">
                Tổng: {totalItems} thiết bị
              </span>
            </div>
          </div>

          {/* Cảnh báo tổng thể nếu có vật tư bị trùng thông tin */}
          {duplicateItemsCount > 0 && (
            <div className="mx-3 sm:mx-5 mt-3.5 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">Cảnh báo trùng lặp vật tư / Serial: </span>
                  <span>
                    Phát hiện <b>{duplicateItemsCount}</b> thiết bị có cảnh báo (trùng đồng thời Serial & Tên VT trên cùng form, hoặc Serial đang chưa hoàn thành quy trình ở phiếu trước đó).
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Items Container - Bố trí trên cùng 1 dòng ngang để quan sát nhiều thiết bị cùng lúc, thao tác liên tục */}
          <div className="p-3 sm:p-5 space-y-3">
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[720px]">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-2.5 w-12 text-center">STT</th>
                      <th className="py-2.5 px-3 min-w-[240px]">
                        Tên nhãn hiệu quy cách vật tư <span className="text-rose-500">*</span>
                      </th>
                      <th className="py-2.5 px-3 w-40 sm:w-44">Mã VT</th>
                      <th className="py-2.5 px-3 w-48 sm:w-56 text-left">Số Serial (S/N)</th>
                      {isUnlocked && (
                        <th className="py-2.5 px-3 w-56 text-left text-indigo-700 font-bold">
                          <div className="flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Ghi chú riêng tư</span>
                          </div>
                        </th>
                      )}
                      <th className="py-2.5 px-2.5 w-20 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {danhSachVatTu.map((item, index) => {
                      const dupInfo = getDuplicateInfo(index);

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            dupInfo.isDuplicate
                              ? 'bg-amber-50/60 hover:bg-amber-100/60'
                              : 'hover:bg-blue-50/40'
                          }`}
                        >
                          {/* STT */}
                          <td className="py-2 px-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <span
                                className={`w-6 h-6 rounded-md text-white text-[11px] font-black flex items-center justify-center shrink-0 ${
                                  dupInfo.isDuplicate ? 'bg-amber-600' : 'bg-[#004b93]'
                                }`}
                              >
                                {index + 1}
                              </span>
                              {dupInfo.isDuplicate && (
                                <span
                                  title={
                                    dupInfo.sameLines.length > 0
                                      ? `Trùng đồng thời Serial và Tên VT với dòng #${dupInfo.sameLines.join(', #')} trên cùng form`
                                      : `Serial đang chưa hoàn thành quy trình tại: ${dupInfo.otherVouchers.map((v) => `${v.soChungTu} (${v.lyDo})`).join(', ')}`
                                  }
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Tên vật tư */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.tenVT}
                              onChange={(e) => handleUpdateItem(index, 'tenVT', e.target.value)}
                              placeholder="Tên nhãn hiệu quy cách vật tư..."
                              className="w-full h-8.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00a3e0] focus:ring-1 focus:ring-[#00a3e0]"
                            />
                          </td>

                          {/* Mã vật tư */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.maVT}
                              onChange={(e) => handleUpdateItem(index, 'maVT', e.target.value)}
                              placeholder="Mã VT..."
                              className={`w-full h-8.5 px-2.5 bg-white border rounded-lg text-xs font-mono font-bold text-[#004b93] focus:outline-none focus:ring-1 ${
                                dupInfo.isDuplicate
                                  ? 'border-amber-400 focus:ring-amber-500 bg-amber-50/40'
                                  : 'border-slate-300 focus:border-[#00a3e0] focus:ring-[#00a3e0]'
                              }`}
                            />
                          </td>

                          {/* Số Serial: TĂNG SIZE FONT, MẦU ĐỎ */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.serialNumber}
                              onChange={(e) => handleUpdateItem(index, 'serialNumber', e.target.value.toUpperCase())}
                              placeholder="Số Serial (S/N)..."
                              className={`w-full h-8.5 px-2.5 bg-red-50/50 border border-red-300 rounded-lg font-mono text-sm sm:text-base font-black text-red-600 tracking-wider focus:outline-none focus:bg-white focus:border-red-500 focus:ring-1 focus:ring-red-400 placeholder:text-red-300 placeholder:font-normal placeholder:text-xs ${
                                dupInfo.isDuplicate
                                  ? 'ring-1 ring-amber-400 bg-amber-50/50'
                                  : ''
                              }`}
                            />
                          </td>

                          {/* Ghi chú riêng tư: CHỈ HIỂN THỊ KHI ĐÃ MỞ KHÓA BẢO MẬT */}
                          {isUnlocked && (
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.privateNote || ''}
                                onChange={(e) => handleUpdateItem(index, 'privateNote', e.target.value)}
                                placeholder="Ghi chú riêng tư (sẽ mã hóa AES-256)..."
                                className="w-full h-8.5 px-2.5 bg-indigo-50/50 border border-indigo-200 rounded-lg text-xs font-medium text-indigo-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-400 placeholder:text-indigo-300"
                              />
                            </td>
                          )}

                          {/* Thao tác: Sao chép & Xóa */}
                          <td className="py-2 px-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDuplicateItem(index)}
                                className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                title="Nhân bản dòng này"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Xóa vật tư này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* + Thêm vật tư mới vào phiếu */}
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-2.5 bg-cyan-50 hover:bg-cyan-100/80 active:bg-cyan-200 border-2 border-dashed border-[#00a3e0] text-[#004b93] font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs"
            >
              <Plus className="w-4 h-4 text-[#00a3e0]" />
              <span>+ Thêm vật tư mới vào phiếu</span>
            </button>
          </div>
        </div>

        {/* Bottom Actions Bar (Sticky on mobile or bottom) */}
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 z-30">
          <div className="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto">
            <Info className="w-4 h-4 text-[#00a3e0] shrink-0" />
            <span>
              Tổng cộng <b>{totalItems}</b> thiết bị gắn với số chứng từ <b>{soChungTu}</b>
              {duplicateItemsCount > 0 && (
                <span className="text-amber-600 font-bold ml-1">
                  ({duplicateItemsCount} trùng lặp)
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {initialData && onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 sm:flex-none min-h-[46px] px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs sm:text-sm font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                title="Xóa phiếu"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Xóa phiếu</span>
              </button>
            )}

            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-none min-h-[46px] px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold cursor-pointer transition-colors"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              className="flex-1 sm:flex-none min-h-[46px] px-6 py-2.5 rounded-xl bg-[#004b93] hover:bg-[#003870] active:bg-[#002752] text-white text-xs sm:text-sm font-bold cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <Save className="w-4 h-4 text-cyan-300" />
              <span>Lưu chứng từ</span>
            </button>
          </div>
        </div>
      </form>

      {/* Confirmation Modal for Deleting Voucher */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-800">Xác nhận xóa phiếu</h3>
                <p className="text-xs text-slate-500">Thao tác này không thể hoàn tác</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600">
              Bạn có chắc chắn muốn xóa vĩnh viễn phiếu{' '}
              <span className="font-mono font-bold text-[#004b93]">
                {soChungTu || initialData?.soChungTu || 'này'}
              </span>{' '}
              cùng toàn bộ <b>{danhSachVatTu.length}</b> thiết bị vật tư liên quan không?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-bold hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (initialData && onDelete) {
                    onDelete(initialData.id);
                  }
                  setShowDeleteConfirm(false);
                  onCancel();
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Equipment Catalog Picker Modal */}
      {catalogModalIndex !== null && (
        <EquipmentCatalogModal
          isOpen={true}
          onClose={() => setCatalogModalIndex(null)}
          onSelect={(selected) => {
            handleUpdateItem(catalogModalIndex, 'maVT', selected.maVT);
            handleUpdateItem(catalogModalIndex, 'tenVT', selected.tenVT);
            setCatalogModalIndex(null);
          }}
        />
      )}

      {/* Barcode & S/N Scanner Modal */}
      {scannerModalIndex !== null && (
        <BarcodeScannerModal
          isOpen={true}
          itemTitle={danhSachVatTu[scannerModalIndex]?.tenVT || 'Thiết bị'}
          onClose={() => setScannerModalIndex(null)}
          onScanSuccess={(serial) => {
            handleUpdateItem(scannerModalIndex, 'serialNumber', serial);
            setScannerModalIndex(null);
          }}
        />
      )}

      {/* BBBG Intake & Assignment Modal */}
      <BBBGIntakeModal
        isOpen={isBBBGIntakeOpen}
        onClose={() => setIsBBBGIntakeOpen(false)}
        currentSoChungTu={soChungTu}
        existingVouchers={existingVouchers || loadVouchers()}
        onAssignSuccess={handleBBBGAssignSuccess}
      />
    </div>
  );
};
