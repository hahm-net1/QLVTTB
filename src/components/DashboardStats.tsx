import React from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Wrench, 
  PackageCheck, 
  Send, 
  Layers, 
  FileText,
  TrendingUp,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { PhieuGiaoDich } from '../types';

interface DashboardStatsProps {
  vouchers: PhieuGiaoDich[];
  onExportCSV: () => void;
  onExportJSON: () => void;
  onNewVoucher: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  vouchers,
  onExportCSV,
  onExportJSON,
  onNewVoucher,
}) => {
  // Compute metrics
  const totalVouchers = vouchers.length;
  const allItems = vouchers.flatMap((v) => v.danhSachVatTu);
  const totalItems = allItems.length;

  const countNKTot = allItems.filter(
    (i) => i.trangThaiHienTai === 'NK tốt' || (i.trangThaiSauSua === 'TOT' && i.trangThaiHienTai !== 'NK hỏng' && i.trangThaiHienTai !== 'Kiểm tra thêm')
  ).length;

  const countNKHong = allItems.filter(
    (i) => i.trangThaiHienTai === 'NK hỏng' || (i.trangThaiSauSua === 'HONG' && i.trangThaiHienTai !== 'NK tốt' && i.trangThaiHienTai !== 'Kiểm tra thêm')
  ).length;

  const countKTT = allItems.filter(
    (i) => i.trangThaiHienTai === 'Kiểm tra thêm' || i.trangThaiHienTai === 'Đang sửa chữa' || (i.trangThaiSauSua === 'LOI' && i.trangThaiHienTai !== 'NK tốt' && i.trangThaiHienTai !== 'NK hỏng')
  ).length;

  const countTiepNhanMoi = allItems.filter(
    (i) => i.trangThaiHienTai === 'Tiếp nhận mới'
  ).length;

  const pctTot = totalItems > 0 ? Math.round((countNKTot / totalItems) * 100) : 0;
  const pctHong = totalItems > 0 ? Math.round((countNKHong / totalItems) * 100) : 0;
  const pctKTT = totalItems > 0 ? Math.round((countKTT / totalItems) * 100) : 0;
  const pctMoi = totalItems > 0 ? Math.round((countTiepNhanMoi / totalItems) * 100) : 0;

  // Voucher type breakdown
  const countPXK = vouchers.filter((v) => v.loaiChungTu === 'PXK').length;
  const countPNK = vouchers.filter((v) => v.loaiChungTu === 'PNK').length;
  const countGM = vouchers.filter((v) => v.loaiChungTu === 'GUI_MUON').length;

  // Top equipment types
  const equipCountMap: Record<string, number> = {};
  allItems.forEach((item) => {
    const key = item.maVT || item.tenVT.slice(0, 20);
    equipCountMap[key] = (equipCountMap[key] || 0) + 1;
  });
  const topEquip = Object.entries(equipCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-24">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#004b93] via-[#003870] to-[#00a3e0] text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-300" />
            Trung tâm Thống kê & Báo cáo Vật tư & Thiết bị
          </h2>
          <p className="text-xs text-cyan-100 mt-1">
            Tổng hợp dữ liệu phiếu tiếp nhận, tỉ lệ sửa chữa thành công và phân bổ luồng thiết bị
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={onExportCSV}
            className="flex-1 sm:flex-none px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-white/20 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span>Xuất CSV</span>
          </button>
          <button
            onClick={onExportJSON}
            className="flex-1 sm:flex-none px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-white/20 transition-colors"
          >
            <Download className="w-4 h-4 text-cyan-300" />
            <span>Sao lưu JSON</span>
          </button>
        </div>
      </div>

      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#004b93] flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Tổng số phiếu</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800">{totalVouchers}</h3>
            <p className="text-[10px] text-slate-500">{countPXK} PXK, {countPNK} PNK</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-cyan-50 text-[#00a3e0] flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Tổng thiết bị</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800">{totalItems}</h3>
            <p className="text-[10px] text-slate-500">Đã gắn mã & S/N</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">NK tốt (Đạt chuẩn)</p>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-600">{countNKTot}</h3>
            <p className="text-[10px] text-emerald-700 font-semibold">{pctTot}% tổng thiết bị</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Kiểm tra thêm & Mới</p>
            <h3 className="text-xl sm:text-2xl font-black text-amber-600">{countKTT + countTiepNhanMoi}</h3>
            <p className="text-[10px] text-amber-700 font-semibold">{countKTT} kiểm tra, {countTiepNhanMoi} mới</p>
          </div>
        </div>
      </div>

      {/* Middle Grid: Repair Quality & Workflow status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quality Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#004b93]" />
            Chất lượng sau sửa chữa
          </h3>

          <div className="space-y-3">
            {/* NK Tốt */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> NK tốt (Hoạt động chuẩn)
                </span>
                <span className="font-mono">{countNKTot} ({pctTot}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${pctTot}%` }}
                />
              </div>
            </div>

            {/* Kiểm tra thêm */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Kiểm tra thêm (Cần xử lý tiếp)
                </span>
                <span className="font-mono">{countKTT} ({pctKTT}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${pctKTT}%` }}
                />
              </div>
            </div>

            {/* NK Hỏng */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-rose-700 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-500" /> NK hỏng (Không thể khắc phục)
                </span>
                <span className="font-mono">{countNKHong} ({pctHong}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-rose-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${pctHong}%` }}
                />
              </div>
            </div>

            {/* Tiếp nhận mới */}
            {countTiepNhanMoi > 0 && (
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-blue-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-500" /> Tiếp nhận mới (Chờ sửa chữa)
                  </span>
                  <span className="font-mono">{countTiepNhanMoi} ({pctMoi}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${pctMoi}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Workflow Location Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-[#00a3e0]" />
            Hiện trạng phân bổ thiết bị
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <PackageCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <p className="text-base font-black text-emerald-700">{countNKTot}</p>
              <p className="text-[10px] text-emerald-800 font-bold">NK tốt</p>
            </div>

            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
              <Wrench className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <p className="text-base font-black text-amber-700">{countKTT}</p>
              <p className="text-[10px] text-amber-800 font-bold">Kiểm tra thêm</p>
            </div>

            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
              <XCircle className="w-4 h-4 text-rose-600 mx-auto mb-1" />
              <p className="text-base font-black text-rose-700">{countNKHong}</p>
              <p className="text-[10px] text-rose-800 font-bold">NK hỏng</p>
            </div>

            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
              <Send className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <p className="text-base font-black text-blue-700">{countTiepNhanMoi}</p>
              <p className="text-[10px] text-blue-800 font-bold">Tiếp nhận mới</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700">Phân loại chứng từ đã lập:</p>
            <div className="flex justify-between">
              <span>PXK (Phiếu xuất kho):</span>
              <span className="font-bold text-[#004b93]">{countPXK} phiếu</span>
            </div>
            <div className="flex justify-between">
              <span>PNK (Phiếu nhập kho):</span>
              <span className="font-bold text-emerald-700">{countPNK} phiếu</span>
            </div>
            <div className="flex justify-between">
              <span>Gửi / Mượn thiết bị:</span>
              <span className="font-bold text-amber-700">{countGM} phiếu</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 Most Processed Equipment */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#004b93]" />
          Top chủng loại thiết bị xử lý nhiều nhất
        </h3>

        <div className="space-y-2">
          {topEquip.map(([name, count], index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#004b93]/10 text-[#004b93] font-bold flex items-center justify-center text-[10px]">
                  {index + 1}
                </span>
                <span className="font-semibold text-slate-800 font-mono">{name}</span>
              </div>
              <span className="font-bold text-[#004b93] bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {count} thiết bị
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
