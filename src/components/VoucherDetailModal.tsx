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
  Loader2 
} from 'lucide-react';
import { PhieuGiaoDich, ChiTietVatTu, TrangThaiSauSua } from '../types';
import { 
  getLoaiChungTuBadge, 
  getItemStatusBadge, 
  formatDateVN 
} from '../utils/formatters';
import { generateVoucherPDF } from '../utils/pdfGenerator';

interface VoucherDetailModalProps {
  voucher: PhieuGiaoDich | null;
  onClose: () => void;
  onEdit: (voucher: PhieuGiaoDich) => void;
  onDelete?: (id: string) => void;
  onUpdateVoucher?: (voucher: PhieuGiaoDich) => void;
}

export const VoucherDetailModal: React.FC<VoucherDetailModalProps> = ({
  voucher,
  onClose,
  onEdit,
  onUpdateVoucher,
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

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (voucher) {
      setItems(voucher.danhSachVatTu || []);
      setIsUpdatingStatus(false);
    }
  }, [voucher]);

  if (!voucher) return null;

  const typeBadge = getLoaiChungTuBadge(voucher.loaiChungTu);

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
      if (pnkScope === 'TOT') {
        isEligible = it.trangThaiSauSua === 'TOT' || it.trangThaiHienTai === 'NK tốt';
      } else if (pnkScope === 'HONG') {
        isEligible = it.trangThaiSauSua === 'HONG' || it.trangThaiHienTai === 'NK hỏng';
      } else if (pnkScope === 'ALL') {
        isEligible = true;
      }

      if (isEligible) {
        return {
          ...it,
          soPNKHoanTat: trimmedPNK,
          trangThaiHienTai:
            it.trangThaiSauSua === 'HONG' || it.trangThaiHienTai === 'NK hỏng'
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
    const preparedItems = (voucher.danhSachVatTu || []).map((it) => {
      const sauSua = it.trangThaiSauSua || 'TOT';
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

  const handleSaveStatusUpdate = () => {
    const updatedVoucher: PhieuGiaoDich = {
      ...voucher,
      danhSachVatTu: items,
      updatedAt: new Date().toISOString(),
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
                {/* Button to enter repair update mode */}
                <button
                  onClick={handleOpenUpdateStatus}
                  className="h-8 px-2.5 sm:px-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs text-white"
                  title="Cập nhật trạng thái sau sửa chữa"
                >
                  <Wrench className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Cập nhật sau sửa</span>
                  <span className="sm:hidden">Cập nhật</span>
                </button>

                {/* Bổ sung nút "Nhập kho" sau khi kết thúc quá trình "cập nhật sau sửa chữa", nếu chưa hoàn thành thì không hiển thị */}
                {hasCompletedPostRepair && (
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
                )}

                {/* Nút tích hợp: In biên bản & Tự động xuất tệp PDF */}
                <button
                  onClick={handlePrint}
                  disabled={isExportingPDF}
                  className="h-8 px-2.5 sm:px-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all text-white shadow-xs"
                  title="Tự động tạo file PDF tải về máy và mở lệnh in ấn biên bản A4"
                >
                  {isExportingPDF ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  ) : (
                    <Printer className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="hidden md:inline">{isExportingPDF ? 'Đang tạo PDF...' : 'In biên bản (PDF)'}</span>
                  <span className="hidden sm:inline md:hidden">{isExportingPDF ? 'Tạo PDF...' : 'In PDF'}</span>
                  <span className="sm:hidden">{isExportingPDF ? '...' : 'In'}</span>
                </button>

                <button
                  onClick={() => {
                    onEdit(voucher);
                    onClose();
                  }}
                  className="h-8 px-2.5 sm:px-3 bg-amber-600 hover:bg-amber-500 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all text-white shadow-xs"
                  title="Chỉnh sửa phiếu"
                >
                  <Edit className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Chỉnh sửa</span>
                  <span className="sm:hidden">Sửa</span>
                </button>
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
                  {voucher.loaiChungTu === 'PXK' && 'BIÊN BẢN XUẤT KHO THIẾT BỊ SỬA CHỮA'}
                  {voucher.loaiChungTu === 'PNK' && 'BIÊN BẢN NHẬP KHO THIẾT BỊ THU HỒI'}
                  {voucher.loaiChungTu === 'GUI_MUON' && 'BIÊN BẢN BÀN GIAO GỬI / MƯỢN THIẾT BỊ'}
                </h2>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
                  <span>Ngày lập phiếu: <strong className="text-slate-700">{formatDateVN(voucher.ngayTiepNhan)}</strong></span>
                  <span>•</span>
                  <span>Hình thức: <strong className="text-slate-700">{typeBadge.label}</strong></span>
                </div>
              </div>

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

                  {/* Hiển thị số PNK hoàn tất nếu có */}
                  <div className="flex items-baseline justify-between border-b border-slate-200/80 pb-1">
                    <span className="text-slate-500 font-medium">Số PNK hoàn tất:</span>
                    {(() => {
                      const pnkItem = voucher.danhSachVatTu.find((i) => Boolean(i.soPNKHoanTat));
                      return pnkItem ? (
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-xs">
                          {pnkItem.soPNKHoanTat}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">— (Chưa nhập kho)</span>
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

                  <button
                    onClick={handleOpenUpdateStatus}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer print:hidden bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Cập nhật kết quả sửa</span>
                  </button>
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
                            <span className="text-slate-400 block text-[10px]">Trạng thái:</span>
                            <span className={`font-semibold ${statusBadge.text}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                        </div>

                        {/* Số PNK hoàn tất ở bên phải của card trên mobile */}
                        {item.soPNKHoanTat && (
                          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/80 bg-indigo-50/60 p-2 rounded-lg">
                            <span className="text-slate-600 font-semibold text-[11px] flex items-center gap-1">
                              <Warehouse className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Số PNK hoàn tất:</span>
                            </span>
                            <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 text-xs">
                              {item.soPNKHoanTat}
                            </span>
                          </div>
                        )}

                        {item.ghiChuVatTu && (
                          <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200/50">
                            Ghi chú: {item.ghiChuVatTu}
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
                        <th className="py-2 px-2.5 font-bold text-center w-28 border border-slate-300 whitespace-nowrap">Trạng thái</th>
                        {/* Trường Số PNK hoàn tất ở bên phải của dòng thiết bị */}
                        <th className="py-2 px-3 font-bold text-center w-36 border border-slate-300 whitespace-nowrap">
                          Số PNK hoàn tất
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
                            {/* Cột Số PNK hoàn tất ở bên phải */}
                            <td className="py-2 px-3 text-center border border-slate-300 whitespace-nowrap">
                              {item.soPNKHoanTat ? (
                                <span className="inline-flex items-center gap-1 font-mono font-bold text-xs bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded shadow-2xs">
                                  <Warehouse className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  <span>{item.soPNKHoanTat}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">—</span>
                              )}
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
                  const countTot = voucher.danhSachVatTu.filter((i) => i.trangThaiSauSua === 'TOT' || i.trangThaiHienTai === 'NK tốt').length;
                  const countHong = voucher.danhSachVatTu.filter((i) => i.trangThaiSauSua === 'HONG' || i.trangThaiHienTai === 'NK hỏng').length;
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
      </div>
    </div>
  );
};
