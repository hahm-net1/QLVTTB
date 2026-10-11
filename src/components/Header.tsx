import React from 'react';
import { 
  FileText, 
  PlusCircle, 
  Scan, 
  BarChart3, 
  Layers, 
  FileSpreadsheet, 
  Sparkles,
  Cloud
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'form' | 'list' | 'stats';
  setActiveTab: (tab: 'form' | 'list' | 'stats') => void;
  onNewVoucher: () => void;
  onOpenSmartScan: () => void;
  onExportCSV: () => void;
  onResetData?: () => void;
  totalCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onNewVoucher,
  onOpenSmartScan,
  onExportCSV,
  totalCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#004b93] text-white shadow-md border-b border-[#003870]">
      {/* Top Brand Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-lg sm:text-xl leading-tight tracking-tight text-white">
                QLVT
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-400/20 text-cyan-200 border border-cyan-400/30">
                <Cloud className="w-3 h-3 text-cyan-300 animate-pulse" />
                <span>Cloud Firestore</span>
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-cyan-100 font-normal leading-tight hidden xs:block">
              Quản lý Phiếu Vật tư, Thiết bị & Sửa chữa
            </p>
          </div>
        </div>

        {/* Action Buttons on Desktop / Tablet */}
        <div className="flex items-center space-x-2">
          {/* Quick Smart Scan AI */}
          <button
            onClick={onOpenSmartScan}
            className="flex items-center gap-1.5 bg-[#00a3e0] hover:bg-cyan-500 active:bg-cyan-600 text-white font-semibold text-xs sm:text-sm px-3 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
            title="Quét ảnh / File PDF / Ghi chú bằng AI"
          >
            <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
            <span className="hidden sm:inline">Quét AI OCR</span>
            <span className="sm:hidden">Quét AI</span>
          </button>

          {/* New Voucher button */}
          <button
            onClick={onNewVoucher}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs sm:text-sm px-3 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
            title="Tạo yêu cầu mới / Lập chứng từ mới"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Tạo yêu cầu mới</span>
            <span className="sm:hidden">Tạo mới</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={onExportCSV}
            className="hidden md:flex items-center gap-1 bg-[#003870] hover:bg-[#002752] text-white text-xs px-2.5 py-2 rounded-lg transition-colors cursor-pointer border border-white/10"
            title="Xuất dữ liệu Excel/CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Mobile & Desktop) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex border-t border-white/10 text-xs sm:text-sm font-medium">
          <button
            onClick={() => setActiveTab('form')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'form'
                ? 'border-[#00a3e0] text-white font-bold bg-white/10'
                : 'border-transparent text-cyan-100/80 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4 text-[#00a3e0]" />
            <span>Nhập liệu phiếu</span>
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-4 border-b-2 transition-colors cursor-pointer relative ${
              activeTab === 'list'
                ? 'border-[#00a3e0] text-white font-bold bg-white/10'
                : 'border-transparent text-cyan-100/80 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4 text-[#00a3e0]" />
            <span>Danh sách phiếu</span>
            <span className="ml-1 bg-white/20 text-white font-bold px-1.5 py-0.2 rounded-full text-[10px]">
              {totalCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'stats'
                ? 'border-[#00a3e0] text-white font-bold bg-white/10'
                : 'border-transparent text-cyan-100/80 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-[#00a3e0]" />
            <span>Thống kê vật tư</span>
          </button>
        </div>
      </div>
    </header>
  );
};
