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

  // Helper kiểm tra BBBG đã hoàn thành gán PNK
  const isCompletedBBBG = (v: PhieuGiaoDich) => {
    const isBB = v.loaiChungTu === 'GUI_MUON' || (v.loaiChungTu as string) === 'BBBG';
    if (!isBB) return false;
    const hasCompletedNote = Boolean(v.ghiChu && v.ghiChu.includes('Đã hoàn thành nhập kho đơn vị'));
    const allAssigned = Boolean(
      v.danhSachVatTu &&
      v.danhSachVatTu.length > 0 &&
      v.danhSachVatTu.every(
        (it) => it.soPNKHoanTat && it.soPNKHoanTat.trim() !== '' && it.trangThaiHienTai !== 'Tạm nhận'
      )
    );
    return hasCompletedNote || allAssigned;
  };

  // Số lượng BBBG đã hoàn thành gán PNK
  const completedBBBGVouchers = vouchers.filter((v) => isCompletedBBBG(v));
  const countCompletedBBBG = completedBBBGVouchers.length;
  // Số lượng vật tư của BBBG đã hoàn thành gán PNK được loại trừ để chống trùng lặp
  const excludedCompletedItemsCount = completedBBBGVouchers.reduce((sum, v) => sum + v.danhSachVatTu.length, 0);

  // DANH SÁCH VẬT TƯ KIỂM ĐẾM TRONG KHO (CHỐNG TRÙNG LẶP):
  // 1. Toàn bộ vật tư từ PXK, PNK
  // 2. Dữ liệu về vật tư của BBBG khi đã hoàn thành gán PNK sẽ KHÔNG ĐƯỢC KIỂM ĐẾM trong các thống kê kho
  // 3. Đối với BBBG chưa hoàn thành: chỉ kiểm đếm các vật tư còn đang "Tạm nhận" chờ gán PNK (tránh đếm trùng các vật tư đã gán PNK)
  const allItems = vouchers.flatMap((v) => {
    const isBB = v.loaiChungTu === 'GUI_MUON' || (v.loaiChungTu as string) === 'BBBG';
    if (!isBB) {
      return v.danhSachVatTu;
    }
    if (isCompletedBBBG(v)) {
      // Đã hoàn thành nhập kho đơn vị: KHÔNG kiểm đếm trong các thống kê kho
      return [];
    }
    // BBBG chưa hoàn thành: chỉ kiểm đếm các vật tư còn đang "Tạm nhận"
    return v.danhSachVatTu.filter((it) => !it.soPNKHoanTat || it.trangThaiHienTai === 'Tạm nhận');
  });

  const totalItems = allItems.length;

  const countNKTot = allItems.filter(
    (i) => i.trangThaiHienTai === 'NK tốt'
  ).length;

  const countNKHong = allItems.filter(
    (i) => i.trangThaiHienTai === 'NK hỏng'
  ).length;

  const countKTT = allItems.filter(
    (i) => i.trangThaiHienTai === 'Kiểm tra thêm' || i.trangThaiHienTai === 'Đang sửa chữa'
  ).length;

  const countTiepNhanMoi = allItems.filter(
    (i) => !i.trangThaiHienTai || i.trangThaiHienTai === 'Tiếp nhận mới'
  ).length;

  const countTamNhan = allItems.filter(
    (i) => i.trangThaiHienTai === 'Tạm nhận'
  ).length;

  const pctTot = totalItems > 0 ? Math.round((countNKTot / totalItems) * 100) : 0;
  const pctHong = totalItems > 0 ? Math.round((countNKHong / totalItems) * 100) : 0;
  const pctKTT = totalItems > 0 ? Math.round((countKTT / totalItems) * 100) : 0;
  const pctMoi = totalItems > 0 ? Math.round((countTiepNhanMoi / totalItems) * 100) : 0;
  const pctTamNhan = totalItems > 0 ? Math.round((countTamNhan / totalItems) * 100) : 0;

  // Voucher type breakdown
  const countPXK = vouchers.filter((v) => v.loaiChungTu === 'PXK').length;
  const countPNK = vouchers.filter((v) => v.loaiChungTu === 'PNK').length;
  const countGM = vouchers.filter((v) => v.loaiChungTu === 'GUI_MUON' || (v.loaiChungTu as string) === 'BBBG').length;

  // Top equipment types (Mã VT & Tên VT)
  interface EquipStat {
    maVT: string;
    tenVT: string;
    count: number;
    countTot: number;
    countHong: number;
  }
  const equipMap: Record<string, EquipStat> = {};
  allItems.forEach((item) => {
    const ma = item.maVT?.trim() || '';
    const ten = item.tenVT?.trim() || '';
    const key = ma || ten || 'Chưa xác định';
    if (!equipMap[key]) {
      equipMap[key] = {
        maVT: ma || 'N/A',
        tenVT: ten || 'Chưa đặt tên vật tư',
        count: 0,
        countTot: 0,
        countHong: 0,
      };
    } else {
      if ((!equipMap[key].tenVT || equipMap[key].tenVT === 'Chưa đặt tên vật tư') && ten) {
        equipMap[key].tenVT = ten;
      }
      if ((equipMap[key].maVT === 'N/A' || !equipMap[key].maVT) && ma) {
        equipMap[key].maVT = ma;
      }
    }
    equipMap[key].count += 1;
    if (item.trangThaiHienTai === 'NK tốt') equipMap[key].countTot += 1;
    if (item.trangThaiHienTai === 'NK hỏng') equipMap[key].countHong += 1;
  });

  const topEquip = Object.values(equipMap)
    .sort((a, b) => b.count - a.count)
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
            <p className="text-[10px] text-slate-500">{countPXK} PXK, {countPNK} PNK, {countGM} BBBG</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#004b93] flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Tiếp nhận mới</p>
            <h3 className="text-xl sm:text-2xl font-black text-[#004b93]">{countTiepNhanMoi}</h3>
            <p className="text-[10px] text-blue-700 font-semibold">{pctMoi}% (Chờ sửa chữa / {totalItems} TB)</p>
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
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">NK Hỏng & Cần KT</p>
            <h3 className="text-xl sm:text-2xl font-black text-rose-600">{countNKHong + countKTT}</h3>
            <p className="text-[10px] text-slate-500 font-semibold">{countNKHong} hỏng, {countKTT} kiểm tra thêm</p>
          </div>
        </div>
      </div>

      {/* Middle Grid: Repair Quality & Workflow status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quality Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#004b93]" />
            Tình trạng & Phân loại thiết bị
          </h3>

          <div className="space-y-3">
            {/* Tiếp nhận mới */}
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

            {/* Tạm nhận (BBBG chờ gán PNK) */}
            {countTamNhan > 0 && (
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-amber-800 flex items-center gap-1.5">
                    <PackageCheck className="w-3.5 h-3.5 text-amber-600" /> Tạm nhận (BBBG chờ gán PNK)
                  </span>
                  <span className="font-mono">{countTamNhan} ({pctTamNhan}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${pctTamNhan}%` }}
                  />
                </div>
              </div>
            )}

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
          </div>
        </div>

        {/* Workflow Location Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-[#00a3e0]" />
            Hiện trạng phân bổ thiết bị
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
              <Layers className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <p className="text-base font-black text-blue-700">{countTiepNhanMoi}</p>
              <p className="text-[10px] text-blue-800 font-bold">Tiếp nhận mới</p>
            </div>

            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
              <PackageCheck className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <p className="text-base font-black text-amber-700">{countTamNhan}</p>
              <p className="text-[10px] text-amber-800 font-bold">Tạm nhận (BBBG)</p>
            </div>

            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <p className="text-base font-black text-emerald-700">{countNKTot}</p>
              <p className="text-[10px] text-emerald-800 font-bold">NK tốt</p>
            </div>

            <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <p className="text-base font-black text-amber-700">{countKTT}</p>
              <p className="text-[10px] text-amber-800 font-bold">Kiểm tra thêm</p>
            </div>

            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
              <XCircle className="w-4 h-4 text-rose-600 mx-auto mb-1" />
              <p className="text-base font-black text-rose-700">{countNKHong}</p>
              <p className="text-[10px] text-rose-800 font-bold">NK hỏng</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
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
              <span>BBBG:</span>
              <span className="font-bold text-amber-700">
                {countGM} phiếu {countCompletedBBBG > 0 && `(${countCompletedBBBG} đã hoàn thành gán PNK)`}
              </span>
            </div>
            {countCompletedBBBG > 0 && (
              <div className="pt-1.5 border-t border-slate-200 text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Đã loại trừ <b>{excludedCompletedItemsCount}</b> vật tư từ <b>{countCompletedBBBG}</b> BBBG đã hoàn thành nhập kho đơn vị để chống trùng lặp số liệu.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top 5 Most Processed Equipment */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#004b93]" />
            Top chủng loại thiết bị xử lý nhiều nhất
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
             </span>
        </div>

        {topEquip.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            Chưa có dữ liệu thiết bị nào trong hệ thống.
          </div>
        ) : (
          <div className="space-y-2">
            {topEquip.map((item, index) => {
              const pctOfTotal = totalItems > 0 ? Math.round((item.count / totalItems) * 100) : 0;
              return (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 transition-colors gap-2.5 text-xs"
                >
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <span className={`w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5 sm:mt-0 ${
                      index === 0
                        ? 'bg-amber-100 text-amber-800 font-extrabold'
                        : index === 1
                        ? 'bg-slate-200 text-slate-800'
                        : index === 2
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-100/70 text-[#004b93]'
                    }`}>
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        {item.maVT && item.maVT !== 'N/A' && (
                          <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                            {item.maVT}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-slate-500 font-medium shrink-0">Tên VT:</span>
                          <span className="font-semibold text-slate-800 truncate" title={item.tenVT}>
                            {item.tenVT}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pl-7 sm:pl-0">
                    <span className="text-[11px] text-slate-400 font-medium">
                      ({pctOfTotal}%)
                    </span>
                    <span className="font-bold text-[#004b93] bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs whitespace-nowrap">
                      {item.count} thiết bị
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
