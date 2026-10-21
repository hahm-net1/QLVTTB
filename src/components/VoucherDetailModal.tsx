import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Printer, 
  Edit, 
  Calendar, 
  User, 
  Hash, 
  Layers, 
  CheckCircle, 
  Wrench, 
  Save, 
  FileText, 
  Check, 
  CheckSquare, 
  AlertTriangle, 
  Warehouse, 
  Loader2,
  Upload,
  FileSpreadsheet,
  MoreVertical,
  Lock
} from 'lucide-react';
import { usePrivateVault } from '../context/PrivateVaultContext';
import { PhieuGiaoDich, ChiTietVatTu, TrangThaiSauSua } from '../types';
import { 
  getLoaiChungTuBadge, 
  getItemStatusBadge, 
  formatDateVN 
} from '../utils/formatters';
import { generateVoucherPDF } from '../utils/pdfGenerator';
import { parseExcelDocument } from '../utils/excelParser';
import { extractDocumentWithAI } from '../utils/ocrParser';
import { exportSingleVoucherToCSV, saveOrUpdateMultipleVouchers } from '../utils/storage';
import { isEquipmentMatched } from '../utils/equipmentMatcher';

interface VoucherDetailModalProps {
  voucher: PhieuGiaoDich | null;
  allVouchers?: PhieuGiaoDich[];
  onClose: () => void;
  onEdit: (voucher: PhieuGiaoDich) => void;
  onDelete?: (id: string) => void;
  onUpdateVoucher?: (voucher: PhieuGiaoDich) => void;
  onUpdateMultipleVouchers?: (vouchers: PhieuGiaoDich[]) => void;
}

export const VoucherDetailModal: React.FC<VoucherDetailModalProps> = ({
  voucher,
  allVouchers,
  onClose,
  onEdit,
  onUpdateVoucher,
  onUpdateMultipleVouchers,
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [items, setItems] = useState<ChiTietVatTu[]>([]);
  const [saveToast, setSaveToast] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [pdfSuccessToast, setPdfSuccessToast] = useState(false);
  const [pdfDownloadedName, setPdfDownloadedName] = useState('');
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [pnkInput, setPnkInput] = useState('');
  const [pnkScope, setPnkScope] = useState<'TOT' | 'HONG' | 'ALL'>('TOT');

  // BBBG PNK Assignment Modal States
  const [showBBBGModal, setShowBBBGModal] = useState(false);
  const [bbbgPnkInput, setBbbgPnkInput] = useState('');
  const [selectedBBBGItemIds, setSelectedBBBGItemIds] = useState<string[]>([]);
  const [bbbgFilterTab, setBbbgFilterTab] = useState<'ALL' | 'TAM_NHAN' | 'DA_GAN'>('TAM_NHAN');
  const [isParsingPnkFile, setIsParsingPnkFile] = useState(false);
  const [pnkFileNotice, setPnkFileNotice] = useState<string | null>(null);
  const pnkFileInputRef = useRef<HTMLInputElement>(null);

  // Overflow Menu State (gộp In biên bản, Xuất CSV, Chỉnh sửa)
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const overflowMenuRef = useRef<HTMLDivElement>(null);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overflowMenuRef.current && !overflowMenuRef.current.contains(event.target as Node)) {
        setShowOverflowMenu(false);
      }
    };
    if (showOverflowMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOverflowMenu]);

  const { isUnlocked, activePin, encryptNote, decryptNote } = usePrivateVault();
  const [decryptedNotes, setDecryptedNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (voucher) {
      setItems(voucher.danhSachVatTu || []);
      setIsUpdatingStatus(false);
      setShowOverflowMenu(false);
    }
  }, [voucher]);

  // Decrypt notes when unlocked
  useEffect(() => {
    if (isUnlocked && activePin && voucher?.danhSachVatTu) {
      const map: Record<string, string> = {};
      const promises = voucher.danhSachVatTu.map(async (it) => {
        if (it.privateNote) {
          const plain = await decryptNote(it.privateNote);
          map[it.id] = plain || '';
        } else {
          map[it.id] = '';
        }
      });
      Promise.all(promises).then(() => {
        setDecryptedNotes(map);
      });
    } else {
      setDecryptedNotes({});
    }
  }, [voucher, isUnlocked, activePin, decryptNote]);

  if (!voucher) return null;

  const typeBadge = getLoaiChungTuBadge(voucher.loaiChungTu);

  const isBBBG = Boolean(
    voucher && (voucher.loaiChungTu === 'GUI_MUON' || (voucher.loaiChungTu as string) === 'BBBG')
  );

  const isBBBGCompleted = Boolean(
    isBBBG &&
    voucher &&
    ((voucher.ghiChu && voucher.ghiChu.includes('Đã hoàn thành nhập kho đơn vị')) ||
      (voucher.danhSachVatTu &&
        voucher.danhSachVatTu.length > 0 &&
        voucher.danhSachVatTu.every(
          (it) => it.trangThaiHienTai === 'Đã gán' || (it.soPNKHoanTat && it.soPNKHoanTat.trim() !== '' && it.trangThaiHienTai !== 'Tạm nhận')
        )))
  );

  const totalBBBGItems = voucher.danhSachVatTu?.length || 0;
  const assignedBBBGItems = (voucher.danhSachVatTu || []).filter(
    (i) => i.trangThaiHienTai === 'Đã gán' || (i.soPNKHoanTat && i.soPNKHoanTat.trim() !== '' && i.trangThaiHienTai !== 'Tạm nhận')
  ).length;
  const pendingBBBGItems = (voucher.danhSachVatTu || []).filter(
    (i) => i.trangThaiHienTai === 'Tạm nhận' || !i.soPNKHoanTat
  ).length;

  const handleOpenBBBGModal = () => {
    if (!voucher) return;
    // Bắt đầu với mảng rỗng: người dùng tự tick chọn nhặt từng vật tư trước khi nhập số PNK
    setSelectedBBBGItemIds([]);
    setPnkFileNotice(null);
    setBbbgPnkInput('');
    setBbbgFilterTab('TAM_NHAN');
    setShowBBBGModal(true);
  };

  const handleToggleSelectBBBGItem = (id: string) => {
    setSelectedBBBGItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllPendingBBBG = () => {
    if (!voucher) return;
    const pendingIds = (voucher.danhSachVatTu || [])
      .filter((it) => it.trangThaiHienTai === 'Tạm nhận' || !it.soPNKHoanTat)
      .map((it) => it.id);
    setSelectedBBBGItemIds(pendingIds);
  };

  const handleSelectAllBBBG = () => {
    if (!voucher) return;
    setSelectedBBBGItemIds((voucher.danhSachVatTu || []).map((it) => it.id));
  };

  const handleDeselectAllBBBG = () => {
    setSelectedBBBGItemIds([]);
  };

  const handlePnkFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !voucher) return;

    setIsParsingPnkFile(true);
    setPnkFileNotice('Đang đọc tệp và trích xuất dữ liệu PNK...');

    try {
      const fileNameLower = file.name.toLowerCase();
      let extractedSoCT = '';
      let extractedItems: any[] = [];

      if (fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls') || fileNameLower.endsWith('.csv')) {
        const parsed = await parseExcelDocument(file);
        extractedSoCT = parsed.soChungTu || '';
        extractedItems = parsed.danhSachVatTu || [];
      } else {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const promptText = `Trích xuất thông tin phiếu nhập kho (PNK) từ file: ${file.name}. Đọc số chứng từ PNK và danh mục Tên thiết bị/vật tư, Số Serial Number thiết bị.`;
        const parsed = await extractDocumentWithAI(promptText, base64);
        extractedSoCT = parsed.soChungTu || '';
        extractedItems = parsed.danhSachVatTu || [];
      }

      if (extractedSoCT) {
        setBbbgPnkInput(extractedSoCT);
      }

      // Quét toàn bộ vật tư có trên BBBG: nếu khớp Tên thiết bị/vật tư và số serial thì tự động tích chọn
      const currentItems = voucher.danhSachVatTu || [];
      const matchedIds: string[] = [];

      currentItems.forEach((item) => {
        const isMatched = extractedItems.some((fItem) => isEquipmentMatched(item, fItem));
        if (isMatched) {
          matchedIds.push(item.id);
        }
      });

      if (matchedIds.length > 0) {
        setSelectedBBBGItemIds(matchedIds);
        setPnkFileNotice(
          `Đã quét file PNK: Số PNK "${extractedSoCT || file.name}". Đã tự động khớp và tích chọn ${matchedIds.length}/${currentItems.length} vật tư (khớp Tên thiết bị & Số serial). Nhấn "Hoàn thành" để gán.`
        );
      } else {
        setPnkFileNotice(
          `Đã đọc file PNK "${extractedSoCT || file.name}" nhưng chưa tìm thấy vật tư nào khớp cả Tên thiết bị & Serial trên BBBG này. Bạn có thể tích chọn thủ công bên dưới.`
        );
      }
    } catch (err: any) {
      console.error('Lỗi phân tích file PNK:', err);
      setPnkFileNotice('Lỗi khi đọc file PNK: ' + (err?.message || 'Không thể nhận diện'));
    } finally {
      setIsParsingPnkFile(false);
      if (pnkFileInputRef.current) pnkFileInputRef.current.value = '';
    }
  };

  const handleConfirmBBBGAssign = () => {
    if (!bbbgPnkInput.trim()) {
      alert('Vui lòng nhập hoặc chọn Số Phiếu Nhập Kho (PNK).');
      return;
    }
    if (selectedBBBGItemIds.length === 0) {
      alert('Vui lòng tích chọn ít nhất 1 vật tư để gán PNK.');
      return;
    }

    const trimmedPNK = bbbgPnkInput.trim();
    const selectedSet = new Set(selectedBBBGItemIds);

    const updatedItems = (voucher.danhSachVatTu || []).map((it) => {
      if (selectedSet.has(it.id)) {
        return {
          ...it,
          soPNKHoanTat: trimmedPNK,
          trangThaiHienTai: 'Đã gán',
        };
      }
      // Những vật tư chưa được chọn: giữ nguyên trạng thái "Tạm nhận" và trường "Số PNK" rỗng
      const isPreviouslyAssigned = it.trangThaiHienTai === 'Đã gán' && Boolean(it.soPNKHoanTat);
      return {
        ...it,
        soPNKHoanTat: isPreviouslyAssigned ? it.soPNKHoanTat : '',
        trangThaiHienTai: isPreviouslyAssigned ? 'Đã gán' : 'Tạm nhận',
      };
    });

    // BBBG sau khi hoàn thành gán PNK phần Ghi chú phiếu sẽ thêm dòng "Đã hoàn thành nhập kho đơn vị"
    const allAssigned = updatedItems.length > 0 && updatedItems.every(
      (it) => it.trangThaiHienTai === 'Đã gán' && it.soPNKHoanTat && it.soPNKHoanTat.trim() !== ''
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

    const updatedVoucher: PhieuGiaoDich = {
      ...voucher,
      danhSachVatTu: updatedItems,
      ghiChu: newGhiChu,
      updatedAt: new Date().toISOString(),
    };

    // Tự động sinh ra phiếu nhập như quá trình tạo phiếu mới và trường "Trạng thái" lúc này sẽ là "Tiếp nhận mới"
    const selectedVatTu = (voucher.danhSachVatTu || []).filter((it) => selectedSet.has(it.id));
    const now = new Date().toISOString();
    const newItemsForPNK: ChiTietVatTu[] = selectedVatTu.map((it, idx) => ({
      ...it,
      id: `vt-${Date.now()}-${idx}`,
      soPNKHoanTat: '', // Số PNK là đầu vào khởi tạo phiếu mới (soChungTu), không phải "Số PNK hoàn tất" (đầu ra sau sửa chữa)
      trangThaiHienTai: 'Tiếp nhận mới', // Trường "Trạng thái" tại phiếu nhập kho mới lúc này sẽ là "Tiếp nhận mới"
      ghiChuVatTu: it.ghiChuVatTu || '', // Tuyệt đối không tự động điền, chỉ ghi nội dung do người dùng nhập vào
    }));

    // Kiểm tra xem phiếu nhập kho này đã có sẵn trên hệ thống hay chưa
    const existingPNKVoucher = (allVouchers || []).find(
      (v) => v.loaiChungTu === 'PNK' && v.soChungTu.trim().toUpperCase() === trimmedPNK.toUpperCase()
    );

    let intakeVoucherToSave: PhieuGiaoDich;
    if (existingPNKVoucher) {
      intakeVoucherToSave = {
        ...existingPNKVoucher,
        danhSachVatTu: [...existingPNKVoucher.danhSachVatTu, ...newItemsForPNK],
        updatedAt: now,
      };
    } else {
      intakeVoucherToSave = {
        id: `phieu-${Date.now()}`,
        soChungTu: trimmedPNK,
        loaiChungTu: 'PNK',
        ngayTiepNhan: new Date().toISOString().slice(0, 10),
        donViLienQuan: voucher.donViLienQuan || '',
        canBoTiepNhan: voucher.canBoTiepNhan || '',
        ghiChu: `Tự động tạo từ BBBG số ${voucher.soChungTu}`,
        danhSachVatTu: newItemsForPNK,
        createdAt: now,
        updatedAt: now,
      };
    }

    setItems(updatedItems);

    if (onUpdateMultipleVouchers) {
      onUpdateMultipleVouchers([updatedVoucher, intakeVoucherToSave]);
    } else {
      saveOrUpdateMultipleVouchers([updatedVoucher, intakeVoucherToSave]);
      if (onUpdateVoucher) {
        onUpdateVoucher(updatedVoucher);
      }
    }

    setShowBBBGModal(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2200);
  };

  // Điều kiện kiểm tra: đã hoàn thành quá trình "cập nhật sau sửa chữa"
  // (không còn toàn bộ thiết bị ở trạng thái "Tiếp nhận mới")
  const hasCompletedPostRepair = Boolean(
    voucher &&
    voucher.danhSachVatTu &&
    voucher.danhSachVatTu.length > 0 &&
    voucher.danhSachVatTu.some(
      (it) => it.trangThaiHienTai && it.trangThaiHienTai !== 'Tiếp nhận mới'
    )
  );

  const handlePrint = async () => {
    if (!printRef.current) {
      window.print();
      return;
    }

    try {
      setIsExportingPDF(true);
      const safeCode = voucher.soChungTu.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Bien-Ban-${safeCode}.pdf`;
      await generateVoucherPDF(printRef.current, fileName, true);
      setPdfDownloadedName(fileName);
      setPdfSuccessToast(true);
      setTimeout(() => setPdfSuccessToast(false), 3500);
    } catch (err) {
      console.error('Lỗi khi tạo PDF:', err);
      window.print();
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleConfirmWarehouseIntake = () => {
    if (!pnkInput.trim()) {
      return;
    }

    const trimmedPNK = pnkInput.trim();
    const updatedItems = (voucher.danhSachVatTu || []).map((it) => {
      let isEligible = false;
      const curStatus = it.trangThaiHienTai || 'Tiếp nhận mới';
      if (pnkScope === 'TOT') {
        isEligible = curStatus === 'NK tốt' || (it.trangThaiSauSua === 'TOT' && curStatus !== 'Tiếp nhận mới' && curStatus !== 'NK hỏng');
      } else if (pnkScope === 'HONG') {
        isEligible = curStatus === 'NK hỏng' || (it.trangThaiSauSua === 'HONG' && curStatus !== 'Tiếp nhận mới' && curStatus !== 'NK tốt');
      } else if (pnkScope === 'ALL') {
        isEligible = true;
      }

      if (isEligible) {
        return {
          ...it,
          soPNKHoanTat: trimmedPNK,
          trangThaiHienTai:
            curStatus === 'NK hỏng' || (it.trangThaiSauSua === 'HONG' && curStatus !== 'NK tốt')
              ? 'NK hỏng'
              : 'NK tốt',
        };
      }
      return it;
    });

    const updatedVoucher: PhieuGiaoDich = {
      ...voucher,
      danhSachVatTu: updatedItems,
      updatedAt: new Date().toISOString(),
    };

    setItems(updatedItems);
    if (onUpdateVoucher) {
      onUpdateVoucher(updatedVoucher);
    }

    setShowWarehouseModal(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleOpenUpdateStatus = () => {
    if (isBBBG) return;
    const rawItems = voucher.danhSachVatTu || [];
    // Kiểm tra nếu tất cả vật tư đều đang ở trạng thái tiếp nhận mới (hoặc chưa có trạng thái)
    const isAllNewlyReceived =
      rawItems.length > 0 &&
      rawItems.every((it) => !it.trangThaiHienTai || it.trangThaiHienTai === 'Tiếp nhận mới');

    const preparedItems = rawItems.map((it) => {
      // Đối với phiếu mới khởi tạo mà tất cả vật tư đều đang ở trạng thái tiếp nhận mới
      // thì khi click "cập nhật sau sửa chữa" lần đầu tiên thì "trạng thái sau sửa chữa" của các vật tư đều là "Lỗi"
      const sauSua = isAllNewlyReceived ? 'LOI' : (it.trangThaiSauSua || 'TOT');
      let hienTai = it.trangThaiHienTai;
      if (!hienTai || hienTai === 'Tiếp nhận mới' || hienTai === 'Đang sửa chữa') {
        if (sauSua === 'TOT') hienTai = 'NK tốt';
        else if (sauSua === 'HONG') hienTai = 'NK hỏng';
        else hienTai = 'Kiểm tra thêm';
      }
      return {
        ...it,
        trangThaiSauSua: sauSua,
        trangThaiHienTai: hienTai,
      };
    });
    setItems(preparedItems);
    setIsUpdatingStatus(true);
  };

  const handleTrangThaiSauSuaChange = (index: number, newSauSua: TrangThaiSauSua) => {
    const updated = [...items];
    let newHienTai = updated[index].trangThaiHienTai;
    if (newSauSua === 'TOT') {
      newHienTai = 'NK tốt';
    } else if (newSauSua === 'HONG') {
      newHienTai = 'NK hỏng';
    } else if (newSauSua === 'LOI') {
      // riêng trạng thái Lỗi có thể lựa chọn 1 trong 3 "trạng thái hiện tại"
      if (!['Kiểm tra thêm', 'NK tốt', 'NK hỏng'].includes(newHienTai)) {
        newHienTai = 'Kiểm tra thêm';
      }
    }
    updated[index] = {
      ...updated[index],
      trangThaiSauSua: newSauSua,
      trangThaiHienTai: newHienTai,
    };
    setItems(updated);
  };

  const handleSetAllTrangThaiSauSua = (newStatus: TrangThaiSauSua) => {
    let newHienTai = 'NK tốt';
    if (newStatus === 'HONG') newHienTai = 'NK hỏng';
    else if (newStatus === 'LOI') newHienTai = 'Kiểm tra thêm';

    const updated = items.map((it) => ({
      ...it,
      trangThaiSauSua: newStatus,
      trangThaiHienTai: newHienTai,
    }));
    setItems(updated);
  };

  const handleItemFieldChange = (index: number, field: keyof ChiTietVatTu, val: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: val,
    };
    setItems(updated);
  };

  const handleSaveStatusUpdate = async () => {
    const now = new Date().toISOString();
    let updatedItems = items.map((it) => ({
      ...it,
      updatedAt: now,
    }));

    if (isUnlocked && activePin) {
      updatedItems = await Promise.all(
        updatedItems.map(async (it) => {
          const plain = decryptedNotes[it.id];
          if (plain !== undefined) {
            const cipher = plain.trim() ? await encryptNote(plain.trim()) : '';
            return { ...it, privateNote: cipher };
          }
          return it;
        })
      );
    }

    const updatedVoucher: PhieuGiaoDich = {
      ...voucher,
      danhSachVatTu: updatedItems,
      updatedAt: now,
    };

    if (onUpdateVoucher) {
      onUpdateVoucher(updatedVoucher);
    }

    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      setIsUpdatingStatus(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 relative">
        {/* Toast Save Alert */}
        {saveToast && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in">
            <CheckCircle className="w-4 h-4" />
            <span>Đã lưu kết quả sau sửa chữa và đồng bộ toàn hệ thống!</span>
          </div>
        )}

        {/* Toast PDF Downloaded Alert */}
        {pdfSuccessToast && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-[#004b93] text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in border border-cyan-300">
            <CheckCircle className="w-4 h-4 text-cyan-300" />
            <span>Đã tạo và tải file PDF thành công: {pdfDownloadedName}</span>
          </div>
        )}

        {/* Header - Not printed */}
        <div className="bg-[#004b93] text-white px-4 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-mono text-sm sm:text-base md:text-lg font-black bg-[#00a3e0] text-white px-3 py-1 rounded-lg shrink-0 shadow-xs tracking-wider">
              {voucher.soChungTu}
            </span>
            <h3 className="font-bold text-sm sm:text-base truncate">
              {isUpdatingStatus ? 'Cập nhật kết quả sau sửa chữa' : 'Chi tiết phiếu tiếp nhận & vật tư'}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isUpdatingStatus ? (
              <>
                {/* Button to enter repair update mode (chỉ dành cho phiếu thông thường, BBBG không có quy trình sửa chữa/tình trạng) */}
                {!isBBBG && (
                  <button
                    onClick={handleOpenUpdateStatus}
                    className="h-8 px-2.5 sm:px-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs text-white"
                    title="Cập nhật trạng thái sau sửa chữa"
                  >
                    <Wrench className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Cập nhật sau sửa</span>
                    <span className="sm:hidden">Cập nhật</span>
                  </button>
                )}

                {/* Đối với BBBG: Nút Gán PNK cho vật tư */}
                {isBBBG ? (
                  <button
                    onClick={handleOpenBBBGModal}
                    className={`h-8 px-2.5 sm:px-3 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${
                      isBBBGCompleted ? 'bg-indigo-700 hover:bg-indigo-600' : 'bg-amber-600 hover:bg-amber-500'
                    }`}
                    title="Gán số PNK cho các vật tư trên BBBG sang Phiếu Nhập Kho"
                  >
                    <Warehouse className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">
                      {isBBBGCompleted ? 'Xem/Sửa gán PNK' : 'Gán PNK cho VT'}
                    </span>
                    <span className="sm:hidden">Gán PNK</span>
                  </button>
                ) : (
                  /* Bổ sung nút "Nhập kho" sau khi kết thúc quá trình "cập nhật sau sửa chữa", nếu chưa hoàn thành thì không hiển thị */
                  hasCompletedPostRepair && (
                    <button
                      onClick={() => {
                        const existing = voucher.danhSachVatTu.find((i) => i.soPNKHoanTat)?.soPNKHoanTat;
                        setPnkInput(existing || `PNK-HT-${voucher.soChungTu.replace(/[^0-9A-Za-z]/g, '') || Date.now().toString().slice(-6)}`);
                        setShowWarehouseModal(true);
                      }}
                      className="h-8 px-2.5 sm:px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                      title="Nhập kho thiết bị & gán Số PNK hoàn tất"
                    >
                      <Warehouse className="w-3.5 h-3.5 shrink-0" />
                      <span>Nhập kho</span>
                    </button>
                  )
                )}

                {/* Overflow Menu gộp 3 chức năng: In biên bản (PDF), Xuất CSV, Chỉnh sửa */}
                <div className="relative" ref={overflowMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowOverflowMenu((prev) => !prev)}
                    className={`h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs text-white ${
                      showOverflowMenu
                        ? 'bg-white/30 ring-2 ring-white/40'
                        : 'bg-white/15 hover:bg-white/25 active:bg-white/30'
                    }`}
                    title="Thao tác khác: In biên bản, Xuất CSV, Chỉnh sửa"
                    aria-label="Thao tác khác"
                    aria-expanded={showOverflowMenu}
                  >
                    <MoreVertical className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Thao tác</span>
                  </button>

                  {showOverflowMenu && (
                    <div className="absolute right-0 top-full mt-1.5 w-56 sm:w-60 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                      {/* 1. In biên bản & Tự động xuất tệp PDF */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowOverflowMenu(false);
                          handlePrint();
                        }}
                        disabled={isExportingPDF}
                        className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-700 shrink-0">
                          {isExportingPDF ? (
                            <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                          ) : (
                            <Printer className="w-4 h-4 text-cyan-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="block font-bold text-slate-800 text-xs">
                            {isExportingPDF ? 'Đang tạo PDF...' : 'In biên bản (PDF)'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal block truncate">
                            Xuất tệp PDF & mở lệnh in A4
                          </span>
                        </div>
                      </button>

                      {/* 2. Xuất file CSV biểu mẫu: BBBG dùng Số PNK, các phiếu khác dùng Số PNK hoàn tất */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowOverflowMenu(false);
                          exportSingleVoucherToCSV(voucher);
                        }}
                        className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors cursor-pointer"
                        title={
                          isBBBG
                            ? 'Xuất tệp CSV cho BBBG (cột Số PNK)'
                            : 'Xuất tệp CSV cho phiếu (cột Số PNK hoàn tất)'
                        }
                      >
                        <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <span className="block font-bold text-slate-800 text-xs">Xuất file CSV</span>
                          <span className="text-[10px] text-slate-400 font-normal block truncate">
                            {isBBBG ? 'Cột Số PNK theo BBBG' : 'Cột Số PNK hoàn tất'}
                          </span>
                        </div>
                      </button>

                      <div className="my-1 border-t border-slate-100" />

                      {/* 3. Chỉnh sửa phiếu */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowOverflowMenu(false);
                          onEdit(voucher);
                          onClose();
                        }}
                        className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-amber-900 hover:bg-amber-50/70 flex items-center gap-3 transition-colors cursor-pointer"
                        title="Chỉnh sửa phiếu"
                      >
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                          <Edit className="w-4 h-4 text-amber-700" />
                        </div>
                        <div className="min-w-0">
                          <span className="block font-bold text-amber-900 text-xs">Chỉnh sửa phiếu</span>
                          <span className="text-[10px] text-amber-700/70 font-normal block truncate">
                            Cập nhật thông tin phiếu tiếp nhận
                          </span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={() => setIsUpdatingStatus(false)}
                className="h-8 px-3 bg-slate-600 hover:bg-slate-500 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all text-white shadow-xs"
              >
                <span>Hủy</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-white/90 hover:text-white cursor-pointer transition-colors"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Printable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 print:p-0 print:overflow-visible">
          {/* ========================================================
              IF IN STATUS UPDATE MODE: SHOW UPDATE FORM
              ======================================================== */}
          {isUpdatingStatus ? (
            <div className="space-y-4">
              {/* Prominent Voucher Code & Quick Actions in Status Update */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
                <div>
                  <span className="text-slate-500 text-xs font-semibold block">Số phiếu tiếp nhận:</span>
                  <div className="text-lg sm:text-xl font-mono font-black text-[#004b93] tracking-wider mt-0.5">
                    {voucher.soChungTu}
                  </div>
                </div>

                {/* Bulk Checklist Actions */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-600 mr-1">Đánh dấu tất cả:</span>
                  <button
                    type="button"
                    onClick={() => handleSetAllTrangThaiSauSua('TOT')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Tất cả Tốt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllTrangThaiSauSua('HONG')}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Tất cả Hỏng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllTrangThaiSauSua('LOI')}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Tất cả Lỗi</span>
                  </button>
                </div>
              </div>

              {/* Detail Items Status Update List */}
              {/* Detail Items Status Update List: Tối ưu 1 hàng ngang xem nhiều dòng cùng lúc, thao tác liên tục */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <h4 className="font-bold text-xs text-slate-800 uppercase flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#00a3e0]" />
                    <span>Danh mục vật tư cập nhật sau sửa chữa • {items.length} thiết bị</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Bảng thao tác liên tục trên 1 hàng ngang
                  </span>
                </div>

                {/* Table Container for Maximum Density & Continuous Operation */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <div className="overflow-x-auto max-h-[58vh]">
                    <table className="w-full text-left border-collapse min-w-[840px]">
                      <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider shadow-2xs">
                        <tr>
                          <th className="py-2 px-2.5 w-12 text-center">STT</th>
                          <th className="py-2 px-3 w-64">Tên vật tư & Mã VT</th>
                          <th className="py-2 px-3 w-52 text-left">Serial (S/N)</th>
                          <th className="py-2 px-3 w-56 text-center">Trạng thái sau sửa</th>
                          <th className="py-2 px-3">Ghi chú sau sửa chữa</th>
                          {isUnlocked && (
                            <th className="py-2 px-3 w-56 text-indigo-700 font-bold">
                              <div className="flex items-center gap-1">
                                <Lock className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Ghi chú riêng tư</span>
                              </div>
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {items.map((item, idx) => (
                          <tr
                            key={item.id}
                            className="hover:bg-blue-50/40 transition-colors"
                          >
                            {/* STT */}
                            <td className="py-2 px-2.5 text-center font-bold text-slate-500 whitespace-nowrap">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#004b93] text-white text-[11px] font-black">
                                {idx + 1}
                              </span>
                            </td>

                            {/* Tên VT & Mã VT */}
                            <td className="py-2 px-3">
                              <div className="font-bold text-xs text-slate-900 leading-snug line-clamp-1" title={item.tenVT}>
                                {item.tenVT}
                              </div>
                              {item.maVT && (
                                <span className="inline-block mt-0.5 font-mono text-[10px] bg-blue-50 text-[#004b93] font-semibold px-1.5 py-0.2 rounded border border-blue-200">
                                  Mã VT: {item.maVT}
                                </span>
                              )}
                            </td>

                            {/* Serial: TĂNG SIZE FONT, MẦU ĐỎ */}
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span className="font-mono text-sm sm:text-base font-black text-red-600 tracking-wider bg-red-50/70 border border-red-200 px-2.5 py-0.5 rounded-lg inline-block shadow-2xs">
                                {item.serialNumber || '—'}
                              </span>
                            </td>

                            {/* Cụm nút chọn trạng thái sau sửa: Thao tác nhanh 1 chạm */}
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleTrangThaiSauSuaChange(idx, 'TOT')}
                                  className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                                    item.trangThaiSauSua === 'TOT'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                  }`}
                                  title="Tốt"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Tốt</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleTrangThaiSauSuaChange(idx, 'HONG')}
                                  className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                                    item.trangThaiSauSua === 'HONG'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                  }`}
                                  title="Hỏng"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Hỏng</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleTrangThaiSauSuaChange(idx, 'LOI')}
                                  className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                                    item.trangThaiSauSua === 'LOI'
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                  }`}
                                  title="Lỗi"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Lỗi</span>
                                </button>
                              </div>
                            </td>

                            {/* Ô ghi chú sau sửa chữa */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.ghiChuVatTu || ''}
                                onChange={(e) => handleItemFieldChange(idx, 'ghiChuVatTu', e.target.value)}
                                placeholder="Ghi chú sau sửa chữa..."
                                className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-[#00a3e0] focus:ring-1 focus:ring-[#00a3e0]"
                              />
                            </td>

                            {/* Ô ghi chú riêng tư (Chỉ hiển thị khi đã mở khóa bảo mật) */}
                            {isUnlocked && (
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={decryptedNotes[item.id] !== undefined ? decryptedNotes[item.id] : ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setDecryptedNotes((prev) => ({ ...prev, [item.id]: val }));
                                    setIsUpdatingStatus(true);
                                  }}
                                  placeholder="Ghi chú riêng tư (sẽ mã hóa)..."
                                  className="w-full h-8 px-2.5 bg-indigo-50/50 border border-indigo-200 rounded-lg text-xs font-medium text-indigo-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-400 placeholder:text-indigo-300"
                                />
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Action Save Status */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUpdatingStatus(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveStatusUpdate}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu kết quả sau sửa chữa</span>
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================
                NORMAL VIEW: OFFICIAL VOUCHER DETAILS & PRINT
                ======================================================== */
            <div ref={printRef} id="printable-voucher-document" className="bg-white space-y-4 print:p-0">
              {/* Header hành chính chuẩn hóa: Tinh giản khung viền, trang nhã */}
              <div className="border-b border-slate-300 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-0.5">
                  <h1 className="text-xs sm:text-sm font-bold uppercase tracking-tight text-slate-900">
                    HỆ THỐNG QUẢN LÝ VẬT TƯ & THIẾT BỊ
                  </h1>
                  <p className="text-[11px] text-slate-500 font-medium">
                    BỘ PHẬN ĐIỀU PHỐI, KIỂM KÊ & SỬA CHỮA THIẾT BỊ
                  </p>
                </div>

                <div className="text-left sm:text-right space-y-0.5">
                  <div className="text-[11px] font-bold text-slate-800 uppercase tracking-tight">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                  <div className="text-[10px] text-slate-500 italic">
                    Độc lập - Tự do - Hạnh phúc
                  </div>
                  <div className="pt-0.5">
                    <span className="font-mono text-xs font-bold text-[#004b93] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Số phiếu: {voucher.soChungTu}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tiêu đề biểu mẫu */}
              <div className="text-center py-1">
                <h2 className="text-base sm:text-lg md:text-xl font-black uppercase text-[#004b93] tracking-wide">
                  {voucher.loaiChungTu === 'PXK' && 'BIÊN BẢN XUẤT KHO THIẾT BỊ'}
                  {voucher.loaiChungTu === 'PNK' && 'BIÊN BẢN NHẬP KHO THIẾT BỊ'}
                  {(voucher.loaiChungTu === 'GUI_MUON' || (voucher.loaiChungTu as string) === 'BBBG') && 'BIÊN BẢN BÀN GIAO THIẾT BỊ (BBBG)'}
                </h2>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
                  <span>Ngày lập phiếu: <strong className="text-slate-700">{formatDateVN(voucher.ngayTiepNhan)}</strong></span>
                  <span>•</span>
                  <span>Hình thức: <strong className="text-slate-700">{typeBadge.label}</strong></span>
                </div>
              </div>

              {/* Banner trạng thái tiến độ hoặc hoàn thành cho BBBG */}
              {isBBBG && (
                <div>
                  {isBBBGCompleted ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-black text-xs sm:text-sm">ĐÃ HOÀN THÀNH NHẬP KHO ĐƠN VỊ</span>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            Toàn bộ {assignedBBBGItems}/{totalBBBGItems} vật tư trên biên bản đã được gán số PNK nhập kho.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                          <span className="font-bold text-xs sm:text-sm">Tiến độ cập nhật gán PNK cho vật tư BBBG</span>
                          <p className="text-[11px] text-amber-800 mt-0.5">
                            Đã gán PNK: <strong className="text-emerald-700">{assignedBBBGItems}</strong> • Còn lại: <strong className="text-amber-800">{pendingBBBGItems} Tạm nhận</strong> / {totalBBBGItems} thiết bị.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenBBBGModal}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs print:hidden shrink-0 transition-colors"
                      >
                        <Warehouse className="w-3.5 h-3.5" />
                        <span>Gán PNK cho vật tư</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Khung thông tin chung: Đơn giản hóa khung viền theo chuẩn hành chính, không rườm rà */}
              <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                  <div className="flex items-baseline justify-between border-b border-slate-200/80 pb-1">
                    <span className="text-slate-500 font-medium">Số phiếu:</span>
                    <span className="font-mono font-bold text-[#004b93] tracking-wide">
                      {voucher.soChungTu}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between border-b border-slate-200/80 pb-1">
                    <span className="text-slate-500 font-medium">Loại chứng từ:</span>
                    <span className="font-bold text-slate-800">
                      {typeBadge.label}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between border-b border-slate-200/80 pb-1">
                    <span className="text-slate-500 font-medium">Cán bộ tiếp nhận:</span>
                    <span className="font-bold text-slate-800">
                      {voucher.canBoTiepNhan}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between border-b border-slate-200/80 pb-1">
                    <span className="text-slate-500 font-medium">Ngày ghi nhận:</span>
                    <span className="font-medium text-slate-800">
                      {formatDateVN(voucher.ngayTiepNhan)}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between border-b border-slate-200/80 pb-1">
                    <span className="text-slate-500 font-medium">Số lượng thiết bị:</span>
                    <span className="font-bold text-[#004b93]">
                      {voucher.danhSachVatTu.length} thiết bị
                    </span>
                  </div>

                  {/* Hiển thị số PNK nếu có */}
                  <div className="flex items-baseline justify-between border-b border-slate-200/80 pb-1">
                    <span className="text-slate-500 font-medium">
                      {isBBBG ? 'Số PNK:' : 'Số PNK hoàn tất:'}
                    </span>
                    {(() => {
                      const pnkItem = voucher.danhSachVatTu.find((i) => Boolean(i.soPNKHoanTat));
                      return pnkItem ? (
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-xs">
                          {pnkItem.soPNKHoanTat}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">—</span>
                      );
                    })()}
                  </div>
                </div>

                {voucher.ghiChu && (
                  <div className="mt-2 pt-2 border-t border-slate-200/80 text-[11px]">
                    <span className="text-slate-500 font-semibold">Ghi chú phiếu: </span>
                    <span className="text-slate-700 italic">{voucher.ghiChu}</span>
                  </div>
                )}
              </div>

              {/* Chi tiết danh mục thiết bị, vật tư */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#00a3e0]" />
                    <span>Chi tiết danh mục thiết bị, vật tư ({voucher.danhSachVatTu.length})</span>
                  </h4>

                  {!isBBBG && (
                    <button
                      onClick={handleOpenUpdateStatus}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer print:hidden bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Cập nhật kết quả sửa</span>
                    </button>
                  )}
                </div>

                {/* Mobile View: Dạng thẻ khi xem lướt trên điện thoại (sẽ tự động ẩn khi xuất PDF hoặc In ấn) */}
                <div className="sm:hidden space-y-2.5 print:hidden">
                  {voucher.danhSachVatTu.map((item, idx) => {
                    const statusBadge = getItemStatusBadge(item.trangThaiHienTai || 'Tiếp nhận mới');
                    return (
                      <div key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-[#004b93] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-mono text-xs font-bold text-[#004b93]">
                              {item.maVT || '—'}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${statusBadge.bg} ${statusBadge.border}`}>
                            {statusBadge.label}
                          </span>
                        </div>

                        <h5 className="font-semibold text-slate-800 text-xs leading-snug">
                          {item.tenVT}
                        </h5>

                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/80">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Số Serial:</span>
                            <span className="font-mono font-bold text-red-600 text-xs">{item.serialNumber || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">{isBBBG ? 'Hiện trạng:' : 'Trạng thái:'}</span>
                            <span className={`font-semibold ${statusBadge.text}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                        </div>

                        {/* Số PNK ở bên phải của card trên mobile */}
                        {item.soPNKHoanTat ? (
                          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/80 bg-indigo-50/60 p-2 rounded-lg">
                            <span className="text-slate-600 font-semibold text-[11px] flex items-center gap-1">
                              <Warehouse className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{isBBBG ? 'Số PNK:' : 'Số PNK hoàn tất:'}</span>
                            </span>
                            <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 text-xs">
                              {item.soPNKHoanTat}
                            </span>
                          </div>
                        ) : null}

                        {item.ghiChuVatTu && (
                          <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200/50">
                            Ghi chú: {item.ghiChuVatTu}
                          </div>
                        )}

                        {isUnlocked && decryptedNotes[item.id] && (
                          <div className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 p-2 rounded-lg flex items-start gap-1.5 font-medium">
                            <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                            <span>Ghi chú riêng: {decryptedNotes[item.id]}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bảng biểu chính thức: Thể hiện đầy đủ tất cả nội dung, đơn giản hóa khung viền kẻ ô chuẩn mực */}
                <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-300 print:block">
                  <table className="w-full text-left text-xs border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
                        <th className="py-2 px-2 font-bold text-center w-10 border border-slate-300">STT</th>
                        <th className="py-2 px-2.5 font-bold text-center w-28 border border-slate-300 whitespace-nowrap">Mã VT</th>
                        <th className="py-2 px-3 font-bold border border-slate-300">Tên thiết bị / Vật tư</th>
                        <th className="py-2 px-3 font-bold text-center w-36 border border-slate-300 whitespace-nowrap">Số Serial (S/N)</th>
                        <th className="py-2 px-2.5 font-bold text-center w-28 border border-slate-300 whitespace-nowrap">
                          {isBBBG ? 'Hiện trạng' : 'Trạng thái'}
                        </th>
                        {/* Cột Số PNK đối với form BBBG, và Số PNK hoàn tất đối với các biểu mẫu khác */}
                        <th className="py-2 px-3 font-bold text-center w-36 border border-slate-300 whitespace-nowrap">
                          {isBBBG ? 'Số PNK' : 'Số PNK hoàn tất'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {voucher.danhSachVatTu.map((item, idx) => {
                        const statusBadge = getItemStatusBadge(item.trangThaiHienTai || 'Tiếp nhận mới');
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70">
                            <td className="py-2 px-2 text-center text-slate-600 font-medium border border-slate-300">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-2.5 text-center font-mono font-bold text-[#004b93] border border-slate-300 whitespace-nowrap">
                              {item.maVT || '—'}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-800 border border-slate-300">
                              <div>{item.tenVT}</div>
                              {item.ghiChuVatTu && (
                                <span className="block text-[10px] text-slate-400 font-normal italic mt-0.5">
                                  Ghi chú: {item.ghiChuVatTu}
                                </span>
                              )}
                              {isUnlocked && decryptedNotes[item.id] && (
                                <div className="mt-1 text-[11px] text-indigo-700 font-medium flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                  <Lock className="w-3 h-3 text-indigo-600 shrink-0" />
                                  <span>Ghi chú riêng: {decryptedNotes[item.id]}</span>
                                </div>
                              )}
                            </td>
                            {/* Serial Number: font to và màu đỏ nổi bật */}
                            <td className="py-2 px-3 text-center font-mono font-black text-red-600 text-xs sm:text-[13px] border border-slate-300 whitespace-nowrap tracking-wide">
                              {item.serialNumber || '—'}
                            </td>
                            <td className="py-2 px-2.5 text-center border border-slate-300 whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${statusBadge.bg} ${statusBadge.border}`}>
                                {statusBadge.label}
                              </span>
                            </td>
                            {/* Cột Số PNK ở bên phải: nếu chưa gán thì để rỗng */}
                            <td className="py-2 px-3 text-center border border-slate-300 whitespace-nowrap">
                              {item.soPNKHoanTat ? (
                                <span className="inline-flex items-center gap-1 font-mono font-bold text-xs bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded shadow-2xs">
                                  <Warehouse className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  <span>{item.soPNKHoanTat}</span>
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Chữ ký xác nhận A4: Tinh gọn, rõ ràng */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs text-slate-800">
                <div>
                  <p className="font-bold uppercase tracking-wider">NGƯỜI GIAO THIẾT BỊ</p>
                  <p className="text-[11px] text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</p>
                  <div className="h-16" />
                </div>

                <div>
                  <p className="font-bold uppercase tracking-wider">CÁN BỘ TIẾP NHẬN</p>
                  <p className="text-[11px] text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</p>
                  <div className="h-16" />
                  <p className="font-bold text-slate-900">{voucher.canBoTiepNhan}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2 text-xs text-slate-500 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-sm text-[#004b93] bg-white px-2 py-0.5 rounded border border-slate-200">
              Số phiếu: {voucher.soChungTu}
            </span>
            <span className="text-slate-300">•</span>
            <span>Tạo lúc: {new Date(voucher.createdAt).toLocaleString('vi-VN')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

        {/* Modal Hoàn tất Nhập kho */}
        {showWarehouseModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                    <Warehouse className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                      Hoàn tất Nhập kho thiết bị
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Gán Số PNK hoàn tất cho danh mục vật tư
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWarehouseModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                {(() => {
                  const countTot = voucher.danhSachVatTu.filter((i) => i.trangThaiHienTai === 'NK tốt').length;
                  const countHong = voucher.danhSachVatTu.filter((i) => i.trangThaiHienTai === 'NK hỏng').length;
                  const countKTT = voucher.danhSachVatTu.filter((i) => i.trangThaiHienTai === 'Kiểm tra thêm' || i.trangThaiHienTai === 'Đang sửa chữa').length;
                  const countMoi = voucher.danhSachVatTu.filter((i) => !i.trangThaiHienTai || i.trangThaiHienTai === 'Tiếp nhận mới').length;
                  const countAll = voucher.danhSachVatTu.length;

                  return (
                    <>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Số phiếu tiếp nhận:</span>
                          <span className="font-mono font-bold text-[#004b93]">{voucher.soChungTu}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tổng số thiết bị trong phiếu:</span>
                          <span className="font-bold text-slate-800">{countAll} thiết bị</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Thiết bị TỐT (NK tốt):</span>
                          <span className="font-bold text-emerald-600">{countTot} thiết bị</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Thiết bị HỎNG (NK hỏng):</span>
                          <span className="font-bold text-rose-600">{countHong} thiết bị</span>
                        </div>
                        {countKTT > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Kiểm tra thêm:</span>
                            <span className="font-bold text-amber-600">{countKTT} thiết bị</span>
                          </div>
                        )}
                        {countMoi > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Tiếp nhận mới (chưa sửa):</span>
                            <span className="font-bold text-blue-600">{countMoi} thiết bị</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Số PNK hoàn tất <span className="text-rose-500">*</span>:
                        </label>
                        <input
                          type="text"
                          value={pnkInput}
                          onChange={(e) => setPnkInput(e.target.value)}
                          placeholder="Ví dụ: THA-KHO28-PNK9506 hoặc PNK-HT-26-001"
                          className="w-full h-10 px-3 font-mono font-bold text-indigo-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          autoFocus
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          Số phiếu này sẽ được cập nhật đồng thời vào trường "Số PNK hoàn tất" ở bên phải của dòng thiết bị và các bảng liên quan.
                        </p>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Phạm vi áp dụng nhập kho:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {/* Option 1: Thiết bị TỐT */}
                          <button
                            type="button"
                            onClick={() => setPnkScope('TOT')}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                              pnkScope === 'TOT'
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-emerald-700">Thiết bị TỐT</span>
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">
                                {countTot}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1">
                              Trạng thái: <strong>NK tốt</strong>
                            </div>
                          </button>

                          {/* Option 2: Thiết bị HỎNG */}
                          <button
                            type="button"
                            onClick={() => setPnkScope('HONG')}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                              pnkScope === 'HONG'
                                ? 'border-rose-600 bg-rose-50 text-rose-950 font-bold ring-2 ring-rose-500/20'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-rose-700">Thiết bị HỎNG</span>
                              <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-mono font-bold">
                                {countHong}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1">
                              Trạng thái: <strong>NK hỏng</strong>
                            </div>
                          </button>

                          {/* Option 3: Toàn bộ thiết bị */}
                          <button
                            type="button"
                            onClick={() => setPnkScope('ALL')}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                              pnkScope === 'ALL'
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold ring-2 ring-indigo-500/20'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-indigo-700">Toàn bộ thiết bị</span>
                              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-mono font-bold">
                                {countAll}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1">
                              Tất cả các dòng
                            </div>
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowWarehouseModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmWarehouseIntake}
                  disabled={!pnkInput.trim()}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-md"
                >
                  <Warehouse className="w-4 h-4" />
                  <span>Xác nhận Nhập kho</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Gán PNK cho vật tư trên BBBG */}
        {showBBBGModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-1 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[95vh] sm:h-[90vh] max-h-[96vh] flex flex-col border border-slate-200 overflow-hidden">
              {/* Modal Header */}
              <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/80">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-indigo-100 text-indigo-700 rounded-xl shrink-0">
                    <Warehouse className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-800 text-xs sm:text-base leading-tight truncate">
                        Cập nhật gán PNK cho vật tư BBBG
                      </h3>
                      <span className="font-mono text-[11px] font-bold text-[#004b93] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {voucher.soChungTu}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-500 truncate mt-0.5">
                      <span className="text-emerald-700 font-bold">{assignedBBBGItems} đã gán</span> • <span className="text-amber-700 font-bold">{pendingBBBGItems} tạm nhận</span> / {totalBBBGItems} vật tư
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBBBGModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 cursor-pointer shrink-0 ml-1"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Thanh điều khiển trên cùng (Gọn gàng - Không che lấp vật tư) */}
              <div className="px-2.5 py-2 sm:px-4 sm:py-2.5 bg-slate-50 border-b border-slate-200 shrink-0 space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  {/* Ô nhập số PNK */}
                  <div className="flex-1 flex items-center gap-1.5">
                    <label className="text-xs font-bold text-slate-700 shrink-0 whitespace-nowrap">
                      Số PNK: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bbbgPnkInput}
                      onChange={(e) => setBbbgPnkInput(e.target.value)}
                      placeholder="Nhập số PNK (VD: THA-KHO28-PNK9506...)"
                      className="flex-1 h-8 sm:h-9 px-2.5 font-mono font-bold text-indigo-950 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm shadow-2xs"
                      autoFocus
                    />
                  </div>

                  {/* Nút nạp từ file PNK thu gọn dạng 1 nút */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    <input
                      ref={pnkFileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,.pdf,image/*"
                      onChange={handlePnkFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => pnkFileInputRef.current?.click()}
                      disabled={isParsingPnkFile}
                      className="w-full sm:w-auto h-8 sm:h-9 px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0"
                      title="Nạp từ file PNK (Excel / PDF / Ảnh) để tự động quét khớp Tên thiết bị và Số serial"
                    >
                      {isParsingPnkFile ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      ) : (
                        <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                      <span>Nạp từ file PNK</span>
                    </button>
                  </div>
                </div>

                {/* Thông báo quét file (nếu có) */}
                {pnkFileNotice && (
                  <div className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-900 text-[11px] flex items-center justify-between gap-1.5 animate-in fade-in">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{pnkFileNotice}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPnkFileNotice(null)}
                      className="text-blue-500 hover:text-blue-800 text-[10px] font-bold px-1"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Dải bộ lọc & nút chọn nhanh vật tư */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBbbgFilterTab('TAM_NHAN')}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                        bbbgFilterTab === 'TAM_NHAN'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Tạm nhận ({pendingBBBGItems})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBbbgFilterTab('DA_GAN')}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                        bbbgFilterTab === 'DA_GAN'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Đã gán ({assignedBBBGItems})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBbbgFilterTab('ALL')}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                        bbbgFilterTab === 'ALL'
                          ? 'bg-slate-800 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Tất cả ({totalBBBGItems})
                    </button>
                  </div>

                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md text-[11px]">
                      Đã chọn: {selectedBBBGItemIds.length}
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAllPendingBBBG}
                      className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md font-semibold cursor-pointer"
                    >
                      Tất cả Tạm nhận
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllBBBG}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold cursor-pointer hidden sm:inline-block"
                    >
                      Tất cả
                    </button>
                    {selectedBBBGItemIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDeselectAllBBBG}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-md cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* KHÔNG GIAN DÀNH ĐỂ HIỆN DANH SÁCH VẬT TƯ (Chiếm toàn bộ thân modal) */}
              <div className="flex-1 overflow-auto bg-white min-h-0 relative">
                {/* 1. Giao diện dạng BẢNG cho Desktop/Tablet (sm trở lên) */}
                <div className="hidden sm:block min-w-full">
                  <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                    <thead className="sticky top-0 bg-slate-100 text-slate-700 border-b border-slate-200 font-bold z-10 shadow-2xs">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              (voucher.danhSachVatTu || []).length > 0 &&
                              selectedBBBGItemIds.length === (voucher.danhSachVatTu || []).length
                            }
                            onChange={(e) => {
                              if (e.target.checked) handleSelectAllBBBG();
                              else handleDeselectAllBBBG();
                            }}
                            className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-indigo-600"
                            title="Chọn / Bỏ chọn tất cả"
                          />
                        </th>
                        <th className="py-2 px-2 text-center w-10">STT</th>
                        <th className="py-2 px-2 w-24 text-center">Mã VT</th>
                        <th className="py-2 px-3 min-w-[200px]">Tên thiết bị / Vật tư</th>
                        <th className="py-2 px-3 w-32 text-center">Số Serial (S/N)</th>
                        <th className="py-2 px-2.5 w-24 text-center">Hiện trạng</th>
                        <th className="py-2 px-3 w-32 text-center">Số PNK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(voucher.danhSachVatTu || [])
                        .filter((it) => {
                          if (bbbgFilterTab === 'TAM_NHAN') return it.trangThaiHienTai === 'Tạm nhận' || !it.soPNKHoanTat;
                          if (bbbgFilterTab === 'DA_GAN') return it.trangThaiHienTai === 'Đã gán' || (Boolean(it.soPNKHoanTat) && it.trangThaiHienTai !== 'Tạm nhận');
                          return true;
                        })
                        .map((item, idx) => {
                          const isSelected = selectedBBBGItemIds.includes(item.id);
                          const isAssigned = item.trangThaiHienTai === 'Đã gán' || (Boolean(item.soPNKHoanTat) && item.trangThaiHienTai !== 'Tạm nhận');
                          return (
                            <tr
                              key={item.id}
                              onClick={() => handleToggleSelectBBBGItem(item.id)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-indigo-50/90 hover:bg-indigo-100/80 border-l-3 border-indigo-600' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectBBBGItem(item.id)}
                                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-indigo-600"
                                />
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-2 text-center font-mono font-bold text-[#004b93] whitespace-nowrap">
                                {item.maVT || '—'}
                              </td>
                              <td className="py-2 px-3">
                                <div className="font-bold text-slate-900 leading-snug">{item.tenVT}</div>
                                {item.ghiChuVatTu && (
                                  <span className="text-[10px] text-slate-400 italic block">
                                    {item.ghiChuVatTu}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                <span className="font-mono font-bold text-red-600 bg-red-50/90 px-2 py-0.5 rounded border border-red-200">
                                  {item.serialNumber || '—'}
                                </span>
                              </td>
                              {/* Cột Hiện trạng */}
                              <td className="py-2 px-2.5 text-center whitespace-nowrap">
                                {isAssigned ? (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                                    Đã gán
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    Tạm nhận
                                  </span>
                                )}
                              </td>
                              {/* Cột Số PNK: rỗng nếu chưa gán, có giá trị nếu đã gán */}
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                {isAssigned && item.soPNKHoanTat ? (
                                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-xs">
                                    {item.soPNKHoanTat}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 italic">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* 2. Giao diện dạng CARD TỐI ƯU MÀN HÌNH ĐIỆN THOẠI (Mobile < sm) */}
                <div className="block sm:hidden divide-y divide-slate-200 p-2 space-y-2">
                  {(voucher.danhSachVatTu || [])
                    .filter((it) => {
                      if (bbbgFilterTab === 'TAM_NHAN') return it.trangThaiHienTai === 'Tạm nhận' || !it.soPNKHoanTat;
                      if (bbbgFilterTab === 'DA_GAN') return it.trangThaiHienTai === 'Đã gán' || (Boolean(it.soPNKHoanTat) && it.trangThaiHienTai !== 'Tạm nhận');
                      return true;
                    })
                    .map((item, idx) => {
                      const isSelected = selectedBBBGItemIds.includes(item.id);
                      const isAssigned = item.trangThaiHienTai === 'Đã gán' || (Boolean(item.soPNKHoanTat) && item.trangThaiHienTai !== 'Tạm nhận');
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleSelectBBBGItem(item.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50/90 border-indigo-500 shadow-xs ring-1 ring-indigo-500'
                              : 'bg-white border-slate-200 shadow-2xs hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectBBBGItem(item.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-5 h-5 text-indigo-600 rounded cursor-pointer accent-indigo-600 mt-0.5 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-mono text-xs font-bold text-[#004b93] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  #{idx + 1} {item.maVT || '—'}
                                </span>
                                {isAssigned ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                    Đã gán
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                    Tạm nhận
                                  </span>
                                )}
                              </div>

                              <div className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                                {item.tenVT}
                              </div>

                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                                <span className="text-slate-500">Serial:</span>
                                <span className="font-mono font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                  {item.serialNumber || '—'}
                                </span>

                                {isAssigned && item.soPNKHoanTat && (
                                  <span className="ml-auto font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                    PNK: {item.soPNKHoanTat}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Modal Actions Footer (Gọn, dính đáy, dễ bấm trên mobile) */}
              <div className="px-3 py-2 sm:px-4 sm:py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 gap-2">
                <span className="text-[11px] sm:text-xs text-slate-600 font-medium">
                  Đã chọn: <b className="text-indigo-700 font-extrabold">{selectedBBBGItemIds.length}</b>/{totalBBBGItems} vật tư
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBBBGModal(false)}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBBBGAssign}
                    disabled={!bbbgPnkInput.trim() || selectedBBBGItemIds.length === 0 || isParsingPnkFile}
                    className="px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-md transition-all active:scale-95"
                    title="Hoàn thành gán PNK cho các vật tư đã chọn"
                  >
                    <Check className="w-4 h-4" />
                    <span>Hoàn thành ({selectedBBBGItemIds.length})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
