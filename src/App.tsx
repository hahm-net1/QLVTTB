import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { VoucherForm } from './components/VoucherForm';
import { VoucherList } from './components/VoucherList';
import { DashboardStats } from './components/DashboardStats';
import { SmartScanModal } from './components/SmartScanModal';
import { VoucherDetailModal } from './components/VoucherDetailModal';
import { 
  loadVouchers, 
  saveVouchers,
  saveOrUpdateVoucher, 
  deleteVoucher, 
  resetToSampleData, 
  clearAllVouchers,
  exportVouchersToCSV, 
  exportVouchersToJSON 
} from './utils/storage';
import { 
  subscribeToCloudVouchers, 
  saveVoucherToCloud, 
  deleteVoucherFromCloud, 
  clearAllCloudVouchers 
} from './services/voucherSync';
import { PhieuGiaoDich } from './types';
import { getVoucherPrefix } from './utils/formatters';
import { 
  FileText, 
  Layers, 
  BarChart3, 
  Sparkles, 
  Plus, 
  CheckCircle,
  HelpCircle,
  PhoneCall,
  Cloud
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'form' | 'list' | 'stats'>('list');
  const [vouchers, setVouchers] = useState<PhieuGiaoDich[]>([]);
  const [editingVoucher, setEditingVoucher] = useState<PhieuGiaoDich | null>(null);
  const [detailVoucher, setDetailVoucher] = useState<PhieuGiaoDich | null>(null);
  const [isSmartScanOpen, setIsSmartScanOpen] = useState(false);
  const [scanSessionKey, setScanSessionKey] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load vouchers from local cache and subscribe to Firestore realtime updates
  useEffect(() => {
    // 1. Initial fast local load
    const initialLocal = loadVouchers();
    if (initialLocal.length > 0) {
      setVouchers(initialLocal);
    }

    // 2. Realtime subscription to Firebase Firestore
    const unsubscribe = subscribeToCloudVouchers(
      (cloudVouchers) => {
        setVouchers(cloudVouchers);
        saveVouchers(cloudVouchers);
      },
      (err) => {
        console.error('Firebase realtime sync notice:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleNewVoucher = () => {
    setEditingVoucher(null);
    setScanSessionKey((prev) => prev + 1);
    setActiveTab('form');
  };

  const handleSaveVoucher = async (savedVoucher: PhieuGiaoDich) => {
    // Reset toàn bộ phiên quét và upload trước đó khi lưu chứng từ
    setScanSessionKey((prev) => prev + 1);

    // Optimistic local update
    const updated = saveOrUpdateVoucher(savedVoucher);
    setVouchers(updated);
    if (detailVoucher && detailVoucher.id === savedVoucher.id) {
      setDetailVoucher(savedVoucher);
    }
    setEditingVoucher(null);
    showToast(`Đã lưu phiếu ${savedVoucher.soChungTu}. Đang đồng bộ Cloud...`);

    // Persist to Firebase Firestore
    try {
      await saveVoucherToCloud(savedVoucher);
      showToast(`Đã đồng bộ realtime phiếu ${savedVoucher.soChungTu} lên Cloud Firestore!`);
    } catch (err) {
      console.error('Lỗi đồng bộ Firebase Firestore:', err);
      showToast(`Đã lưu phiếu ${savedVoucher.soChungTu} (đang ngoại tuyến)`);
    }
  };

  const handleEditVoucher = (voucher: PhieuGiaoDich) => {
    setEditingVoucher(voucher);
    setActiveTab('form');
  };

  const handleDeleteVoucher = async (id: string) => {
    const updated = deleteVoucher(id);
    setVouchers(updated);
    if (detailVoucher && detailVoucher.id === id) {
      setDetailVoucher(null);
    }
    try {
      await deleteVoucherFromCloud(id);
      showToast('Đã xóa phiếu giao dịch trên Cloud Firestore');
    } catch (err) {
      console.error('Lỗi xóa trên Cloud:', err);
      showToast('Đã xóa phiếu giao dịch cục bộ');
    }
  };

  const handleDuplicateVoucher = (voucher: PhieuGiaoDich) => {
    const cloned: PhieuGiaoDich = {
      ...voucher,
      id: `phieu-${Date.now()}`,
      soChungTu: `${voucher.soChungTu}-COPY`,
      ngayTiepNhan: new Date().toISOString().slice(0, 10),
      danhSachVatTu: voucher.danhSachVatTu.map((item, idx) => ({
        ...item,
        id: `vt-${Date.now()}-${idx}`,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingVoucher(cloned);
    setActiveTab('form');
    showToast(`Đã sao chép sang phiếu: ${cloned.soChungTu}`);
  };

  const handleApplySmartScanData = (extracted: Partial<PhieuGiaoDich>) => {
    const loai = extracted.loaiChungTu || 'PXK';
    const newVoucher: PhieuGiaoDich = {
      id: `phieu-${Date.now()}`,
      soChungTu: extracted.soChungTu || getVoucherPrefix(loai),
      loaiChungTu: loai,
      ngayTiepNhan: extracted.ngayTiepNhan || new Date().toISOString().slice(0, 10),
      donViLienQuan: extracted.donViLienQuan || '',
      canBoTiepNhan: extracted.canBoTiepNhan || '',
      ghiChu: extracted.ghiChu || '',
      danhSachVatTu: extracted.danhSachVatTu || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setScanSessionKey((prev) => prev + 1);
    setEditingVoucher(newVoucher);
    setActiveTab('form');
    showToast('Đã nạp dữ liệu trích xuất AI vào form!');
  };

  const handleResetSampleData = async () => {
    const empty = clearAllVouchers();
    setVouchers(empty);
    if (detailVoucher) setDetailVoucher(null);
    if (editingVoucher) setEditingVoucher(null);
    try {
      await clearAllCloudVouchers();
      showToast('Đã xóa sạch toàn bộ phiếu trên hệ thống và Cloud Firestore');
    } catch (err) {
      showToast('Đã xóa sạch toàn bộ phiếu trên hệ thống');
    }
  };

  const handleExportCSV = () => {
    exportVouchersToCSV(vouchers);
    showToast('Đã xuất file báo cáo CSV thành công');
  };

  const handleExportJSON = () => {
    exportVouchersToJSON(vouchers);
    showToast('Đã xuất file sao lưu JSON thành công');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#004b93] text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-cyan-400 text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-top-3">
          <CheckCircle className="w-4 h-4 text-cyan-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewVoucher={handleNewVoucher}
        onOpenSmartScan={() => setIsSmartScanOpen(true)}
        onExportCSV={handleExportCSV}
        onResetData={handleResetSampleData}
        totalCount={vouchers.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {activeTab === 'form' && (
          <VoucherForm
            key={editingVoucher ? editingVoucher.id : 'new-form'}
            initialData={editingVoucher}
            existingVouchers={vouchers}
            onSave={handleSaveVoucher}
            onCancel={() => {
              setEditingVoucher(null);
              setActiveTab('list');
            }}
            onOpenSmartScan={() => setIsSmartScanOpen(true)}
            onDelete={handleDeleteVoucher}
          />
        )}

        {activeTab === 'list' && (
          <VoucherList
            vouchers={vouchers}
            onSelectVoucher={(v) => setDetailVoucher(v)}
            onEditVoucher={handleEditVoucher}
            onDeleteVoucher={handleDeleteVoucher}
            onDuplicateVoucher={handleDuplicateVoucher}
            onNewVoucher={handleNewVoucher}
            onExportCSV={handleExportCSV}
          />
        )}

        {activeTab === 'stats' && (
          <DashboardStats
            vouchers={vouchers}
            onExportCSV={handleExportCSV}
            onExportJSON={handleExportJSON}
            onNewVoucher={handleNewVoucher}
          />
        )}
      </main>

      {/* Floating Action Button for Mobile: Quick AI Scan */}
      <div className="fixed bottom-18 right-4 sm:hidden z-30">
        <button
          onClick={() => setIsSmartScanOpen(true)}
          className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#004b93] to-[#00a3e0] text-white flex items-center justify-center shadow-xl border-2 border-white cursor-pointer active:scale-95 transition-transform"
          title="Quét tài liệu AI OCR"
        >
          <Sparkles className="w-6 h-6 text-amber-200" />
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1.5 flex items-center justify-around text-[10px] font-semibold text-slate-500">
        <button
          onClick={() => {
            setEditingVoucher(null);
            setActiveTab('form');
          }}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'form'
              ? 'text-[#004b93] font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className={`w-5 h-5 ${activeTab === 'form' ? 'text-[#004b93]' : 'text-slate-400'}`} />
          <span>Nhập phiếu</span>
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-colors cursor-pointer relative ${
            activeTab === 'list'
              ? 'text-[#004b93] font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className={`w-5 h-5 ${activeTab === 'list' ? 'text-[#004b93]' : 'text-slate-400'}`} />
          <span>Danh sách</span>
          <span className="absolute top-0.5 right-2 bg-[#00a3e0] text-white text-[9px] px-1 rounded-full font-bold">
            {vouchers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'stats'
              ? 'text-[#004b93] font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <BarChart3 className={`w-5 h-5 ${activeTab === 'stats' ? 'text-[#004b93]' : 'text-slate-400'}`} />
          <span>Thống kê</span>
        </button>
      </nav>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500 hidden sm:block">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#004b93]">QLVT</span>
            <span>•</span>
            <span>Hệ thống Quản lý Thiết bị, Vật tư & Sửa chữa</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>XVT-Hahm</span>
            <button
              onClick={handleResetSampleData}
              className="text-[#004b93] hover:underline cursor-pointer"
            >
        
            </button>
          </div>
        </div>
      </footer>

      {/* AI OCR Smart Scan Modal */}
      <SmartScanModal
        key={scanSessionKey}
        isOpen={isSmartScanOpen}
        onClose={() => setIsSmartScanOpen(false)}
        onApplyData={handleApplySmartScanData}
      />

      {/* Voucher Detail & Print Modal */}
      <VoucherDetailModal
        voucher={detailVoucher}
        allVouchers={vouchers}
        onClose={() => setDetailVoucher(null)}
        onEdit={handleEditVoucher}
        onDelete={handleDeleteVoucher}
        onUpdateVoucher={handleSaveVoucher}
      />
    </div>
  );
}
