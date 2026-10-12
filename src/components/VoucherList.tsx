import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  Eye, 
  Copy, 
  Plus, 
  FileText, 
  Calendar, 
  User, 
  Building2, 
  Layers, 
  Tag, 
  ArrowUpDown, 
  X,
  FileSpreadsheet,
  Download,
  ChevronRight,
  Package,
  Warehouse
} from 'lucide-react';
import { PhieuGiaoDich, LoaiChungTu } from '../types';
import { 
  getLoaiChungTuBadge, 
  formatDateVN, 
  getTrangThaiSauSuaBadge 
} from '../utils/formatters';

interface VoucherListProps {
  vouchers: PhieuGiaoDich[];
  onSelectVoucher: (voucher: PhieuGiaoDich) => void;
  onEditVoucher: (voucher: PhieuGiaoDich) => void;
  onDeleteVoucher: (id: string) => void;
  onDuplicateVoucher: (voucher: PhieuGiaoDich) => void;
  onNewVoucher: () => void;
  onExportCSV: () => void;
}

export const VoucherList: React.FC<VoucherListProps> = ({
  vouchers,
  onSelectVoucher,
  onEditVoucher,
  onDeleteVoucher,
  onDuplicateVoucher,
  onNewVoucher,
  onExportCSV,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'code'>('date_desc');
  const [voucherToDelete, setVoucherToDelete] = useState<PhieuGiaoDich | null>(null);

  // Filter logic
  const filteredVouchers = vouchers
    .filter((v) => {
      // Type filter
      if (selectedType !== 'ALL') {
        const isBBBG = selectedType === 'BBBG' || selectedType === 'GUI_MUON';
        if (isBBBG) {
          if (v.loaiChungTu !== 'GUI_MUON' && (v.loaiChungTu as string) !== 'BBBG') {
            return false;
          }
        } else if (v.loaiChungTu !== selectedType) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        const hasStatus = v.danhSachVatTu.some((item) => {
          const itemStatus = item.trangThaiHienTai || 'Tiếp nhận mới';
          return itemStatus.toLowerCase().includes(selectedStatus.toLowerCase());
        });
        if (!hasStatus) return false;
      }

      // Search term
      if (!searchTerm.trim()) return true;

      const term = searchTerm.toLowerCase();
      const isSearchBBBG = term === 'bbbg' || term === 'gửi mượn' || term === 'bàn giao';
      const matchMaster =
        v.soChungTu.toLowerCase().includes(term) ||
        v.donViLienQuan.toLowerCase().includes(term) ||
        v.canBoTiepNhan.toLowerCase().includes(term) ||
        (isSearchBBBG && (v.loaiChungTu === 'GUI_MUON' || (v.loaiChungTu as string) === 'BBBG')) ||
        (v.ghiChu && v.ghiChu.toLowerCase().includes(term));

      const matchDetail = v.danhSachVatTu.some(
        (item) =>
          item.serialNumber.toLowerCase().includes(term) ||
          item.maVT.toLowerCase().includes(term) ||
          item.tenVT.toLowerCase().includes(term) ||
          (item.soPNKHoanTat && item.soPNKHoanTat.toLowerCase().includes(term))
      );

      return matchMaster || matchDetail;
    })
    .sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.ngayTiepNhan).getTime() - new Date(a.ngayTiepNhan).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.ngayTiepNhan).getTime() - new Date(b.ngayTiepNhan).getTime();
      }
      return a.soChungTu.localeCompare(b.soChungTu);
    });

  const handleDeleteConfirm = (voucher: PhieuGiaoDich, e: React.MouseEvent) => {
    e.stopPropagation();
    setVoucherToDelete(voucher);
  };

  const handleDuplicateClick = (voucher: PhieuGiaoDich, e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicateVoucher(voucher);
  };

  const handleEditClick = (voucher: PhieuGiaoDich, e: React.MouseEvent) => {
    e.stopPropagation();
    onEditVoucher(voucher);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-20">
      {/* Control Bar: Search + Filters */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
        {/* Search input with Serial highlight note */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm nhanh theo Số chứng từ, Số Serial, Tên thiết bị, Đơn vị hoặc Cán bộ tiếp nhận..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00a3e0]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          {/* Loai Chung Tu Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Loại:
            </span>
            {[
              { id: 'ALL', label: 'Tất cả', count: vouchers.length },
              { id: 'PXK', label: 'Phiếu xuất kho', count: vouchers.filter((v) => v.loaiChungTu === 'PXK').length },
              { id: 'PNK', label: 'Phiếu nhập kho', count: vouchers.filter((v) => v.loaiChungTu === 'PNK').length },
              {
                id: 'BBBG',
                label: 'BBBG',
                count: vouchers.filter((v) => v.loaiChungTu === 'GUI_MUON' || (v.loaiChungTu as string) === 'BBBG').length,
              },
            ].map((tab) => {
              const isSelected = selectedType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedType(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap text-xs flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#004b93] text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs bg-slate-100 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Tạm nhận">Tạm nhận (BBBG)</option>
              <option value="Tiếp nhận mới">Tiếp nhận mới</option>
              <option value="NK tốt">NK tốt</option>
              <option value="NK hỏng">NK hỏng</option>
              <option value="Kiểm tra thêm">Kiểm tra thêm</option>
              <option value="Đang sửa chữa">Đang sửa chữa</option>
              <option value="Đã xuất đi">Đã xuất đi</option>
            </select>

            <button
              onClick={onExportCSV}
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
              title="Xuất bảng Excel/CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Xuất CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* List Header Count */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
        <span>
          Tìm thấy <b>{filteredVouchers.length}</b> phiếu chứng từ
          {searchTerm && ` chứa từ khóa "${searchTerm}"`}
        </span>
        <button
          onClick={onNewVoucher}
          className="text-xs font-bold text-[#004b93] hover:text-[#00a3e0] flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Tạo yêu cầu mới
        </button>
      </div>

      {/* Empty State */}
      {filteredVouchers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-base">Không tìm thấy phiếu nào phù hợp</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Vui lòng thử tìm kiếm bằng từ khóa khác hoặc bấm nút Tạo yêu cầu mới để tạo chứng từ.
          </p>
          <button
            onClick={onNewVoucher}
            className="px-4 py-2 bg-[#004b93] text-white text-xs font-bold rounded-xl hover:bg-[#003870] cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tạo yêu cầu mới
          </button>
        </div>
      ) : (
        /* Voucher Cards List (Responsive for Mobile & Desktop - List Only) */
        <div className="space-y-2.5">
          {filteredVouchers.map((voucher) => {
            const badge = getLoaiChungTuBadge(voucher.loaiChungTu);
            const totalItems = voucher.danhSachVatTu.length;

            return (
              <div
                key={voucher.id}
                onClick={() => onSelectVoucher(voucher)}
                className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 hover:border-[#00a3e0] hover:shadow-md active:scale-[0.99] transition-all cursor-pointer group space-y-2.5"
              >
                {/* Row 1: Badge + Code + Date + Quick Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border shrink-0 ${badge.bg} ${badge.border}`}>
                      {badge.label}
                    </span>
                    <span className="font-mono text-sm sm:text-base font-extrabold text-[#004b93] group-hover:text-[#00a3e0] transition-colors truncate">
                      {voucher.soChungTu}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1 mr-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDateVN(voucher.ngayTiepNhan)}
                    </span>

                    {/* Quick actions on card */}
                    <button
                      onClick={(e) => handleEditClick(voucher, e)}
                      className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-[#004b93] rounded-lg transition-colors cursor-pointer"
                      title="Sửa phiếu"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleDuplicateClick(voucher, e)}
                      className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-[#004b93] rounded-lg transition-colors cursor-pointer"
                      title="Nhân bản phiếu"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleDeleteConfirm(voucher, e)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="Xóa phiếu"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Row 2: Master Details */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-800 truncate">
                      Cán bộ: {voucher.canBoTiepNhan || 'Chưa gán'}
                    </span>
                  </div>
                  {voucher.donViLienQuan && voucher.donViLienQuan !== 'Chờ phân bổ sau sửa chữa' && (
                    <div className="flex items-center gap-1.5 min-w-0 text-slate-500">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{voucher.donViLienQuan}</span>
                    </div>
                  )}
                </div>

                {/* Row 3: Item Count Pill & Status Summary + Click to View Details Prompt */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-[#004b93] font-bold text-[11px] border border-blue-100">
                      <Package className="w-3.5 h-3.5 text-[#00a3e0]" />
                      <span>{totalItems} thiết bị</span>
                    </span>

                    {/* Status Sync Badges */}
                    {(() => {
                      const isBBBG = voucher.loaiChungTu === 'GUI_MUON' || (voucher.loaiChungTu as string) === 'BBBG';
                      const isCompletedBBBG = isBBBG && (
                        Boolean(voucher.ghiChu && voucher.ghiChu.includes('Đã hoàn thành nhập kho đơn vị')) ||
                        (voucher.danhSachVatTu.length > 0 && voucher.danhSachVatTu.every((i) => i.soPNKHoanTat && i.trangThaiHienTai !== 'Tạm nhận'))
                      );

                      if (isBBBG) {
                        const nDaGan = voucher.danhSachVatTu.filter((i) => Boolean(i.soPNKHoanTat) && i.trangThaiHienTai !== 'Tạm nhận').length;
                        const nTamNhan = voucher.danhSachVatTu.filter((i) => !i.soPNKHoanTat || i.trangThaiHienTai === 'Tạm nhận').length;

                        return (
                          <div className="flex flex-wrap items-center gap-1">
                            {isCompletedBBBG ? (
                              <>
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                                  ✓ Đã hoàn thành nhập kho đơn vị
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-500 border border-slate-200" title="Không kiểm đếm kho để chống trùng lặp">
                                  Không đếm kho
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  Đang gán PNK: {nDaGan}/{totalItems} ({nTamNhan} Tạm nhận)
                                </span>
                                {nDaGan > 0 && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Đã có PNK
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        );
                      }

                      const nTot = voucher.danhSachVatTu.filter((i) => i.trangThaiHienTai === 'NK tốt').length;
                      const nHong = voucher.danhSachVatTu.filter((i) => i.trangThaiHienTai === 'NK hỏng').length;
                      const nKTT = voucher.danhSachVatTu.filter((i) => i.trangThaiHienTai === 'Kiểm tra thêm' || i.trangThaiHienTai === 'Đang sửa chữa').length;
                      const nMoi = voucher.danhSachVatTu.filter((i) => !i.trangThaiHienTai || i.trangThaiHienTai === 'Tiếp nhận mới').length;
                      const nTamNhan = voucher.danhSachVatTu.filter((i) => i.trangThaiHienTai === 'Tạm nhận').length;

                      return (
                        <div className="flex flex-wrap items-center gap-1">
                          {nTot > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              NK tốt: {nTot}
                            </span>
                          )}
                          {nHong > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              NK hỏng: {nHong}
                            </span>
                          )}
                          {nKTT > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Kiểm tra thêm: {nKTT}
                            </span>
                          )}
                          {nTamNhan > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              Tạm nhận: {nTamNhan}
                            </span>
                          )}
                          {nMoi > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              {nTot === 0 && nHong === 0 && nKTT === 0 && nTamNhan === 0 ? 'Tiếp nhận mới' : `Tiếp nhận mới: ${nMoi}`}
                            </span>
                          )}
                          {(() => {
                            const pnkItems = voucher.danhSachVatTu.filter((i) => Boolean(i.soPNKHoanTat));
                            if (pnkItems.length > 0) {
                              const firstPNK = pnkItems[0].soPNKHoanTat;
                              return (
                                <span 
                                  className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 shadow-2xs"
                                  title={`Số PNK hoàn tất: ${firstPNK}`}
                                >
                                  <Warehouse className="w-3 h-3 text-indigo-600" />
                                  <span>PNK: {firstPNK}</span>
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      );
                    })()}

                    {voucher.ghiChu && (
                      <span className="text-[11px] text-slate-400 italic truncate max-w-[140px] sm:max-w-xs hidden sm:inline ml-1">
                        {voucher.ghiChu}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold text-[#004b93] group-hover:text-[#00a3e0] transition-colors shrink-0 ml-auto">
                    <span>Xem chi tiết</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Delete Voucher */}
      {voucherToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setVoucherToDelete(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-800">Xác nhận xóa phiếu</h3>
                <p className="text-xs text-slate-500">Thao tác này không thể hoàn tác</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa vĩnh viễn phiếu{' '}
              <span className="font-mono font-bold text-[#004b93]">
                {voucherToDelete.soChungTu}
              </span>{' '}
              cùng <b>{voucherToDelete.danhSachVatTu.length}</b> thiết bị vật tư liên quan không?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVoucherToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-bold hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteVoucher(voucherToDelete.id);
                  setVoucherToDelete(null);
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
    </div>
  );
};
