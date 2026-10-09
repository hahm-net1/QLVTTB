import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Upload, 
  FileText, 
  Camera, 
  CheckCircle2, 
  Loader2, 
  ArrowRight, 
  FileUp, 
  ClipboardPaste,
  HelpCircle,
  Eye,
  Check
} from 'lucide-react';
import { OCR_SAMPLE_PRESETS } from '../constants/sampleData';
import { extractDocumentWithAI, parseTextDocumentHeuristic } from '../utils/ocrParser';
import { AIOCRExtractResult, PhieuGiaoDich, ChiTietVatTu } from '../types';
import { getLoaiChungTuBadge, getTrangThaiSauSuaBadge } from '../utils/formatters';

interface SmartScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (extractedData: Partial<PhieuGiaoDich>) => void;
}

export const SmartScanModal: React.FC<SmartScanModalProps> = ({
  isOpen,
  onClose,
  onApplyData,
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'preset'>('preset');
  const [inputText, setInputText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [extractedResult, setExtractedResult] = useState<AIOCRExtractResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof OCR_SAMPLE_PRESETS[0]) => {
    setInputText(preset.text);
    setImagePreview(null);
    handleProcess(preset.text, undefined);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        setImagePreview(base64);
        setActiveTab('image');
        // Extract with image
        handleProcess(
          `Trích xuất biên bản giao nhận thiết bị viễn thông từ ảnh tài liệu đính kèm: ${file.name}`,
          base64
        );
      };
      reader.readAsDataURL(file);
    } else {
      // PDF or text file
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const content = uploadEvent.target?.result as string;
        setInputText(content);
        setActiveTab('text');
        handleProcess(content, undefined);
      };
      reader.readAsText(file);
    }
  };

  const handleProcess = async (textToProcess: string, imgBase64?: string) => {
    setIsProcessing(true);
    setExtractedResult(null);

    // Multi-step animated feedback
    setProcessingStep('Đang phân tích định dạng tài liệu viễn thông...');
    await new Promise((r) => setTimeout(r, 400));
    setProcessingStep('Đang nhận diện mã chứng từ, đơn vị và ngày lập...');
    await new Promise((r) => setTimeout(r, 400));
    setProcessingStep('Đang bóc tách danh mục Serial Number và trạng thái thiết bị...');

    try {
      let result: AIOCRExtractResult;
      if (imgBase64 || textToProcess) {
        result = await extractDocumentWithAI(textToProcess, imgBase64);
      } else {
        result = parseTextDocumentHeuristic(inputText);
      }
      setExtractedResult(result);
    } catch (err) {
      console.error(err);
      const fallback = parseTextDocumentHeuristic(textToProcess);
      setExtractedResult(fallback);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleApply = () => {
    if (!extractedResult) return;

    const formattedVatTu: ChiTietVatTu[] = (extractedResult.danhSachVatTu || []).map((item, idx) => ({
      id: `vt-${Date.now()}-${idx}`,
      maVT: item.maVT || 'ONT-GW040H',
      tenVT: item.tenVT || 'Thiết bị viễn thông',
      serialNumber: item.serialNumber || `SN-${Math.floor(100000 + Math.random() * 900000)}`,
      trangThaiSauSua: item.trangThaiSauSua || 'TOT',
      soPNKHoanTat: item.soPNKHoanTat || '',
      trangThaiHienTai: item.trangThaiHienTai || 'Đang sửa chữa',
      ghiChuVatTu: '',
    }));

    const partialVoucher: Partial<PhieuGiaoDich> = {
      soChungTu: extractedResult.soChungTu || '',
      loaiChungTu: extractedResult.loaiChungTu || 'PXK',
      ngayTiepNhan: extractedResult.ngayTiepNhan || new Date().toISOString().slice(0, 10),
      donViLienQuan: extractedResult.donViLienQuan || '',
      canBoTiepNhan: extractedResult.canBoTiepNhan || '',
      ghiChu: extractedResult.ghiChu || '',
      danhSachVatTu: formattedVatTu,
    };

    onApplyData(partialVoucher);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-[#004b93] text-white px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00a3e0] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                AI / OCR Trích xuất thông minh
              </h3>
              <p className="text-[11px] text-cyan-100">
                Chụp ảnh giấy tờ, tải PDF hoặc dán văn bản để tự động điền Form
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Methods Tab Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-medium">
          <button
            onClick={() => setActiveTab('preset')}
            className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'preset'
                ? 'border-[#004b93] text-[#004b93] font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-[#00a3e0]" />
            <span>Mẫu biên bản thử nghiệm</span>
          </button>

          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'text'
                ? 'border-[#004b93] text-[#004b93] font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardPaste className="w-4 h-4 text-[#00a3e0]" />
            <span>Dán ghi chú / Text</span>
          </button>

          <button
            onClick={() => setActiveTab('image')}
            className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'image'
                ? 'border-[#004b93] text-[#004b93] font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4 text-[#00a3e0]" />
            <span>Tải ảnh / PDF / Chụp</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: PRESETS */}
          {activeTab === 'preset' && (
            <div className="space-y-3">
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 text-xs text-cyan-900 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-[#00a3e0] shrink-0 mt-0.5" />
                <span>
                  Chọn một mẫu biên bản bên dưới để kiểm tra khả năng bóc tách tự động Số chứng từ, Thiết bị, Số Serial và Trạng thái:
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {OCR_SAMPLE_PRESETS.map((preset, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectPreset(preset)}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-[#00a3e0] hover:bg-slate-50 transition-all cursor-pointer group flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-800 group-hover:text-[#004b93] flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#00a3e0]" />
                        {preset.name}
                      </h4>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-[#004b93]">
                        {preset.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono line-clamp-2 bg-slate-100 p-2 rounded-lg">
                      {preset.text.slice(0, 150)}...
                    </p>
                    <div className="flex justify-end">
                      <span className="text-xs font-semibold text-[#004b93] group-hover:underline flex items-center gap-1">
                        Áp dụng & Phân tích ngay <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: TEXT NOTE */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Dán nội dung tin nhắn, biên bản text hoặc ghi chú bàn giao:
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows={6}
                  placeholder="Dán nội dung ví dụ:
Phiếu xuất kho số: PXK-20261009-01
Ngày: 09/10/2026
Đơn vị: Đội điều phối 1
Người nhận: Nguyễn Văn Hùng
1. ONT GW040H - S/N: VT24H88102 - Tốt - Đã xuất đi
2. Mesh EW12SX - S/N: MESH12S9921 - Tốt - Đã xuất đi"
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00a3e0]"
                />
              </div>

              <button
                onClick={() => handleProcess(inputText, undefined)}
                disabled={!inputText.trim() || isProcessing}
                className="w-full py-3 bg-[#004b93] hover:bg-[#003870] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>Bắt đầu phân tích văn bản</span>
              </button>
            </div>
          )}

          {/* TAB 3: FILE / IMAGE UPLOAD */}
          {activeTab === 'image' && (
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,application/pdf,.txt"
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#00a3e0] rounded-2xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-cyan-50/20 transition-colors"
              >
                <Upload className="w-10 h-10 text-[#00a3e0] mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-800">
                  Nhấn để chọn ảnh biên bản, chụp ảnh hoặc tải PDF
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Hỗ trợ định dạng JPG, PNG, PDF hoặc tài liệu văn bản
                </p>
              </div>

              {imagePreview && (
                <div className="mt-3 p-3 bg-slate-100 rounded-xl flex items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="Xem trước tài liệu"
                    className="w-16 h-16 object-cover rounded-lg border border-slate-300 shadow-xs"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">Ảnh biên bản đã tải lên</p>
                    <p className="text-[11px] text-slate-500">Sẵn sàng để quét bóc tách OCR</p>
                  </div>
                  <button
                    onClick={() => handleProcess(inputText, imagePreview)}
                    className="px-3 py-2 bg-[#00a3e0] text-white text-xs font-bold rounded-lg hover:bg-cyan-600 cursor-pointer"
                  >
                    Quét lại
                  </button>
                </div>
              )}
            </div>
          )}

          {/* LOADING STATE */}
          {isProcessing && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#00a3e0] animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">Hệ thống đang xử lý...</p>
                <p className="text-xs text-[#004b93] font-medium animate-pulse">{processingStep}</p>
              </div>
            </div>
          )}

          {/* EXTRACTED RESULT REVIEW */}
          {extractedResult && !isProcessing && (
            <div className="border border-emerald-300 bg-emerald-50/40 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-bold text-xs sm:text-sm text-emerald-900">
                    Kết quả trích xuất tự động thành công
                  </h4>
                </div>
                <span className="text-[11px] font-bold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
                  {extractedResult.danhSachVatTu?.length || 0} vật tư
                </span>
              </div>

              {/* Master metadata cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Số chứng từ:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {extractedResult.soChungTu || '(Chưa có - sẽ tự sinh)'}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Loại chứng từ:</span>
                  <span className="font-bold text-[#004b93]">
                    {extractedResult.loaiChungTu || 'PXK'}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Ngày tiếp nhận:</span>
                  <span className="font-semibold text-slate-800">
                    {extractedResult.ngayTiepNhan || 'Hôm nay'}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Đơn vị liên quan:</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {extractedResult.donViLienQuan || '(Chưa nhận diện)'}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 sm:col-span-2">
                  <span className="text-[10px] text-slate-400 block">Cán bộ tiếp nhận:</span>
                  <span className="font-semibold text-slate-800">
                    {extractedResult.canBoTiepNhan || '(Chưa nhận diện)'}
                  </span>
                </div>
              </div>

              {/* Items Detail Preview */}
              <div>
                <h5 className="text-xs font-bold text-slate-700 mb-2">
                  Danh sách vật tư bóc tách ({extractedResult.danhSachVatTu?.length || 0}):
                </h5>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {extractedResult.danhSachVatTu?.map((item, idx) => {
                    const statusBadge = getTrangThaiSauSuaBadge(item.trangThaiSauSua || 'TOT');
                    return (
                      <div
                        key={idx}
                        className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-slate-800 truncate">{item.tenVT}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                            <span className="font-mono text-slate-500">S/N: {item.serialNumber}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600">{item.trangThaiHienTai}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[11px] border ${statusBadge.badgeClass}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Apply Button */}
              <button
                onClick={handleApply}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Áp dụng thông tin này vào Form</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Công nghệ OCR & Phân tích cấu trúc chứng từ</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
