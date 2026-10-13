import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  Warehouse,
  Check,
  CheckCircle,
  FileSpreadsheet,
  Loader2,
  Search,
  Filter,
  AlertCircle
} from 'lucide-react';
import { PhieuGiaoDich, ChiTietVatTu } from '../types';
import {
  getAllPendingBBBGItems,
  isEquipmentMatched,
  updateBBBGVoucherWithAssignment,
  PendingBBBGItem
} from '../utils/equipmentMatcher';
import { parseExcelDocument } from '../utils/excelParser';
import { extractDocumentWithAI } from '../utils/ocrParser';

interface BBBGIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSoChungTu?: string;
  existingVouchers: PhieuGiaoDich[];
  onAssignSuccess: (
    assignedItems: ChiTietVatTu[],
    updatedBBBGVouchers: PhieuGiaoDich[],
    pnkNumber: string
  ) => void;
}

export const BBBGIntakeModal: React.FC<BBBGIntakeModalProps> = ({
  isOpen,
  onClose,
  currentSoChungTu = '',
  existingVouchers,
  onAssignSuccess,
}) => {
  const [pnkInput, setPnkInput] = useState<string>(
    currentSoChungTu && currentSoChungTu.startsWith('PNK') ? currentSoChungTu : ''
  );
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]); // key = `${bbbgId}__${itemId}`
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterBBBG, setFilterBBBG] = useState<string>('ALL');
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [fileNotice, setFileNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lấy toàn bộ vật tư của các BBBG chưa hoàn thành gán
  const pendingItems: PendingBBBGItem[] = useMemo(() => {
    return getAllPendingBBBGItems(existingVouchers);
  }, [existingVouchers]);

  // Danh sách các số BBBG chưa hoàn thành để làm bộ lọc
  const uniqueBBBGNumbers = useMemo(() => {
    const set = new Set<string>();
    pendingItems.forEach((pi) => set.add(pi.soBBBG));
    return Array.from(set);
  }, [pendingItems]);

  // Lọc danh sách theo từ khóa và theo BBBG
  const filteredItems = useMemo(() => {
    return pendingItems.filter((pi) => {
      if (filterBBBG !== 'ALL' && pi.soBBBG !== filterBBBG) {
        return false;
      }
      if (!searchTerm.trim()) return true;

      const term = searchTerm.toLowerCase();
      const ten = (pi.item.tenVT || '').toLowerCase();
      const sn = (pi.item.serialNumber || '').toLowerCase();
      const ma = (pi.item.maVT || '').toLowerCase();
      const bbbg = pi.soBBBG.toLowerCase();
      return ten.includes(term) || sn.includes(term) || ma.includes(term) || bbbg.includes(term);
    });
  }, [pendingItems, filterBBBG, searchTerm]);

  if (!isOpen) return null;

  const handleToggleSelect = (bbbgId: string, itemId: string) => {
    const key = `${bbbgId}__${itemId}`;
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAllFiltered = () => {
    const newKeys = new Set(selectedKeys);
    filteredItems.forEach((pi) => newKeys.add(`${pi.bbbgId}__${pi.item.id}`));
    setSelectedKeys(Array.from(newKeys));
  };

  const handleDeselectAll = () => {
    setSelectedKeys([]);
  };

  // =========================================================================
  // LỰA CHỌN 2: NẠP TỪ FILE PNK (Excel / PDF / Ảnh)
  // Quét toàn bộ vật tư có trên các BBBG chưa có trạng thái hoàn thành gán.
  // Nếu khớp Tên thiết bị/vật tư và số serial thì thực hiện tự động gán.
  // =========================================================================
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    setFileNotice('Đang đọc file và quét dữ liệu vật tư...');

    try {
      const fileNameLower = file.name.toLowerCase();
      let extractedSoCT = '';
      let extractedItems: any[] = [];

      if (
        fileNameLower.endsWith('.xlsx') ||
        fileNameLower.endsWith('.xls') ||
        fileNameLower.endsWith('.csv')
      ) {
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
        setPnkInput(extractedSoCT);
      }

      // Quét toàn bộ vật tư của TẤT CẢ các BBBG chưa hoàn thành gán
      const matchedKeys: string[] = [];
      const matchedBBBGSet = new Set<string>();

      pendingItems.forEach((pi) => {
        const isMatched = extractedItems.some((fItem) => isEquipmentMatched(pi.item, fItem));
        if (isMatched) {
          matchedKeys.push(`${pi.bbbgId}__${pi.item.id}`);
          matchedBBBGSet.add(pi.soBBBG);
        }
      });

      if (matchedKeys.length > 0) {
        // Hợp nhất các vật tư đã khớp vào lựa chọn hiện tại
        setSelectedKeys(Array.from(new Set([...selectedKeys, ...matchedKeys])));
        setFileNotice(
          `Đã quét file PNK: Số PNK "${extractedSoCT || file.name}". Khớp tự động ${matchedKeys.length}/${pendingItems.length} vật tư thuộc ${matchedBBBGSet.size} BBBG (khớp CẢ Tên thiết bị & Số serial). Nhấn "Hoàn thành" để gán.`
        );
      } else {
        setFileNotice(
          `Đã đọc file "${extractedSoCT || file.name}". Không tìm thấy vật tư nào khớp đồng thời Tên thiết bị & Serial với các BBBG chưa hoàn thành. Bạn có thể chọn thủ công bên dưới.`
        );
      }
    } catch (err: any) {
      console.error('Lỗi phân tích file PNK:', err);
      setFileNotice('Lỗi khi đọc file PNK: ' + (err?.message || 'Không thể nhận diện'));
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // =========================================================================
  // HOÀN THÀNH GÁN PHIẾU
  // =========================================================================
  const handleComplete = () => {
    if (!pnkInput.trim()) {
      alert('Vui lòng nhập hoặc nạp Số Phiếu Nhập Kho (PNK).');
      return;
    }
    if (selectedKeys.length === 0) {
      alert('Vui lòng tích chọn ít nhất 1 vật tư để gán PNK.');
      return;
    }

    const trimmedPNK = pnkInput.trim();

    // Phân nhóm các vật tư được chọn theo từng BBBG
    const bbbgToSelectedItemsMap = new Map<string, string[]>(); // bbbgId -> itemId[]
    const assignedItemsList: ChiTietVatTu[] = [];

    selectedKeys.forEach((key) => {
      const [bbbgId, itemId] = key.split('__');
      if (!bbbgToSelectedItemsMap.has(bbbgId)) {
        bbbgToSelectedItemsMap.set(bbbgId, []);
      }
      bbbgToSelectedItemsMap.get(bbbgId)!.push(itemId);

      // Tìm chi tiết vật tư để đưa vào phiếu nhập mới
      const found = pendingItems.find((pi) => pi.bbbgId === bbbgId && pi.item.id === itemId);
      if (found) {
        assignedItemsList.push({
          ...found.item,
          soPNKHoanTat: '', // Số PNK là đầu vào khởi tạo phiếu mới (soChungTu), không phải "Số PNK hoàn tất" (đầu ra sau sửa chữa)
          trangThaiHienTai: 'Tiếp nhận mới', // Người dùng yêu cầu: sau khi gán số PNK trường "Trạng thái" tại phiếu nhập mới là "Tiếp nhận mới"
          ghiChuVatTu: found.item.ghiChuVatTu || '', // Tuyệt đối không tự động điền, chỉ ghi nội dung do người dùng nhập vào
        });
      }
    });

    // Cập nhật từng BBBG gốc theo nguyên tắc:
    // - Vật tư được chọn: 'Đã gán' + Số PNK
    // - Vật tư chưa chọn: 'Tạm nhận' + Số PNK rỗng ''
    // - Khi tất cả vật tư trên BBBG đều 'Đã gán': BBBG coi như hoàn thành
    const updatedBBBGVouchers: PhieuGiaoDich[] = [];

    bbbgToSelectedItemsMap.forEach((itemIds, bbbgId) => {
      const bbbgVoucher = existingVouchers.find((v) => v.id === bbbgId);
      if (bbbgVoucher) {
        const updated = updateBBBGVoucherWithAssignment(bbbgVoucher, itemIds, trimmedPNK);
        updatedBBBGVouchers.push(updated);
      }
    });

    onAssignSuccess(assignedItemsList, updatedBBBGVouchers, trimmedPNK);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-1 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-[95vh] sm:h-[90vh] max-h-[96vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/80">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="p-1.5 sm:p-2 bg-indigo-100 text-indigo-700 rounded-xl shrink-0">
              <Warehouse className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 text-xs sm:text-base leading-tight truncate">
                Gán PNK từ các BBBG chưa hoàn thành
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 truncate mt-0.5">
                Tổng cộng <span className="text-amber-700 font-bold">{pendingItems.length} vật tư tạm nhận</span> trên toàn hệ thống
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 cursor-pointer shrink-0 ml-1"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thanh điều khiển trên cùng (Gọn gàng - Tối ưu khoảng trống) */}
        <div className="px-2.5 py-2 sm:px-4 sm:py-2.5 bg-slate-50 border-b border-slate-200 shrink-0 space-y-1.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {/* Nhập số PNK */}
            <div className="flex-1 flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-700 shrink-0 whitespace-nowrap">
                Số PNK: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={pnkInput}
                onChange={(e) => setPnkInput(e.target.value)}
                placeholder="Nhập số PNK (VD: PNK-2026-001, THA-KHO28-PNK9506...)"
                className="flex-1 h-8 sm:h-9 px-2.5 font-mono font-bold text-indigo-950 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm shadow-2xs"
                autoFocus
              />
            </div>

            {/* Nút nạp từ file dạng 1 nút thu gọn */}
            <div className="shrink-0 flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.pdf,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsingFile}
                className="w-full sm:w-auto h-8 sm:h-9 px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0"
                title="Nạp số PNK và tự động quét khớp Tên thiết bị & Số serial"
              >
                {isParsingFile ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span>Nạp từ file PNK</span>
              </button>
            </div>
          </div>

          {/* Thông báo quét file nếu có */}
          {fileNotice && (
            <div className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-900 text-[11px] flex items-center justify-between gap-1.5 animate-in fade-in">
              <div className="flex items-center gap-1.5 min-w-0">
                <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">{fileNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setFileNotice(null)}
                className="text-blue-500 hover:text-blue-800 text-[10px] font-bold px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Hàng tìm kiếm, lọc BBBG & chọn nhanh */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
            <div className="flex items-center gap-1.5 flex-1 min-w-[200px] max-w-sm">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm tên VT, serial, số BBBG..."
                  className="w-full h-7 sm:h-8 pl-8 pr-2.5 text-[11px] sm:text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {uniqueBBBGNumbers.length > 1 && (
                <div className="flex items-center gap-1 shrink-0">
                  <select
                    value={filterBBBG}
                    onChange={(e) => setFilterBBBG(e.target.value)}
                    className="h-7 sm:h-8 px-2 bg-white border border-slate-300 rounded-lg text-[11px] sm:text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">Tất cả BBBG ({uniqueBBBGNumbers.length})</option>
                    {uniqueBBBGNumbers.map((no) => (
                      <option key={no} value={no}>
                        {no}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 text-[11px]">
              <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md text-[11px]">
                Đã chọn: {selectedKeys.length}
              </span>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md font-semibold cursor-pointer"
              >
                Chọn tất cả ({filteredItems.length})
              </button>
              {selectedKeys.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeselectAll}
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
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              {pendingItems.length === 0 ? (
                <p>Không có vật tư nào ở hiện trạng "Tạm nhận" trên toàn hệ thống BBBG.</p>
              ) : (
                <p>Không tìm thấy vật tư nào khớp với từ khóa tìm kiếm.</p>
              )}
            </div>
          ) : (
            <>
              {/* 1. Giao diện BẢNG cho Desktop/Tablet (sm trở lên) */}
              <div className="hidden sm:block min-w-full">
                <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700 border-b border-slate-200 font-bold z-10 shadow-2xs">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredItems.length > 0 &&
                            filteredItems.every((pi) =>
                              selectedKeys.includes(`${pi.bbbgId}__${pi.item.id}`)
                            )
                          }
                          onChange={(e) => {
                            if (e.target.checked) handleSelectAllFiltered();
                            else handleDeselectAll();
                          }}
                          className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-indigo-600"
                          title="Chọn / Bỏ chọn"
                        />
                      </th>
                      <th className="py-2 px-2 text-center w-10">STT</th>
                      <th className="py-2 px-2.5 w-28 text-center">Số BBBG</th>
                      <th className="py-2 px-2 w-24 text-center">Mã VT</th>
                      <th className="py-2 px-3 min-w-[200px]">Tên thiết bị / Vật tư</th>
                      <th className="py-2 px-3 w-32 text-center">Số Serial (S/N)</th>
                      <th className="py-2 px-2.5 w-24 text-center">Hiện trạng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((pi, idx) => {
                      const key = `${pi.bbbgId}__${pi.item.id}`;
                      const isSelected = selectedKeys.includes(key);
                      return (
                        <tr
                          key={key}
                          onClick={() => handleToggleSelect(pi.bbbgId, pi.item.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-50/90 hover:bg-indigo-100/80 border-l-3 border-indigo-600'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(pi.bbbgId, pi.item.id)}
                              className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-indigo-600"
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-2.5 text-center font-mono font-bold text-[#004b93] whitespace-nowrap">
                            {pi.soBBBG}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-600 whitespace-nowrap">
                            {pi.item.maVT || '—'}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-900 leading-snug">{pi.item.tenVT}</div>
                            {pi.item.ghiChuVatTu && (
                              <span className="text-[10px] text-slate-400 italic block">
                                {pi.item.ghiChuVatTu}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <span className="font-mono font-bold text-red-600 bg-red-50/90 px-2 py-0.5 rounded border border-red-200">
                              {pi.item.serialNumber || '—'}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              Tạm nhận
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 2. Giao diện CARD TỐI ƯU MÀN HÌNH ĐIỆN THOẠI (Mobile < sm) */}
              <div className="block sm:hidden divide-y divide-slate-200 p-2 space-y-2">
                {filteredItems.map((pi, idx) => {
                  const key = `${pi.bbbgId}__${pi.item.id}`;
                  const isSelected = selectedKeys.includes(key);
                  return (
                    <div
                      key={key}
                      onClick={() => handleToggleSelect(pi.bbbgId, pi.item.id)}
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
                          onChange={() => handleToggleSelect(pi.bbbgId, pi.item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 text-indigo-600 rounded cursor-pointer accent-indigo-600 mt-0.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-xs font-bold text-[#004b93] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                {pi.soBBBG}
                              </span>
                              {pi.item.maVT && (
                                <span className="font-mono text-[10px] text-slate-500">
                                  {pi.item.maVT}
                                </span>
                              )}
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                              Tạm nhận
                            </span>
                          </div>

                          <div className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                            {pi.item.tenVT}
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="text-slate-500">Serial:</span>
                            <span className="font-mono font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                              {pi.item.serialNumber || '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="px-3 py-2 sm:px-4 sm:py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 gap-2">
          <span className="text-[11px] sm:text-xs text-slate-600 font-medium">
            Đã chọn: <b className="text-indigo-700 font-extrabold">{selectedKeys.length}</b>/{pendingItems.length} vật tư
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={!pnkInput.trim() || selectedKeys.length === 0 || isParsingFile}
              className="px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-md transition-all active:scale-95"
              title="Hoàn thành gán PNK cho các vật tư đã chọn"
            >
              <Check className="w-4 h-4" />
              <span>Hoàn thành ({selectedKeys.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
