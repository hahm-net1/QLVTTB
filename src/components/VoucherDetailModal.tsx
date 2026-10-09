import React, { useState, useEffect } from 'react';
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
  Save 
} from 'lucide-react';
import { PhieuGiaoDich, ChiTietVatTu, TrangThaiSauSua } from '../types';
import { 
  getLoaiChungTuBadge, 
  getItemStatusBadge, 
  formatDateVN 
} from '../utils/formatters';

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

  useEffect(() => {
    if (voucher) {
      setItems(voucher.danhSachVatTu || []);
      setIsUpdatingStatus(false);
    }
  }, [voucher]);

  if (!voucher) return null;

  const typeBadge = getLoaiChungTuBadge(voucher.loaiChungTu);

  const handlePrint = () => {
    window.print();
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

        {/* Header - Not printed */}
        <div className="bg-[#004b93] text-white px-4 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs font-bold bg-[#00a3e0] text-white px-2 py-0.5 rounded shrink-0">
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
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  title="Cập nhật trạng thái sau sửa chữa"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cập nhật sau sửa</span>
                  <span className="sm:hidden">Cập nhật</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="In biên bản A4"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">In biên bản</span>
                </button>

                <button
                  onClick={() => {
                    onEdit(voucher);
                    onClose();
                  }}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Chỉnh sửa phiếu"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Chỉnh sửa</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsUpdatingStatus(false)}
                className="px-2.5 py-1.5 bg-slate-600 hover:bg-slate-500 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Hủy</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/90 hover:text-white cursor-pointer"
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
              {/* Detail Items Status Update List */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-800 uppercase flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#00a3e0]" />
                  <span>Cập nhật trạng thái từng thiết bị ({items.length})</span>
                </h4>

                {items.map((item, idx) => {
                  return (
                    <div
                      key={item.id}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3"
                    >
                      {/* Item header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#004b93] text-white text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-xs text-slate-800">{item.tenVT}</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-[#004b93]">
                          S/N: {item.serialNumber || '—'}
                        </span>
                      </div>

                      {/* Item Update Inputs: Trạng thái sau sửa & Trạng thái hiện tại */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Trạng thái sau sửa */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Trạng thái sau sửa
                          </label>
                          <select
                            value={item.trangThaiSauSua}
                            onChange={(e) =>
                              handleTrangThaiSauSuaChange(idx, e.target.value as TrangThaiSauSua)
                            }
                            className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a3e0]"
                          >
                            <option value="TOT">Tốt</option>
                            <option value="HONG">Hỏng</option>
                            <option value="LOI">Lỗi</option>
                          </select>
                        </div>

                        {/* Trạng thái hiện tại (Dropdown) */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Trạng thái hiện tại
                          </label>
                          <select
                            value={item.trangThaiHienTai}
                            onChange={(e) => handleItemFieldChange(idx, 'trangThaiHienTai', e.target.value)}
                            disabled={item.trangThaiSauSua !== 'LOI'}
                            className={`w-full h-9 px-2.5 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00a3e0] ${
                              item.trangThaiSauSua !== 'LOI'
                                ? 'bg-slate-100 text-slate-700 cursor-not-allowed border-slate-200'
                                : 'bg-white text-slate-800 border-slate-300'
                            }`}
                          >
                            {item.trangThaiSauSua === 'TOT' && (
                              <option value="NK tốt">NK tốt</option>
                            )}
                            {item.trangThaiSauSua === 'HONG' && (
                              <option value="NK hỏng">NK hỏng</option>
                            )}
                            {item.trangThaiSauSua === 'LOI' && (
                              <>
                                <option value="Kiểm tra thêm">Kiểm tra thêm</option>
                                <option value="NK tốt">NK tốt</option>
                                <option value="NK hỏng">NK hỏng</option>
                              </>
                            )}
                          </select>
                          <p className="text-[10px] text-slate-500 mt-1 italic">
                            {item.trangThaiSauSua === 'LOI'
                              ? 'Riêng trạng thái Lỗi: có thể chọn 1 trong 3 trạng thái hiện tại'
                              : `Tự động gắn theo kết quả ${item.trangThaiSauSua === 'TOT' ? 'Tốt (NK tốt)' : 'Hỏng (NK hỏng)'}`}
                          </p>
                        </div>

                        {/* Ghi chú vật tư */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Ghi chú vật tư (Tùy chọn)
                          </label>
                          <input
                            type="text"
                            value={item.ghiChuVatTu || ''}
                            onChange={(e) => handleItemFieldChange(idx, 'ghiChuVatTu', e.target.value)}
                            placeholder="VD: Đã thay linh kiện nguồn, nạp lại Firmware v2.14..."
                            className="w-full h-8 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#00a3e0]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
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
            <>
              {/* Printable Official Letterhead */}
              <div className="border-b-2 border-[#004b93] pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h1 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    HỆ THỐNG QUẢN LÝ VẬT TƯ & THIẾT BỊ (QLVT-TB)
                  </h1>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    BỘ PHẬN ĐIỀU PHỐI, KIỂM KÊ & SỬA CHỮA THIẾT BỊ
                  </p>
                </div>

                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${typeBadge.bg} ${typeBadge.border}`}>
                    {typeBadge.label}
                  </span>
                  <p className="text-xs font-mono font-bold text-[#004b93] mt-1">
                    Số: {voucher.soChungTu}
                  </p>
                </div>
              </div>

              {/* Title */}
              <div className="text-center my-2">
                <h2 className="text-lg sm:text-xl font-extrabold uppercase text-[#004b93] tracking-wide">
                  {voucher.loaiChungTu === 'PXK' && 'BIÊN BẢN XUẤT KHO THIẾT BỊ SỬA CHỮA'}
                  {voucher.loaiChungTu === 'PNK' && 'BIÊN BẢN NHẬP KHO THIẾT BỊ THU HỒI'}
                  {voucher.loaiChungTu === 'GUI_MUON' && 'BIÊN BẢN BÀN GIAO GỬI / MƯỢN THIẾT BỊ'}
                </h2>
                <p className="text-xs text-slate-500 mt-1 italic">
                  Ngày tiếp nhận / lập phiếu: {formatDateVN(voucher.ngayTiepNhan)}
                </p>
              </div>

              {/* Master Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#004b93] shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Cán bộ tiếp nhận:</span>
                    <span className="font-semibold text-slate-800">{voucher.canBoTiepNhan}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#004b93] shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Ngày ghi nhận:</span>
                    <span className="font-semibold text-slate-800">{formatDateVN(voucher.ngayTiepNhan)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-[#004b93] shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Số lượng thiết bị:</span>
                    <span className="font-bold text-[#004b93]">{voucher.danhSachVatTu.length} thiết bị</span>
                  </div>
                </div>

                {voucher.ghiChu && (
                  <div className="sm:col-span-3 pt-2 border-t border-slate-200 mt-1">
                    <span className="text-slate-400 block text-[10px]">Ghi chú:</span>
                    <p className="text-slate-700 italic">{voucher.ghiChu}</p>
                  </div>
                )}
              </div>

              {/* Table of Detail Items */}
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

                {/* Mobile View: Dedicated cards for each equipment */}
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
                            <span className="font-mono font-bold text-slate-700">{item.serialNumber || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Trạng thái:</span>
                            <span className={`font-semibold ${statusBadge.text}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                        </div>

                        {item.ghiChuVatTu && (
                          <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200/50">
                            Ghi chú: {item.ghiChuVatTu}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop & Print View: Full Table */}
                <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 print:block">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#004b93] text-white">
                        <th className="py-2.5 px-3 font-semibold text-center w-10">STT</th>
                        <th className="py-2.5 px-3 font-semibold">Mã VT</th>
                        <th className="py-2.5 px-3 font-semibold">Tên thiết bị / Vật tư</th>
                        <th className="py-2.5 px-3 font-semibold">Số Serial</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {voucher.danhSachVatTu.map((item, idx) => {
                        const statusBadge = getItemStatusBadge(item.trangThaiHienTai || 'Tiếp nhận mới');
                        return (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#004b93] whitespace-nowrap">
                              {item.maVT || '—'}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              {item.tenVT}
                              {item.ghiChuVatTu && (
                                <span className="block text-[10px] text-slate-400 font-normal italic">
                                  {item.ghiChuVatTu}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                              {item.serialNumber || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadge.bg} ${statusBadge.border}`}>
                                {statusBadge.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures for Print A4 */}
              <div className="pt-8 grid grid-cols-2 gap-6 text-center text-xs text-slate-700">
                <div>
                  <p className="font-bold uppercase">Người giao thiết bị</p>
                  <p className="text-[11px] text-slate-400 italic">(Ký và ghi rõ họ tên)</p>
                  <div className="h-16" />
                </div>

                <div>
                  <p className="font-bold uppercase">Cán bộ tiếp nhận</p>
                  <p className="text-[11px] text-slate-400 italic">(Ký và ghi rõ họ tên)</p>
                  <div className="h-16" />
                  <p className="font-bold text-slate-800">{voucher.canBoTiepNhan}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 print:hidden">
          <span>Tạo lúc: {new Date(voucher.createdAt).toLocaleString('vi-VN')}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
